import { getCustomerSession } from '@/lib/customer-auth';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET - Obter histórico completo de rastreamento (para cliente)
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
      select: {
        id: true,
        customerId: true
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

    // Obter histórico de tracking
    const tracking = await prisma.deliveryTracking.findMany({
      where: { preOrderId },
      orderBy: {
        timestamp: 'asc'
      }
    });

    return NextResponse.json({ tracking });
  } catch (error) {
    console.error('Error fetching tracking history:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar histórico de rastreamento' },
      { status: 500 }
    );
  }
}

