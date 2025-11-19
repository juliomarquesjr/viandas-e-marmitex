import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    // Validação básica
    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Email/telefone e senha são obrigatórios', needsPassword: false },
        { status: 400 }
      );
    }

    // Buscar cliente por email ou telefone
    const phoneWithoutFormatting = identifier.replace(/\D/g, '');
    
    const customer = await prisma.customer.findFirst({
      where: {
        active: true,
        OR: [
          { email: identifier },
          { phone: { contains: phoneWithoutFormatting } },
          { phone: { contains: identifier } }
        ]
      }
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Cliente não encontrado ou inativo', needsPassword: false },
        { status: 404 }
      );
    }

    // Verificar se o cliente tem senha cadastrada
    if (!customer.password) {
      return NextResponse.json(
        { 
          error: 'Cliente não possui senha cadastrada. Entre em contato com o suporte.', 
          needsPassword: true 
        },
        { status: 400 }
      );
    }

    // Validar senha
    const isPasswordValid = await bcrypt.compare(password, customer.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Senha incorreta', needsPassword: false },
        { status: 401 }
      );
    }

    // Não retornar a senha
    const { password: _, ...customerWithoutPassword } = customer;

    return NextResponse.json({
      customer: customerWithoutPassword,
      message: 'Login realizado com sucesso'
    });
  } catch (error) {
    console.error('Error in customer login:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer login';
    return NextResponse.json(
      { error: errorMessage, needsPassword: false },
      { status: 500 }
    );
  }
}
