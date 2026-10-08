import { NextResponse } from 'next/server';
import { getRealtimeClient, STAFF_NOTIFICATIONS_CHANNEL } from '@/lib/realtime';
import { requireStaff } from '@/lib/staff-session';

const TOKEN_TTL_MS = 60 * 60 * 1000;

// GET - Token do Ably para o funcionário (admin ou PDV) ouvir o canal de notificações
//
// Só emite com sessão de funcionário: cliente logado recebe 401/403. O token só permite ASSINAR
// staff:notifications (não publica) e vale 1 hora; o navegador pede outro antes de vencer.
// Sem chave configurada: 204, e o sino segue só com o polling.
export async function GET() {
  try {
    const auth = await requireStaff();
    if ('error' in auth) return auth.error;

    const rest = getRealtimeClient();
    if (!rest) {
      return new NextResponse(null, { status: 204 });
    }

    const details = await rest.auth.requestToken({
      clientId: `staff:${auth.staff.userId}`,
      capability: JSON.stringify({ [STAFF_NOTIFICATIONS_CHANNEL]: ['subscribe'] }),
      ttl: TOKEN_TTL_MS,
    });

    return NextResponse.json(
      { token: details.token, expires: details.expires, channel: STAFF_NOTIFICATIONS_CHANNEL },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error creating staff realtime token:', error);
    return NextResponse.json({ error: 'Erro ao gerar token' }, { status: 500 });
  }
}
