import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMobileSession } from '@/lib/mobile-auth';

export async function GET() {
    try {
        // Verificar autenticação mobile
        const session = await getMobileSession();

        if (!session || !session.id) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401 }
            );
        }

        const customerId = session.id as string;

        // Buscar último pedido do cliente
        const lastOrder = await prisma.order.findFirst({
            where: {
                customerId,
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!lastOrder) {
            return NextResponse.json(
                { message: 'Nenhum pedido encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            order: lastOrder
        });

    } catch (error) {
        console.error('Erro ao buscar último pedido:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar último pedido' },
            { status: 500 }
        );
    }
}
