import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

// GET - Listar pedidos com filtros
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '20');
    const status = searchParams.get('status') || 'all';
    const customerId = searchParams.get('customerId') || null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const where: any = {};
    
    // Filtro por status
    if (status !== 'all') {
      where.status = status;
    }
    
    // Filtro por cliente
    if (customerId) {
      where.customerId = customerId;
    }
    
    // Filtro por data
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        // Criar data no fuso horário local para evitar problemas de UTC
        const [year, month, day] = startDate.split('-').map(Number);
        const startDateTime = new Date(year, month - 1, day, 0, 0, 0, 0); // Início do dia local
        where.createdAt.gte = startDateTime;
      }
      if (endDate) {
        // Criar data no fuso horário local para evitar problemas de UTC
        const [year, month, day] = endDate.split('-').map(Number);
        const endDateTime = new Date(year, month - 1, day, 23, 59, 59, 999); // Fim do dia local
        where.createdAt.lte = endDateTime;
      }
    }
    
    // Excluir pagamentos de ficha da lista de vendas
    where.paymentMethod = {
      not: 'ficha_payment'
    };
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: (page - 1) * size,
        take: size,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          subtotalCents: true,
          discountCents: true,
          deliveryFeeCents: true,
          totalCents: true,
          paymentMethod: true,
          cashReceivedCents: true,
          changeCents: true,
          createdAt: true,
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
                  name: true
                }
              }
            }
          }
        }
      }),
      prisma.order.count({ where })
    ]);
    

    
    return NextResponse.json({
      data: orders,
      pagination: {
        page,
        size,
        total,
        pages: Math.ceil(total / size)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST - Criar novo pedido
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Validação básica
    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Order must have at least one item' },
        { status: 400 }
      );
    }
    
    // Verificar estoque antes de criar o pedido
    for (const item of body.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { 
          id: true, 
          name: true, 
          stockEnabled: true, 
          stock: true 
        }
      });
      
      if (!product) {
        return NextResponse.json(
          { error: `Product with ID ${item.productId} not found` },
          { status: 400 }
        );
      }
      
      if (product.stockEnabled && product.stock !== null) {
        if (product.stock < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for product: ${product.name}` },
            { status: 400 }
          );
        }
      }
    }
    
    // Calcular totais
    let subtotalCents = 0;
    const itemsData = body.items.map((item: any) => {
      const itemTotal = item.priceCents * item.quantity;
      subtotalCents += itemTotal;
      return {
        productId: item.productId,
        quantity: item.quantity,
        priceCents: item.priceCents
      };
    });
    
    const discountCents = body.discountCents || 0;
    const deliveryFeeCents = body.deliveryFeeCents || 0;
    const totalCents = subtotalCents - discountCents + deliveryFeeCents;
    
    // Determinar status baseado no método de pagamento
    const status = body.paymentMethod === 'invoice' ? 'pending' : 'confirmed';
    
    // Preparar dados adicionais de pagamento
    const additionalData: any = {};
    if (body.cashReceivedCents !== undefined) {
      additionalData.cashReceivedCents = body.cashReceivedCents;
    }
    if (body.changeCents !== undefined) {
      additionalData.changeCents = body.changeCents;
    }
    
    // Se uma data customizada foi fornecida (apenas para admins), usar ela
    if (body.customSaleDate) {
      // Criar data no fuso horário local para evitar problemas de UTC
      const [year, month, day] = body.customSaleDate.split('-').map(Number);
      const customDate = new Date(year, month - 1, day, 12, 0, 0, 0); // Meio-dia local
      
      // Validar que a data não é futura
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
      
      if (customDate <= today) {
        additionalData.createdAt = customDate;
      }
    }
    
    // Criar pedido e atualizar estoque em uma transação
    const order = await prisma.$transaction(async (prisma) => {
      // Criar pedido
      const newOrder = await prisma.order.create({
        data: {
          customerId: body.customerId || null,
          status,
          subtotalCents,
          discountCents,
          deliveryFeeCents,
          totalCents,
          paymentMethod: body.paymentMethod || null,
          ...additionalData,
          items: {
            create: itemsData
          }
        },
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
                  name: true
                }
              }
            }
          }
        }
      });
      
      // Atualizar estoque dos produtos
      for (const item of body.items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { 
            id: true, 
            stockEnabled: true, 
            stock: true 
          }
        });
        
        if (product && product.stockEnabled && product.stock !== null) {
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity
              }
            }
          });
        }
      }
      
      return newOrder;
    });
    
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar status do pedido
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    // Preparar dados para atualização
    const updateData: any = {};
    
    if (body.status) {
      updateData.status = body.status;
    }
    
    if (body.paymentMethod) {
      updateData.paymentMethod = body.paymentMethod;
    }
    
    // Se for um pagamento de ficha, vincular ao pedido original
    if (body.fichaPaymentForOrderId) {
      updateData.fichaPaymentForOrderId = body.fichaPaymentForOrderId;
    }
    
    const order = await prisma.order.update({
      where: { id: body.id },
      data: updateData,
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
                name: true
              }
            }
          }
        }
      }
    });
    
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir pedido (apenas para administradores)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }
    
    // Verificar se o pedido existe
    const order = await prisma.order.findUnique({
      where: { id }
    });
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Excluir itens primeiro (devido à restrições de chave estrangeira)
    await prisma.orderItem.deleteMany({
      where: { orderId: id }
    });
    
    // Excluir pedido
    await prisma.order.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    // Verificar se é um erro de constraint
    if (error instanceof Error && error.message.includes('foreign key constraint')) {
      return NextResponse.json(
        { error: 'Não é possível excluir o pedido pois ele possui registros relacionados.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}