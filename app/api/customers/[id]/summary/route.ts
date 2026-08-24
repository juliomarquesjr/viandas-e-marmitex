import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

/**
 * O resumo que o dossiê do cliente mostra na Mesa de Pedido: quantos pedidos,
 * quando foi o último e quanto está em aberto.
 *
 * O saldo devedor segue a mesma regra do fechamento em
 * `/api/customers/[id]/report`: fiado é venda com `status: 'pending'` que não
 * seja um pagamento de ficha, e o que o cliente já quitou entra como
 * `paymentMethod: 'ficha_payment'`. Duplicar a conta aqui seria arriscar duas
 * verdades sobre a mesma dívida — se a regra mudar, muda nos dois lugares.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const [orders, pending, payments] = await Promise.all([
      prisma.order.aggregate({
        where: { customerId, paymentMethod: { not: 'ficha_payment' } },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      prisma.order.aggregate({
        where: {
          customerId,
          status: 'pending',
          paymentMethod: { not: 'ficha_payment' },
        },
        _sum: { totalCents: true },
      }),
      prisma.order.aggregate({
        where: { customerId, paymentMethod: 'ficha_payment' },
        _sum: { totalCents: true },
      }),
    ]);

    const debtBalanceCents =
      (pending._sum.totalCents ?? 0) - (payments._sum.totalCents ?? 0);

    return NextResponse.json({
      data: {
        orderCount: orders._count._all,
        lastOrderAt: orders._max.createdAt,
        // Crédito a favor do cliente não é dívida negativa: vira zero.
        debtBalanceCents: Math.max(0, debtBalanceCents),
      },
    });
  } catch (error) {
    console.error('Error fetching customer summary:', error);
    return NextResponse.json(
      { error: 'Falha ao carregar o resumo do cliente' },
      { status: 500 }
    );
  }
}
