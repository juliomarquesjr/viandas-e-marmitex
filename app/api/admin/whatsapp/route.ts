import { requireAdmin } from '@/lib/staff-session';
import { getStatus } from '@/lib/whatsapp-service';
import { NextResponse } from 'next/server';

// GET - Estado do WhatsApp do estabelecimento (pergunta à Evolution; só administrador)
export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  try {
    return NextResponse.json(await getStatus(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error loading WhatsApp status:', error);
    return NextResponse.json({ error: 'Erro ao buscar o estado do WhatsApp' }, { status: 500 });
  }
}
