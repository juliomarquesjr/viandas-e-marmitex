import { Prisma } from '@/lib/generated/prisma';

type StockTransactionClient = Prisma.TransactionClient;

export type StockItem = {
  productId: string;
  quantity: number;
};

export type StockShortage = {
  productId: string;
  name: string;
  requested: number;
  available: number;
};

/** Falta de saldo ao reservar: vira 409 `OUT_OF_STOCK` nas rotas. */
export class StockShortError extends Error {
  constructor(public readonly shortages: StockShortage[]) {
    super(describeShortage(shortages[0]));
    this.name = 'StockShortError';
  }
}

export function describeShortage(shortage: StockShortage): string {
  return `Estoque insuficiente para "${shortage.name}": ${shortage.requested} un. no pedido, ${shortage.available} ${
    shortage.available === 1 ? 'disponível' : 'disponíveis'
  }.`;
}

/**
 * Soma por produto, em ordem estável. Um item por quilo ocupa uma linha por
 * peso e a baixa acontece em todas elas; a ordem fixa evita deadlock entre
 * duas reservas que disputam os mesmos produtos.
 */
export function totalsByProduct(items: StockItem[]): Array<[string, number]> {
  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
  }
  return Array.from(totals).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

async function adjustStockForItems(
  prisma: StockTransactionClient,
  items: StockItem[],
  operation: 'increment' | 'decrement'
) {
  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: {
        id: true,
        stockEnabled: true,
        stock: true,
      },
    });

    if (!product || !product.stockEnabled || product.stock === null) {
      continue;
    }

    await prisma.product.update({
      where: { id: item.productId },
      data: {
        stock:
          operation === 'increment'
            ? { increment: item.quantity }
            : { decrement: item.quantity },
      },
    });
  }
}

export async function decrementStockForItems(
  prisma: StockTransactionClient,
  items: StockItem[]
) {
  await adjustStockForItems(prisma, items, 'decrement');
}

export async function restoreStockForItems(
  prisma: StockTransactionClient,
  items: StockItem[]
) {
  await adjustStockForItems(prisma, items, 'increment');
}

/**
 * Reserva estoque para um pré-pedido. A baixa é condicional (`stock >= qtd`),
 * então duas reservas do último item não passam as duas. Produto sem controle
 * de estoque é ignorado. Lança `StockShortError` e o chamador desfaz a transação.
 */
export async function reserveStockForItems(
  prisma: StockTransactionClient,
  items: StockItem[]
) {
  for (const [productId, quantity] of totalsByProduct(items)) {
    const claimed = await prisma.product.updateMany({
      where: { id: productId, stockEnabled: true, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    });
    if (claimed.count > 0) continue;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true, stockEnabled: true, stock: true },
    });
    if (!product) {
      throw new StockShortError([{ productId, name: productId, requested: quantity, available: 0 }]);
    }
    // sem controle (ou sem saldo informado) não há o que reservar
    if (!product.stockEnabled || product.stock === null) continue;
    throw new StockShortError([
      { productId, name: product.name, requested: quantity, available: Math.max(0, product.stock) },
    ]);
  }
}

/**
 * Devolve a reserva de um pré-pedido, uma única vez: a marca `stockReserved`
 * é virada com `updateMany` e só quem a virou devolve. Chamar de novo (duplo
 * clique, recusa em lote, cancelamento concorrente) não devolve em dobro.
 */
export async function releasePreOrderReservation(
  prisma: StockTransactionClient,
  preOrderId: string
): Promise<boolean> {
  const claimed = await prisma.preOrder.updateMany({
    where: { id: preOrderId, stockReserved: true },
    data: { stockReserved: false },
  });
  if (claimed.count === 0) return false;

  const items = await prisma.preOrderItem.findMany({
    where: { preOrderId },
    select: { productId: true, quantity: true },
  });
  await restoreStockForItems(prisma, items);
  return true;
}
