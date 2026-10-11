// Orquestra uma pergunta: atalho sem IA quando dá, senão a IA escolhe a ferramenta; a ferramenta responde.

import type { Content } from '@google/generative-ai';
import { dateStringSP } from '@/lib/date-range';
import { decidir } from './gemini';
import { rotearRapido } from './router';
import { ajuda, executarFerramenta, type FerramentaSaida } from './tools';
import type { RoBloco, RoMensagemEntrada, RoResposta } from './types';

const MAX_PERGUNTA = 600;
const MAX_HISTORICO = 6;

const ABRE_COM_DADOS = ['Pronto, saiu do fogão:', 'Olha o que a panela trouxe:', 'Aqui está, quentinho:', 'Separei para você:'];
const ABRE_SEM_DADOS = ['A panela ficou vazia desta vez.', 'Procurei e não achei nada.'];

const sortear = <T,>(lista: T[]): T => lista[Math.floor(Math.random() * lista.length)];

function comPersonalidade(saida: FerramentaSaida, tom: 'divertida' | 'direta', ferramenta: string): string {
  if (tom !== 'divertida' || ['ajuda', 'esclarecer', 'cardapio'].includes(ferramenta)) return saida.mensagem;
  if (Math.random() > 0.55) return saida.mensagem;
  const vazio = /^(Não achei|Nenhum|Nenhuma|Não há|Não houve|Ninguém)/.test(saida.mensagem);
  return `${sortear(vazio ? ABRE_SEM_DADOS : ABRE_COM_DADOS)} ${saida.mensagem}`;
}

function paraHistorico(mensagens: RoMensagemEntrada[]): Content[] {
  const recorte = mensagens.slice(-MAX_HISTORICO);
  // a primeira mensagem do histórico precisa ser do usuário
  while (recorte.length && recorte[0].role !== 'user') recorte.shift();
  return recorte.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.role === 'assistant' && m.contexto ? `${m.content}\n[contexto: ${m.contexto}]` : m.content }],
  }));
}

export async function responder(entrada: { mensagens: RoMensagemEntrada[]; tom: 'divertida' | 'direta' }): Promise<RoResposta> {
  const inicio = performance.now();
  const ultima = entrada.mensagens[entrada.mensagens.length - 1];
  const pergunta = ultima.content.trim().slice(0, MAX_PERGUNTA);
  const meta = (origem: RoResposta['meta']['origem'], ferramentas: string[], modelo?: string): RoResposta['meta'] => ({ ms: Math.round(performance.now() - inicio), ferramentas, origem, modelo });

  const atalho = rotearRapido(pergunta);

  if (atalho?.fixo) return { mensagem: atalho.fixo, blocos: [], meta: meta('fixa', []) };

  if (atalho) {
    let saida = await executarFerramenta(atalho.ferramenta, atalho.args);
    let usadas = [atalho.ferramenta as string];
    // nome solto que não é cliente nenhum: talvez seja um produto
    if (atalho.nomeSolto && atalho.ferramenta === 'buscar_cliente' && saida.blocos.length === 0) {
      const produtos = await executarFerramenta('produto_buscar', { consulta: atalho.args.consulta });
      if (produtos.blocos.length > 0) {
        saida = { mensagem: `Não achei cliente com **${String(atalho.args.consulta)}**, mas achei produto:`, blocos: produtos.blocos };
        usadas = ['buscar_cliente', 'produto_buscar'];
      }
    }
    return { mensagem: comPersonalidade(saida, entrada.tom, atalho.ferramenta), blocos: saida.blocos, contexto: saida.contexto, meta: meta('regra', usadas) };
  }

  const decisao = await decidir({ historico: paraHistorico(entrada.mensagens.slice(0, -1)), mensagem: pergunta, hoje: dateStringSP(), tom: entrada.tom });

  if (decisao.chamadas.length === 0) {
    if (decisao.texto) return { mensagem: decisao.texto.slice(0, 1500), blocos: [], meta: meta('ia', [], decisao.modelo) };
    const a = ajuda();
    return { mensagem: `Não entendi bem a pergunta. ${a.mensagem}`, blocos: [], meta: meta('ia', [], decisao.modelo) };
  }

  const partes: string[] = [];
  const blocos: RoBloco[] = [];
  const contextos: string[] = [];
  const usadas: string[] = [];
  for (const chamada of decisao.chamadas.slice(0, 2)) {
    const saida = await executarFerramenta(chamada.nome, chamada.args);
    usadas.push(chamada.nome);
    partes.push(usadas.length === 1 ? comPersonalidade(saida, entrada.tom, chamada.nome) : saida.mensagem);
    blocos.push(...saida.blocos);
    if (saida.contexto) contextos.push(saida.contexto);
  }
  return { mensagem: partes.join('\n\n'), blocos: blocos.slice(0, 6), contexto: contextos.join(' ') || undefined, meta: meta('ia', usadas, decisao.modelo) };
}
