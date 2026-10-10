// Envio, pelo WhatsApp, do resumo das compras e do saldo da ficha de um cliente (servidor).

import prisma from '@/lib/prisma';
import { getCustomerBalance } from '@/lib/customer-balance';
import { addDaysToDay, dateStringSP, endOfDaySP, startOfDaySP, todaySP } from '@/lib/date-range';
import { menuDayLabel } from './menu-text';
import { describeBalance, formatOrdersMessage, ORDERS_MAX_DAYS, type DayOrders } from './ficha-text';
import { channelReadiness, previewCustomerMessage, sendCustomerMessage, type ChannelResult, type CustomerContact } from './service';

export const CUSTOMER_ORDERS = 'customer_orders';
export const CUSTOMER_BALANCE = 'customer_balance';

/** Até onde olhamos para trás ao listar os dias com compra. */
const LOOKBACK_DAYS = 90;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const hhmm = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

export interface PurchaseDay {
  day: string;
  label: string;
  count: number;
  totalCents: number;
}

const isPurchase = { status: { not: 'cancelled' }, paymentMethod: { not: 'ficha_payment' } } as const;

/** Dias em que o cliente comprou (mais recente primeiro). Pagamento de ficha e venda cancelada não contam. */
export async function purchaseDays(customerId: string): Promise<PurchaseDay[]> {
  const since = startOfDaySP(addDaysToDay(todaySP(), -LOOKBACK_DAYS)) ?? new Date(Date.now() - LOOKBACK_DAYS * 86_400_000);
  const rows = await prisma.order.findMany({
    where: { customerId, createdAt: { gte: since }, ...isPurchase },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, totalCents: true },
    take: 400,
  });
  const days = new Map<string, PurchaseDay>();
  for (const r of rows) {
    const day = dateStringSP(r.createdAt);
    const entry = days.get(day) ?? { day, label: menuDayLabel(day), count: 0, totalCents: 0 };
    entry.count += 1;
    entry.totalCents += r.totalCents;
    days.set(day, entry);
  }
  return [...days.values()];
}

/** Valida os dias pedidos: formato, sem repetir e no máximo 5. */
export function parseDays(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const days = [...new Set(value.filter((d): d is string => typeof d === 'string' && DAY.test(d)))];
  if (days.length === 0 || days.length > ORDERS_MAX_DAYS) return null;
  return days;
}

/** As compras dos dias escolhidos, prontas para o texto. Dia sem compra fica de fora. */
export async function loadDayOrders(customerId: string, days: string[]): Promise<DayOrders[]> {
  const ranges = days.flatMap((day) => {
    const gte = startOfDaySP(day);
    const lte = endOfDaySP(day);
    return gte && lte ? [{ createdAt: { gte, lte } }] : [];
  });
  if (ranges.length === 0) return [];
  const orders = await prisma.order.findMany({
    where: { customerId, OR: ranges, ...isPurchase },
    orderBy: { createdAt: 'asc' },
    select: {
      createdAt: true,
      totalCents: true,
      status: true,
      items: { select: { quantity: true, product: { select: { name: true } } }, take: 30 },
    },
  });
  const byDay = new Map<string, DayOrders>();
  for (const o of orders) {
    const day = dateStringSP(o.createdAt);
    const entry = byDay.get(day) ?? { day, orders: [] };
    entry.orders.push({
      time: hhmm(o.createdAt),
      totalCents: o.totalCents,
      open: o.status === 'pending',
      items: o.items.map((i) => ({ name: i.product?.name ?? 'Produto', quantity: i.quantity })),
    });
    byDay.set(day, entry);
  }
  return days.flatMap((d) => (byDay.has(d) ? [byDay.get(d)!] : []));
}

const ordersValues = (days: DayOrders[]) => ({ compras: formatOrdersMessage(days) });

async function balanceValues(customerId: string) {
  const { balanceCents } = await getCustomerBalance(customerId);
  const text = describeBalance(balanceCents);
  return { balanceCents, kind: text.kind, values: { saldo: text.value, situacao: text.sentence } };
}

export async function previewOrders(customer: CustomerContact, days: DayOrders[]): Promise<string> {
  return previewCustomerMessage(CUSTOMER_ORDERS, 'whatsapp', customer, ordersValues(days));
}

export async function previewBalance(customer: CustomerContact) {
  const balance = await balanceValues(customer.id);
  return { balanceCents: balance.balanceCents, kind: balance.kind, preview: await previewCustomerMessage(CUSTOMER_BALANCE, 'whatsapp', customer, balance.values) };
}

export type FichaSendOutcome =
  | { status: 'sent' | 'failed'; result: ChannelResult }
  | { status: 'no_whatsapp' | 'no_orders' | 'unavailable'; reason: string };

async function guard(customer: CustomerContact & { active?: boolean }, typeKey: string): Promise<FichaSendOutcome | null> {
  if (!customer.phoneIsWhatsapp || !customer.phone || customer.active === false) {
    return { status: 'no_whatsapp', reason: 'O cliente não tem um WhatsApp cadastrado.' };
  }
  const readiness = await channelReadiness(typeKey, 'whatsapp');
  if (!readiness.ready) return { status: 'unavailable', reason: readiness.reason ?? 'O WhatsApp não está disponível.' };
  return null;
}

export async function sendOrdersToCustomer(customer: CustomerContact & { active?: boolean }, days: string[]): Promise<FichaSendOutcome> {
  const blocked = await guard(customer, CUSTOMER_ORDERS);
  if (blocked) return blocked;
  const data = await loadDayOrders(customer.id, days);
  if (data.length === 0) return { status: 'no_orders', reason: 'Não há compras nos dias escolhidos.' };
  const [result] = await sendCustomerMessage({ typeKey: CUSTOMER_ORDERS, customer, channels: ['whatsapp'], values: ordersValues(data) });
  return { status: result.ok ? 'sent' : 'failed', result };
}

export async function sendBalanceToCustomer(customer: CustomerContact & { active?: boolean }): Promise<FichaSendOutcome> {
  const blocked = await guard(customer, CUSTOMER_BALANCE);
  if (blocked) return blocked;
  const { values } = await balanceValues(customer.id);
  const [result] = await sendCustomerMessage({ typeKey: CUSTOMER_BALANCE, customer, channels: ['whatsapp'], values });
  return { status: result.ok ? 'sent' : 'failed', result };
}
