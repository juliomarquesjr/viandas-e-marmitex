import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    
    // Validação básica
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }
    
    // Verificar se o tipo de despesa existe
    const existingExpenseType = await prisma.expenseType.findUnique({
      where: { id }
    });
    
    if (!existingExpenseType) {
      return NextResponse.json(
        { error: 'Tipo de despesa não encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar se já existe outro tipo com o mesmo nome
    const duplicateExpenseType = await prisma.expenseType.findFirst({
      where: { 
        name: { mode: 'insensitive', equals: body.name.trim() },
        id: { not: id }
      }
    });
    
    if (duplicateExpenseType) {
      return NextResponse.json(
        { error: 'Tipo de despesa com este nome já existe' },
        { status: 400 }
      );
    }
    
    const updatedExpenseType = await prisma.expenseType.update({
      where: { id },
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        active: body.active !== undefined ? body.active : true
      }
    });
    
    return NextResponse.json(updatedExpenseType);
  } catch (error) {
    console.error('Error updating expense type:', error);
    return NextResponse.json(
      { error: 'Failed to update expense type' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    // Verificar se o tipo de despesa existe
    const existingExpenseType = await prisma.expenseType.findUnique({
      where: { id },
      include: { expenses: true }
    });
    
    if (!existingExpenseType) {
      return NextResponse.json(
        { error: 'Tipo de despesa não encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar se há despesas vinculadas
    if (existingExpenseType.expenses.length > 0) {
      return NextResponse.json(
        { 
          error: 'Não é possível remover este tipo de despesa pois existem despesas vinculadas a ele',
          count: existingExpenseType.expenses.length
        },
        { status: 400 }
      );
    }
    
    await prisma.expenseType.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: 'Tipo de despesa removido com sucesso' });
  } catch (error) {
    console.error('Error deleting expense type:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense type' },
      { status: 500 }
    );
  }
}
