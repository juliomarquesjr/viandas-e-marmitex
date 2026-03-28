import { Prisma } from '@/lib/generated/prisma';

type StockTransactionClient = Prisma.TransactionClient;

export type StockItem = {
  productId: string;
  quantity: number;
};

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
