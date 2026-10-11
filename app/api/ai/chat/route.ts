import { NextRequest, NextResponse } from 'next/server';

import { responder } from '@/lib/ai/ro/chat';
import { RoErroIa } from '@/lib/ai/ro/gemini';
import { lerConfiguracoes } from '@/lib/ai/ro/settings';
import type { RoErro, RoMensagemEntrada } from '@/lib/ai/ro/types';
import { checkUserRateLimit } from '@/lib/rate-limit';
import { requireAdmin } from '@/lib/staff-session';
import { dateStringSP } from '@/lib/date-range';

// POST - Pergunta à RO. Só administrador. A IA escolhe uma ferramenta pronta (lib/ai/ro/tools.ts): nenhuma SQL vem dela.
// Resposta: RoResposta; erro: { erro: RoErro } com o status HTTP correspondente.

const MAX_MENSAGENS = 12;
const MAX_TEXTO = 1500;

const usoDiario = new Map<string, number>();

const falha = (erro: RoErro, status: number) => NextResponse.json({ erro }, { status, headers: erro.tentarEm ? { 'Retry-After': String(erro.tentarEm) } : undefined });

function limparMensagens(bruto: unknown): RoMensagemEntrada[] {
  if (!Array.isArray(bruto)) return [];
  const lista: RoMensagemEntrada[] = [];
  for (const m of bruto) {
    if (!m || typeof m !== 'object') continue;
    const { role, content, contexto } = m as { role?: unknown; content?: unknown; contexto?: unknown };
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || !content.trim()) continue;
    lista.push({ role, content: content.trim().slice(0, MAX_TEXTO), contexto: typeof contexto === 'string' ? contexto.slice(0, 600) : undefined });
  }
  return lista.slice(-MAX_MENSAGENS);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    const status = auth.error.status;
    return falha(status === 401 ? { codigo: 'login', mensagem: 'Entre no sistema para falar com a RO.' } : { codigo: 'permissao', mensagem: 'A RO é só para o administrador.' }, status);
  }

  const config = await lerConfiguracoes();
  if (!config.ligada) return falha({ codigo: 'desligada', mensagem: 'A RO está desligada nas configurações.' }, 403);

  const usuario = auth.staff.userId;
  if (!checkUserRateLimit(`ro:${usuario}`, 40, 10 * 60 * 1000).allowed) {
    return falha({ codigo: 'limite', mensagem: 'Muitas perguntas em pouco tempo. Espere alguns minutos e tente de novo.', tentarEm: 120 }, 429);
  }
  const chaveDia = `${usuario}:${dateStringSP()}`;
  const usadas = usoDiario.get(chaveDia) ?? 0;
  if (usadas >= config.limiteDiario) {
    return falha({ codigo: 'limite', mensagem: `Você chegou ao limite de ${config.limiteDiario} perguntas de hoje. Amanhã a RO volta, ou o limite pode ser aumentado em Configurações.` }, 429);
  }

  const corpo = await req.json().catch(() => null);
  const mensagens = limparMensagens((corpo as { messages?: unknown } | null)?.messages);
  if (mensagens.length === 0 || mensagens[mensagens.length - 1].role !== 'user') {
    return falha({ codigo: 'pedido', mensagem: 'Escreva uma pergunta.' }, 400);
  }

  try {
    usoDiario.set(chaveDia, usadas + 1);
    if (usoDiario.size > 500) for (const k of usoDiario.keys()) if (!k.endsWith(dateStringSP())) usoDiario.delete(k);
    const resposta = await responder({ mensagens, tom: config.tom });
    return NextResponse.json(resposta, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // pergunta que falhou por culpa da IA não conta no limite do dia
    usoDiario.set(chaveDia, usadas);
    if (error instanceof RoErroIa) return falha(error.erro, error.status);
    console.error('[RO][ERRO]', error);
    return falha({ codigo: 'interno', mensagem: 'Tive um problema para consultar os dados. Tente de novo; se continuar, avise o suporte.' }, 500);
  }
}
