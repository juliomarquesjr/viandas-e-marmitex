import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supplierTypes = await prisma.supplierType.findMany({
      orderBy: { name: 'asc' }
    });
    
    return NextResponse.json(supplierTypes);
  } catch (error) {
    console.error('Error fetching supplier types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier types' },
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
    
    // Verificar se o tipo de fornecedor já existe
    const existingSupplierType = await prisma.supplierType.findFirst({
      where: { name: { mode: 'insensitive', equals: body.name.trim() } }
    });
    
    if (existingSupplierType) {
      return NextResponse.json(
        { error: 'Tipo de fornecedor com este nome já existe' },
        { status: 400 }
      );
    }
    
    const supplierType = await prisma.supplierType.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        active: body.active !== undefined ? body.active : true
      }
    });
    
    return NextResponse.json(supplierType);
  } catch (error) {
    console.error('Error creating supplier type:', error);
    return NextResponse.json(
      { error: 'Failed to create supplier type' },
      { status: 500 }
    );
  }
}
