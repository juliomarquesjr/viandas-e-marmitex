import { loadAwaitingOrders } from '@/lib/online-ordering';
import { loadNotificationDTOs } from '@/lib/notifications';
import type { NotificationListResponse } from '@/lib/notification-types';
import prisma from '@/lib/prisma';
import { requireStaff } from '@/lib/staff-session';
import { NextResponse } from 'next/server';

const MAX_LIMIT = 50;

// GET - Notificações dos funcionários, da mais nova para a mais antiga
//   ?limit=20   quantas trazer (até 50)
//   ?before=ISO traz só as anteriores a essa data (paginação)
//   ?filter=pending traz só as que ainda pedem ação
export async function GET(request: Request) {
  try {
    const auth = await requireStaff();
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 1), MAX_LIMIT);
    const beforeParam = searchParams.get('before');
    const before = beforeParam ? new Date(beforeParam) : null;
    if (before && Number.isNaN(before.getTime())) {
      return NextResponse.json({ error: 'Parâmetro "before" inválido' }, { status: 400 });
    }
    const onlyPending = searchParams.get('filter') === 'pending';

    const where = {
      ...(before ? { createdAt: { lt: before } } : {}),
      ...(onlyPending ? { resolvedAt: null } : {}),
    };

    const [rows, notificationBadge, notificationPending, awaiting] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        include: { customer: { select: { name: true } } },
      }),
      prisma.notification.count({ where: { OR: [{ readAt: null }, { resolvedAt: null }] } }),
      prisma.notification.count({ where: { resolvedAt: null } }),
      loadAwaitingOrders(),
    ]);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const response: NotificationListResponse = {
      notifications: await loadNotificationDTOs(page),
      // O pedido do cliente aguardando conta no sino e na home pela mesma fonte (o próprio pedido)
      badgeCount: notificationBadge + awaiting.count,
      pendingCount: notificationPending + awaiting.count,
      awaitingOrders: awaiting.items,
      awaitingOrdersCount: awaiting.count,
      nextBefore: hasMore ? page[page.length - 1].createdAt.toISOString() : null,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error listing notifications:', error);
    return NextResponse.json({ error: 'Erro ao buscar notificações' }, { status: 500 });
  }
}
