import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET - Obter histórico completo de rastreamento (público, sem autenticação)
// Esta rota permite que clientes acessem o histórico via link compartilhado
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: preOrderId } = await params;

    // Verificar se o pré-pedido existe
    const preOrder = await prisma.preOrder.findUnique({
      where: { id: preOrderId },
      select: {
        id: true
      }
    });

    if (!preOrder) {
      return NextResponse.json(
        { error: 'Pré-pedido não encontrado' },
        { status: 404 }
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

