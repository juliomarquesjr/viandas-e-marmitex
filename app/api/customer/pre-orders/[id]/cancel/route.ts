import { getCustomerSession } from '@/lib/customer-auth';
import prisma from '@/lib/prisma';
import { publishToCustomer, publishToStaff } from '@/lib/realtime';
import { NextResponse } from 'next/server';

// POST - O cliente cancela o próprio pedido online, enquanto a loja ainda não respondeu
//
// updateMany com o estado no where: se o admin aceitar ao mesmo tempo, só um dos dois vence (o outro leva 409).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const customerId = session.user.customerId;

    const result = await prisma.preOrder.updateMany({
      where: { id, customerId, source: 'online', approval: 'awaiting' },
      data: { approval: 'cancelled', deliveryStatus: 'cancelled', respondedAt: new Date(), rejectReason: 'Cancelado pelo cliente' },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'A loja já respondeu este pedido, então não dá mais para cancelar por aqui. Fale com a loja.' }, { status: 409 });
    }

    console.info(JSON.stringify({ event: 'online_order.cancelled_by_customer', preOrderId: id, customerId }));
    await Promise.all([publishToStaff('notification.changed', { id }), publishToCustomer(customerId, 'pre-order.updated', { id })]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling online order:', error);
    return NextResponse.json({ error: 'Não foi possível cancelar agora. Tente de novo.' }, { status: 500 });
  }
}
