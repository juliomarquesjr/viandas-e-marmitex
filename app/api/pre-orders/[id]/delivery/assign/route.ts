import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

// POST - Atribuir entregador ao pré-pedido
export async function POST(
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

    // Apenas admin pode atribuir entregador
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { id: preOrderId } = await params;
    const body = await request.json();

    if (!body.deliveryPersonId) {
      return NextResponse.json(
        { error: 'deliveryPersonId is required' },
        { status: 400 }
      );
    }

    // Verificar se o pré-pedido existe
    const preOrder = await prisma.preOrder.findUnique({
      where: { id: preOrderId }
    });

    if (!preOrder) {
      return NextResponse.json(
        { error: 'Pre-order not found' },
        { status: 404 }
      );
    }

    // Verificar se o usuário existe
    const deliveryPerson = await prisma.user.findUnique({
      where: { id: body.deliveryPersonId }
    });

    if (!deliveryPerson) {
      return NextResponse.json(
        { error: 'Delivery person not found' },
        { status: 404 }
      );
    }

    // Atualizar pré-pedido com entregador
    const updatedPreOrder = await prisma.preOrder.update({
      where: { id: preOrderId },
      data: {
        deliveryPersonId: body.deliveryPersonId
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
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(updatedPreOrder);
  } catch (error) {
    console.error('Error assigning delivery person:', error);
    return NextResponse.json(
      { error: 'Failed to assign delivery person' },
      { status: 500 }
    );
  }
}

// DELETE - Remover atribuição de entregador
export async function DELETE(
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

    // Apenas admin pode remover atribuição
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { id: preOrderId } = await params;

    const updatedPreOrder = await prisma.preOrder.update({
      where: { id: preOrderId },
      data: {
        deliveryPersonId: null
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
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(updatedPreOrder);
  } catch (error) {
    console.error('Error removing delivery person:', error);
    return NextResponse.json(
      { error: 'Failed to remove delivery person' },
      { status: 500 }
    );
  }
}

