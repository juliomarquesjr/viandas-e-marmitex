import type { Prisma, PrismaClient } from '@/lib/generated/prisma';
import prisma from '@/lib/prisma';

type Db = PrismaClient | Prisma.TransactionClient;

export interface CustomerBalance {
  /** Positivo é o que o cliente deve; negativo é crédito. */
  balanceCents: number;
  totalPending: number;
  totalPayments: number;
}

/**
 * Saldo da ficha inteira, sem filtro de período: compras na ficha que ainda
 * não foram liquidadas menos os pagamentos de ficha. É a mesma conta de
 * /api/customer/expenses, em um lugar só.
 */
export async function getCustomerBalance(customerId: string, db: Db = prisma): Promise<CustomerBalance> {
  const [pending, payments] = await Promise.all([
    db.order.aggregate({
      where: { customerId, status: 'pending', paymentMethod: { not: 'ficha_payment' } },
      _sum: { totalCents: true },
    }),
    db.order.aggregate({
      where: { customerId, paymentMethod: 'ficha_payment' },
      _sum: { totalCents: true },
    }),
  ]);

  const totalPending = pending._sum.totalCents ?? 0;
  const totalPayments = payments._sum.totalCents ?? 0;
  return { balanceCents: totalPending - totalPayments, totalPending, totalPayments };
}
