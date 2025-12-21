import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET - Obter informações de entrega do pré-pedido (público, sem autenticação)
// Esta rota permite que clientes acessem o rastreamento via link compartilhado
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Retornar dados sem verificar autenticação
    // O link compartilhado já contém o ID do pré-pedido, que serve como "senha"
    return NextResponse.json(preOrder);
  } catch (error) {
    console.error('Error fetching delivery info:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar informações de entrega' },
      { status: 500 }
    );
  }
}

