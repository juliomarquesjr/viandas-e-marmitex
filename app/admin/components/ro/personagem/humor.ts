// Qual expressão a RO faz em cada momento da conversa. Funções puras (testadas em tests/ro-humor.test.ts).

import type { RoBloco, RoErro } from "@/lib/ai/ro/types";
import type { RoEstado } from "./estados";

const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const CONTAS = /\b(vend[aeoi]\w*|lucr\w*|despes\w*|gast\w*|caixa|fatur\w*|receb\w*|ticket|pix|dinheiro|balanc\w*|fechamento|resumo|quanto (vendi|ganhei|gastei|entrou|saiu|sobrou))\b/;
const FICHA = /\b(deve\w*|devedor\w*|fiado|ficha|saldo|credito|pendur\w*|inadimpl\w*|divida\w*)\b/;
const BUSCA = /\b(cliente|telefone|cadastro|procur\w*|ach[aeo]\w*|numero|whatsapp|zap)\b/;

/** O que a RO faz enquanto a resposta não chega (a pergunta diz o tipo de trabalho; o tempo diz se está demorando). */
export function estadoDoCarregamento(pergunta: string, segundos: number): RoEstado {
  if (segundos >= 20) return "demorando";
  const t = sem(pergunta);
  if (CONTAS.test(t)) return "calculando";
  if (FICHA.test(t)) return "conferindo";
  if (segundos >= 6 || BUSCA.test(t)) return "procurando";
  // um nome solto ("ingrid", "dona maria") é busca de cliente
  const palavras = t.trim().split(/\s+/).filter(Boolean);
  if (palavras.length <= 3 && !/\d{4,}/.test(t)) return "procurando";
  return "pensando";
}

export interface RespostaParaHumor {
  content: string;
  erro?: RoErro;
  parada?: boolean;
  blocos?: RoBloco[];
}

const RECUSA = /(isso eu nao faco|so consulto|so consulta|nao altero|nao posso alterar|nao consigo alterar|nao mexo)/;
const NAO_ACHOU = /^(nao achei|nao encontrei|nenhum[a]? |procurei e nao)/;

/** A expressão logo depois da resposta, ou null quando a RO deve só voltar a esperar. */
export function estadoDaResposta(r: RespostaParaHumor): RoEstado | null {
  if (r.parada) return null;
  if (r.erro) {
    if (r.erro.codigo === "cota" || r.erro.codigo === "limite") return "descansando";
    if (["desligada", "permissao", "login", "pedido"].includes(r.erro.codigo)) return null;
    return "preocupada";
  }
  const t = sem(r.content).trim();
  if (RECUSA.test(t)) return "recusando";
  const temCartoes = (r.blocos ?? []).some((b) => b.tipo === "clientes" && b.itens.length > 0);
  if (NAO_ACHOU.test(t) && !temCartoes) return "confusa";
  return "feliz";
}

/** Quanto tempo (ms) a expressão da resposta fica antes de a RO voltar a esperar. Sem valor = fica até a pessoa agir. */
export const HUMOR_DURACAO_MS: Partial<Record<RoEstado, number>> = { feliz: 3600, confusa: 4200, recusando: 4200 };
