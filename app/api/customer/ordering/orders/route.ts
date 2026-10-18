import { getCustomerSession } from '@/lib/customer-auth';
import { OrderError } from '@/lib/online-order-errors';
import { describeOpening, nextOpening, ORDERING, orderingStatus, productsOpenNow } from '@/lib/ordering';
import { loadSettings, loadSoldOut, loadWindows, productEligibility, releaseDeadReservations } from '@/lib/online-ordering';
import { StockShortError, reserveStockForItems } from '@/lib/stock/orderStock';
import { canNotifyOnWhatsapp } from '@/lib/messages/order-status-send';
import prisma from '@/lib/prisma';
import { publishToCustomer, publishToStaff } from '@/lib/realtime';
import { NextResponse } from 'next/server';

// POST - O cliente envia um pedido (fica aguardando o admin aceitar ou recusar)
//
//   corpo:   { items: [{ productId, quantity }], notes? }
//   header:  Idempotency-Key (um UUID por abertura do carrinho; repetir devolve o mesmo pedido)
//
// O servidor decide TUDO: janela de horário (em Brasília), produto liberado, preço (lido do banco
// e congelado no item), estoque e limites. Preço, desconto, taxa, status e cliente que vierem no
// corpo são ignorados. Nada é cobrado: o pagamento acontece na retirada, pelo fluxo de sempre.

const KEY_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;

interface RawItem {
  productId?: unknown;
  quantity?: unknown;
}

function parseItems(raw: unknown): { productId: string; quantity: number }[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > ORDERING.MAX_ITEMS) {
    throw new OrderError('INVALID_ITEMS', 400, `O pedido precisa ter de 1 a ${ORDERING.MAX_ITEMS} produtos.`);
  }
  const seen = new Set<string>();
  return (raw as RawItem[]).map((item) => {
    const productId = typeof item?.productId === 'string' ? item.productId : '';
    const quantity = item?.quantity;
    if (!productId || seen.has(productId)) {
      throw new OrderError('INVALID_ITEMS', 400, 'Produto repetido ou inválido no pedido.');
    }
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > ORDERING.MAX_QTY_PER_ITEM) {
      throw new OrderError('INVALID_ITEMS', 400, `A quantidade de cada produto vai de 1 a ${ORDERING.MAX_QTY_PER_ITEM}.`);
    }
    seen.add(productId);
    return { productId, quantity };
  });
}

function parseNotes(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw !== 'string') throw new OrderError('INVALID_ITEMS', 400, 'Observação inválida.');
  // eslint-disable-next-line no-control-regex
  const notes = raw.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  if (notes.length > ORDERING.NOTES_MAX) {
    throw new OrderError('INVALID_ITEMS', 400, `A observação pode ter até ${ORDERING.NOTES_MAX} letras.`);
  }
  return notes || null;
}

export async function POST(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const customerId = session.user.customerId;

    const key = request.headers.get('Idempotency-Key') ?? '';
    if (!KEY_PATTERN.test(key)) {
      return NextResponse.json({ error: 'Pedido inválido. Atualize a página e tente de novo.' }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as { items?: unknown; notes?: unknown } | null;
    const items = parseItems(body?.items);
    const notes = parseNotes(body?.notes);

    // A configuração é lida ANTES de abrir a transação: dentro dela, `prisma` pegaria uma segunda conexão
    // do pool enquanto a transação segura a primeira (no pico do almoço isso trava o envio).
    const now = new Date();
    // pedidos que não vão mais acontecer devolvem o estoque antes da checagem de saldo
    await releaseDeadReservations(now);
    const [settings, windows, soldOut] = await Promise.all([loadSettings(), loadWindows(), loadSoldOut(now)]);
    const usable = windows.filter((w) => w.active && w.productIds.length > 0);

    const result = await prisma.$transaction(
      async (tx) => {
        // Trava só a linha do cliente: serializa o toque duplo e o limite de pendentes dele,
        // sem segurar produto nenhum (o balcão continua vendendo no almoço).
        await tx.$queryRaw`SELECT id FROM "Customer" WHERE id = ${customerId} FOR UPDATE`;

        const existing = await tx.preOrder.findUnique({
          where: { customerId_idempotencyKey: { customerId, idempotencyKey: key } },
          select: { id: true, totalCents: true, createdAt: true },
        });
        if (existing) return { order: existing, duplicate: true };

        const customer = await tx.customer.findUnique({ where: { id: customerId }, select: { active: true } });
        if (!customer?.active) {
          throw new OrderError('CUSTOMER_INACTIVE', 403, 'Seu cadastro está inativo. Fale com a loja.');
        }

        // O relógio é o do servidor (tomado logo antes da transação), nunca o do cliente
        if (!settings.enabled) {
          throw new OrderError('ORDERING_DISABLED', 409, 'A loja não está recebendo pedidos pelo app agora.');
        }
        const status = orderingStatus(usable, settings, now);
        const openIds = productsOpenNow(usable, now, ORDERING.GRACE_MINUTES);
        if (status.reason === 'paused' || openIds.size === 0) {
          const next = status.nextOpening ?? nextOpening(usable, now);
          throw new OrderError(
            'WINDOW_CLOSED',
            409,
            next ? `A loja não está recebendo pedidos agora. Abre ${describeOpening(next)}.` : 'A loja não está recebendo pedidos agora.',
            { nextOpening: next ? describeOpening(next) : null }
          );
        }

        const products = await tx.product.findMany({
          where: { id: { in: items.map((i) => i.productId) } },
          select: {
            id: true,
            name: true,
            priceCents: true,
            pricePerKgCents: true,
            variableProduct: true,
            productType: true,
            active: true,
            stockEnabled: true,
            stock: true,
          },
        });
        const byId = new Map(products.map((p) => [p.id, p]));

        const unavailable = items
          .filter((item) => {
            const product = byId.get(item.productId);
            return !product || !productEligibility(product).eligible || !openIds.has(product.id) || soldOut.has(product.id);
          })
          .map((item) => ({ productId: item.productId, name: byId.get(item.productId)?.name ?? null }));
        if (unavailable.length > 0) {
          throw new OrderError(
            'PRODUCT_UNAVAILABLE',
            409,
            'Alguns produtos não podem ser pedidos agora. Remova-os do carrinho e envie de novo.',
            { products: unavailable }
          );
        }

        // Estoque (só para quem controla): o pedido reserva de verdade. O saldo do produto já vem
        // descontado do que está em pedidos abertos (ver lib/stock/orderStock.ts), então a checagem
        // é direta. A baixa definitiva e atômica é feita mais abaixo, junto da criação do pedido.
        const short = products
          .filter((p) => p.stockEnabled)
          .map((p) => ({ productId: p.id, name: p.name, available: Math.max(0, p.stock ?? 0) }))
          .filter((p) => items.find((i) => i.productId === p.productId)!.quantity > p.available);
        if (short.length > 0) {
          // o estoque exato não sai: só até o máximo que dá para pedir de uma vez
          throw new OrderError('OUT_OF_STOCK', 409, 'Alguns produtos não têm a quantidade pedida. Ajuste o carrinho e envie de novo.', {
            products: short.map((p) => ({ ...p, available: Math.min(p.available, ORDERING.MAX_QTY_PER_ITEM) })),
          });
        }

        // pedido que a loja não respondeu em 20 min já está expirado: não ocupa vaga
        const awaitingSince = new Date(now.getTime() - ORDERING.TTL_MINUTES * 60_000);
        const awaiting = await tx.preOrder.count({
          where: { customerId, source: 'online', approval: 'awaiting', createdAt: { gte: awaitingSince } },
        });
        if (awaiting >= ORDERING.MAX_PENDING_PER_CUSTOMER) {
          throw new OrderError('TOO_MANY_PENDING', 429, 'Você já tem pedidos esperando a loja confirmar. Aguarde a resposta para enviar outro.');
        }
        const lastHour = await tx.preOrder.count({
          where: { customerId, source: 'online', createdAt: { gte: new Date(now.getTime() - 60 * 60_000) } },
        });
        if (lastHour >= ORDERING.MAX_PER_HOUR) {
          throw new OrderError('RATE_LIMITED', 429, 'Muitos pedidos em pouco tempo. Tente de novo daqui a pouco.');
        }

        // Preço lido do banco agora e congelado no item
        const totalCents = items.reduce((sum, item) => sum + byId.get(item.productId)!.priceCents * item.quantity, 0);
        // Cliente com WhatsApp é avisado a cada etapa por padrão; o operador pode desligar no pedido
        const contact = await tx.customer.findUnique({ where: { id: customerId }, select: { phone: true, phoneIsWhatsapp: true } });
        try {
          await reserveStockForItems(tx, items);
        } catch (error) {
          // alguém levou o último item entre a checagem e a reserva
          if (!(error instanceof StockShortError)) throw error;
          throw new OrderError('OUT_OF_STOCK', 409, 'Alguns produtos não têm a quantidade pedida. Ajuste o carrinho e envie de novo.', {
            products: error.shortages.map((p) => ({
              productId: p.productId,
              name: p.name,
              available: Math.min(p.available, ORDERING.MAX_QTY_PER_ITEM),
            })),
          });
        }
        const order = await tx.preOrder.create({
          data: {
            customerId,
            notifyCustomer: canNotifyOnWhatsapp(contact),
            stockReserved: true,
            source: 'online',
            approval: 'awaiting',
            idempotencyKey: key,
            subtotalCents: totalCents,
            discountCents: 0,
            deliveryFeeCents: 0,
            totalCents,
            notes,
            items: {
              create: items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                priceCents: byId.get(item.productId)!.priceCents,
              })),
            },
          },
          select: { id: true, totalCents: true, createdAt: true },
        });
        return { order, duplicate: false };
      },
      { maxWait: 5000, timeout: 10_000 }
    );

    if (!result.duplicate) {
      console.info(JSON.stringify({ event: 'online_order.created', preOrderId: result.order.id, customerId, totalCents: result.order.totalCents }));
      await Promise.all([
        publishToStaff('notification.changed', { id: result.order.id }),
        publishToCustomer(customerId, 'pre-order.updated', { id: result.order.id }),
      ]);
    }

    return NextResponse.json(
      { id: result.order.id, totalCents: result.order.totalCents, createdAt: result.order.createdAt.toISOString(), duplicate: result.duplicate },
      { status: result.duplicate ? 200 : 201 }
    );
  } catch (error) {
    if (error instanceof OrderError) return error.toResponse();
    console.error('Error creating online order:', error);
    return NextResponse.json({ error: 'Não foi possível enviar o pedido agora. Tente de novo.' }, { status: 500 });
  }
}
