import { getCustomerSession } from '@/lib/customer-auth';
import { dismissedAmong } from '@/lib/customer-dismissals';
import { getCustomerBalance } from '@/lib/customer-balance';
import { createNotification } from '@/lib/notifications';
import { publishToStaff } from '@/lib/realtime';
import {
  PAYMENT_INTENT_MAX_PENDING,
  PAYMENT_INTENT_MIN_CENTS,
  PAYMENT_INTENT_VISIBLE_HOURS,
  type CreatePaymentIntentResponse,
  type CustomerPaymentIntentDTO,
  type CustomerPaymentIntentsResponse,
  type PaymentIntentStatus,
} from '@/lib/notification-types';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Uma intenção igual (mesmo valor) aguardando há menos que isso conta como o mesmo toque
const DUPLICATE_WINDOW_MS = 15 * 60 * 1000;

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

type IntentRow = {
  id: string;
  status: string;
  amountCents: number;
  confirmedAmountCents: number | null;
  rejectionReason: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
};

const select = {
  id: true,
  status: true,
  amountCents: true,
  confirmedAmountCents: true,
  rejectionReason: true,
  createdAt: true,
  reviewedAt: true,
} as const;

function toDTO(intent: IntentRow): CustomerPaymentIntentDTO {
  return {
    id: intent.id,
    status: intent.status as PaymentIntentStatus,
    amountCents: intent.amountCents,
    confirmedAmountCents: intent.confirmedAmountCents,
    rejectionReason: intent.rejectionReason,
    createdAt: intent.createdAt.toISOString(),
    reviewedAt: intent.reviewedAt?.toISOString() ?? null,
  };
}

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
    const amountCents = body.amountCents;
    const customerId = session.user.customerId;

    if (!Number.isInteger(amountCents) || amountCents < PAYMENT_INTENT_MIN_CENTS) {
      return NextResponse.json({ error: 'Informe um valor de pelo menos R$ 1,00.' }, { status: 400 });
    }

    const { balanceCents } = await getCustomerBalance(customerId);
    if (balanceCents <= 0) {
      return NextResponse.json({ error: 'Sua ficha não tem saldo a pagar.' }, { status: 409 });
    }
    if (amountCents > balanceCents) {
      return NextResponse.json({ error: `O valor não pode passar do saldo da ficha, ${brl.format(balanceCents / 100)}.` }, { status: 400 });
    }

    const pending = await prisma.paymentIntent.findMany({
      where: { customerId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      select,
    });

    // Mesmo valor logo em seguida: o cliente tocou duas vezes, não pagou duas vezes
    const repeat = pending.find((p) => p.amountCents === amountCents && Date.now() - p.createdAt.getTime() < DUPLICATE_WINDOW_MS);
    if (repeat) {
      const response: CreatePaymentIntentResponse = { intent: toDTO(repeat), duplicate: true };
      return NextResponse.json(response);
    }

    if (pending.length >= PAYMENT_INTENT_MAX_PENDING) {
      return NextResponse.json(
        { error: 'Você já tem pagamentos aguardando confirmação. Assim que forem conferidos, você pode informar outro.' },
        { status: 429 }
      );
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { name: true } });

    const intent = await prisma.$transaction(async (tx) => {
      const created = await tx.paymentIntent.create({
        data: { customerId, amountCents, balanceCents },
        select,
      });
      await createNotification(
        {
          type: 'payment_intent',
          title: `${customer?.name ?? 'Um cliente'} informou um pagamento`,
          message: `PIX de ${brl.format(amountCents / 100)}. Saldo da ficha: ${brl.format(balanceCents / 100)}. Confira no banco e confirme.`,
          customerId,
          refType: 'PaymentIntent',
          refId: created.id,
        },
        tx
      );
      return created;
    });

    // O sino do admin mostra o aviso na hora, sem esperar a próxima consulta
    await publishToStaff('notification.changed', { id: intent.id });

    const response: CreatePaymentIntentResponse = { intent: toDTO(intent), duplicate: false };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ error: 'Não foi possível avisar o estabelecimento agora. Tente de novo.' }, { status: 500 });
  }
}
