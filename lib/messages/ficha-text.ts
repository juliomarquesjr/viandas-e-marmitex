// Textos do WhatsApp sobre a ficha do cliente: resumo das compras e saldo (puro, testado em tests/ficha-message.test.ts).

import { menuDayLabel } from './menu-text';

/** Quantos dias de compras cabem numa mensagem. */
export const ORDERS_MAX_DAYS = 5;

/** O quanto do texto das compras cabe na mensagem (o WhatsApp aceita 4096 no total). */
export const ORDERS_MESSAGE_MAX = 3000;

export interface OrderForMessage {
  /** Horário da compra, "HH:MM" de Brasília. */
  time: string;
  items: { name: string; quantity: number }[];
  totalCents: number;
  /** Compra anotada na ficha e ainda não paga. */
  open: boolean;
}

export interface DayOrders {
  /** "AAAA-MM-DD" de Brasília. */
  day: string;
  orders: OrderForMessage[];
}

/** "R$ 1.234,56" (centavos). Não depende do ICU do servidor. */
export function formatBRL(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const reais = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cents < 0 ? '-' : ''}R$ ${reais},${String(abs % 100).padStart(2, '0')}`;
}

const dayTotal = (d: DayOrders) => d.orders.reduce((sum, o) => sum + o.totalCents, 0);

function detailedDay(d: DayOrders): string {
  const lines = [`🧾 *${menuDayLabel(d.day)}*`];
  const several = d.orders.length > 1;
  for (const order of d.orders) {
    if (several) lines.push(`🕐 ${order.time}`);
    for (const item of order.items) lines.push(`• ${item.quantity}× ${item.name}`);
    if (order.items.length === 0) lines.push('• Venda');
    if (several) lines.push(`${formatBRL(order.totalCents)}${order.open ? ' _(na ficha)_' : ''}`);
  }
  const open = d.orders.some((o) => o.open);
  lines.push(`💰 ${several ? 'Total do dia' : 'Total'}: *${formatBRL(dayTotal(d))}*${open && !several ? ' _(na ficha)_' : ''}`);
  return lines.join('\n');
}

function compactDay(d: DayOrders): string {
  const count = d.orders.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0);
  return `🧾 *${menuDayLabel(d.day)}* · ${count} ${count === 1 ? 'item' : 'itens'} · *${formatBRL(dayTotal(d))}*`;
}

/** Compras por dia, do mais antigo ao mais novo. Mensagem grande vira uma linha por dia, para caber. */
export function formatOrdersMessage(days: DayOrders[], max: number = ORDERS_MESSAGE_MAX): string {
  const sorted = [...days].sort((a, b) => a.day.localeCompare(b.day));
  const full = sorted.map(detailedDay).join('\n\n');
  if (full.length <= max) return full;
  return sorted.map(compactDay).join('\n');
}

export interface BalanceText {
  /** Valor sem sinal, ex.: "R$ 127,70". */
  value: string;
  kind: 'owes' | 'credit' | 'even';
  /** A frase que entra na mensagem. */
  sentence: string;
}

/** Saldo da ficha: positivo é o que o cliente deve; negativo é crédito. */
export function describeBalance(balanceCents: number): BalanceText {
  const value = formatBRL(Math.abs(balanceCents));
  if (balanceCents > 0) return { value, kind: 'owes', sentence: `💳 Sua ficha está com *${value}* em aberto.` };
  if (balanceCents < 0) return { value, kind: 'credit', sentence: `✨ Você tem *${value}* de crédito na ficha.` };
  return { value, kind: 'even', sentence: '✅ Sua ficha está em dia: não há nada a pagar.' };
}
