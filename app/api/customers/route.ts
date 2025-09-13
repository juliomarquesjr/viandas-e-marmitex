import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : null;
    const size = searchParams.get('size') ? parseInt(searchParams.get('size')!) : null;
    const status = searchParams.get('status') || 'all';
    
    const where: any = {};
    
    // Filtro de busca
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { email: { contains: q, mode: 'insensitive' } },
        { doc: { contains: q } },
        { barcode: { contains: q } }
      ];
    }
    
    // Filtro de status
    if (status === 'active') {
      where.active = true;
    } else if (status === 'inactive') {
      where.active = false;
    }
    
    // Se não especificar paginação, retornar todos os clientes
    const shouldPaginate = page !== null && size !== null;
    
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        ...(shouldPaginate && {
          skip: (page - 1) * size,
          take: size,
        }),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.customer.count({ where })
    ]);
    
    return NextResponse.json({
      data: customers,
      ...(shouldPaginate && {
        pagination: {
          page,
          size,
          total,
          pages: Math.ceil(total / size)
        }
      })
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validação básica
    if (!body.name || !body.phone) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      );
    }
    
    const customer = await prisma.customer.create({
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email,
        doc: body.doc,
        barcode: body.barcode,
        address: body.address ? JSON.parse(JSON.stringify(body.address)) : undefined,
        active: body.active !== undefined ? body.active : true
      }
    });
    
    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }
    
    // Validação básica
    if (!data.name || !data.phone) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      );
    }
    
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        doc: data.doc,
        barcode: data.barcode,
        address: data.address ? JSON.parse(JSON.stringify(data.address)) : undefined,
        active: data.active !== undefined ? data.active : true
      }
    });
    
    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }
    
    // Verificar se o cliente tem pedidos ou pré-pedidos associados
    const [orderCount, preOrderCount] = await Promise.all([
      prisma.order.count({ where: { customerId: id } }),
      prisma.preOrder.count({ where: { customerId: id } })
    ]);
    
    // Se o cliente tiver pedidos ou pré-pedidos, não podemos excluí-lo
    if (orderCount > 0 || preOrderCount > 0) {
      return NextResponse.json(
        { 
          error: `Não é possível excluir o cliente pois ele possui ${orderCount} pedido(s) e ${preOrderCount} pré-pedido(s) associado(s).` 
        },
        { status: 400 }
      );
    }
    
    // Se não tiver pedidos ou pré-pedidos, podemos excluir o cliente e todos os registros relacionados
    await prisma.$transaction(async (prisma) => {
      // Desativar todos os presets do cliente (em vez de excluir)
      await prisma.customerProductPreset.updateMany({
        where: { customerId: id },
        data: { active: false }
      });
      
      // Excluir o cliente
      await prisma.customer.delete({
        where: { id }
      });
    });
    
    return NextResponse.json({ message: 'Cliente excluído com sucesso' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    // Verificar se é um erro de constraint
    if (error instanceof Error && error.message.includes('foreign key constraint')) {
      return NextResponse.json(
        { error: 'Não é possível excluir o cliente pois ele possui registros relacionados.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Falha ao excluir cliente. Verifique se o cliente possui pedidos ou pré-pedidos associados.' },
      { status: 500 }
    );
  }
}