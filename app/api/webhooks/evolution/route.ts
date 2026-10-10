import { instanceName } from '@/lib/evolution';
import { mapEvolutionState, numberFromJid } from '@/lib/whatsapp-rules';
import { recordState } from '@/lib/whatsapp-service';
import { applyStatus, handleWebhookMessage } from '@/lib/whatsapp-chat-service';
import { chatStatusFrom, parseWebhookMessage } from '@/lib/whatsapp-chat';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

// POST - A Evolution avisa quando a conexão muda e a cada mensagem (conversas). Protegido por um segredo no cabeçalho
// `x-webhook-secret` (configurado na instância ao conectar).

function secretMatches(received: string | null): boolean {
  const expected = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!secretMatches(request.headers.get('x-webhook-secret'))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    event?: string;
    instance?: string;
    data?: Record<string, unknown> | Record<string, unknown>[];
  } | null;
  if (!payload) return NextResponse.json({ ok: true });

  const event = String(payload.event ?? '').toLowerCase().replace(/_/g, '.');
  const name = payload.instance ?? (Array.isArray(payload.data) ? undefined : (payload.data?.instance as string | undefined));
  // só o que é da nossa instância
  if (name !== instanceName()) return NextResponse.json({ ok: true });

  // conversas: mensagem recebida, enviada (inclusive pelo celular) e confirmações de entrega/leitura
  if (event === 'messages.upsert' || event === 'send.message') {
    const items = Array.isArray(payload.data) ? payload.data : [payload.data];
    try {
      for (const item of items) {
        const parsed = parseWebhookMessage(item);
        if (parsed) await handleWebhookMessage(parsed);
      }
    } catch (error) {
      console.error('Error recording WhatsApp message:', error);
      return NextResponse.json({ error: 'Erro ao registrar' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }
  if (event === 'messages.update') {
    const items = Array.isArray(payload.data) ? payload.data : [payload.data];
    try {
      for (const item of items) {
        const d = (item ?? {}) as { keyId?: string; messageId?: string; key?: { id?: string }; status?: unknown };
        const status = chatStatusFrom(d.status);
        const id = d.keyId ?? d.key?.id ?? d.messageId;
        if (status && id) await applyStatus(id, status);
      }
    } catch (error) {
      console.error('Error applying WhatsApp message status:', error);
    }
    return NextResponse.json({ ok: true });
  }

  const data = (Array.isArray(payload.data) ? {} : payload.data ?? {}) as { state?: string; connection?: string; wuid?: string; ownerJid?: string };
  if (event !== 'connection.update') return NextResponse.json({ ok: true });

  const state = mapEvolutionState(data.state ?? data.connection);
  if (state === 'unknown') return NextResponse.json({ ok: true });

  try {
    await recordState(state, { number: numberFromJid(data.wuid ?? data.ownerJid) });
  } catch (error) {
    console.error('Error recording WhatsApp webhook:', error);
    return NextResponse.json({ error: 'Erro ao registrar' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
