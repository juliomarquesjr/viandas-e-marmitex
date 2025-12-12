import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customer-auth';

// GET - Listar pré-pedidos do cliente autenticado
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

    const where: any = {
      customerId
    };
    
    // Filtro por data
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const [year, month, day] = startDate.split('-').map(Number);
        const startDateTimeLocal = new Date(year, month - 1, day, 0, 0, 0, 0);
        const startDateTime = new Date(startDateTimeLocal.getTime() - startDateTimeLocal.getTimezoneOffset() * 60000);
        where.createdAt.gte = startDateTime;
      }
      if (endDate) {
        const [year, month, day] = endDate.split('-').map(Number);
        const endDateTimeLocal = new Date(year, month - 1, day, 23, 59, 59, 999);
        const endDateTime = new Date(endDateTimeLocal.getTime() - endDateTimeLocal.getTimezoneOffset() * 60000);
        where.createdAt.lte = endDateTime;
      }
    }
    
    const preOrders = await prisma.preOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true
              }
            }
          }
        }
      }
    });
    
    return NextResponse.json({
      data: preOrders,
      total: preOrders.length
    });
  } catch (error) {
    console.error('Error fetching customer pre-orders:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pré-pedidos' },
      { status: 500 }
    );
  }
}

