import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customer-auth';

// GET - Obter ficha detalhada do cliente autenticado
export async function GET(request: Request) {
  try {
    const session = await getCustomerSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const customerId = session.user.customerId;

    // Obter todas as vendas pendentes do cliente (excluindo pagamentos de ficha)
    const pendingOrdersQuery: any = {
      customerId,
      status: 'pending',
      paymentMethod: {
        not: 'ficha_payment'
      }
    };

    // Adicionar filtro de data se fornecido
    if (startDate || endDate) {
      pendingOrdersQuery.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        pendingOrdersQuery.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        pendingOrdersQuery.createdAt.lte = end;
      }
    }

    const pendingOrders = await prisma.order.findMany({
      where: pendingOrdersQuery,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calcular o total das vendas pendentes
    const totalPending = pendingOrders.reduce((sum, order) => sum + order.totalCents, 0);

    // Obter todos os pagamentos de ficha do cliente
    const fichaPaymentsQuery: any = {
      customerId,
      paymentMethod: 'ficha_payment'
    };

    // Adicionar filtro de data se fornecido
    if (startDate || endDate) {
      fichaPaymentsQuery.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        fichaPaymentsQuery.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        fichaPaymentsQuery.createdAt.lte = end;
      }
    }

    const fichaPayments = await prisma.order.findMany({
      where: fichaPaymentsQuery,
      select: {
        id: true,
        totalCents: true,
        createdAt: true,
        status: true,
        paymentMethod: true,
        cashReceivedCents: true,
        changeCents: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calcular o total dos pagamentos
    const totalPayments = fichaPayments.reduce((sum, payment) => sum + payment.totalCents, 0);

    // Calcular o saldo devedor
    const balanceCents = totalPending - totalPayments;

    return NextResponse.json({
      balanceCents,
      totalPending,
      totalPayments,
      pendingOrders,
      fichaPayments
    });
  } catch (error) {
    console.error('Error fetching customer expenses:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar ficha' },
      { status: 500 }
    );
  }
}

