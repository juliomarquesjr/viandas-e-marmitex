import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCustomerSession } from '@/lib/customer-auth';
import { parseCustomerDateRange } from '@/lib/customer-date-range';

// GET - Ficha do cliente autenticado
//
// O saldo é sempre o da ficha inteira: filtrar um período muda as listas e os
// totais do período, nunca o quanto o cliente deve. Antes o saldo seguia o
// filtro, e quem olhava "esta semana" via uma dívida menor do que a real.
export async function GET(request: Request) {
  try {
    const session = await getCustomerSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = parseCustomerDateRange(searchParams.get('startDate'), searchParams.get('endDate'));
    if (range === 'invalid') {
      return NextResponse.json({ error: 'Período inválido' }, { status: 400 });
    }

    const customerId = session.user.customerId;
    const purchasesWhere = { customerId, status: 'pending', paymentMethod: { not: 'ficha_payment' as const } };
    const paymentsWhere = { customerId, paymentMethod: 'ficha_payment' as const };

    const [allPending, allPayments, pendingOrders, fichaPayments] = await Promise.all([
      prisma.order.aggregate({ where: purchasesWhere, _sum: { totalCents: true } }),
      prisma.order.aggregate({ where: paymentsWhere, _sum: { totalCents: true } }),
      prisma.order.findMany({
        where: { ...purchasesWhere, ...(range ? { createdAt: range } : {}) },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.findMany({
        where: { ...paymentsWhere, ...(range ? { createdAt: range } : {}) },
        select: {
          id: true,
          totalCents: true,
          createdAt: true,
          status: true,
          paymentMethod: true,
          cashReceivedCents: true,
          changeCents: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalPending = allPending._sum.totalCents ?? 0;
    const totalPayments = allPayments._sum.totalCents ?? 0;

    return NextResponse.json({
      balanceCents: totalPending - totalPayments,
      totalPending,
      totalPayments,
      period: range
        ? {
            pendingCents: pendingOrders.reduce((sum, order) => sum + order.totalCents, 0),
            paymentsCents: fichaPayments.reduce((sum, payment) => sum + payment.totalCents, 0),
          }
        : null,
      pendingOrders,
      fichaPayments,
    });
  } catch (error) {
    console.error('Error fetching customer expenses:', error);
    return NextResponse.json({ error: 'Erro ao buscar ficha' }, { status: 500 });
  }
}
