import { NextResponse } from 'next/server';
import { getCustomerSession } from '@/lib/customer-auth';
import { customerChannel, getRealtimeClient } from '@/lib/realtime';

const TOKEN_TTL_MS = 60 * 60 * 1000;

// GET - Token do Ably para o cliente autenticado ouvir o próprio canal
//
// O token só permite ASSINAR customer:{id} do próprio cliente (não publica, não ouve outro canal)
// e vale 1 hora; o navegador pede outro antes de vencer. Sem chave configurada: 204, e a tela
// continua só com o polling.
export async function GET() {
  try {
    const session = await getCustomerSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const rest = getRealtimeClient();
    if (!rest) {
      return new NextResponse(null, { status: 204 });
    }

    const customerId = session.user.customerId;
    const channel = customerChannel(customerId);
    const details = await rest.auth.requestToken({
      clientId: customerId,
      capability: JSON.stringify({ [channel]: ['subscribe'] }),
      ttl: TOKEN_TTL_MS,
    });

    return NextResponse.json(
      { token: details.token, expires: details.expires, channel },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error creating realtime token:', error);
    return NextResponse.json({ error: 'Erro ao gerar token' }, { status: 500 });
  }
}
