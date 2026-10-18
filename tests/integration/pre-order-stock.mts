// Teste de integração da reserva de estoque do pré-pedido. Só precisa do banco LOCAL (sem servidor):
//   npx tsx tests/integration/pre-order-stock.mts
// Cria um produto e pré-pedidos de teste e apaga tudo no fim.
const DB = process.env.QA_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5434/viandas';
if (!/localhost|127\.0\.0\.1/.test(DB)) throw new Error('Este teste só roda contra o banco LOCAL.');
process.env.DATABASE_URL = DB;
import { PrismaClient } from '../../lib/generated/prisma';
import { StockShortError, releasePreOrderReservation, reserveStockForItems } from '../../lib/stock/orderStock';

const p = new PrismaClient();
let failed = 0;
const check = (n: string, ok: boolean, x = '') => { console.log(`${ok ? '  ok ' : ' FALHOU'}  ${n}${x ? '  → ' + x : ''}`); if (!ok) failed++; };
const stockOf = async (id: string) => (await p.product.findUniqueOrThrow({ where: { id } })).stock;

const tag = `qa-reserva-${Date.now()}`;
const prod = await p.product.create({ data: { name: tag, priceCents: 1000, stockEnabled: true, stock: 5, productType: 'sellable', active: true } });
const free = await p.product.create({ data: { name: `${tag}-livre`, priceCents: 1000, stockEnabled: false, stock: null, productType: 'sellable', active: true } });
const made: string[] = [];

const newPreOrder = (items: { productId: string; quantity: number }[]) =>
  p.$transaction(async (tx) => {
    await reserveStockForItems(tx, items);
    const o = await tx.preOrder.create({
      data: { stockReserved: true, subtotalCents: 0, totalCents: 0, items: { create: items.map((i) => ({ ...i, priceCents: 1000 })) } },
    });
    made.push(o.id);
    return o;
  });

try {
  const a = await newPreOrder([{ productId: prod.id, quantity: 2 }, { productId: free.id, quantity: 9 }]);
  check('criar reserva baixa o estoque (5 → 3)', (await stockOf(prod.id)) === 3);
  check('produto sem controle não é tocado', (await stockOf(free.id)) === null);

  let short: unknown = null;
  try { await newPreOrder([{ productId: prod.id, quantity: 4 }]); } catch (e) { short = e; }
  check('acima do saldo lança StockShortError e não mexe no estoque', short instanceof StockShortError && (await stockOf(prod.id)) === 3, (short as Error)?.message);

  check('devolver uma vez volta o estoque (3 → 5)', (await p.$transaction((tx) => releasePreOrderReservation(tx, a.id))) === true && (await stockOf(prod.id)) === 5);
  check('devolver de novo não devolve em dobro', (await p.$transaction((tx) => releasePreOrderReservation(tx, a.id))) === false && (await stockOf(prod.id)) === 5);

  // dois pedidos disputando as 5 unidades: só um passa
  const results = await Promise.allSettled([
    newPreOrder([{ productId: prod.id, quantity: 4 }]),
    newPreOrder([{ productId: prod.id, quantity: 4 }]),
  ]);
  const ok = results.filter((r) => r.status === 'fulfilled').length;
  check('duas reservas simultâneas do mesmo saldo: só uma passa', ok === 1 && (await stockOf(prod.id)) === 1, `passaram ${ok}, estoque ${await stockOf(prod.id)}`);

  // duas devoluções simultâneas do mesmo pedido: devolve uma vez só
  const winner = (results.find((r) => r.status === 'fulfilled') as PromiseFulfilledResult<{ id: string }>).value;
  const rel = await Promise.all([
    p.$transaction((tx) => releasePreOrderReservation(tx, winner.id)),
    p.$transaction((tx) => releasePreOrderReservation(tx, winner.id)),
  ]);
  check('duas devoluções simultâneas: devolve uma vez só', rel.filter(Boolean).length === 1 && (await stockOf(prod.id)) === 5, `estoque ${await stockOf(prod.id)}`);

  // pedido antigo (sem reserva) não devolve nada
  const legacy = await p.preOrder.create({ data: { subtotalCents: 0, totalCents: 0, items: { create: [{ productId: prod.id, quantity: 3, priceCents: 1000 }] } } });
  made.push(legacy.id);
  check('pedido antigo (sem reserva) não devolve estoque', (await p.$transaction((tx) => releasePreOrderReservation(tx, legacy.id))) === false && (await stockOf(prod.id)) === 5);
} finally {
  await p.preOrderItem.deleteMany({ where: { preOrderId: { in: made } } });
  await p.preOrder.deleteMany({ where: { id: { in: made } } });
  await p.product.deleteMany({ where: { id: { in: [prod.id, free.id] } } });
  await p.$disconnect();
}
console.log(failed ? `\n${failed} falha(s)` : '\ntudo certo');
process.exit(failed ? 1 : 0);
