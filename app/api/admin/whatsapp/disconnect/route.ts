import { requireAdmin } from '@/lib/staff-session';
import { describeWhatsAppError, disconnect } from '@/lib/whatsapp-service';
import { NextResponse } from 'next/server';

// POST - Desconecta o número (de propósito: o aviso automático de queda fica desligado)
export async function POST() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  try {
    await disconnect();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
    return NextResponse.json({ error: describeWhatsAppError(error) }, { status: 502 });
  }
}
