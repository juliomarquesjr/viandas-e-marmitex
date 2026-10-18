import assert from 'node:assert/strict';
import { test } from 'node:test';
import { StockShortError, describeShortage, totalsByProduct } from '../lib/stock/orderStock';
import { withOwnReservation, type CatalogProduct } from '../app/admin/pre-orders/lib/orderDraft';

const product = (over: Partial<CatalogProduct>): CatalogProduct => ({
  id: 'p1',
  name: 'Marmita',
  priceCents: 1000,
  active: true,
  stockEnabled: true,
  stock: 5,
  ...over,
});

test('totalsByProduct soma as linhas do mesmo produto e ordena por id', () => {
  const totals = totalsByProduct([
    { productId: 'b', quantity: 1 },
    { productId: 'a', quantity: 2 },
    { productId: 'b', quantity: 1 },
  ]);
  assert.deepEqual(totals, [
    ['a', 2],
    ['b', 2],
  ]);
});

test('a mensagem de falta concorda no singular e no plural', () => {
  const base = { productId: 'p', name: 'Feijoada', requested: 3 };
  assert.equal(
    describeShortage({ ...base, available: 1 }),
    'Estoque insuficiente para "Feijoada": 3 un. no pedido, 1 disponível.'
  );
  assert.equal(
    describeShortage({ ...base, available: 0 }),
    'Estoque insuficiente para "Feijoada": 3 un. no pedido, 0 disponíveis.'
  );
  assert.match(new StockShortError([{ ...base, available: 2 }]).message, /2 disponíveis/);
});

test('withOwnReservation devolve ao saldo as unidades do próprio pedido', () => {
  const catalog = [
    product({ id: 'p1', stock: 2 }),
    product({ id: 'p2', stock: 0 }),
    product({ id: 'p3', stockEnabled: false, stock: null }),
  ];
  const adjusted = withOwnReservation(catalog, [
    { productId: 'p1', quantity: 2 },
    { productId: 'p1', quantity: 1 },
    { productId: 'p3', quantity: 4 },
  ]);
  assert.equal(adjusted[0].stock, 5);
  assert.equal(adjusted[1].stock, 0);
  assert.equal(adjusted[2].stock, null);
  assert.equal(catalog[0].stock, 2, 'não altera o catálogo original');
});
