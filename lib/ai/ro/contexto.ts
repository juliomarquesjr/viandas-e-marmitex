// Contexto da conversa: de quem a RO falou na resposta anterior. Serve para entender "e o telefone dela?", "o segundo",
// "e a outra Ingrid?" sem chutar. Puro (testado em tests/ro.test.ts). O texto vem do navegador, então só se aproveita o que
// segue o formato abaixo; qualquer outra coisa é descartada (nunca vai para a IA como instrução).

import type { Decisao } from './router';
import { normalizar, primeiroNome } from './text';

export interface ClienteCitado {
  posicao: number;
  nome: string;
  id: string;
}

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/** "Clientes citados: 1) Nome (id uuid); 2) Outro (id uuid)." */
export function montarContexto(clientes: { id: string; nome: string }[]): string | undefined {
  if (clientes.length === 0) return undefined;
  const limpos = clientes.slice(0, 15).map((c, i) => `${i + 1}) ${c.nome.replace(/[();]/g, ' ').replace(/\s+/g, ' ').trim()} (id ${c.id})`);
  return `Clientes citados: ${limpos.join('; ')}.`;
}

export function lerContexto(contexto?: string): ClienteCitado[] {
  if (!contexto) return [];
  const lista: ClienteCitado[] = [];
  const re = new RegExp(`(\\d{1,2})\\) ([^();]{1,120}?) \\(id (${UUID})\\)`, 'gi');
  for (const m of contexto.matchAll(re)) lista.push({ posicao: Number(m[1]), nome: m[2].trim(), id: m[3].toLowerCase() });
  return lista;
}

/** O que a IA enxerga do contexto: só o primeiro nome e o id, na ordem da tela. */
export function contextoParaIa(contexto?: string): string | undefined {
  const lista = lerContexto(contexto);
  if (lista.length === 0) return undefined;
  return `clientes citados na resposta, na ordem da tela: ${lista.map((c) => `${c.posicao}) ${primeiroNome(c.nome)} (id ${c.id})`).join('; ')}`;
}

const ORDINAIS = new Map<string, number>(Object.entries({ primeiro: 1, primeira: 1, segundo: 2, segunda: 2, terceiro: 3, terceira: 3, quarto: 4, quarta: 4, quinto: 5, quinta: 5, sexto: 6, sexta: 6 }));
const ULTIMO = new Set(['ultimo', 'ultima']);
const PRONOMES = new Set(['dele', 'dela', 'ele', 'ela', 'deles', 'delas']);
const OUTRO = new Set(['outro', 'outra', 'outros', 'outras']);
const ASSUNTO_DE_DADOS = new Set(['vendas', 'venda', 'vendi', 'vendeu', 'despesas', 'despesa', 'lucro', 'cardapio', 'feira', 'mes', 'semana', 'ano', 'hoje', 'ontem', 'amanha', 'pedidos', 'pedido', 'produtos', 'produto']);
const QUER_CONTATO = new Set(['telefone', 'fone', 'celular', 'whatsapp', 'zap', 'numero', 'contato', 'email', 'cadastro']);
const MIUDEZAS = new Set(['e', 'a', 'o', 'as', 'os', 'de', 'do', 'da', 'dos', 'das', 'um', 'uma', 'que', 'qual', 'quem', 'me', 'mostra', 'mostre', 'ver', 'ficha', 'saldo', 'quanto', 'deve', 'tem', 'tambem', 'agora', 'entao', 'ai', 'ro', 'cliente', 'pessoa', 'lista', 'da', 'na', 'no', 'pra', 'para', 'por', 'favor', 'sobrenome', 'com', 'tal', 'isso', 'esse', 'essa']);

const aviso = 'De qual cliente você está falando? Toque no certo.';

/**
 * Pergunta que só faz sentido com a resposta anterior ("e o telefone dela?", "o segundo", "e a outra Ingrid?").
 * Devolve o que fazer, ou `null` quando não é esse tipo de pergunta (o atalho normal ou a IA seguem).
 * Com mais de um cliente na tela e sem dizer qual, pergunta qual: nunca escolhe o primeiro por conta própria.
 */
export function resolverPeloContexto(pergunta: string, contexto?: string): Decisao | null {
  const citados = lerContexto(contexto);
  if (citados.length === 0) return null;
  const tokens = normalizar(pergunta).split(' ').filter(Boolean);
  if (tokens.length === 0 || tokens.length > 12) return null;
  if (tokens.some((t) => ASSUNTO_DE_DADOS.has(t))) return null;

  const ordinal = tokens.map((t) => ORDINAIS.get(t)).find((n) => n !== undefined);
  const ultimo = tokens.some((t) => ULTIMO.has(t));
  const pronome = tokens.some((t) => PRONOMES.has(t)) || /\b(esse|essa|este|esta|mesmo|mesma) (cliente|pessoa|cara|moca|senhora|homem)\b/.test(normalizar(pergunta));
  const outro = tokens.some((t) => OUTRO.has(t));
  if (ordinal === undefined && !ultimo && !pronome && !outro) return null;

  const querContato = tokens.some((t) => QUER_CONTATO.has(t));
  const verbo = querContato ? 'telefone' : 'ficha';
  const ir = (c: ClienteCitado): Decisao => ({ ferramenta: querContato ? 'buscar_cliente' : 'ficha_cliente', args: { cliente_id: c.id } });

  const esclarecer = (): Decisao => ({
    ferramenta: 'esclarecer',
    args: { pergunta: aviso, opcoes: citados.slice(0, 6).map((c) => ({ rotulo: c.nome, pergunta: `${verbo} do cliente ${c.nome} [id:${c.id}]` })) },
  });

  if (outro) {
    // "e a outra Ingrid?": sobrou um nome, procura por ele
    const sobras = tokens.filter((t) => !OUTRO.has(t) && !MIUDEZAS.has(t) && !QUER_CONTATO.has(t) && !PRONOMES.has(t) && !ORDINAIS.has(t) && !ULTIMO.has(t));
    if (sobras.length > 0 && sobras.length <= 3) return { ferramenta: 'buscar_cliente', args: { consulta: sobras.join(' ') } };
    return citados.length >= 2 ? esclarecer() : null;
  }
  if (ordinal !== undefined || ultimo) {
    const alvo = ultimo ? citados[citados.length - 1] : citados.find((c) => c.posicao === ordinal);
    return alvo ? ir(alvo) : null;
  }
  return citados.length === 1 ? ir(citados[0]) : esclarecer();
}
