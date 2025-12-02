import prisma from '@/lib/prisma';
import bcrypt from "bcryptjs";
import { NextResponse } from 'next/server';

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
    
    // Criptografar senha
    const hashedPassword = body.password 
      ? await bcrypt.hash(body.password, 10) 
      : await bcrypt.hash('123456', 10); // Senha padrão
    
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
        role: body.role || 'pdv',
        active: body.status === 'active',
        facialImageUrl: body.facialImageUrl || undefined,
        facialDescriptor: body.facialDescriptor || undefined
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
    
    // Buscar usuário existente
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Se está atualizando apenas dados faciais (sem name/email), não validar
    const isFacialOnlyUpdate = !data.name && !data.email && (data.facialImageUrl !== undefined || data.facialDescriptor !== undefined);
    
    // Validação básica (apenas se não for atualização apenas facial)
    if (!isFacialOnlyUpdate) {
      if (!data.name || !data.email) {
        return NextResponse.json(
          { error: 'Name and email are required' },
          { status: 400 }
        );
      }
      
      // Verificar se o email já existe em outro usuário
      const emailExists = await prisma.user.findFirst({
        where: { 
          email: data.email,
          NOT: { id }
        }
      });
      
      if (emailExists) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        );
      }
    }
    
    // Preparar dados de atualização
    let updateData: any = {};
    
    // Se não for atualização apenas facial, incluir campos básicos
    if (!isFacialOnlyUpdate) {
      updateData.name = data.name;
      updateData.email = data.email;
      if (data.role !== undefined) {
        updateData.role = data.role;
      }
      if (data.status !== undefined) {
        updateData.active = data.status === 'active';
      }
    }
    
    // Atualizar senha se fornecida
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    // Atualizar dados faciais se fornecidos
    if (data.facialImageUrl !== undefined) {
      updateData.facialImageUrl = data.facialImageUrl || null;
    }
    
    if (data.facialDescriptor !== undefined) {
      updateData.facialDescriptor = data.facialDescriptor || null;
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