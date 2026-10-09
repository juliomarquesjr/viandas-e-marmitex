// Cria um pedido online como um cliente de teste (sem usar o navegador, para não trocar o cookie do cliente nele).
//   npx tsx tests/integration/make-online-order.mts qa.cliente2@example.com [quantidade=1] [observação] [quantosProdutos=1]
// Imprime uma linha JSON { status, id?, error?, code? }. Precisa do servidor local em http://localhost:3010.
import { randomUUID } from 'node:crypto';

const [email, qty = '1', notes = '', count = '1'] = process.argv.slice(2);
if (!email) throw new Error('Informe o e-mail do cliente de teste.');
const BASE = process.env.BASE_URL ?? 'http://localhost:3010';
const jar = new Map<string, string>();
const f = async (path: string, init: RequestInit = {}) => {
  const res = await fetch(BASE + path, { ...init, headers: { ...(init.headers || {}), cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') }, redirect: 'manual' });
  for (const s of (res.headers as any).getSetCookie?.() ?? []) { const [kv] = s.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i), kv.slice(i + 1)); }
  return res;
};
const { csrfToken } = await (await f('/api/auth/customer/csrf')).json();
await f('/api/auth/customer/callback/CustomerCredentials', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ csrfToken, json: 'true', identifier: email, password: 'senhaqa123' }) });
const menu = await (await f('/api/customer/ordering/menu')).json();
const pool = (menu.products ?? []).filter((p: any) => p.availableNow && !p.soldOut);
const items = pool.slice(0, Number(count)).map((p: any) => ({ productId: p.id, quantity: Number(qty) }));
const res = await f('/api/customer/ordering/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() }, body: JSON.stringify({ items, notes: notes || undefined }) });
const body = await res.json().catch(() => ({}));
console.log(JSON.stringify({ status: res.status, id: body.id, totalCents: body.totalCents, error: body.error, code: body.code, itens: items.length }));
