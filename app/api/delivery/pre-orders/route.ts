import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

// GET - Listar pré-pedidos atribuídos ao entregador logado
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Buscar pré-pedidos atribuídos a este entregador
    const preOrders = await prisma.preOrder.findMany({
      where: {
        deliveryPersonId: session.user.id
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true
          }
        },
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

    return NextResponse.json(preOrders);
  } catch (error) {
    console.error('Error fetching delivery pre-orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pre-orders' },
      { status: 500 }
    );
  }
}

