import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { decrementStockForItems } from '@/lib/stock/orderStock';
import {
  isWeightBasedProduct,
  roundWeightKg,
  validateWeightKg,
  weightPriceCents,
} from '@/lib/weight';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

const preOrderCustomerSelect = {
  id: true,
  name: true,
  phone: true,
  imageUrl: true,
  address: true,
};

const preOrderItemProductSelect = {
  id: true,
  name: true,
  imageUrl: true,
  pricePerKgCents: true,
  productType: true,
};

type PricingProduct = {
  id: string;
  name: string;
  priceCents: number;
  pricePerKgCents: number | null;
};

type PreOrderItemData = {
  productId: string;
  quantity: number;
  priceCents: number;
  weightKg: number | null;
};

/**
 * Normaliza os itens recebidos aplicando as mesmas regras do PDV:
 * produto por quilo entra com peso válido, quantidade 1 e preço calculado a
 * partir do preço por quilo; produto unitário exige valor unitário cadastrado.
 * O preço vem sempre do cadastro, nunca do payload.
 */
function buildPreOrderItems(
  items: any[],
  productsMap: Map<string, PricingProduct>
): { error: string } | { itemsData: PreOrderItemData[]; subtotalCents: number } {
  const itemsData: PreOrderItemData[] = [];
  let subtotalCents = 0;

  for (const item of items) {
    const product = productsMap.get(item.productId);

    if (!product) {
      return { error: `Product with ID ${item.productId} not found` };
    }

    if (isWeightBasedProduct(product)) {
      const rawWeight = Number(item.weightKg);

      if (!Number.isFinite(rawWeight) || rawWeight <= 0) {
        return {
          error: `Produto "${product.name}" é vendido por quilo: informe o peso do item.`,
        };
      }

      const weightKg = roundWeightKg(rawWeight);
      const weightError = validateWeightKg(weightKg);

      if (weightError) {
        return { error: `Produto "${product.name}": ${weightError}` };
      }

      const priceCents = weightPriceCents(product.pricePerKgCents ?? 0, weightKg);
      subtotalCents += priceCents;
      itemsData.push({
        productId: product.id,
        quantity: 1,
        priceCents,
        weightKg,
      });
      continue;
    }

    if (!product.priceCents || product.priceCents <= 0) {
      return { error: `Produto "${product.name}" não possui valor unitário válido.` };
    }

    const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 1));
    subtotalCents += product.priceCents * quantity;
    itemsData.push({
      productId: product.id,
      quantity,
      priceCents: product.priceCents,
      weightKg: null,
    });
  }

  return { itemsData, subtotalCents };
}

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
        // Criar data no fuso horário local e ajustar para UTC
        const [year, month, day] = startDate.split('-').map(Number);
        const startDateTimeLocal = new Date(year, month - 1, day, 0, 0, 0, 0);
        const startDateTime = new Date(startDateTimeLocal.getTime() - startDateTimeLocal.getTimezoneOffset() * 60000);
        where.createdAt.gte = startDateTime;
      }
      if (endDate) {
        // Criar data no fuso horário local e ajustar para UTC
        const [year, month, day] = endDate.split('-').map(Number);
        const endDateTimeLocal = new Date(year, month - 1, day, 23, 59, 59, 999);
        const endDateTime = new Date(endDateTimeLocal.getTime() - endDateTimeLocal.getTimezoneOffset() * 60000);
        where.createdAt.lte = endDateTime;
      }
    }
    
    const [preOrders, total] = await Promise.all([
      prisma.preOrder.findMany({
        where,
        skip: (page - 1) * size,
        take: size,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          customerId: true,
          subtotalCents: true,
          discountCents: true,
          deliveryFeeCents: true,
          totalCents: true,
          notes: true,
          createdAt: true,
          deliveryStatus: true,
          estimatedDeliveryTime: true,
          deliveryStartedAt: true,
          deliveredAt: true,
          customer: {
            select: preOrderCustomerSelect
          },
          deliveryPerson: {
            select: { id: true, name: true }
          },
          // A trilha do pedido na Mesa de Trabalho é montada a partir daqui.
          tracking: {
            select: { id: true, status: true, timestamp: true, notes: true },
            orderBy: { timestamp: 'asc' }
          },
          items: {
            include: {
              product: {
                select: preOrderItemProductSelect
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
    
    // Buscar produtos para validação
    const productIds = body.items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, priceCents: true, pricePerKgCents: true }
    });
    const productsMap = new Map(products.map(p => [p.id, p]));
    
    // Valida e precifica os itens (unitários e por quilo)
    const normalized = buildPreOrderItems(body.items, productsMap);
    
    if ('error' in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }
    
    const { itemsData, subtotalCents } = normalized;
    
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
          select: preOrderCustomerSelect
        },
        items: {
          include: {
            product: {
              select: preOrderItemProductSelect
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
    
    // Verificar estoque antes de criar o pedido. A soma é por produto, não por
    // linha: um item por quilo ocupa uma linha por peso, e a baixa acontece em
    // todas elas.
    const requestedByProduct = new Map<string, number>();
    for (const item of preOrder.items) {
      requestedByProduct.set(
        item.productId,
        (requestedByProduct.get(item.productId) || 0) + item.quantity
      );
    }
    
    for (const [productId, requestedUnits] of requestedByProduct) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { 
          id: true, 
          name: true, 
          stockEnabled: true, 
          stock: true 
        }
      });
      
      if (!product) {
        return NextResponse.json(
          { error: `Product with ID ${productId} not found` },
          { status: 400 }
        );
      }
      
      if (product.stockEnabled && product.stock !== null) {
        if (product.stock < requestedUnits) {
          return NextResponse.json(
            {
              error: `Estoque insuficiente para "${product.name}": ${requestedUnits} un. no pedido, ${product.stock} ${
                product.stock === 1 ? 'disponível' : 'disponíveis'
              }.`
            },
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
          // Add cash payment information if provided (convert to cents)
          ...(body.paymentMethod === 'cash' && body.cashReceived !== undefined && body.change !== undefined && {
            cashReceivedCents: Math.round(body.cashReceived * 100),
            changeCents: Math.round(body.change * 100)
          }),
          items: {
            create: preOrder.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              priceCents: item.priceCents,
              weightKg: item.weightKg ? parseFloat(item.weightKg.toString()) : null
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
      
      await decrementStockForItems(prisma, preOrder.items);
      
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
    
    // Buscar produtos para validação
    const productIds = body.items?.map((item: any) => item.productId) || [];
    const products = productIds.length > 0 ? await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, priceCents: true, pricePerKgCents: true }
    }) : [];
    const productsMap = new Map(products.map(p => [p.id, p]));
    
    // Valida e precifica os itens (unitários e por quilo)
    const normalized = buildPreOrderItems(body.items || [], productsMap);
    
    if ('error' in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }
    
    const { itemsData, subtotalCents } = normalized;
    
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
          select: preOrderCustomerSelect
        },
        items: {
          include: {
            product: {
              select: preOrderItemProductSelect
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
    
    // Excluir dados relacionados primeiro (devido à restrições de chave estrangeira)
    // Limpar tracking de entrega (latitudes/longitudes) para não manter dados órfãos
    await prisma.deliveryTracking.deleteMany({
      where: { preOrderId: id }
    });
    
    // Excluir itens do pré-pedido
    await prisma.preOrderItem.deleteMany({
      where: { preOrderId: id }
    });
    
    // Excluir pré-pedido (o cascade também limparia automaticamente, mas deixamos explícito)
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
