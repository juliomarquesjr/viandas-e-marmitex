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
    
    // Verificar se o tipo de fornecedor existe
    const existingSupplierType = await prisma.supplierType.findUnique({
      where: { id }
    });
    
    if (!existingSupplierType) {
      return NextResponse.json(
        { error: 'Tipo de fornecedor não encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar se já existe outro tipo com o mesmo nome
    const duplicateSupplierType = await prisma.supplierType.findFirst({
      where: { 
        name: { mode: 'insensitive', equals: body.name.trim() },
        id: { not: id }
      }
    });
    
    if (duplicateSupplierType) {
      return NextResponse.json(
        { error: 'Tipo de fornecedor com este nome já existe' },
        { status: 400 }
      );
    }
    
    const updatedSupplierType = await prisma.supplierType.update({
      where: { id },
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        active: body.active !== undefined ? body.active : true
      }
    });
    
    return NextResponse.json(updatedSupplierType);
  } catch (error) {
    console.error('Error updating supplier type:', error);
    return NextResponse.json(
      { error: 'Failed to update supplier type' },
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
    
    // Verificar se o tipo de fornecedor existe
    const existingSupplierType = await prisma.supplierType.findUnique({
      where: { id },
      include: { expenses: true }
    });
    
    if (!existingSupplierType) {
      return NextResponse.json(
        { error: 'Tipo de fornecedor não encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar se há despesas vinculadas
    if (existingSupplierType.expenses.length > 0) {
      return NextResponse.json(
        { 
          error: 'Não é possível remover este tipo de fornecedor pois existem despesas vinculadas a ele',
          count: existingSupplierType.expenses.length
        },
        { status: 400 }
      );
    }
    
    await prisma.supplierType.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: 'Tipo de fornecedor removido com sucesso' });
  } catch (error) {
    console.error('Error deleting supplier type:', error);
    return NextResponse.json(
      { error: 'Failed to delete supplier type' },
      { status: 500 }
    );
  }
}
