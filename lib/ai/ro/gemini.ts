// Fala com a Gemini só para decidir qual ferramenta usar (uma chamada por pergunta). Tenta o modelo principal e,
// se a cota dele acabar ou ele estiver ocupado, o seguinte: cada modelo tem a sua própria cota gratuita.

import { FunctionCallingMode, GoogleGenerativeAI, SchemaType, type Content, type FunctionDeclaration, type Schema } from '@google/generative-ai';
import { PERIODOS } from './periods';
import type { Argumentos } from './tools';
import type { RoErro } from './types';

export class RoErroIa extends Error {
  constructor(public erro: RoErro, public status: number) {
    super(erro.mensagem);
  }
}

const MODELOS = (process.env.RO_MODELOS ?? 'gemini-2.5-flash,gemini-2.5-flash-lite').split(',').map((m) => m.trim()).filter(Boolean);

let cliente: GoogleGenerativeAI | null = null;
function obterCliente(): GoogleGenerativeAI {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) throw new RoErroIa({ codigo: 'ia', mensagem: 'A chave da Gemini não está configurada neste ambiente.' }, 503);
  if (!cliente) cliente = new GoogleGenerativeAI(chave);
  return cliente;
}

/** Quando cada modelo volta a valer a pena (depois de um 429), em milissegundos desde 1970. */
const descanso = new Map<string, number>();

const str = (description: string) => ({ type: SchemaType.STRING, description }) as Schema;
const inteiro = (description: string) => ({ type: SchemaType.INTEGER, description }) as Schema;
const periodo = { type: SchemaType.STRING, format: 'enum', enum: [...PERIODOS], description: 'Período. Use "intervalo" com de/ate para datas específicas.' } as Schema;
const de = str('Data inicial AAAA-MM-DD (só com periodo=intervalo).');
const ate = str('Data final AAAA-MM-DD (só com periodo=intervalo).');
const limite = inteiro('Quantos itens mostrar (1 a 30).');

export const DECLARACOES: FunctionDeclaration[] = [
  { name: 'buscar_cliente', description: 'Procura cadastros de clientes por nome (qualquer pedaço, sem acento), telefone, e-mail ou CPF. Use sempre que a pessoa citar um cliente sem pedir saldo ou compras.', parameters: { type: SchemaType.OBJECT, properties: { consulta: str('O que foi digitado: nome, pedaço do nome, telefone ou e-mail.') }, required: ['consulta'] } },
  { name: 'ficha_cliente', description: 'Mostra a ficha de um cliente: quanto ele deve ou tem de crédito, últimas compras e pagamentos. Use para "quanto fulano deve", "ficha do fulano", "o que fulano comprou".', parameters: { type: SchemaType.OBJECT, properties: { consulta: str('Nome ou pedaço do nome do cliente.'), cliente_id: str('Id do cliente, quando já apareceu na conversa.') } } },
  { name: 'clientes_devendo', description: 'Lista os clientes com saldo a pagar na ficha (fiado), do maior para o menor, com o total a receber.', parameters: { type: SchemaType.OBJECT, properties: { limite } } },
  { name: 'clientes_inativos', description: 'Clientes ativos que não compram há N dias (ou nunca compraram).', parameters: { type: SchemaType.OBJECT, properties: { dias: inteiro('Dias sem comprar (padrão 30).'), limite } } },
  { name: 'clientes_top', description: 'Quem mais comprou (valor) em um período.', parameters: { type: SchemaType.OBJECT, properties: { periodo, de, ate, limite } } },
  { name: 'vendas', description: 'Resumo de vendas de um período: total vendido (à vista + fiado), pagamentos de ficha recebidos, quanto entrou no caixa, ticket médio, por forma de pagamento e por dia.', parameters: { type: SchemaType.OBJECT, properties: { periodo, de, ate }, required: ['periodo'] } },
  { name: 'produtos_mais_vendidos', description: 'Ranking dos produtos mais vendidos (quantidade e receita) em um período.', parameters: { type: SchemaType.OBJECT, properties: { periodo, de, ate, limite } } },
  { name: 'pedidos_em_aberto', description: 'Pré-pedidos em andamento (aguardando, em preparo, prontos, em entrega) e pedidos online esperando aceite.', parameters: { type: SchemaType.OBJECT, properties: {} } },
  { name: 'despesas', description: 'Despesas de um período, total e por tipo.', parameters: { type: SchemaType.OBJECT, properties: { periodo, de, ate } } },
  { name: 'lucro', description: 'Lucro de um período: o que entrou no caixa, despesas, lucro de caixa e resultado das vendas.', parameters: { type: SchemaType.OBJECT, properties: { periodo, de, ate } } },
  { name: 'cardapio', description: 'Cardápio de um dia (padrão hoje).', parameters: { type: SchemaType.OBJECT, properties: { data: str('Dia AAAA-MM-DD.') } } },
  { name: 'whatsapp_nao_lidas', description: 'Conversas do WhatsApp com mensagens novas ainda não lidas.', parameters: { type: SchemaType.OBJECT, properties: {} } },
  { name: 'produto_buscar', description: 'Procura produtos por nome e mostra preço, estoque e se está ativo.', parameters: { type: SchemaType.OBJECT, properties: { consulta: str('Nome ou pedaço do nome do produto.') } } },
  { name: 'esclarecer', description: 'Quando a pergunta pode ter mais de um sentido, devolve uma pergunta curta com 2 a 4 opções para a pessoa tocar.', parameters: { type: SchemaType.OBJECT, properties: { pergunta: str('Pergunta curta.'), opcoes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: 'Opções curtas, escritas como a pessoa perguntaria.' } as Schema }, required: ['pergunta', 'opcoes'] } },
  { name: 'ajuda', description: 'Explica o que a RO sabe fazer.', parameters: { type: SchemaType.OBJECT, properties: {} } },
];

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

export function instrucao(hoje: string, tom: 'divertida' | 'direta'): string {
  const diaSemana = DIAS[new Date(`${hoje}T12:00:00Z`).getUTCDay()];
  return `Você é a RO, assistente do painel de um negócio de marmitas e refeições. Quem pergunta é a dona ou o gerente, em geral pessoas simples que não sabem o nome completo dos clientes e escrevem do jeito que falam. Hoje é ${diaSemana}, ${hoje} (horário de Brasília).

Como trabalhar:
- Para qualquer pergunta sobre dados do sistema, chame a ferramenta certa. Nunca invente nomes, números ou datas.
- Se a pessoa citar só um pedaço de nome, um apelido ou um telefone, use buscar_cliente (ou ficha_cliente se perguntar de saldo, dívida ou compras). Não peça o nome completo: procure com o que ela deu.
- Se a pergunta fala de "ele", "ela" ou "esse cliente", use o id que aparece no contexto da conversa.
- Se a pergunta puder ter mais de um sentido, use esclarecer com 2 a 4 opções curtas.
- Venda inclui o fiado. Para datas específicas use periodo=intervalo com de e ate.
- Conversa sem dados (cumprimento, agradecimento, "o que você faz"): responda em uma ou duas frases, ou use ajuda.
- Você só consulta. Se pedirem para cadastrar, alterar, apagar, cobrar ou enviar mensagem, diga em uma frase que isso você não faz e em qual tela do sistema a pessoa faz.
- Nunca mostre senhas, chaves ou configurações do sistema.
- Responda sempre em português do Brasil. ${tom === 'divertida' ? 'Pode usar um toque leve de humor de cozinha, sem exagero.' : 'Seja direta e objetiva.'}`;
}

export interface DecisaoIa {
  chamadas: { nome: string; args: Argumentos }[];
  texto: string;
  modelo: string;
}

const segundosDe = (mensagem: string): number | undefined => {
  const m = /retry in ([\d.]+)s/i.exec(mensagem) ?? /"retryDelay":"(\d+)s"/.exec(mensagem);
  return m ? Math.ceil(Number(m[1])) : undefined;
};

function classificar(error: unknown): { cota: boolean; ocupado: boolean; segundos?: number; texto: string } {
  const texto = error instanceof Error ? error.message : String(error);
  const status = (error as { status?: number })?.status;
  return {
    cota: status === 429 || /\b429\b|quota|rate limit|RESOURCE_EXHAUSTED/i.test(texto),
    ocupado: status === 503 || /\b503\b|overloaded|unavailable/i.test(texto),
    segundos: segundosDe(texto),
    texto,
  };
}

export async function decidir(opcoes: { historico: Content[]; mensagem: string; hoje: string; tom: 'divertida' | 'direta' }): Promise<DecisaoIa> {
  const api = obterCliente();
  let ultimoErro: ReturnType<typeof classificar> | null = null;

  for (const modelo of MODELOS) {
    if ((descanso.get(modelo) ?? 0) > Date.now()) {
      ultimoErro = { cota: true, ocupado: false, segundos: Math.ceil(((descanso.get(modelo) ?? 0) - Date.now()) / 1000), texto: 'em descanso' };
      continue;
    }
    try {
      const model = api.getGenerativeModel({
        model: modelo,
        systemInstruction: instrucao(opcoes.hoje, opcoes.tom),
        tools: [{ functionDeclarations: DECLARACOES }],
        toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
        generationConfig: { temperature: 0.2 },
      });
      const resultado = await model.generateContent({ contents: [...opcoes.historico, { role: 'user', parts: [{ text: opcoes.mensagem }] }] });
      const chamadas = (resultado.response.functionCalls() ?? []).map((c) => ({ nome: c.name, args: (c.args ?? {}) as Argumentos }));
      let texto = '';
      try {
        texto = resultado.response.text().trim();
      } catch {
        texto = '';
      }
      return { chamadas, texto, modelo };
    } catch (error) {
      const c = classificar(error);
      ultimoErro = c;
      if (c.cota) descanso.set(modelo, Date.now() + (c.segundos ?? 30) * 1000);
      if (!c.cota && !c.ocupado) {
        console.error('[RO][Gemini]', modelo, c.texto.slice(0, 300));
        throw new RoErroIa({ codigo: 'ia', mensagem: 'Não consegui falar com a inteligência da RO agora. Tente de novo em instantes.' }, 502);
      }
    }
  }

  if (ultimoErro?.cota) {
    const espera = ultimoErro.segundos ?? 60;
    throw new RoErroIa({ codigo: 'cota', mensagem: `A cota gratuita da inteligência da RO acabou por agora. Tente de novo em cerca de ${espera <= 60 ? 'um minuto' : `${Math.ceil(espera / 60)} minutos`}. Perguntas simples (cliente, vendas, devendo) continuam funcionando.`, tentarEm: espera }, 429);
  }
  throw new RoErroIa({ codigo: 'ocupada', mensagem: 'O serviço de inteligência está ocupado. Tente de novo em instantes.', tentarEm: 15 }, 503);
}

/** Estado para a tela de configurações: tem chave? algum modelo em descanso por causa da cota? */
export function estadoIa(): { chave: boolean; modelos: { nome: string; descansaAte: string | null }[] } {
  return {
    chave: Boolean(process.env.GEMINI_API_KEY),
    modelos: MODELOS.map((nome) => {
      const ate = descanso.get(nome) ?? 0;
      return { nome, descansaAte: ate > Date.now() ? new Date(ate).toISOString() : null };
    }),
  };
}

/** Uma pergunta mínima para conferir que a chave e a cota funcionam (gasta uma chamada). */
export async function testarIa(): Promise<{ ok: boolean; modelo?: string; mensagem: string }> {
  try {
    const api = obterCliente();
    for (const modelo of MODELOS) {
      if ((descanso.get(modelo) ?? 0) > Date.now()) continue;
      try {
        const r = await api.getGenerativeModel({ model: modelo }).generateContent('Responda apenas: ok');
        r.response.text();
        return { ok: true, modelo, mensagem: `Funcionando com ${modelo}.` };
      } catch (error) {
        const c = classificar(error);
        if (c.cota) descanso.set(modelo, Date.now() + (c.segundos ?? 30) * 1000);
        if (!c.cota && !c.ocupado) return { ok: false, mensagem: 'A Gemini recusou a chamada. Confira a chave.' };
      }
    }
    return { ok: false, mensagem: 'A cota gratuita acabou por agora. Tente de novo em cerca de um minuto.' };
  } catch (error) {
    return { ok: false, mensagem: error instanceof RoErroIa ? error.erro.mensagem : 'Não foi possível testar.' };
  }
}
