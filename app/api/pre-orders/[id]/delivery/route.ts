import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

// GET - Obter informações de entrega do pré-pedido
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
        { error: 'Pre-order not found' },
        { status: 404 }
      );
    }

    // Verificar se o usuário tem permissão (admin ou entregador atribuído)
    // Clientes devem usar a rota /api/customer/pre-orders/[id]/delivery
    const isAdmin = session.user.role === 'admin';
    const isDeliveryPerson = preOrder.deliveryPersonId === session.user.id;

    if (!isAdmin && !isDeliveryPerson) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json(preOrder);
  } catch (error) {
    console.error('Error fetching delivery info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delivery info' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar status ou localização de entrega
export async function PUT(
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

    // Apenas admin ou entregador atribuído pode atualizar
    const isAdmin = session.user.role === 'admin';

    const { id: preOrderId } = await params;
    const body = await request.json();

    const preOrder = await prisma.preOrder.findUnique({
      where: { id: preOrderId },
      select: {
        id: true,
        deliveryPersonId: true,
        deliveryStatus: true,
        deliveryStartedAt: true
      }
    });

    if (!preOrder) {
      return NextResponse.json(
        { error: 'Pre-order not found' },
        { status: 404 }
      );
    }

    const isDeliveryPerson = preOrder.deliveryPersonId === session.user.id;

    if (!isAdmin && !isDeliveryPerson) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const updateData: any = {};
    const trackingData: any = {};

    // Atualizar status
    if (body.status) {
      const validStatuses = ['pending', 'preparing', 'out_for_delivery', 'in_transit', 'delivered', 'cancelled'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        );
      }

      updateData.deliveryStatus = body.status;
      trackingData.status = body.status;

      // Atualizar timestamps baseado no status
      if (body.status === 'out_for_delivery' && !preOrder.deliveryStartedAt) {
        updateData.deliveryStartedAt = new Date();
      }
      if (body.status === 'delivered') {
        updateData.deliveredAt = new Date();
      }
    }

    // Atualizar localização GPS
    if (body.latitude !== undefined && body.longitude !== undefined) {
      // Validar coordenadas
      const lat = parseFloat(body.latitude);
      const lng = parseFloat(body.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json(
          { error: 'Invalid coordinates' },
          { status: 400 }
        );
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return NextResponse.json(
          { error: 'Coordinates out of range' },
          { status: 400 }
        );
      }

      trackingData.latitude = lat;
      trackingData.longitude = lng;
    }

    // Atualizar tempo estimado de entrega
    if (body.estimatedDeliveryTime) {
      updateData.estimatedDeliveryTime = new Date(body.estimatedDeliveryTime);
    }

    // Notas do entregador
    if (body.notes !== undefined) {
      trackingData.notes = body.notes;
    }

    // Atualizar pré-pedido e criar registro de tracking em uma transação
    const result = await prisma.$transaction(async (tx) => {
      // Atualizar pré-pedido se houver mudanças
      if (Object.keys(updateData).length > 0) {
        await tx.preOrder.update({
          where: { id: preOrderId },
          data: updateData
        });
      }

      // Criar registro de tracking se houver dados de localização ou status
      if (Object.keys(trackingData).length > 0) {
        trackingData.preOrderId = preOrderId;
        trackingData.timestamp = new Date();
        
        // Se não tiver status no tracking, usar o status atual
        if (!trackingData.status) {
          trackingData.status = preOrder.deliveryStatus;
        }

        await tx.deliveryTracking.create({
          data: trackingData
        });
      }

      // Retornar pré-pedido atualizado
      return await tx.preOrder.findUnique({
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
            take: 1
          }
        }
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating delivery:', error);
    return NextResponse.json(
      { error: 'Failed to update delivery' },
      { status: 500 }
    );
  }
}

