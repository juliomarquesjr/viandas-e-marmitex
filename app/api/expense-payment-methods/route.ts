
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const paymentMethods = await prisma.expensePaymentMethod.findMany({
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(paymentMethods);
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        return NextResponse.json(
            { error: 'Failed to fetch payment methods' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        if (!body.name || body.name.trim() === '') {
            return NextResponse.json(
                { error: 'Nome é obrigatório' },
                { status: 400 }
            );
        }

        const existing = await prisma.expensePaymentMethod.findUnique({
            where: { name: body.name },
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Já existe um método de pagamento com este nome' },
                { status: 400 }
            );
        }

        const paymentMethod = await prisma.expensePaymentMethod.create({
            data: {
                name: body.name.trim(),
                description: body.description,
                active: body.active !== undefined ? body.active : true,
            },
        });

        return NextResponse.json(paymentMethod);
    } catch (error) {
        console.error('Error creating payment method:', error);
        return NextResponse.json(
            { error: 'Failed to create payment method' },
            { status: 500 }
        );
    }
}
