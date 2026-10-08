import type { Prisma, PrismaClient } from '@/lib/generated/prisma';
import prisma from '@/lib/prisma';
import type { NotificationDTO, NotificationType, PaymentIntentStatus } from '@/lib/notification-types';

type Db = PrismaClient | Prisma.TransactionClient;

export interface NewNotification {
  type: NotificationType;
  title: string;
  message?: string | null;
  customerId?: string | null;
  refType?: string | null;
  refId?: string | null;
  /** Notificação só informativa: nasce resolvida e some do "pede ação" assim que for lida. */
  informational?: boolean;
}

/** Cria uma notificação. Aceita a transação em que o fato que a gerou foi gravado. */
export function createNotification(input: NewNotification, db: Db = prisma) {
  return db.notification.create({
    data: {
      type: input.type,
      title: input.title,
      message: input.message ?? null,
      customerId: input.customerId ?? null,
      refType: input.refType ?? null,
      refId: input.refId ?? null,
      resolvedAt: input.informational ? new Date() : null,
    },
  });
}

/** Marca como resolvidas (e lidas) as notificações que apontam para um item. */
export function resolveNotificationsFor(refType: string, refId: string, db: Db = prisma) {
  const now = new Date();
  return Promise.all([
    db.notification.updateMany({ where: { refType, refId, readAt: null }, data: { readAt: now } }),
    db.notification.updateMany({ where: { refType, refId, resolvedAt: null }, data: { resolvedAt: now } }),
  ]);
}

/** Notificações prontas para as telas, com o resumo da intenção de pagamento quando houver. */
export async function loadNotificationDTOs(
  notifications: Array<Prisma.NotificationGetPayload<{ include: { customer: { select: { name: true } } } }>>,
  db: Db = prisma
): Promise<NotificationDTO[]> {
  const intentIds = notifications.filter((n) => n.refType === 'PaymentIntent' && n.refId).map((n) => n.refId as string);
  const intents = intentIds.length
    ? await db.paymentIntent.findMany({
        where: { id: { in: intentIds } },
        select: { id: true, status: true, amountCents: true, confirmedAmountCents: true },
      })
    : [];
  const byId = new Map(intents.map((i) => [i.id, i]));

  return notifications.map((n) => {
    const intent = n.refType === 'PaymentIntent' && n.refId ? byId.get(n.refId) : undefined;
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      customerId: n.customerId,
      customerName: n.customer?.name ?? null,
      refType: n.refType,
      refId: n.refId,
      readAt: n.readAt?.toISOString() ?? null,
      resolvedAt: n.resolvedAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
      paymentIntent: intent
        ? {
            id: intent.id,
            status: intent.status as PaymentIntentStatus,
            amountCents: intent.amountCents,
            confirmedAmountCents: intent.confirmedAmountCents,
          }
        : null,
    };
  });
}
