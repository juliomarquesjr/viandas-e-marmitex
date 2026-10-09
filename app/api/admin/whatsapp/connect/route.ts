import { EvolutionError } from '@/lib/evolution';
import { requireAdmin } from '@/lib/staff-session';
import { describeWhatsAppError, startConnection } from '@/lib/whatsapp-service';
import { NextResponse } from 'next/server';

// POST - Começa ou retoma a conexão: devolve um QR code novo (ou o código de pareamento, se vier `phone`)
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const body = (await request.json().catch(() => null)) as { phone?: unknown } | null;
  const phone = typeof body?.phone === 'string' && body.phone.trim() ? body.phone : undefined;

  try {
    return NextResponse.json(await startConnection({ phone }), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (!(error instanceof EvolutionError) || error.code !== 'bad_request') console.error('Error starting WhatsApp connection:', error);
    const status = error instanceof EvolutionError && error.code === 'bad_request' ? 400 : 502;
    return NextResponse.json({ error: describeWhatsAppError(error) }, { status });
  }
}
