import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/staff-session';
import { ensureChatWebhook, listConversations, unreadTotal } from '@/lib/whatsapp-chat-service';

// GET ?q=&filter=all|unread|awaiting - Conversas com clientes (só administrador: é conversa de clientes)
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const params = new URL(request.url).searchParams;
  const filter = params.get('filter');
  try {
    void ensureChatWebhook(); // garante que a Evolution avise as mensagens (uma vez por versão)
    const [conversations, unread] = await Promise.all([
      listConversations({ q: params.get('q') ?? undefined, filter: filter === 'unread' || filter === 'awaiting' ? filter : 'all' }),
      unreadTotal(),
    ]);
    return NextResponse.json({ conversations, unread }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error listing WhatsApp conversations:', error);
    return NextResponse.json({ error: 'Erro ao carregar as conversas' }, { status: 500 });
  }
}
