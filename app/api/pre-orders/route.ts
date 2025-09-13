import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

// GET - Listar pré-pedidos com filtros
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  
  // Se um ID foi fornecido, retornar um pré-pedido específico
  if (id) {
    return getPreOrderById(id);
  }
  
  // Caso contrário, listar pré-pedidos com filtros
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '20');
    const customerId = searchParams.get('customerId') || null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const where: any = {};
    
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
    
    const [preOrders, total] = await Promise.all([
      prisma.preOrder.findMany({
        where,
        skip: (page - 1) * size,
        take: size,
        orderBy: { createdAt: 'desc' },
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
      }),
      prisma.preOrder.count({ where })
    ]);
    
    return NextResponse.json({
      data: preOrders,
      pagination: {
        page,
        size,
        total,
        pages: Math.ceil(total / size)
      }
    });
  } catch (error) {
    console.error('Error fetching pre-orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pre-orders' },
      { status: 500 }
    );
  }
}

// Função para obter um pré-pedido específico
async function getPreOrderById(id: string) {
  try {
    const preOrder = await prisma.preOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });
    
    if (!preOrder) {
      return NextResponse.json(
        { error: 'Pre-order not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(preOrder);
  } catch (error) {
    console.error('Error fetching pre-order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pre-order' },
      { status: 500 }
    );
  }
}

// POST - Converter pré-pedido em pedido
export async function POST(request: Request) {
  const url = new URL(request.url);
  const convert = url.searchParams.get('convert');
  
  if (convert === 'true') {
    return convertPreOrderToOrder(request);
  }
  
  // Criar novo pré-pedido (implementação existente)
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
        { error: 'Pre-order must have at least one item' },
        { status: 400 }
      );
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
    
    // Criar pré-pedido
    const preOrder = await prisma.preOrder.create({
      data: {
        customerId: body.customerId || null,
        subtotalCents,
        discountCents,
        deliveryFeeCents,
        totalCents,
        notes: body.notes || null,
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
    
    return NextResponse.json(preOrder);
  } catch (error) {
    console.error('Error creating pre-order:', error);
    return NextResponse.json(
      { error: 'Failed to create pre-order' },
      { status: 500 }
    );
  }
}

// Função para converter pré-pedido em pedido
async function convertPreOrderToOrder(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    if (!body.preOrderId) {
      return NextResponse.json(
        { error: 'Pre-order ID is required' },
        { status: 400 }
      );
    }
    
    // Obter o pré-pedido
    const preOrder = await prisma.preOrder.findUnique({
      where: { id: body.preOrderId },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });
    
    if (!preOrder) {
      return NextResponse.json(
        { error: 'Pre-order not found' },
        { status: 404 }
      );
    }
    
    // Verificar estoque antes de criar o pedido
    for (const item of preOrder.items) {
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
    
    // Criar pedido e atualizar estoque em uma transação
    const order = await prisma.$transaction(async (prisma) => {
      // Determinar o status com base no método de pagamento
      const orderStatus = body.paymentMethod === 'invoice' ? 'pending' : 'confirmed';
      
      // Criar pedido
      const newOrder = await prisma.order.create({
        data: {
          customerId: preOrder.customerId || null,
          status: orderStatus,
          subtotalCents: preOrder.subtotalCents,
          discountCents: preOrder.discountCents,
          deliveryFeeCents: preOrder.deliveryFeeCents,
          totalCents: preOrder.totalCents,
          paymentMethod: body.paymentMethod || null,
          items: {
            create: preOrder.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              priceCents: item.priceCents
            }))
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
      for (const item of preOrder.items) {
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
      
      // Excluir o pré-pedido após a conversão
      await prisma.preOrderItem.deleteMany({
        where: { preOrderId: preOrder.id }
      });
      
      await prisma.preOrder.delete({
        where: { id: preOrder.id }
      });
      
      return newOrder;
    });
    
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error converting pre-order to order:', error);
    return NextResponse.json(
      { error: 'Failed to convert pre-order to order' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar pré-pedido
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
        { error: 'Pre-order ID is required' },
        { status: 400 }
      );
    }
    
    // Calcular totais
    let subtotalCents = 0;
    const itemsData = body.items?.map((item: any) => {
      const itemTotal = item.priceCents * item.quantity;
      subtotalCents += itemTotal;
      return {
        productId: item.productId,
        quantity: item.quantity,
        priceCents: item.priceCents
      };
    }) || [];
    
    const discountCents = body.discountCents || 0;
    const deliveryFeeCents = body.deliveryFeeCents || 0;
    const totalCents = subtotalCents - discountCents + deliveryFeeCents;
    
    // Atualizar pré-pedido
    const preOrder = await prisma.preOrder.update({
      where: { id: body.id },
      data: {
        customerId: body.customerId,
        subtotalCents,
        discountCents,
        deliveryFeeCents,
        totalCents,
        notes: body.notes,
        items: {
          deleteMany: {},
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
    
    return NextResponse.json(preOrder);
  } catch (error) {
    console.error('Error updating pre-order:', error);
    return NextResponse.json(
      { error: 'Failed to update pre-order' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir pré-pedido
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
        { error: 'Pre-order ID is required' },
        { status: 400 }
      );
    }
    
    // Excluir itens primeiro (devido à restrições de chave estrangeira)
    await prisma.preOrderItem.deleteMany({
      where: { preOrderId: id }
    });
    
    // Excluir pré-pedido
    await prisma.preOrder.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: 'Pre-order deleted successfully' });
  } catch (error) {
    console.error('Error deleting pre-order:', error);
    return NextResponse.json(
      { error: 'Failed to delete pre-order' },
      { status: 500 }
    );
  }
}