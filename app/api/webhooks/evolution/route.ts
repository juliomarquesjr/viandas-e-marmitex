import { instanceName } from '@/lib/evolution';
import { mapEvolutionState, numberFromJid } from '@/lib/whatsapp-rules';
import { recordState } from '@/lib/whatsapp-service';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

// POST - A Evolution avisa quando a conexão muda. Protegido por um segredo no cabeçalho
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
    data?: { instance?: string; state?: string; connection?: string; wuid?: string; ownerJid?: string };
  } | null;
  if (!payload) return NextResponse.json({ ok: true });

  const event = String(payload.event ?? '').toLowerCase().replace(/_/g, '.');
  const name = payload.instance ?? payload.data?.instance;
  // só o que é da nossa instância e é mudança de conexão
  if (event !== 'connection.update' || name !== instanceName()) return NextResponse.json({ ok: true });

  const state = mapEvolutionState(payload.data?.state ?? payload.data?.connection);
  if (state === 'unknown') return NextResponse.json({ ok: true });

  try {
    await recordState(state, { number: numberFromJid(payload.data?.wuid ?? payload.data?.ownerJid) });
  } catch (error) {
    console.error('Error recording WhatsApp webhook:', error);
    return NextResponse.json({ error: 'Erro ao registrar' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
