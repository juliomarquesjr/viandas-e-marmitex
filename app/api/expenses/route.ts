import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const typeId = searchParams.get('typeId');
    const supplierTypeId = searchParams.get('supplierTypeId');

    // Construir filtros
    const where: any = {};
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    
    if (typeId) {
      where.typeId = typeId;
    }
    
    if (supplierTypeId) {
      where.supplierTypeId = supplierTypeId;
    }

    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          type: {
            select: {
              id: true,
              name: true
            }
          },
          supplierType: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit
      }),
      prisma.expense.count({ where })
    ]);

    return NextResponse.json({
      expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
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
    if (!body.typeId) {
      return NextResponse.json(
        { error: 'Tipo de despesa é obrigatório' },
        { status: 400 }
      );
    }
    
    if (!body.supplierTypeId) {
      return NextResponse.json(
        { error: 'Tipo de fornecedor é obrigatório' },
        { status: 400 }
      );
    }
    
    if (!body.amountCents || body.amountCents <= 0) {
      return NextResponse.json(
        { error: 'Valor da despesa deve ser maior que zero' },
        { status: 400 }
      );
    }
    
    if (!body.description || body.description.trim() === '') {
      return NextResponse.json(
        { error: 'Descrição é obrigatória' },
        { status: 400 }
      );
    }
    
    if (!body.date) {
      return NextResponse.json(
        { error: 'Data é obrigatória' },
        { status: 400 }
      );
    }
    
    // Verificar se os tipos existem
    const [expenseType, supplierType] = await Promise.all([
      prisma.expenseType.findUnique({ where: { id: body.typeId } }),
      prisma.supplierType.findUnique({ where: { id: body.supplierTypeId } })
    ]);
    
    if (!expenseType) {
      return NextResponse.json(
        { error: 'Tipo de despesa não encontrado' },
        { status: 400 }
      );
    }
    
    if (!supplierType) {
      return NextResponse.json(
        { error: 'Tipo de fornecedor não encontrado' },
        { status: 400 }
      );
    }
    
    const expense = await prisma.expense.create({
      data: {
        typeId: body.typeId,
        supplierTypeId: body.supplierTypeId,
        amountCents: body.amountCents,
        description: body.description.trim(),
        date: new Date(body.date + 'T00:00:00')
      },
      include: {
        type: {
          select: {
            id: true,
            name: true
          }
        },
        supplierType: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense' },
      { status: 500 }
    );
  }
}
