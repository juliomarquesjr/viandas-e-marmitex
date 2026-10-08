import { getCustomerBalance } from '@/lib/customer-balance';
import { createFichaPaymentOrder } from '@/lib/ficha-payment';
import { resolveNotificationsFor } from '@/lib/notifications';
import prisma from '@/lib/prisma';
import { publishToCustomer, publishToStaff } from '@/lib/realtime';
import { requireStaff } from '@/lib/staff-session';
import { NextResponse } from 'next/server';

// Teto de sanidade contra um zero a mais na digitação: R$ 100.000,00
const MAX_CONFIRMED_CENTS = 10_000_000;

// POST - Operador confirma o recebimento.
//   { amountCents?: number }  valor realmente recebido; sem ele vale o que o cliente informou.
// Cria o pagamento de ficha (PIX) pelo mesmo caminho do admin, então o saldo do cliente cai.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireStaff();
    if ('error' in auth) return auth.error;

    const { id } = await params;
    const body = (await request.json().catch(() => null)) ?? {};

    const intent = await prisma.paymentIntent.findUnique({ where: { id } });
    if (!intent) {
      return NextResponse.json({ error: 'Intenção de pagamento não encontrada' }, { status: 404 });
    }

    const amountCents = body.amountCents === undefined ? intent.amountCents : body.amountCents;
    if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > MAX_CONFIRMED_CENTS) {
      return NextResponse.json({ error: 'Informe um valor válido, em centavos' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Só quem vira o status de "pending" confirma: dois operadores não duplicam o pagamento
      const claimed = await tx.paymentIntent.updateMany({
        where: { id, status: 'pending' },
        data: {
          status: 'confirmed',
          confirmedAmountCents: amountCents,
          reviewedById: auth.staff.userId,
          reviewedAt: new Date(),
        },
      });
      if (claimed.count === 0) return null;

      const paymentOrder = await createFichaPaymentOrder(
        { customerId: intent.customerId, amountCents, paymentMethod: 'pix' },
        tx
      );
      await tx.paymentIntent.update({ where: { id }, data: { paymentOrderId: paymentOrder.id } });
      await resolveNotificationsFor('PaymentIntent', id, tx);
      return paymentOrder;
    });

    if (!result) {
      const current = await prisma.paymentIntent.findUnique({
        where: { id },
        select: { status: true, reviewedBy: { select: { name: true } } },
      });
      const who = current?.reviewedBy?.name ? ` por ${current.reviewedBy.name}` : '';
      return NextResponse.json(
        { error: `Esta intenção já foi ${current?.status === 'rejected' ? 'recusada' : 'confirmada'}${who}.` },
        { status: 409 }
      );
    }

    // Outros operadores veem o aviso resolvido; o cliente vê o PIX confirmado e o saldo novo
    await Promise.all([
      publishToStaff('notification.changed', { id }),
      publishToCustomer(intent.customerId, 'payment-intent.reviewed', { id }),
      publishToCustomer(intent.customerId, 'ficha.updated'),
    ]);

    const { balanceCents } = await getCustomerBalance(intent.customerId);
    return NextResponse.json({ success: true, paymentOrderId: result.id, confirmedAmountCents: amountCents, currentBalanceCents: balanceCents });
  } catch (error) {
    console.error('Error confirming payment intent:', error);
    return NextResponse.json({ error: 'Erro ao confirmar o pagamento' }, { status: 500 });
  }
}
