import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const expense = await prisma.expense.findUnique({
      where: { id },
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
        },
        paymentMethod: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!expense) {
      return NextResponse.json(
        { error: 'Despesa não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error fetching expense:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expense' },
      { status: 500 }
    );
  }
}

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

    // Verificar se a despesa existe
    const existingExpense = await prisma.expense.findUnique({
      where: { id }
    });

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Despesa não encontrada' },
        { status: 404 }
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

    if (body.paymentMethodId) {
      const paymentMethod = await prisma.expensePaymentMethod.findUnique({
        where: { id: body.paymentMethodId }
      });

      if (!paymentMethod) {
        return NextResponse.json(
          { error: 'Método de pagamento não encontrado' },
          { status: 400 }
        );
      }
    }

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        typeId: body.typeId,
        supplierTypeId: body.supplierTypeId,
        paymentMethodId: body.paymentMethodId || null,
        amountCents: body.amountCents,
        description: body.description.trim(),
        date: new Date(body.date + 'T00:00:00.000Z')
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
        },
        paymentMethod: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { error: 'Failed to update expense' },
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

    // Verificar se a despesa existe
    const existingExpense = await prisma.expense.findUnique({
      where: { id }
    });

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Despesa não encontrada' },
        { status: 404 }
      );
    }

    await prisma.expense.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Despesa removida com sucesso' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
