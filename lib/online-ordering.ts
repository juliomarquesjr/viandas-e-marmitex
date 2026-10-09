import type { AwaitingOrderDTO } from '@/lib/notification-types';
import { addDaysToDay, dateStringSP, startOfDaySP } from '@/lib/date-range';
import { formatMinute, isOrderExpired, ORDERING, WEEKDAY_NAMES, type OrderingSettings, type WindowDef } from '@/lib/ordering';
import prisma from '@/lib/prisma';
import { isWeightBasedProduct } from '@/lib/weight';

/**
 * Leitura e escrita da configuração do pedido online (servidor).
 * As regras de horário ficam em lib/ordering.ts (funções puras); aqui só o banco.
 */

const CATEGORY = 'ordering';

async function readConfig(key: string): Promise<string | null> {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function writeConfig(key: string, value: string | null) {
  await prisma.systemConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value, type: 'text', category: CATEGORY },
  });
}

export async function loadSettings(): Promise<OrderingSettings> {
  const [enabled, pausedUntil] = await Promise.all([readConfig(ORDERING.ENABLED_KEY), readConfig(ORDERING.PAUSED_UNTIL_KEY)]);
  const paused = pausedUntil ? new Date(pausedUntil) : null;
  return { enabled: enabled === 'true', pausedUntil: paused && !Number.isNaN(paused.getTime()) ? paused : null };
}

export async function saveEnabled(enabled: boolean) {
  await writeConfig(ORDERING.ENABLED_KEY, enabled ? 'true' : 'false');
}

/** "Hoje não": pausa até a meia-noite de Brasília (volta sozinho amanhã). `null` tira a pausa. */
export async function savePause(mode: 'until_tomorrow' | null, now: Date = new Date()) {
  if (mode === null) return writeConfig(ORDERING.PAUSED_UNTIL_KEY, null);
  const tomorrow = startOfDaySP(addDaysToDay(dateStringSP(now), 1));
  await writeConfig(ORDERING.PAUSED_UNTIL_KEY, tomorrow ? tomorrow.toISOString() : null);
}

/** Produtos que o admin marcou como "esgotou hoje". A lista é do dia: amanhã começa vazia. */
export async function loadSoldOut(now: Date = new Date()): Promise<Set<string>> {
  const raw = await readConfig(ORDERING.SOLD_OUT_KEY);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as { day?: string; ids?: string[] };
    return parsed.day === dateStringSP(now) && Array.isArray(parsed.ids) ? new Set(parsed.ids) : new Set();
  } catch {
    return new Set();
  }
}

export async function saveSoldOut(productId: string, soldOut: boolean, now: Date = new Date()) {
  const ids = await loadSoldOut(now);
  if (soldOut) ids.add(productId);
  else ids.delete(productId);
  await writeConfig(ORDERING.SOLD_OUT_KEY, JSON.stringify({ day: dateStringSP(now), ids: [...ids] }));
}

export async function loadWindows(): Promise<WindowDef[]> {
  const rows = await prisma.orderWindow.findMany({
    orderBy: [{ startMinute: 'asc' }, { name: 'asc' }],
    include: { products: { select: { productId: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    weekdays: row.weekdays,
    startMinute: row.startMinute,
    endMinute: row.endMinute,
    active: row.active,
    productIds: row.products.map((p) => p.productId),
  }));
}

/** Produto que pode entrar numa janela: ativo, vendável, com preço e que não é vendido por quilo. */
export function productEligibility(product: {
  active: boolean;
  productType: string;
  priceCents: number;
  pricePerKgCents: number | null;
  variableProduct: boolean;
}): { eligible: boolean; reason?: string } {
  if (!product.active) return { eligible: false, reason: 'Produto inativo' };
  if (product.productType !== 'sellable') return { eligible: false, reason: 'Adicional (não vende sozinho)' };
  if (isWeightBasedProduct(product) || product.variableProduct) return { eligible: false, reason: 'Vendido por quilo' };
  if (product.priceCents <= 0) return { eligible: false, reason: 'Sem preço' };
  return { eligible: true };
}

/** "seg–sex 10:00–13:00": o texto que o cliente lê para saber quando pode pedir. */
export function describeSchedule(window: Pick<WindowDef, 'weekdays' | 'startMinute' | 'endMinute'>): string {
  const short = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const days = [...window.weekdays].sort((a, b) => a - b);
  const consecutive = days.length > 2 && days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  const label =
    days.length === 7 ? 'todos os dias' : consecutive ? `${short[days[0]]}–${short[days[days.length - 1]]}` : days.map((d) => short[d]).join(', ');
  return `${label} ${formatMinute(window.startMinute)}–${formatMinute(window.endMinute)}`;
}

export { WEEKDAY_NAMES };

/** Pedidos do cliente aguardando o admin. Tolera a migration ainda não aplicada (devolve vazio). */
export async function loadAwaitingOrders(now: Date = new Date(), take = 10): Promise<{ count: number; items: AwaitingOrderDTO[] }> {
  try {
    // Pedido de um dia anterior que ninguém respondeu nunca mais será aceito: é recusado aqui (idempotente), com o
    // motivo certo para o cliente, e deixa de contar no sino e de esconder os pedidos novos atrás dele.
    const dayStart = startOfDaySP(dateStringSP(now));
    if (dayStart) {
      await prisma.preOrder.updateMany({
        where: { source: 'online', approval: 'awaiting', createdAt: { lt: dayStart } },
        data: { approval: 'rejected', deliveryStatus: 'cancelled', respondedAt: now, rejectReason: 'A loja não respondeu a tempo' },
      });
    }

    const where = { source: 'online', approval: 'awaiting' } as const;
    const [count, rows] = await Promise.all([
      prisma.preOrder.count({ where }),
      prisma.preOrder.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }],
        take: 50,
        select: {
          id: true,
          customerId: true,
          totalCents: true,
          notes: true,
          createdAt: true,
          customer: { select: { name: true } },
          items: { select: { quantity: true, product: { select: { name: true } } } },
        },
      }),
    ]);
    // O mais antigo primeiro (os expirados do dia são os mais urgentes de limpar). Os de dias anteriores já foram
    // recusados acima, então não escondem os pedidos novos.
    return {
      count,
      items: rows.slice(0, take).map((row) => ({
        id: row.id,
        customerId: row.customerId,
        customerName: row.customer?.name ?? null,
        summary: row.items.map((item) => `${item.quantity} × ${item.product.name}`).join(', '),
        itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
        totalCents: row.totalCents,
        notes: row.notes,
        createdAt: row.createdAt.toISOString(),
        expired: isOrderExpired(row.createdAt, now),
      })),
    };
  } catch (error) {
    // P2021/P2022: tabela ou coluna ainda não existe (código novo antes da migration). Não derruba o sino.
    console.error('Awaiting orders unavailable:', error);
    return { count: 0, items: [] };
  }
}

/** Pedido online aguardando resposta não avança por nenhum caminho que não seja Aceitar/Recusar. */
export function isAwaitingApproval(preOrder: { source?: string | null; approval?: string | null }): boolean {
  return preOrder.source === 'online' && preOrder.approval === 'awaiting';
}

/** Pedido online que a loja recusou ou o cliente cancelou: fica como está (não reabre nem vira venda). */
export function isClosedOnline(preOrder: { source?: string | null; approval?: string | null }): boolean {
  return preOrder.source === 'online' && (preOrder.approval === 'rejected' || preOrder.approval === 'cancelled');
}

export const CLOSED_MESSAGE = 'Este pedido do cliente foi recusado ou cancelado e não pode mais ser alterado.';

export const AWAITING_MESSAGE = 'Este pedido do cliente ainda não foi aceito. Aceite ou recuse antes de continuar.';
