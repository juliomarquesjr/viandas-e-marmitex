import { getCustomerSession } from '@/lib/customer-auth';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET - Obter informações de entrega do pré-pedido (para cliente)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { id: preOrderId } = await params;

    const preOrder = await prisma.preOrder.findUnique({
      where: { id: preOrderId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true
          }
        },
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        tracking: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 50 // Últimas 50 localizações
        }
      }
    });

    if (!preOrder) {
      return NextResponse.json(
        { error: 'Pré-pedido não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o pré-pedido pertence ao cliente autenticado
    if (preOrder.customerId !== session.user.customerId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    return NextResponse.json(preOrder);
  } catch (error) {
    console.error('Error fetching delivery info:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar informações de entrega' },
      { status: 500 }
    );
  }
}

