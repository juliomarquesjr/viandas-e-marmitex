import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

// GET - Obter histórico completo de rastreamento
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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
        { error: 'Pre-order not found' },
        { status: 404 }
      );
    }

    // Verificar permissões (apenas admin)
    // Clientes devem usar a rota /api/customer/pre-orders/[id]/delivery/tracking
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
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
      { error: 'Failed to fetch tracking history' },
      { status: 500 }
    );
  }
}

