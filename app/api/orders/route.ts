import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { noonOfDaySP, parseDayRange, todaySP } from '@/lib/date-range';
import { publishToCustomer } from '@/lib/realtime';
import { decrementStockForItems, restoreStockForItems } from '@/lib/stock/orderStock';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

// GET - Listar pedidos com filtros
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '20');
    
    // Se o tamanho for muito grande (como 1000), buscar todos os dados sem paginação
    const shouldPaginate = size < 1000;
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
    
    // Filtro por data: o dia é o dia em Brasília (ver lib/date-range.ts)
    const range = parseDayRange(startDate, endDate);
    if (range === 'invalid') {
      return NextResponse.json({ error: 'Período inválido' }, { status: 400 });
    }
    if (range) {
      where.createdAt = range;
    }
    
    // Excluir pagamentos de ficha da lista de vendas
    where.paymentMethod = {
      not: 'ficha_payment'
    };
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        ...(shouldPaginate ? {
          skip: (page - 1) * size,
          take: size,
        } : {}),
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
              phone: true,
              address: true,
              imageUrl: true
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
    
    // Buscar produtos que precisam de cálculo de peso
    const productIds = body.items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, pricePerKgCents: true }
    });
    const productsMap = new Map(products.map(p => [p.id, p]));

    // Calcular totais
    let subtotalCents = 0;
    const itemsData = await Promise.all(body.items.map(async (item: any) => {
      // Se o item tiver peso (weightKg), calcular preço baseado no peso
      let itemPriceCents = item.priceCents;
      if (item.weightKg && item.weightKg > 0) {
        const product = productsMap.get(item.productId);
        
        if (product && product.pricePerKgCents) {
          // Calcular: preço por quilo * peso (convertido para centavos)
          itemPriceCents = Math.round(parseFloat(product.pricePerKgCents.toString()) * parseFloat(item.weightKg.toString()));
        }
      }
      
      const itemTotal = itemPriceCents * item.quantity;
      subtotalCents += itemTotal;
      
      return {
        productId: item.productId,
        quantity: item.quantity,
        priceCents: itemPriceCents,
        weightKg: item.weightKg ? parseFloat(item.weightKg.toString()) : null
      };
    }));
    
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
    
    // Se uma data customizada foi fornecida (apenas para admins), usar ela: meio-dia em Brasília
    // Só o admin pode informar a data: esconder o seletor na tela não basta, a API também confere
    if (body.customSaleDate && session.user.role === 'admin') {
      const customDate = noonOfDaySP(body.customSaleDate);

      // Não aceita data futura nem data inválida
      if (customDate && body.customSaleDate <= todaySP()) {
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
        }
      });
      
      await decrementStockForItems(prisma, body.items);
      
      return newOrder;
    });

    // Compra na ficha e pagamento mudam o saldo do cliente
    await publishToCustomer(order.customerId, 'ficha.updated');
    
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

    await publishToCustomer(order.customerId, 'ficha.updated');
    
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
      where: { id },
      select: {
        id: true,
        customerId: true,
        items: {
          select: {
            productId: true,
            quantity: true,
          },
        },
      },
    });
    
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    await prisma.$transaction(async (tx) => {
      await restoreStockForItems(tx, order.items);

      // Excluir itens primeiro (devido à restrições de chave estrangeira)
      await tx.orderItem.deleteMany({
        where: { orderId: id }
      });

      // Excluir pedido
      await tx.order.delete({
        where: { id }
      });
    });
    
    await publishToCustomer(order.customerId, 'ficha.updated');

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