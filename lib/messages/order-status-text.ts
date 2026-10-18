// Textos do aviso de andamento do pedido pelo WhatsApp (puro, testado em tests/order-status-message.test.ts).

import { formatBRL } from './ficha-text';

/** O que acontece com o pedido e merece um aviso ao cliente. */
export type OrderEvent = 'received' | 'accepted' | 'rejected' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';

/** Modelo de mensagem de cada acontecimento (os mesmos que aparecem em WhatsApp → Mensagens). */
export const ORDER_EVENT_TYPE: Record<OrderEvent, string> = {
  received: 'order_received',
  accepted: 'order_accepted',
  rejected: 'order_rejected',
  preparing: 'order_preparing',
  ready: 'order_ready',
  out_for_delivery: 'order_out_for_delivery',
  delivered: 'order_delivered',
  cancelled: 'order_cancelled',
};

/**
 * O acontecimento que uma mudança de status gera. "Na fila" (pending) não avisa ninguém: é o pedido
 * voltando para o começo, e o "recebido" já foi enviado quando ele foi registrado.
 */
export function eventOfStatus(status: string): OrderEvent | null {
  switch (status) {
    case 'preparing':
      return 'preparing';
    case 'ready':
      return 'ready';
    case 'out_for_delivery':
    case 'in_transit':
      return 'out_for_delivery';
    case 'delivered':
      return 'delivered';
    case 'cancelled':
      return 'cancelled';
    default:
      return null;
  }
}

/** Número que o cliente vê e cita: os 4 últimos caracteres do código, como na comanda e na mensagem do PIX. */
export const orderCode = (id: string) => `#${id.slice(-4).toUpperCase()}`;

const weight = (kg: number) => kg.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/** Uma linha por item: "• 2× Suco" ou, nos vendidos por quilo, "• Feijoada (0,450 kg)". */
export function formatOrderItems(items: { quantity: number; weightKg?: number | string | null; name: string }[], max = 20): string {
  const lines = items.slice(0, max).map((item) => {
    const kg = item.weightKg === null || item.weightKg === undefined ? 0 : Number(item.weightKg);
    return kg > 0 ? `• ${item.name} (${weight(kg)} kg)` : `• ${item.quantity}× ${item.name}`;
  });
  if (items.length > max) lines.push(`…e mais ${items.length - max} ${items.length - max === 1 ? 'item' : 'itens'}`);
  return lines.join('\n');
}

/** "🕐 Previsão: *18:30*" (Brasília), ou vazio quando o pedido não tem previsão. */
export function previsionLine(estimated: Date | null | undefined): string {
  if (!estimated || Number.isNaN(estimated.getTime())) return '';
  const time = estimated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  return `🕐 Previsão: *${time}*`;
}

/** "Motivo: _texto_", ou vazio quando o operador não escreveu um motivo. */
export function reasonLine(reason: string | null | undefined): string {
  const clean = reason?.replace(/\s+/g, ' ').trim();
  return clean ? `Motivo: _${clean}_` : '';
}

export interface OrderForNotice {
  id: string;
  totalCents: number;
  estimatedDeliveryTime: Date | null;
  rejectReason: string | null;
  items: { quantity: number; weightKg?: number | string | null; name: string }[];
}

/** Os valores que o sistema preenche nos modelos de pedido. */
export function orderNoticeValues(order: OrderForNotice): Record<string, string> {
  return {
    pedido: orderCode(order.id),
    itens: formatOrderItems(order.items),
    total: formatBRL(order.totalCents),
    previsao: previsionLine(order.estimatedDeliveryTime),
    motivo: reasonLine(order.rejectReason),
  };
}
