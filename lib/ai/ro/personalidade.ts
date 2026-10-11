// O toque de humor da RO ("Pronto, saiu do fogão:"). Puro, testado em tests/ro-busca.test.ts.

import type { FerramentaSaida } from './tools';

const ABRE_COM_DADOS = ['Pronto, saiu do fogão:', 'Olha o que a panela trouxe:', 'Aqui está, quentinho:', 'Separei para você:'];

/** Ferramentas cujo resultado é uma lista ou um número (nas de cliente a própria frase já começa com "Achei:"). */
const COM_ABERTURA = new Set(['vendas', 'clientes_devendo', 'clientes_credito', 'clientes_inativos', 'clientes_top', 'produtos_mais_vendidos', 'pedidos_em_aberto', 'despesas', 'lucro', 'whatsapp_nao_lidas']);

/** O toque de humor só entra quando há dados de verdade: nunca em pergunta, em resultado vazio ou em recusa. */
export function comPersonalidade(saida: FerramentaSaida, tom: 'divertida' | 'direta', ferramenta: string, sorteio: number = Math.random()): string {
  if (tom !== 'divertida' || !COM_ABERTURA.has(ferramenta)) return saida.mensagem;
  if (sorteio > 0.55) return saida.mensagem;
  if (saida.blocos.length === 0) return saida.mensagem;
  if (/^(Não|Nenhum|Nenhuma|Ninguém|Todo|Isso|Escreva|De qual|Qual)/.test(saida.mensagem)) return saida.mensagem;
  if (saida.blocos.some((b) => b.tipo === 'opcoes') || /\?\s*$/.test(saida.mensagem.trim())) return saida.mensagem;
  return `${ABRE_COM_DADOS[Math.floor(sorteio * 100) % ABRE_COM_DADOS.length]} ${saida.mensagem}`;
}
