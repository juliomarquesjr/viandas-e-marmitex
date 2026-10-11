// Atalhos da RO: perguntas comuns e curtas são entendidas aqui, sem chamar a IA. Isso deixa a resposta mais rápida,
// poupa a cota gratuita da Gemini e faz a RO continuar útil mesmo quando a cota acaba. Se a frase tiver qualquer palavra
// que o atalho não conhece (um nome, um detalhe), devolve null e a IA decide. Puro, testado em tests/ro.test.ts.

import type { Argumentos, NomeFerramenta } from './tools';
import { normalizar } from './text';

export interface Decisao {
  ferramenta: NomeFerramenta;
  args: Argumentos;
  /** O atalho achou que era um nome solto; se nada for encontrado, vale tentar produtos também. */
  nomeSolto?: boolean;
  /** Resposta pronta (conversa fiada), sem consultar nada. */
  fixo?: string;
}

const set = (...palavras: string[]) => new Set(palavras);

/** Palavras de enfeite que não mudam o assunto. */
const ENFEITE = set('qual', 'quais', 'quanto', 'quantos', 'quanta', 'quantas', 'me', 'mostra', 'mostre', 'mostrar', 'ver', 'veja', 'tem', 'ha', 'esta', 'estao', 'sao', 'foi', 'foram', 'e', 'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'em', 'por', 'favor', 'pra', 'para', 'que', 'quem', 'to', 'tem', 'algum', 'alguma', 'algo', 'meu', 'minha', 'meus', 'minhas', 'agora', 'neste', 'nesta', 'deste', 'desta', 'esse', 'essa', 'este', 'ainda', 'total', 'resumo', 'lista', 'listar', 'liste', 'dia', 'dias', 'oi', 'ola', 'bom', 'boa', 'tarde', 'noite', 'vc', 'voce', 'pode', 'poderia', 'gostaria', 'queria', 'quero', 'preciso', 'saber');

const PERIODOS_PALAVRAS: { palavras: string[]; periodo: string }[] = [
  { palavras: ['hoje'], periodo: 'hoje' },
  { palavras: ['ontem'], periodo: 'ontem' },
  { palavras: ['semana', 'passada'], periodo: 'semana_passada' },
  { palavras: ['semana'], periodo: 'esta_semana' },
  { palavras: ['mes', 'passado'], periodo: 'mes_passado' },
  { palavras: ['mes'], periodo: 'este_mes' },
  { palavras: ['ano'], periodo: 'este_ano' },
  { palavras: ['ultimos', '7'], periodo: 'ultimos_7_dias' },
  { palavras: ['ultimos', '30'], periodo: 'ultimos_30_dias' },
];
const PALAVRAS_DE_PERIODO = set('hoje', 'ontem', 'semana', 'passada', 'passado', 'mes', 'ano', 'ultimos', 'ultimo', '7', '30', 'este', 'esta', 'nesse', 'nessa', 'deste', 'desta', 'neste', 'nesta', 'atual', 'corrente');

function periodoDe(tokens: string[], padrao: string): string {
  const junto = ` ${tokens.join(' ')} `;
  for (const p of PERIODOS_PALAVRAS) {
    if (p.palavras.every((w) => junto.includes(` ${w} `))) return p.periodo;
  }
  return padrao;
}

interface Intencao {
  ferramenta: NomeFerramenta;
  /** Palavras que disparam. */
  gatilhos: Set<string>;
  /** Outras palavras que podem aparecer sem mudar o sentido. */
  aceitas?: Set<string>;
  periodoPadrao?: string;
  /** Exige uma destas palavras junto (ex.: "mais" em "mais vendidos"). */
  exige?: string[];
}

const INTENCOES: Intencao[] = [
  { ferramenta: 'produtos_mais_vendidos', gatilhos: set('vendidos', 'vendido', 'saem', 'sai', 'saiu'), aceitas: set('mais', 'produtos', 'produto', 'itens', 'item', 'marmitas', 'pratos'), periodoPadrao: 'este_mes', exige: ['mais'] },
  { ferramenta: 'clientes_top', gatilhos: set('compra', 'compram', 'comprou', 'compraram', 'gasta', 'gastam', 'gastou', 'melhores', 'melhor', 'principais', 'clientes'), aceitas: set('mais', 'clientes', 'cliente', 'fregueses'), periodoPadrao: 'este_mes', exige: ['mais', 'melhores', 'melhor', 'principais'] },
  { ferramenta: 'clientes_devendo', gatilhos: set('devendo', 'deve', 'devem', 'fiado', 'fiados', 'debito', 'debitos', 'divida', 'dividas', 'inadimplentes', 'inadimplente', 'receber', 'pendurado', 'penduradas', 'pendurados'), aceitas: set('clientes', 'cliente', 'ficha', 'fichas', 'abertos', 'aberto', 'tem', 'pagar', 'tudo', 'gente', 'pessoas') },
  { ferramenta: 'clientes_inativos', gatilhos: set('sumiu', 'sumiram', 'sumidos', 'inativos', 'inativo', 'ausentes', 'parados'), aceitas: set('clientes', 'cliente', 'comprar', 'comprando', 'compram', 'comprou', 'sem', 'nao', 'ha', 'mais'), periodoPadrao: '30' },
  { ferramenta: 'vendas', gatilhos: set('vendas', 'venda', 'vendi', 'vendemos', 'vendeu', 'vendeu', 'faturamento', 'faturei', 'faturamos', 'vendido', 'vendeu', 'fiz', 'fizemos', 'movimento', 'caixa', 'entrou', 'receita'), aceitas: set('fatura', 'faturou', 'dinheiro', 'registradas', 'registrado'), periodoPadrao: 'hoje' },
  { ferramenta: 'pedidos_em_aberto', gatilhos: set('aberto', 'abertos', 'andamento', 'pendentes', 'pendente', 'fila', 'esperando', 'preparo', 'preparando', 'entregar', 'entregas'), aceitas: set('pedidos', 'pedido', 'pre', 'pedido', 'prepedidos', 'prepedido', 'online', 'novos', 'novo', 'aceitar'), exige: ['pedidos', 'pedido', 'pre', 'prepedidos', 'prepedido', 'entregas', 'entregar'] },
  { ferramenta: 'despesas', gatilhos: set('despesas', 'despesa', 'gastos', 'gasto', 'gastei', 'gastamos', 'contas', 'saidas'), aceitas: set('paguei', 'pagamos'), periodoPadrao: 'este_mes' },
  { ferramenta: 'lucro', gatilhos: set('lucro', 'lucrei', 'lucramos', 'lucrativo', 'sobrou', 'resultado'), aceitas: set('liquido'), periodoPadrao: 'este_mes' },
  { ferramenta: 'cardapio', gatilhos: set('cardapio', 'cardapios'), aceitas: set('amanha') },
  { ferramenta: 'whatsapp_nao_lidas', gatilhos: set('whatsapp', 'zap', 'whats', 'conversas', 'mensagens', 'mensagem'), aceitas: set('nao', 'lidas', 'lida', 'novas', 'nova', 'sem', 'responder', 'chegaram', 'chegou') },
];

/** Palavras que indicam uma análise que o atalho não sabe fazer: deixa para a IA. */
const COMPLEXAS = set('media', 'maior', 'menor', 'compare', 'comparar', 'comparando', 'versus', 'porcentagem', 'percentual', 'crescimento', 'cresceu', 'caiu', 'queda', 'diferenca', 'por', 'cada', 'entre', 'desde', 'quando', 'primeira', 'primeiro', 'ultima', 'ultimo', 'depois', 'antes', 'fez', 'fizeram', 'comprar', 'pagou', 'pagaram', 'projecao', 'previsao', 'cadastre', 'cadastrar', 'altere', 'alterar', 'apague', 'apagar', 'exclua', 'excluir', 'envie', 'enviar', 'mande', 'mandar', 'cobre', 'cobrar', 'edite', 'editar', 'crie', 'criar', 'adicione', 'adicionar', 'remova', 'remover', 'registre', 'registrar', 'lance', 'lancar');

/** Palavras que ensinam como se pede um cliente (e não fazem parte do nome). */
const VERBOS_BUSCA = set('procure', 'procura', 'procurar', 'busca', 'busque', 'buscar', 'acha', 'ache', 'achar', 'encontre', 'encontra', 'encontrar', 'localiza', 'localize', 'cadastro', 'cliente', 'clientes', 'dados', 'contato', 'telefone', 'celular', 'numero', 'fone', 'whatsapp', 'zap', 'email', 'endereco', 'quem', 'seria', 'conhece', 'conhecer', 'lembra', 'lembro', 'chama', 'chamada', 'chamado', 'nome', 'pessoa', 'dona', 'dono', 'senhora', 'seu', 'sr', 'sra');
const PALAVRAS_FICHA = set('ficha', 'saldo', 'deve', 'devendo', 'divida', 'fiado', 'pagar', 'pendente', 'conta', 'historico', 'extrato', 'compras', 'comprou');

/** Frases de ajuda e de conversa que não precisam de IA nem de ferramenta de dados. */
const CONVERSA = set('oi', 'ola', 'bom', 'boa', 'dia', 'tarde', 'noite', 'tudo', 'bem', 'obrigado', 'obrigada', 'valeu', 'ok', 'certo', 'beleza', 'blz', 'tchau', 'ate', 'logo', 'e', 'voce', 'vc', 'como', 'vai', 'tranquilo', 'opa', 'eae', 'salve', 'hey', 'hello');
/** Palavras que nunca são nome de gente. */
const NAO_NOME = set('mais', 'menos', 'muito', 'muita', 'pouco', 'todos', 'todas', 'tudo', 'nada', 'sim', 'nao', 'porque', 'entao', 'tambem', 'so', 'isso', 'isto', 'aquilo', 'aqui', 'la', 'qual', 'quais', 'quando', 'onde', 'como', 'ele', 'ela', 'eles', 'elas', 'dele', 'dela', 'deles', 'delas');

function ehAjuda(norm: string): boolean {
  return /^(ajuda|help|menu|o que (voce|vc) (faz|sabe|consegue|pode)|como (funciona|te uso|uso|usar)|(voce|vc) (faz|sabe|consegue) o que|para que (voce )?serve)\b/.test(norm);
}

export function rotearRapido(mensagem: string): Decisao | null {
  const norm = normalizar(mensagem);
  if (!norm) return null;
  if (ehAjuda(norm)) return { ferramenta: 'ajuda', args: {} };
  const tk = norm.split(' ');
  if (tk.every((t) => CONVERSA.has(t))) {
    const fixo = tk.some((t) => t === 'obrigado' || t === 'obrigada' || t === 'valeu')
      ? 'Por nada! Se precisar de mais alguma coisa, é só chamar.'
      : tk.some((t) => t === 'tchau' || t === 'ate')
        ? 'Até mais! Quando precisar, estou por aqui.'
        : 'Oi! Em que posso ajudar? Pode perguntar por um cliente, pelas vendas, pela ficha, pelos pedidos em aberto ou pelo cardápio.';
    return { ferramenta: 'ajuda', args: {}, fixo };
  }

  // e-mail
  if (mensagem.includes('@') && !/\s/.test(mensagem.trim())) return { ferramenta: 'buscar_cliente', args: { consulta: mensagem.trim() } };
  // telefone ou CPF: quase só números
  const digitos = mensagem.replace(/\D/g, '');
  if (digitos.length >= 6 && mensagem.replace(/[\d\s().+-]/g, '').replace(/\b(telefone|fone|celular|numero|cpf|ficha|cliente|do|da|de)\b/gi, '').trim() === '') {
    return { ferramenta: /ficha|saldo/i.test(mensagem) ? 'ficha_cliente' : 'buscar_cliente', args: { consulta: digitos } };
  }

  const tokens = norm.split(' ');
  if (tokens.length > 9) return null;
  if (tokens.some((t) => COMPLEXAS.has(t))) return null;

  // 1) intenções por palavra-chave: só vale se sobrar nada além das palavras conhecidas
  for (const it of INTENCOES) {
    if (!tokens.some((t) => it.gatilhos.has(t))) continue;
    if (it.exige && !it.exige.some((w) => tokens.includes(w))) continue;
    const restante = tokens.filter((t) => !ENFEITE.has(t) && !PALAVRAS_DE_PERIODO.has(t) && !it.gatilhos.has(t) && !(it.aceitas?.has(t)) && !(it.exige?.includes(t)) && !(it.ferramenta === 'clientes_inativos' && /^\d{1,3}$/.test(t)));
    if (restante.length > 0) continue;
    if (it.ferramenta === 'clientes_inativos') {
      const dias = Number(tokens.find((t) => /^\d{2,3}$/.test(t)) ?? 30);
      return { ferramenta: 'clientes_inativos', args: { dias: Number.isFinite(dias) ? dias : 30 } };
    }
    if (it.ferramenta === 'cardapio') return { ferramenta: 'cardapio', args: tokens.includes('amanha') ? { data: 'amanha' } : {} };
    const args: Argumentos = {};
    if (it.periodoPadrao) args.periodo = periodoDe(tokens, it.periodoPadrao);
    return { ferramenta: it.ferramenta, args };
  }
  if (tokens.length === 1 && tokens[0] === 'cardapio') return { ferramenta: 'cardapio', args: {} };

  // uma palavra de assunto sem atalho que sirva (ex.: "vendemos de marmita de frango em outubro"): deixa para a IA
  if (tokens.some((t) => !PALAVRAS_FICHA.has(t) && INTENCOES.some((it) => it.gatilhos.has(t)))) return null;

  // 2) um nome solto, com ou sem "procure", "telefone da", "ficha da"
  const querFicha = tokens.some((t) => PALAVRAS_FICHA.has(t));
  const nome = tokens.filter((t) => !ENFEITE.has(t) && !VERBOS_BUSCA.has(t) && !PALAVRAS_FICHA.has(t) && !PALAVRAS_DE_PERIODO.has(t));
  const temNumero = nome.some((t) => /\d/.test(t));
  if (nome.length >= 1 && nome.length <= 5 && !temNumero && !nome.some((t) => NAO_NOME.has(t))) {
    const consulta = nome.join(' ');
    return { ferramenta: querFicha ? 'ficha_cliente' : 'buscar_cliente', args: { consulta }, nomeSolto: true };
  }
  return null;
}
