import { getCustomerBalance } from '@/lib/customer-balance';
import type { PaymentIntentReviewDTO, PaymentIntentStatus } from '@/lib/notification-types';
import prisma from '@/lib/prisma';
import { requireStaff } from '@/lib/staff-session';
import { NextResponse } from 'next/server';

// GET - Intenção de pagamento para o operador revisar
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireStaff();
    if ('error' in auth) return auth.error;

    const { id } = await params;
    const intent = await prisma.paymentIntent.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        reviewedBy: { select: { name: true } },
      },
    });

    if (!intent) {
      return NextResponse.json({ error: 'Intenção de pagamento não encontrada' }, { status: 404 });
    }

    const { balanceCents } = await getCustomerBalance(intent.customerId);

    const dto: PaymentIntentReviewDTO = {
      id: intent.id,
      status: intent.status as PaymentIntentStatus,
      amountCents: intent.amountCents,
      balanceAtInformCents: intent.balanceCents,
      currentBalanceCents: balanceCents,
      confirmedAmountCents: intent.confirmedAmountCents,
      rejectionReason: intent.rejectionReason,
      createdAt: intent.createdAt.toISOString(),
      reviewedAt: intent.reviewedAt?.toISOString() ?? null,
      reviewedByName: intent.reviewedBy?.name ?? null,
      customer: intent.customer,
    };
    return NextResponse.json(dto);
  } catch (error) {
    console.error('Error fetching payment intent:', error);
    return NextResponse.json({ error: 'Erro ao buscar a intenção de pagamento' }, { status: 500 });
  }
}
