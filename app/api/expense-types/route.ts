import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const expenseTypes = await prisma.expenseType.findMany({
      orderBy: { name: 'asc' }
    });
    
    return NextResponse.json(expenseTypes);
  } catch (error) {
    console.error('Error fetching expense types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expense types' },
      { status: 500 }
    );
  }
}

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
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }
    
    // Verificar se o tipo de despesa já existe
    const existingExpenseType = await prisma.expenseType.findFirst({
      where: { name: { mode: 'insensitive', equals: body.name.trim() } }
    });
    
    if (existingExpenseType) {
      return NextResponse.json(
        { error: 'Tipo de despesa com este nome já existe' },
        { status: 400 }
      );
    }
    
    const expenseType = await prisma.expenseType.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        active: body.active !== undefined ? body.active : true
      }
    });
    
    return NextResponse.json(expenseType);
  } catch (error) {
    console.error('Error creating expense type:', error);
    return NextResponse.json(
      { error: 'Failed to create expense type' },
      { status: 500 }
    );
  }
}
