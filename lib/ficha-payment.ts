import type { Prisma, PrismaClient } from '@/lib/generated/prisma';
import { noonOfDaySP } from '@/lib/date-range';
import prisma from '@/lib/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

export const FICHA_PAYMENT_METHODS = ['cash', 'credit', 'debit', 'pix'] as const;
export type FichaPaymentMethod = (typeof FICHA_PAYMENT_METHODS)[number];

export interface FichaPaymentInput {
  customerId: string;
  amountCents: number;
  paymentMethod: FichaPaymentMethod;
  /** "AAAA-MM-DD". Sem data, vale o momento atual. */
  paymentDate?: string;
  cashReceivedCents?: number;
  changeCents?: number;
}

/**
 * Registra um pagamento de ficha: um pedido especial (paymentMethod
 * "ficha_payment") que abate o saldo do cliente. É o único caminho que cria
 * esse registro. A rota do admin e a confirmação de uma intenção de pagamento
 * passam por aqui, para o saldo nunca depender de quem registrou.
 */
export async function createFichaPaymentOrder(input: FichaPaymentInput, db: Db = prisma) {
  const data: Prisma.OrderUncheckedCreateInput = {
    customerId: input.customerId,
    status: 'pending',
    subtotalCents: input.amountCents,
    discountCents: 0,
    deliveryFeeCents: 0,
    totalCents: input.amountCents,
    paymentMethod: 'ficha_payment',
    items: { create: [] },
  };

  if (input.paymentDate) {
    // Meio-dia de Brasília: longe das bordas do dia, em qualquer fuso (ver lib/date-range.ts)
    const noon = noonOfDaySP(input.paymentDate);
    if (!noon) throw new Error('Data do pagamento inválida');
    data.createdAt = noon;
  }

  if (input.paymentMethod === 'cash' && input.cashReceivedCents !== undefined) {
    data.cashReceivedCents = input.cashReceivedCents;
    data.changeCents = input.changeCents || 0;
  }

  return db.order.create({
    data,
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      items: true,
    },
  });
}
