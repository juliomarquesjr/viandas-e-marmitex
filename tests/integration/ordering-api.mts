// Teste de integração do pedido online. Precisa de um servidor LOCAL rodando (TZ=UTC simula a Vercel) e do banco local:
//   TZ=UTC npm run build && TZ=UTC npm start -- -p 3010     (ou next dev)
//   npx tsx tests/integration/ordering-api.mts
// Usa as contas de QA (qa.operador / qa.pdv / qa.cliente.area, senha senhaqa123). Limpa o que cria.
const DB = process.env.QA_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5434/viandas';
if (!/localhost|127\.0\.0\.1/.test(DB)) throw new Error('Este teste só roda contra o banco LOCAL.');
process.env.DATABASE_URL = DB;
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../lib/generated/prisma';
import { weekdayAndMinuteSP } from '../../lib/date-range';

const p = new PrismaClient();
const BASE = 'http://localhost:3010';
const jar = () => { const c = new Map<string, string>(); return { async f(path: string, init: RequestInit = {}) { const res = await fetch(BASE + path, { ...init, headers: { ...(init.headers || {}), cookie: [...c].map(([k, v]) => `${k}=${v}`).join('; ') }, redirect: 'manual' }); for (const s of (res.headers as any).getSetCookie?.() ?? []) { const [kv] = s.split(';'); const i = kv.indexOf('='); c.set(kv.slice(0, i), kv.slice(i + 1)); } return res; } }; };
const form = (o: Record<string, string>) => ({ method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(o) });
const json = (m: string, o: unknown, h: Record<string, string> = {}) => ({ method: m, headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify(o) });
let failed = 0;
const check = (n: string, ok: boolean, x = '') => { console.log(`${ok ? '  ok ' : ' FALHOU'}  ${n}${x ? '  → ' + x : ''}`); if (!ok) failed++; };
const login = async (path: string, provider: string, fields: Record<string, string>, csrfPath: string) => { const j = jar(); const { csrfToken } = await (await j.f(csrfPath)).json(); await j.f(`${path}/callback/${provider}`, form({ csrfToken, json: 'true', ...fields })); return j; };

const admin = await login('/api/auth', 'credentials', { email: 'qa.operador@example.com', password: 'senhaqa123' }, '/api/auth/csrf');
const pdv = await login('/api/auth', 'credentials', { email: 'qa.pdv@example.com', password: 'senhaqa123' }, '/api/auth/csrf');
const cust = await login('/api/auth/customer', 'CustomerCredentials', { identifier: 'qa.cliente.area@example.com', password: 'senhaqa123' }, '/api/auth/customer/csrf');
const anon = jar();
const customer = await p.customer.findFirstOrThrow({ where: { email: 'qa.cliente.area@example.com' } });
const products = await p.product.findMany({ where: { active: true, productType: 'sellable', priceCents: { gt: 0 }, pricePerKgCents: null, variableProduct: false, stockEnabled: false }, take: 3 });
const [pa, pb, pc] = products;
const weight = await p.product.findFirst({ where: { pricePerKgCents: { gt: 0 } } });
const created: string[] = [];
const origConfig = await p.systemConfig.findMany({ where: { category: 'ordering' } });
const origWindows = await p.orderWindow.count();
console.log(`produtos de teste: ${pa.name}, ${pb.name}, ${pc.name}`);

const putCfg = async (b: unknown) => admin.f('/api/admin/customer-ordering', json('PUT', b));
const order = async (items: any[], key = randomUUID(), extra: any = {}) => { const r = await cust.f('/api/customer/ordering/orders', json('POST', { items, ...extra }, { 'Idempotency-Key': key })); const b = await r.json().catch(() => ({})); if (b.id) created.push(b.id); return { r, b }; };
const now = new Date(); const { minute, weekday } = weekdayAndMinuteSP(now);
const allDays = [0, 1, 2, 3, 4, 5, 6];
const otherDays = allDays.filter((d) => d !== weekday);

try {
  console.log('\n— permissões');
  check('config sem login → 401', (await anon.f('/api/admin/customer-ordering')).status === 401);
  check('config como PDV → 403', (await pdv.f('/api/admin/customer-ordering')).status === 403);
  check('config como cliente → 401/403', [401, 403].includes((await cust.f('/api/admin/customer-ordering')).status));
  check('cardápio sem login → 401', (await anon.f('/api/customer/ordering/menu')).status === 401);
  check('pedido sem login → 401', (await anon.f('/api/customer/ordering/orders', json('POST', { items: [] }, { 'Idempotency-Key': randomUUID() }))).status === 401);
  check('responder como PDV → 403', (await pdv.f('/api/pre-orders/x/respond', json('POST', { action: 'accept' }))).status === 403);

  console.log('\n— desligado por padrão');
  await putCfg({ enabled: false, windows: [], pause: null });
  let menu = await (await cust.f('/api/customer/ordering/menu')).json();
  check('desligado: open=false, reason=disabled', menu.open === false && menu.reason === 'disabled');
  let o = await order([{ productId: pa.id, quantity: 1 }]);
  check('pedido com a loja desligada → 409 ORDERING_DISABLED', o.r.status === 409 && o.b.code === 'ORDERING_DISABLED');

  console.log('\n— janela aberta agora (todos os dias, o dia todo) com 2 produtos');
  let cfg = await (await putCfg({ enabled: true, windows: [{ name: 'Teste dia todo', weekdays: allDays, startMinute: 0, endMinute: 1440, active: true, productIds: [pa.id, pb.id] }] })).json();
  check('config salva com 1 janela', cfg.windows?.length === 1 && cfg.preview?.open === true, JSON.stringify(cfg.preview));
  menu = await (await cust.f('/api/customer/ordering/menu')).json();
  const mp = (id: string) => menu.products.find((x: any) => x.id === id);
  check('cardápio aberto: 2 produtos, ambos disponíveis agora', menu.open && menu.products.length === 2 && menu.products.every((x: any) => x.availableNow));
  check('o cardápio traz o horário do produto e não traz estoque exato', typeof mp(pa.id)?.schedule?.[0] === 'string' && !('stock' in mp(pa.id)));
  check('produto fora das janelas não aparece', !mp(pc.id));

  console.log('\n— validação do pedido');
  check('sem Idempotency-Key → 400', (await cust.f('/api/customer/ordering/orders', json('POST', { items: [{ productId: pa.id, quantity: 1 }] }))).status === 400);
  for (const [nome, items] of [['quantidade 0', [{ productId: pa.id, quantity: 0 }]], ['quantidade decimal', [{ productId: pa.id, quantity: 1.5 }]], ['quantidade 21', [{ productId: pa.id, quantity: 21 }]], ['sem itens', []], ['produto repetido', [{ productId: pa.id, quantity: 1 }, { productId: pa.id, quantity: 1 }]]] as const) {
    o = await order(items as any); check(`${nome} → 400`, o.r.status === 400 && o.b.code === 'INVALID_ITEMS');
  }
  o = await order([{ productId: pa.id, quantity: 1 }], randomUUID(), { notes: 'x'.repeat(201) }); check('observação longa → 400', o.r.status === 400);
  o = await order([{ productId: pc.id, quantity: 1 }]); check('produto fora da janela → 409 PRODUCT_UNAVAILABLE', o.r.status === 409 && o.b.code === 'PRODUCT_UNAVAILABLE' && o.b.details.products[0].productId === pc.id);
  if (weight) { o = await order([{ productId: weight.id, quantity: 1 }]); check('produto por quilo → 409', o.r.status === 409); }

  console.log('\n— pedido válido, idempotência e preço adulterado');
  const key = randomUUID();
  o = await order([{ productId: pa.id, quantity: 2 }, { productId: pb.id, quantity: 1 }], key, { notes: 'sem cebola', priceCents: 1, totalCents: 1, discountCents: 999, status: 'delivered', customerId: 'outro' });
  const expected = pa.priceCents * 2 + pb.priceCents;
  check('pedido criado (201) com o total do BANCO, ignorando preço/desconto/status/cliente do corpo', o.r.status === 201 && o.b.totalCents === expected, `${o.b.totalCents} esperado ${expected}`);
  const first = o.b.id;
  const row = await p.preOrder.findUniqueOrThrow({ where: { id: first }, include: { items: true } });
  check('gravado como online/aguardando, do cliente da sessão, status pending, preço congelado', row.source === 'online' && row.approval === 'awaiting' && row.customerId === customer.id && row.deliveryStatus === 'pending' && row.discountCents === 0 && row.items.some((i) => i.priceCents === pa.priceCents));
  const dup = await order([{ productId: pa.id, quantity: 2 }, { productId: pb.id, quantity: 1 }], key);
  check('mesma chave → 200 duplicate, mesmo pedido', dup.r.status === 200 && dup.b.duplicate === true && dup.b.id === first);
  check('toque duplo não cria 2 pedidos', (await p.preOrder.count({ where: { customerId: customer.id, idempotencyKey: key } })) === 1);

  console.log('\n— sino e pendências');
  const noti = await (await admin.f('/api/notifications?limit=5')).json();
  check('o sino conta o pedido aguardando', noti.awaitingOrdersCount >= 1 && noti.awaitingOrders.some((a: any) => a.id === first) && noti.badgeCount >= noti.awaitingOrdersCount, `awaiting=${noti.awaitingOrdersCount} badge=${noti.badgeCount}`);
  const mine = noti.awaitingOrders.find((a: any) => a.id === first);
  check('o resumo mostra itens, valor e observação', mine?.summary?.includes('2 ×') && mine.totalCents === expected && mine.notes === 'sem cebola' && mine.expired === false);
  const cust1 = (await (await cust.f('/api/customer/pre-orders')).json()).data.find((x: any) => x.id === first);
  check('o cliente vê o pedido como online/aguardando', cust1?.source === 'online' && cust1?.approval === 'awaiting' && cust1?.expired === false);

  console.log('\n— guard: pedido aguardando não avança por fora do Aceitar/Recusar');
  check('mudar status (delivery PUT) → 409', (await admin.f(`/api/pre-orders/${first}/delivery`, json('PUT', { status: 'preparing' }))).status === 409);
  check('editar (PUT /api/pre-orders) → 409', (await admin.f('/api/pre-orders', json('PUT', { id: first, items: [], subtotalCents: 0 }))).status === 409);
  check('apagar (DELETE) → 409', (await admin.f(`/api/pre-orders?id=${first}`, { method: 'DELETE' })).status === 409);
  check('virar venda (convert) → 409', (await admin.f('/api/pre-orders?convert=true', json('POST', { preOrderId: first, paymentMethod: 'cash', receivedCents: 100000 }))).status === 409);

  console.log('\n— limite de pendentes (3) e cancelar');
  const second = (await order([{ productId: pa.id, quantity: 1 }])).b.id; const third = (await order([{ productId: pb.id, quantity: 1 }])).b.id;
  o = await order([{ productId: pa.id, quantity: 1 }]); check('4º pedido pendente → 429 TOO_MANY_PENDING', o.r.status === 429 && o.b.code === 'TOO_MANY_PENDING');
  const cancel = await cust.f(`/api/customer/pre-orders/${third}/cancel`, { method: 'POST' });
  check('cliente cancela o aguardando → 200', cancel.status === 200);
  const c2 = await p.preOrder.findUniqueOrThrow({ where: { id: third } });
  check('cancelado: cancelled + approval=cancelled', c2.deliveryStatus === 'cancelled' && c2.approval === 'cancelled');
  check('cancelar de novo → 409', (await cust.f(`/api/customer/pre-orders/${third}/cancel`, { method: 'POST' })).status === 409);
  check('cancelar pedido de outro/inexistente → 409', (await cust.f('/api/customer/pre-orders/nao-existe/cancel', { method: 'POST' })).status === 409);

  console.log('\n— aceitar / recusar');
  const acc = await admin.f(`/api/pre-orders/${first}/respond`, json('POST', { action: 'accept', minutes: 30 }));
  check('admin aceita → 200', acc.status === 200);
  const accRow = await p.preOrder.findUniqueOrThrow({ where: { id: first } });
  check('aceito: approval=accepted, segue na fila (pending), com previsão ~30 min', accRow.approval === 'accepted' && accRow.deliveryStatus === 'pending' && !!accRow.estimatedDeliveryTime && Math.abs(accRow.estimatedDeliveryTime.getTime() - Date.now() - 30 * 60000) < 60000);
  check('aceitar de novo → 409 ALREADY_ANSWERED', (await admin.f(`/api/pre-orders/${first}/respond`, json('POST', { action: 'accept' }))).status === 409);
  check('cliente não cancela mais o aceito → 409', (await cust.f(`/api/customer/pre-orders/${first}/cancel`, { method: 'POST' })).status === 409);
  check('depois de aceito o Admin avança normalmente (delivery PUT → 200)', (await admin.f(`/api/pre-orders/${first}/delivery`, json('PUT', { status: 'preparing' }))).status === 200);
  const rej = await admin.f(`/api/pre-orders/${second}/respond`, json('POST', { action: 'reject', reason: 'Sem frango hoje' }));
  const rejRow = await p.preOrder.findUniqueOrThrow({ where: { id: second } });
  check('recusar com motivo → cancelled + motivo', rej.status === 200 && rejRow.deliveryStatus === 'cancelled' && rejRow.approval === 'rejected' && rejRow.rejectReason === 'Sem frango hoje');
  const seen = (await (await cust.f('/api/customer/pre-orders')).json()).data.find((x: any) => x.id === second);
  check('o cliente vê o motivo da recusa', seen?.rejectReason === 'Sem frango hoje' && seen?.approval === 'rejected');
  check('responder pedido que não é online → 404', (await admin.f(`/api/pre-orders/${(await p.preOrder.findFirst({ where: { source: 'staff' } }))?.id ?? 'x'}/respond`, json('POST', { action: 'accept' }))).status === 404);
  check('ação inválida → 400', (await admin.f(`/api/pre-orders/${first}/respond`, json('POST', { action: 'foo' }))).status === 400);

  console.log('\n— expiração (20 min)');
  const exp = (await order([{ productId: pa.id, quantity: 1 }])).b.id;
  await p.preOrder.update({ where: { id: exp }, data: { createdAt: new Date(Date.now() - 30 * 60000) } });
  const expAcc = await admin.f(`/api/pre-orders/${exp}/respond`, json('POST', { action: 'accept' }));
  check('aceitar pedido expirado → 409 EXPIRED', expAcc.status === 409 && (await expAcc.json()).code === 'EXPIRED');
  const expList = await (await admin.f('/api/notifications?limit=5')).json();
  check('o expirado aparece como expirado no sino', expList.awaitingOrders.find((a: any) => a.id === exp)?.expired === true);
  check('recusar o expirado → 200 (avisa o cliente)', (await admin.f(`/api/pre-orders/${exp}/respond`, json('POST', { action: 'reject', reason: 'Expirou' }))).status === 200);

  console.log('\n— janela fechada, tolerância, pausa e esgotado');
  const win = (start: number, end: number, days = allDays) => ({ name: 'Janela', weekdays: days, startMinute: start, endMinute: end, active: true, productIds: [pa.id] });
  await putCfg({ windows: [win(Math.max(0, minute - 120), Math.max(1, minute - 5))] });
  o = await order([{ productId: pa.id, quantity: 1 }]);
  check('janela fechou há 5 min → 409 WINDOW_CLOSED', o.r.status === 409 && o.b.code === 'WINDOW_CLOSED', o.b.error);
  menu = await (await cust.f('/api/customer/ordering/menu')).json();
  check('cardápio fechado: open=false, reason=closed, com próxima abertura e produtos ainda visíveis', menu.open === false && menu.reason === 'closed' && !!menu.nextOpening?.label && menu.products.length === 1 && menu.products[0].availableNow === false, menu.nextOpening?.label);
  if (minute >= 6) {
    await putCfg({ windows: [win(Math.max(0, minute - 120), minute - 2)] });
    o = await order([{ productId: pa.id, quantity: 1 }]);
    check('janela fechou há 2 min → ainda aceita (tolerância de 3 min)', o.r.status === 201, `${o.r.status} ${o.b.error ?? ''}`);
    if (o.b.id) await p.preOrder.update({ where: { id: o.b.id }, data: { approval: 'rejected', deliveryStatus: 'cancelled' } });
  }
  await putCfg({ windows: [win(0, 1440, otherDays)] });
  o = await order([{ productId: pa.id, quantity: 1 }]); check('janela só em outros dias da semana → 409', o.r.status === 409 && o.b.code === 'WINDOW_CLOSED');
  await putCfg({ windows: [win(0, 1440)], pause: 'until_tomorrow' });
  menu = await (await cust.f('/api/customer/ordering/menu')).json();
  o = await order([{ productId: pa.id, quantity: 1 }]);
  check('"hoje não" (pausa): cardápio paused e pedido → 409', menu.reason === 'paused' && o.r.status === 409 && o.b.code === 'WINDOW_CLOSED');
  await putCfg({ pause: null });
  await putCfg({ soldOut: { productId: pa.id, value: true } });
  menu = await (await cust.f('/api/customer/ordering/menu')).json();
  o = await order([{ productId: pa.id, quantity: 1 }]);
  check('"esgotou hoje": soldOut no cardápio e pedido → 409 PRODUCT_UNAVAILABLE', menu.products[0].soldOut === true && o.r.status === 409 && o.b.code === 'PRODUCT_UNAVAILABLE');
  await putCfg({ soldOut: { productId: pa.id, value: false } });

  console.log('\n— configuração: validações do admin');
  const bad = async (w: any) => (await putCfg({ windows: [w] })).status;
  check('fim antes do início → 400', (await bad({ ...win(0, 1440), startMinute: 700, endMinute: 600 })) === 400);
  check('sem dias → 400', (await bad(win(0, 1440, []))) === 400);
  check('produto inexistente → 400', (await bad({ ...win(0, 1440), productIds: ['nao-existe'] })) === 400);
  if (weight) check('produto por quilo na janela → 400', (await bad({ ...win(0, 1440), productIds: [weight.id] })) === 400);
  check('21 janelas → 400', (await putCfg({ windows: Array.from({ length: 21 }, () => win(0, 1440)) })).status === 400);

  console.log('\n— cliente inativo (a sessão ainda vale por 30 dias)');
  await p.customer.update({ where: { id: customer.id }, data: { active: false } });
  await putCfg({ windows: [win(0, 1440)] });
  o = await order([{ productId: pa.id, quantity: 1 }]); check('inativo → 403 CUSTOMER_INACTIVE', o.r.status === 403 && o.b.code === 'CUSTOMER_INACTIVE');
  check('cardápio do inativo → 403', (await cust.f('/api/customer/ordering/menu')).status === 403);
  await p.customer.update({ where: { id: customer.id }, data: { active: true } });

  console.log('\n— corrida: 2 pedidos ao mesmo tempo com chaves diferentes (limite de 3 pendentes)');
  await p.preOrder.updateMany({ where: { customerId: customer.id, source: 'online', approval: 'awaiting' }, data: { approval: 'rejected', deliveryStatus: 'cancelled' } });
  const results = await Promise.all(Array.from({ length: 6 }, () => order([{ productId: pa.id, quantity: 1 }])));
  const okCount = results.filter((r) => r.r.status === 201).length;
  check('6 pedidos simultâneos → só 3 entram (o resto 429)', okCount === 3 && results.filter((r) => r.r.status === 429).length === 3, `criados=${okCount}`);
} finally {
  // limpeza
  await p.preOrderItem.deleteMany({ where: { preOrderId: { in: created } } });
  await p.deliveryTracking.deleteMany({ where: { preOrderId: { in: created } } });
  await p.preOrder.deleteMany({ where: { id: { in: created } } });
  await p.customer.update({ where: { id: customer.id }, data: { active: true } });
  await p.orderWindow.deleteMany({});
  await p.systemConfig.deleteMany({ where: { category: 'ordering' } });
  for (const c of origConfig) await p.systemConfig.create({ data: { key: c.key, value: c.value, type: c.type, category: c.category } });
  console.log(`\nlimpeza: ${created.length} pedidos removidos; janelas antes=${origWindows}, depois=${await p.orderWindow.count()}`);
  await p.$disconnect();
}
console.log(failed ? `\n${failed} VERIFICAÇÃO(ÕES) FALHARAM` : '\ntudo certo');
process.exit(failed ? 1 : 0);
