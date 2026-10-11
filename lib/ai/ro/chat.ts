// Orquestra uma pergunta: atalho sem IA quando dá, senão a IA escolhe a ferramenta; a ferramenta responde.

import type { Content } from '@google/generative-ai';
import { dateStringSP } from '@/lib/date-range';
import { contextoParaIa, resolverPeloContexto } from './contexto';
import { decidir, RoErroIa } from './gemini';
import { comPersonalidade } from './personalidade';
import { rotearRapido, type Decisao } from './router';
import { ajuda, executarFerramenta, type FerramentaSaida } from './tools';
import type { RoBloco, RoMensagemEntrada, RoResposta } from './types';

const MAX_PERGUNTA = 600;
const MAX_HISTORICO = 6;

function paraHistorico(mensagens: RoMensagemEntrada[]): Content[] {
  const recorte = mensagens.slice(-MAX_HISTORICO);
  // a primeira mensagem do histórico precisa ser do usuário
  while (recorte.length && recorte[0].role !== 'user') recorte.shift();
  return recorte.map((m) => {
    // só o que segue o formato conhecido do contexto chega à IA (primeiro nome e id): texto solto vindo do navegador nunca vai
    const ctx = m.role === 'assistant' ? contextoParaIa(m.contexto) : undefined;
    return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: ctx ? `${m.content}\n[${ctx}]` : m.content }] };
  });
}

const textoDe = (v: unknown) => (typeof v === 'string' ? v : '');

export async function responder(entrada: { mensagens: RoMensagemEntrada[]; tom: 'divertida' | 'direta' }): Promise<RoResposta> {
  const inicio = performance.now();
  const ultima = entrada.mensagens[entrada.mensagens.length - 1];
  const pergunta = ultima.content.trim().slice(0, MAX_PERGUNTA);
  const meta = (origem: RoResposta['meta']['origem'], ferramentas: string[], modelo?: string): RoResposta['meta'] => ({ ms: Math.round(performance.now() - inicio), ferramentas, origem, modelo });

  const hoje = dateStringSP();
  const anterior = entrada.mensagens.length >= 2 ? entrada.mensagens[entrada.mensagens.length - 2] : undefined;
  // "e o telefone dela?", "o segundo", "e a outra Ingrid?": resolvido pela resposta anterior, sem chutar o primeiro da lista
  const atalho: Decisao | null = resolverPeloContexto(pergunta, anterior?.role === 'assistant' ? anterior.contexto : undefined) ?? rotearRapido(pergunta, { hoje, temConversa: entrada.mensagens.length > 1 });

  if (atalho?.fixo) return { mensagem: atalho.fixo, blocos: [], meta: meta('fixa', []) };

  if (atalho) {
    let saida = await executarFerramenta(atalho.ferramenta, atalho.args);
    let usadas = [atalho.ferramenta as string];
    const consulta = textoDe(atalho.args.consulta);

    // nome solto que não é cliente nenhum: talvez seja um produto
    if (atalho.nomeSolto && atalho.ferramenta === 'buscar_cliente' && saida.blocos.length === 0 && consulta.replace(/\s/g, '').length >= 3) {
      const produtos = await executarFerramenta('produto_buscar', { consulta });
      if (produtos.blocos.length > 0) {
        saida = { mensagem: `Não achei cliente com **${consulta}**, mas achei produto:`, blocos: produtos.blocos };
        usadas = ['buscar_cliente', 'produto_buscar'];
      }
    }
    // "tem frango?" que não é produto nenhum: talvez seja um cliente
    if (atalho.clienteSeVazio && saida.blocos.length === 0) {
      const cliente = await executarFerramenta('buscar_cliente', { consulta });
      if (cliente.blocos.length > 0) {
        saida = cliente;
        usadas = ['produto_buscar', 'buscar_cliente'];
      }
    }

    // frase com várias palavras que parecia um nome mas não bateu com ninguém: a IA tenta entender; se não puder, vale a resposta guiada
    if (atalho.nomeSolto && saida.incerta && consulta.split(' ').length >= 2) {
      try {
        const viaIa = await executarViaIa(pergunta, entrada, hoje, meta);
        if (viaIa) return viaIa;
      } catch (error) {
        if (!(error instanceof RoErroIa)) throw error;
      }
    }
    return { mensagem: comPersonalidade(saida, entrada.tom, atalho.ferramenta), blocos: saida.blocos, contexto: saida.contexto, meta: meta('regra', usadas) };
  }

  const viaIa = await executarViaIa(pergunta, entrada, hoje, meta);
  if (viaIa) return viaIa;
  const a = ajuda();
  return { mensagem: `Não entendi bem a pergunta. ${a.mensagem}`, blocos: [], meta: meta('ia', []) };
}

async function executarViaIa(
  pergunta: string,
  entrada: { mensagens: RoMensagemEntrada[]; tom: 'divertida' | 'direta' },
  hoje: string,
  meta: (origem: RoResposta['meta']['origem'], ferramentas: string[], modelo?: string) => RoResposta['meta'],
): Promise<RoResposta | null> {
  const decisao = await decidir({ historico: paraHistorico(entrada.mensagens.slice(0, -1)), mensagem: pergunta, hoje, tom: entrada.tom });

  if (decisao.chamadas.length === 0) {
    if (decisao.texto) return { mensagem: decisao.texto.slice(0, 1500), blocos: [], meta: meta('ia', [], decisao.modelo) };
    return null;
  }

  const partes: string[] = [];
  const blocos: RoBloco[] = [];
  const contextos: string[] = [];
  const usadas: string[] = [];
  // a IA escreve uma frase só quando não dá para atender o pedido por inteiro ("não separo por dia da semana, mas...")
  const aviso = decisao.texto.trim();
  if (aviso && aviso.length <= 300) partes.push(aviso);
  for (const chamada of decisao.chamadas.slice(0, 2)) {
    const saida = await executarFerramenta(chamada.nome, chamada.args);
    usadas.push(chamada.nome);
    partes.push(usadas.length === 1 && partes.length === 0 ? comPersonalidade(saida, entrada.tom, chamada.nome) : saida.mensagem);
    blocos.push(...saida.blocos);
    if (saida.contexto) contextos.push(saida.contexto);
  }
  return { mensagem: partes.join('\n\n'), blocos: blocos.slice(0, 6), contexto: contextos[0], meta: meta('ia', usadas, decisao.modelo) };
}
