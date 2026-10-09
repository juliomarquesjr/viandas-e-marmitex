import { ORDERING, isOrderExpired } from '@/lib/ordering';
import prisma from '@/lib/prisma';
import { publishToCustomer, publishToStaff } from '@/lib/realtime';
import { requireAdmin } from '@/lib/staff-session';
import { NextResponse } from 'next/server';

const MAX_REASON = 200;

// POST - O administrador aceita ou recusa um pedido feito pelo cliente
//   { action: 'accept', minutes?: 15|30|45|60 }   aceita (o pedido segue na fila; "minutes" vira a previsão para o cliente)
//   { action: 'reject', reason? }                 recusa (o pedido é cancelado e o cliente vê o motivo)
//
// updateMany com o estado no where: se outro operador (ou o cliente, cancelando) chegou antes, responde 409.
// Pedido que ficou sem resposta além do prazo não pode mais ser aceito, só recusado.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;

    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { action?: unknown; minutes?: unknown; reason?: unknown } | null;
    const action = body?.action;
    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }

    const order = await prisma.preOrder.findUnique({
      where: { id },
      select: { id: true, customerId: true, source: true, approval: true, createdAt: true },
    });
    if (!order || order.source !== 'online') {
      return NextResponse.json({ error: 'Pedido do cliente não encontrado' }, { status: 404 });
    }

    const now = new Date();
    const where = { id, source: 'online', approval: 'awaiting' } as const;
    let claimed: { count: number };

    if (action === 'accept') {
      if (isOrderExpired(order.createdAt, now)) {
        return NextResponse.json(
          { error: 'Este pedido ficou sem resposta por muito tempo e expirou. Recuse para avisar o cliente.', code: 'EXPIRED' },
          { status: 409 }
        );
      }
      const minutes = (ORDERING.ACCEPT_MINUTES as readonly number[]).includes(body?.minutes as number) ? (body!.minutes as number) : null;
      claimed = await prisma.preOrder.updateMany({
        where,
        data: {
          approval: 'accepted',
          respondedAt: now,
          ...(minutes ? { estimatedDeliveryTime: new Date(now.getTime() + minutes * 60_000) } : {}),
        },
      });
    } else {
      const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, MAX_REASON) : '';
      claimed = await prisma.preOrder.updateMany({
        where,
        data: { approval: 'rejected', deliveryStatus: 'cancelled', respondedAt: now, rejectReason: reason || null },
      });
    }

    if (claimed.count === 0) {
      const current = await prisma.preOrder.findUnique({ where: { id }, select: { approval: true } });
      const what: Record<string, string> = { accepted: 'aceito', rejected: 'recusado', cancelled: 'cancelado pelo cliente' };
      return NextResponse.json(
        { error: `Este pedido já foi ${what[current?.approval ?? ''] ?? 'respondido'}.`, code: 'ALREADY_ANSWERED' },
        { status: 409 }
      );
    }

    console.info(JSON.stringify({ event: 'online_order.responded', preOrderId: id, action, by: auth.staff.userId }));
    await Promise.all([
      publishToStaff('notification.changed', { id }),
      publishToCustomer(order.customerId, 'pre-order.updated', { id }),
    ]);

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error('Error answering online order:', error);
    return NextResponse.json({ error: 'Erro ao responder o pedido' }, { status: 500 });
  }
}
