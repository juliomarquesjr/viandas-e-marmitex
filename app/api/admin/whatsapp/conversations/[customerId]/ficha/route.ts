import { NextResponse } from 'next/server';
import { getCustomerBalance } from '@/lib/customer-balance';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/staff-session';

const LAST = 40;

// GET - Saldo da ficha (positivo = deve; negativo = crédito) e as últimas compras e pagamentos do cliente
export async function GET(_request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { customerId } = await params;
  try {
    const [{ balanceCents: debtCents }, orders] = await Promise.all([
      getCustomerBalance(customerId),
      prisma.order.findMany({
        where: { customerId, status: { not: 'cancelled' } },
        orderBy: { createdAt: 'desc' },
        take: LAST,
        select: {
          id: true,
          createdAt: true,
          totalCents: true,
          status: true,
          paymentMethod: true,
          items: { select: { quantity: true, product: { select: { name: true } } }, take: 20 },
        },
      }),
    ]);
    const entries = orders.map((o) => {
      const payment = o.paymentMethod === 'ficha_payment';
      const names = o.items.map((i) => `${i.quantity}× ${i.product?.name ?? 'Produto'}`);
      return {
        id: o.id,
        at: o.createdAt.toISOString(),
        totalCents: o.totalCents,
        kind: payment ? 'payment' : 'purchase',
        // compra ainda não paga (fiado em aberto)
        open: !payment && o.status === 'pending',
        summary: payment ? 'Pagamento da ficha' : names.length > 3 ? `${names.slice(0, 3).join(', ')} e mais ${names.length - 3}` : names.join(', ') || 'Venda',
      };
    });
    return NextResponse.json({ debtCents, entries }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error loading customer ficha for chat:', error);
    return NextResponse.json({ error: 'Erro ao carregar a ficha do cliente' }, { status: 500 });
  }
}
