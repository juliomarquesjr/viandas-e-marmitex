
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
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        if (!body.name || body.name.trim() === '') {
            return NextResponse.json(
                { error: 'Nome é obrigatório' },
                { status: 400 }
            );
        }

        const existing = await prisma.expensePaymentMethod.findFirst({
            where: {
                name: body.name,
                id: { not: id },
            },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Já existe um método de pagamento com este nome' },
                { status: 400 }
            );
        }

        const paymentMethod = await prisma.expensePaymentMethod.update({
            where: { id },
            data: {
                name: body.name.trim(),
                description: body.description,
                active: body.active,
            },
        });

        return NextResponse.json(paymentMethod);
    } catch (error) {
        console.error('Error updating payment method:', error);
        return NextResponse.json(
            { error: 'Failed to update payment method' },
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
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // Verificar se está em uso
        const expensesCount = await prisma.expense.count({
            where: { paymentMethodId: id },
        });

        if (expensesCount > 0) {
            return NextResponse.json(
                {
                    error:
                        'Não é possível excluir este método de pagamento pois existem despesas vinculadas a ele. Tente desativá-lo.',
                },
                { status: 400 }
            );
        }

        await prisma.expensePaymentMethod.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting payment method:', error);
        return NextResponse.json(
            { error: 'Failed to delete payment method' },
            { status: 500 }
        );
    }
}
