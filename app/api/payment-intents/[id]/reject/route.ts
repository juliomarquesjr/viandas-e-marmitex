import { resolveNotificationsFor } from '@/lib/notifications';
import prisma from '@/lib/prisma';
import { publishToCustomer, publishToStaff } from '@/lib/realtime';
import { requireStaff } from '@/lib/staff-session';
import { NextResponse } from 'next/server';

const MAX_REASON_LENGTH = 300;

// POST - Operador não encontrou o pagamento no banco.
//   { reason?: string }  motivo opcional; o cliente o vê junto do aviso.
// Nada muda no saldo.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireStaff();
    if ('error' in auth) return auth.error;

    const { id } = await params;
    const body = (await request.json().catch(() => null)) ?? {};
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, MAX_REASON_LENGTH) : '';

    const intent = await prisma.paymentIntent.findUnique({ where: { id }, select: { id: true, customerId: true } });
    if (!intent) {
      return NextResponse.json({ error: 'Intenção de pagamento não encontrada' }, { status: 404 });
    }

    const rejected = await prisma.$transaction(async (tx) => {
      const claimed = await tx.paymentIntent.updateMany({
        where: { id, status: 'pending' },
        data: {
          status: 'rejected',
          rejectionReason: reason || null,
          reviewedById: auth.staff.userId,
          reviewedAt: new Date(),
        },
      });
      if (claimed.count === 0) return false;
      await resolveNotificationsFor('PaymentIntent', id, tx);
      return true;
    });

    if (!rejected) {
      const current = await prisma.paymentIntent.findUnique({
        where: { id },
        select: { status: true, reviewedBy: { select: { name: true } } },
      });
      const who = current?.reviewedBy?.name ? ` por ${current.reviewedBy.name}` : '';
      return NextResponse.json(
        { error: `Esta intenção já foi ${current?.status === 'confirmed' ? 'confirmada' : 'recusada'}${who}.` },
        { status: 409 }
      );
    }

    await Promise.all([
      publishToStaff('notification.changed', { id }),
      publishToCustomer(intent.customerId, 'payment-intent.reviewed', { id }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting payment intent:', error);
    return NextResponse.json({ error: 'Erro ao recusar o pagamento' }, { status: 500 });
  }
}
