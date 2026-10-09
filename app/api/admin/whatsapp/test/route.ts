import { EvolutionError } from '@/lib/evolution';
import { requireAdmin } from '@/lib/staff-session';
import { describeWhatsAppError, sendTestMessage } from '@/lib/whatsapp-service';
import { NextResponse } from 'next/server';

// POST - Manda uma mensagem de teste para o próprio número conectado
export async function POST() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  try {
    return NextResponse.json({ ok: true, ...(await sendTestMessage()) });
  } catch (error) {
    const status = error instanceof EvolutionError && error.code === 'bad_request' ? 409 : 502;
    if (status === 502) console.error('Error sending WhatsApp test:', error);
    return NextResponse.json({ error: describeWhatsAppError(error) }, { status });
  }
}
