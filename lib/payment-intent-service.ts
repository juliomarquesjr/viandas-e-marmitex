// "Já paguei": o cliente avisa o estabelecimento de um PIX. Não altera o saldo; o operador confere no banco e confirma.
// Usado pela área do cliente (logado) e pela página do link de pagamento (sem login): os dois geram o mesmo aviso.

import { getCustomerBalance } from '@/lib/customer-balance';
import { createNotification } from '@/lib/notifications';
import {
  PAYMENT_INTENT_MAX_PENDING,
  PAYMENT_INTENT_MIN_CENTS,
  type CreatePaymentIntentResponse,
  type CustomerPaymentIntentDTO,
  type PaymentIntentStatus,
} from '@/lib/notification-types';
import prisma from '@/lib/prisma';
import { publishToStaff } from '@/lib/realtime';

/** Uma intenção igual (mesmo valor) aguardando há menos que isso conta como o mesmo toque. */
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

export const intentSelect = {
  id: true,
  status: true,
  amountCents: true,
  confirmedAmountCents: true,
  rejectionReason: true,
  createdAt: true,
  reviewedAt: true,
} as const;

export function intentToDTO(intent: IntentRow): CustomerPaymentIntentDTO {
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

export type RegisterIntentResult = { status: 200 | 201; body: CreatePaymentIntentResponse } | { status: 400 | 409 | 429; body: { error: string } };

/** Registra o aviso de pagamento de `customerId` e levanta o aviso no sino do administrador. */
export async function registerPaymentIntent(customerId: string, amountCents: unknown): Promise<RegisterIntentResult> {
  if (typeof amountCents !== 'number' || !Number.isInteger(amountCents) || amountCents < PAYMENT_INTENT_MIN_CENTS) {
    return { status: 400, body: { error: 'Informe um valor de pelo menos R$ 1,00.' } };
  }

  const { balanceCents } = await getCustomerBalance(customerId);
  if (balanceCents <= 0) return { status: 409, body: { error: 'Sua ficha não tem saldo a pagar.' } };
  if (amountCents > balanceCents) {
    return { status: 400, body: { error: `O valor não pode passar do saldo da ficha, ${brl.format(balanceCents / 100)}.` } };
  }

  const pending = await prisma.paymentIntent.findMany({ where: { customerId, status: 'pending' }, orderBy: { createdAt: 'desc' }, select: intentSelect });

  // Mesmo valor logo em seguida: o cliente tocou duas vezes, não pagou duas vezes
  const repeat = pending.find((p) => p.amountCents === amountCents && Date.now() - p.createdAt.getTime() < DUPLICATE_WINDOW_MS);
  if (repeat) return { status: 200, body: { intent: intentToDTO(repeat), duplicate: true } };

  if (pending.length >= PAYMENT_INTENT_MAX_PENDING) {
    return { status: 429, body: { error: 'Você já tem pagamentos aguardando confirmação. Assim que forem conferidos, você pode informar outro.' } };
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { name: true } });

  const intent = await prisma.$transaction(async (tx) => {
    const created = await tx.paymentIntent.create({ data: { customerId, amountCents, balanceCents }, select: intentSelect });
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

  return { status: 201, body: { intent: intentToDTO(intent), duplicate: false } };
}
