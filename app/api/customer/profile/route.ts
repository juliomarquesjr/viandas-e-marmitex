import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customer-auth';
import bcrypt from 'bcryptjs';
import { Prisma } from '@/lib/generated/prisma';

// GET - Obter dados do cliente autenticado
export async function GET() {
  try {
    const session = await getCustomerSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: session.user.customerId }
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    // Não retornar a senha
    const { password, ...customerWithoutPassword } = customer;
    return NextResponse.json(customerWithoutPassword);
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar perfil' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar dados do cliente autenticado
export async function PUT(request: Request) {
  try {
    const session = await getCustomerSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, phone, email, doc, address, password } = body;

    // Preparar dados para atualização
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    
    // Converter email vazio para null (banco não aceita string vazia)
    if (email !== undefined) {
      const emailValue = email?.trim() || null;
      
      // Validar unicidade de email se fornecido e diferente do atual
      if (emailValue) {
        const existingCustomer = await prisma.customer.findUnique({
          where: { email: emailValue }
        });
        
        if (existingCustomer && existingCustomer.id !== session.user.customerId) {
          return NextResponse.json(
            { error: 'Este email já está cadastrado para outro cliente' },
            { status: 400 }
          );
        }
      }
      
      updateData.email = emailValue;
    }
    
    if (doc !== undefined) updateData.doc = doc?.trim() || null;
    if (address !== undefined) updateData.address = address;
    
    // Se senha foi fornecida, fazer hash
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    // Atualizar cliente
    const customer = await prisma.customer.update({
      where: { id: session.user.customerId },
      data: updateData
    });

    // Não retornar a senha
    const { password: _, ...customerWithoutPassword } = customer;
    return NextResponse.json({
      customer: customerWithoutPassword,
      message: 'Perfil atualizado com sucesso'
    });
  } catch (error) {
    console.error('Error updating customer profile:', error);
    
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
        return NextResponse.json(
          { error: 'Já existe um registro com estes dados únicos' },
          { status: 400 }
        );
      }
    }
    
    // Fallback para outros tipos de erro
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado para outro cliente' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erro ao atualizar perfil' },
      { status: 500 }
    );
  }
}

