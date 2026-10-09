import { connectionState, instanceName, isEvolutionConfigured } from '@/lib/evolution';
import { recordState } from '@/lib/whatsapp-service';
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

// GET - Checagem diária da conexão (Vercel Cron). A Vercel manda `Authorization: Bearer $CRON_SECRET`.

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!isEvolutionConfigured()) return NextResponse.json({ ok: true, skipped: 'not_configured' });
  try {
    const state = await connectionState(instanceName());
    await recordState(state);
    return NextResponse.json({ ok: true, state });
  } catch (error) {
    // instância inexistente ou Evolution fora do ar: não é erro do cron
    return NextResponse.json({ ok: true, skipped: error instanceof Error ? error.name : 'error' });
  }
}
