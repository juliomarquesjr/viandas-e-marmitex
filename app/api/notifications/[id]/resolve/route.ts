import prisma from '@/lib/prisma';
import { publishToStaff } from '@/lib/realtime';
import { requireStaff } from '@/lib/staff-session';
import { NextResponse } from 'next/server';

// POST - "Conferido": a notificação deixa de pedir ação (e é marcada como lida). Some do sino e fica no histórico.
// Pagamento informado não passa por aqui: só vira conferido confirmando ou recusando, para o saldo do cliente ficar certo.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireStaff();
    if ('error' in auth) return auth.error;

    const { id } = await params;
    const notification = await prisma.notification.findUnique({ where: { id }, select: { refType: true, refId: true, resolvedAt: true } });
    if (!notification) return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });

    if (notification.refType === 'PaymentIntent' && notification.refId && !notification.resolvedAt) {
      const intent = await prisma.paymentIntent.findUnique({ where: { id: notification.refId }, select: { status: true } });
      if (intent?.status === 'pending') {
        return NextResponse.json({ error: 'Confira o pagamento para concluir: confirme ou recuse.' }, { status: 409 });
      }
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.notification.updateMany({ where: { id, readAt: null }, data: { readAt: now } }),
      prisma.notification.updateMany({ where: { id, resolvedAt: null }, data: { resolvedAt: now } }),
    ]);
    void publishToStaff('notification.changed');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resolving notification:', error);
    return NextResponse.json({ error: 'Erro ao marcar como conferido' }, { status: 500 });
  }
}
