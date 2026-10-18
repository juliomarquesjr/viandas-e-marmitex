// Aviso, pelo WhatsApp, de cada etapa do pedido, quando o operador marcou "avisar o cliente" (servidor).
//
// Nunca derruba a ação do operador: uma falha no envio volta como resultado e a mudança de etapa segue.

import prisma from '@/lib/prisma';
import { loadTemplate, sendCustomerMessage } from './service';
import { ORDER_EVENT_TYPE, orderNoticeValues, type OrderEvent } from './order-status-text';

export type CustomerNotice =
  | { status: 'sent' }
  | { status: 'failed'; reason: string }
  /** Não era para avisar: switch desligado, cliente sem WhatsApp ou modelo desligado. */
  | { status: 'skipped' };

/** Cliente que pode receber o aviso: tem telefone e está marcado como WhatsApp. */
export const canNotifyOnWhatsapp = (customer: { phone: string | null; phoneIsWhatsapp: boolean } | null | undefined): boolean =>
  Boolean(customer?.phoneIsWhatsapp && customer.phone);

export async function notifyOrderEvent(preOrderId: string, event: OrderEvent): Promise<CustomerNotice> {
  try {
    const order = await prisma.preOrder.findUnique({
      where: { id: preOrderId },
      select: {
        id: true,
        notifyCustomer: true,
        totalCents: true,
        estimatedDeliveryTime: true,
        rejectReason: true,
        customer: { select: { id: true, name: true, email: true, phone: true, phoneIsWhatsapp: true } },
        items: { select: { quantity: true, weightKg: true, product: { select: { name: true } } } },
      },
    });
    if (!order || !order.notifyCustomer || !order.customer || !canNotifyOnWhatsapp(order.customer)) return { status: 'skipped' };

    const typeKey = ORDER_EVENT_TYPE[event];
    const template = await loadTemplate(typeKey, 'whatsapp');
    // o administrador desligou este aviso em WhatsApp → Mensagens: é escolha dele, não falha
    if (!template || !template.enabled) return { status: 'skipped' };

    const values = orderNoticeValues({
      id: order.id,
      totalCents: order.totalCents,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      rejectReason: order.rejectReason,
      items: order.items.map((i) => ({ quantity: i.quantity, weightKg: i.weightKg === null ? null : Number(i.weightKg), name: i.product?.name ?? 'Produto' })),
    });
    const [result] = await sendCustomerMessage({ typeKey, customer: order.customer, channels: ['whatsapp'], values });
    return result.ok ? { status: 'sent' } : { status: 'failed', reason: result.error ?? 'Não foi possível enviar.' };
  } catch (error) {
    console.error('aviso do pedido: falha ao enviar:', error);
    return { status: 'failed', reason: 'Não foi possível enviar o aviso pelo WhatsApp.' };
  }
}
