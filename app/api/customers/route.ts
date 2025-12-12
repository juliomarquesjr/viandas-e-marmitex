import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma } from '@/lib/generated/prisma';

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
    
    // Não retornar senhas
    const customersWithoutPasswords = customers.map(({ password, ...customer }) => customer);
    
    return NextResponse.json({
      data: customersWithoutPasswords,
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
    
    // Converter email vazio para null (banco não aceita string vazia)
    const emailValue = body.email?.trim() || null;
    
    // Validar unicidade de email se fornecido
    if (emailValue) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { email: emailValue }
      });
      
      if (existingCustomer) {
        return NextResponse.json(
          { error: 'Este email já está cadastrado para outro cliente' },
          { status: 400 }
        );
      }
    }
    
    // Hash da senha se fornecida e não vazia
    let hashedPassword = undefined;
    if (body.password && typeof body.password === 'string' && body.password.trim()) {
      hashedPassword = await bcrypt.hash(body.password.trim(), 10);
    }
    
    const customer = await prisma.customer.create({
      data: {
        name: body.name,
        phone: body.phone,
        email: emailValue,
        doc: body.doc,
        barcode: body.barcode,
        password: hashedPassword,
        address: body.address ? JSON.parse(JSON.stringify(body.address)) : undefined,
        active: body.active !== undefined ? body.active : true
      }
    });
    
    // Não retornar a senha
    const { password, ...customerWithoutPassword } = customer;
    return NextResponse.json(customerWithoutPassword);
  } catch (error) {
    console.error('Error creating customer:', error);
    
    // Verificar se é erro de constraint única do Prisma (P2002)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        // Violação de constraint única
        const target = error.meta?.target as string[] | undefined;
        if (target?.includes('email')) {
          return NextResponse.json(
            { error: 'Este email já está cadastrado para outro cliente' },
            { status: 400 }
          );
        }
        if (target?.includes('barcode')) {
          return NextResponse.json(
            { error: 'Este código de barras já está cadastrado para outro cliente' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: 'Já existe um registro com estes dados únicos' },
          { status: 400 }
        );
      }
    }
    
    // Fallback para outros tipos de erro
    if (error instanceof Error && (error.message.includes('Unique constraint') || error.message.includes('email'))) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado para outro cliente' },
        { status: 400 }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to create customer';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, password, ...data } = body;
    
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
    
    // Converter email vazio para null (banco não aceita string vazia)
    const emailValue = data.email?.trim() || null;
    
    // Validar unicidade de email se fornecido e diferente do atual
    if (emailValue) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { email: emailValue }
      });
      
      if (existingCustomer && existingCustomer.id !== id) {
        return NextResponse.json(
          { error: 'Este email já está cadastrado para outro cliente' },
          { status: 400 }
        );
      }
    }
    
    // Preparar dados de atualização
    const updateData: any = {
      name: data.name,
      phone: data.phone,
      email: emailValue,
      doc: data.doc,
      barcode: data.barcode,
      address: data.address ? JSON.parse(JSON.stringify(data.address)) : undefined,
      active: data.active !== undefined ? data.active : true
    };
    
    // Hash da senha se fornecida e não vazia
    if (password && typeof password === 'string' && password.trim()) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }
    
    const customer = await prisma.customer.update({
      where: { id },
      data: updateData
    });
    
    // Não retornar a senha
    const { password: _, ...customerWithoutPassword } = customer;
    return NextResponse.json(customerWithoutPassword);
  } catch (error) {
    console.error('Error updating customer:', error);
    
    // Verificar se é erro de constraint única do Prisma (P2002)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        // Violação de constraint única
        const target = error.meta?.target as string[] | undefined;
        if (target?.includes('email')) {
          return NextResponse.json(
            { error: 'Este email já está cadastrado para outro cliente' },
            { status: 400 }
          );
        }
        if (target?.includes('barcode')) {
          return NextResponse.json(
            { error: 'Este código de barras já está cadastrado para outro cliente' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: 'Já existe um registro com estes dados únicos' },
          { status: 400 }
        );
      }
    }
    
    // Fallback para outros tipos de erro
    if (error instanceof Error && (error.message.includes('Unique constraint') || error.message.includes('email'))) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado para outro cliente' },
        { status: 400 }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to update customer';
    return NextResponse.json(
      { error: errorMessage },
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