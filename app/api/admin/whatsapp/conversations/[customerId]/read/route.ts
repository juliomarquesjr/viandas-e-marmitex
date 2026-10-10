import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/staff-session';
import { markConversationRead } from '@/lib/whatsapp-chat-service';

// POST - Marca as mensagens recebidas deste cliente como lidas
export async function POST(_request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { customerId } = await params;
  try {
    await markConversationRead(customerId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    return NextResponse.json({ error: 'Erro ao marcar como lida' }, { status: 500 });
  }
}
