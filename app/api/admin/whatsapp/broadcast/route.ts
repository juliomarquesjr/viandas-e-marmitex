import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { dateStringSP, startOfDaySP } from '@/lib/date-range';
import { requireAdmin } from '@/lib/staff-session';
import type { BroadcastRecipient } from '@/lib/whatsapp-broadcast';

// GET - Clientes com WhatsApp que podem receber um envio em massa, com o que separa os públicos:
// saldo da ficha (quem está devendo) e se já comprou hoje
export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  try {
    const customers = await prisma.customer.findMany({
      where: { active: true, phoneIsWhatsapp: true, NOT: { phone: '' } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    const ids = customers.map((c) => c.id);
    const dayStart = startOfDaySP(dateStringSP());
    const [pending, payments, today] = await Promise.all([
      prisma.order.groupBy({ by: ['customerId'], where: { customerId: { in: ids }, status: 'pending', paymentMethod: { not: 'ficha_payment' } }, _sum: { totalCents: true } }),
      prisma.order.groupBy({ by: ['customerId'], where: { customerId: { in: ids }, paymentMethod: 'ficha_payment' }, _sum: { totalCents: true } }),
      prisma.order.groupBy({
        by: ['customerId'],
        where: {
          customerId: { in: ids },
          status: { not: 'cancelled' },
          // venda sem forma de pagamento também conta; só o pagamento de ficha não é pedido
          OR: [{ paymentMethod: null }, { paymentMethod: { not: 'ficha_payment' } }],
          ...(dayStart ? { createdAt: { gte: dayStart } } : {}),
        },
        _count: { _all: true },
      }),
    ]);
    const owed = new Map(pending.map((p) => [p.customerId, p._sum.totalCents ?? 0]));
    const paid = new Map(payments.map((p) => [p.customerId, p._sum.totalCents ?? 0]));
    const ordered = new Set(today.map((t) => t.customerId));
    const recipients: BroadcastRecipient[] = customers.map((c) => ({
      id: c.id,
      name: c.name,
      debtCents: (owed.get(c.id) ?? 0) - (paid.get(c.id) ?? 0),
      orderedToday: ordered.has(c.id),
    }));
    return NextResponse.json({ recipients }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error loading broadcast audiences:', error);
    return NextResponse.json({ error: 'Erro ao carregar os clientes do envio' }, { status: 500 });
  }
}
