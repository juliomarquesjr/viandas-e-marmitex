import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMobileSession } from '@/lib/mobile-auth';

export async function GET() {
    try {
        const session = await getMobileSession();

        if (!session || !session.id) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401 }
            );
        }

        const customerId = session.id as string;

        // Buscar dados completos do cliente
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                doc: true,
                address: true
            }
        });

        if (!customer) {
            return NextResponse.json(
                { error: 'Cliente não encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json({ customer });

    } catch (error) {
        console.error('Erro ao buscar dados do cliente:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar dados' },
            { status: 500 }
        );
    }
}
