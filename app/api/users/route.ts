import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Função auxiliar para hash de senha (placeholder)
async function hashPassword(password: string): Promise<string> {
  // Em produção, usar bcrypt ou outra biblioteca de hash
  return `hashed_${password}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const size = parseInt(searchParams.get('size') || '10');
    const role = searchParams.get('role') || 'all';
    const status = searchParams.get('status') || 'all';
    
    const where: any = {};
    
    // Filtro de busca
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } }
      ];
    }
    
    // Filtro de role
    if (role !== 'all') {
      where.role = role;
    }
    
    // Filtro de status
    if (status !== 'all') {
      where.active = status === 'active';
    }
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * size,
        take: size,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);
    
    return NextResponse.json({
      data: users.map(user => ({
        ...user,
        status: user.active ? 'active' : 'inactive',
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      })),
      pagination: {
        page,
        size,
        total,
        pages: Math.ceil(total / size)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validação básica
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }
    
    // Verificar se o email já existe
    const existingUser = await prisma.user.findFirst({
      where: { email: body.email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    
    // Criptografar senha (placeholder - implementar bcrypt na produção)
    const hashedPassword = body.password 
      ? await hashPassword(body.password) 
      : await hashPassword('123456'); // Senha padrão
    
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
        role: body.role || 'employee',
        active: body.status === 'active'
      }
    });
    
    return NextResponse.json({
      ...user,
      status: user.active ? 'active' : 'inactive',
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
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
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Validação básica
    if (!data.name || !data.email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }
    
    // Verificar se o email já existe em outro usuário
    const existingUser = await prisma.user.findFirst({
      where: { 
        email: data.email,
        NOT: { id }
      }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    
    // Atualizar senha se fornecida
    let updateData: any = {
      name: data.name,
      email: data.email,
      role: data.role || 'employee',
      active: data.status === 'active'
    };
    
    if (password) {
      updateData.password = await hashPassword(password);
    }
    
    const user = await prisma.user.update({
      where: { id },
      data: updateData
    });
    
    return NextResponse.json({
      ...user,
      status: user.active ? 'active' : 'inactive',
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
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
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    await prisma.user.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}