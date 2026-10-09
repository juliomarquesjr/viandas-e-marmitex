import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customer-auth';
import { parseCustomerDateRange } from '@/lib/customer-date-range';
import { isOrderExpired } from '@/lib/ordering';

// GET - Pré-pedidos do cliente autenticado
export async function GET(request: Request) {
  try {
    const session = await getCustomerSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = parseCustomerDateRange(searchParams.get('startDate'), searchParams.get('endDate'));
    if (range === 'invalid') {
      return NextResponse.json({ error: 'Período inválido' }, { status: 400 });
    }

    const preOrders = await prisma.preOrder.findMany({
      where: { customerId: session.user.customerId, ...(range ? { createdAt: range } : {}) },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        totalCents: true,
        subtotalCents: true,
        discountCents: true,
        deliveryFeeCents: true,
        notes: true,
        createdAt: true,
        deliveryStatus: true,
        estimatedDeliveryTime: true,
        deliveryStartedAt: true,
        deliveredAt: true,
        // Pedido feito pelo cliente: andamento da aprovação da loja
        source: true,
        approval: true,
        respondedAt: true,
        rejectReason: true,
        // Só serve para saber se o pedido vai por entrega; quem é o entregador não sai daqui
        deliveryPersonId: true,
        items: {
          include: {
            product: { select: { id: true, name: true, imageUrl: true } },
          },
        },
      },
    });

    const now = new Date();
    const data = preOrders.map(({ deliveryPersonId, ...preOrder }) => ({
      ...preOrder,
      hasCourier: deliveryPersonId !== null,
      // Aguardando a loja além do prazo: a tela mostra "a loja não respondeu a tempo"
      expired: preOrder.source === 'online' && preOrder.approval === 'awaiting' && isOrderExpired(preOrder.createdAt, now),
    }));

    return NextResponse.json({ data, total: data.length });
  } catch (error) {
    console.error('Error fetching customer pre-orders:', error);
    return NextResponse.json({ error: 'Erro ao buscar pré-pedidos' }, { status: 500 });
  }
}
