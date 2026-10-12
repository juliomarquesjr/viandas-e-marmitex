import { getCustomerSession } from '@/lib/customer-auth';
import { dismissedAmong } from '@/lib/customer-dismissals';
import { intentSelect as select, intentToDTO as toDTO, registerPaymentIntent } from '@/lib/payment-intent-service';
import { PAYMENT_INTENT_VISIBLE_HOURS, type CustomerPaymentIntentsResponse } from '@/lib/notification-types';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET - Intenções aguardando revisão e as revisadas nos últimos dias, para o cliente acompanhar
export async function GET() {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const since = new Date(Date.now() - PAYMENT_INTENT_VISIBLE_HOURS * 60 * 60 * 1000);
    const intents = await prisma.paymentIntent.findMany({
      where: {
        customerId: session.user.customerId,
        OR: [{ status: 'pending' }, { reviewedAt: { gte: since } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select,
    });

    // Cartões revisados que o cliente dispensou (em qualquer aparelho) não voltam
    const dismissed = await dismissedAmong(
      session.user.customerId,
      intents.filter((i) => i.status !== 'pending').map((i) => `intent:${i.id}`)
    );
    const visible = intents.filter((i) => i.status === 'pending' || !dismissed.has(`intent:${i.id}`));

    const response: CustomerPaymentIntentsResponse = { intents: visible.map(toDTO) };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error listing customer payment intents:', error);
    return NextResponse.json({ error: 'Erro ao buscar seus pagamentos' }, { status: 500 });
  }
}

// POST - O cliente informa que pagou a ficha por PIX. { amountCents }
// Isso não altera o saldo: só avisa o estabelecimento, que confere no banco e confirma.
export async function POST(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) ?? {};
    const result = await registerPaymentIntent(session.user.customerId, body.amountCents);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ error: 'Não foi possível avisar o estabelecimento agora. Tente de novo.' }, { status: 500 });
  }
}
