// Link de pagamento: um endereço que abre a página de PIX do cliente sem ele precisar entrar na conta.
//
// O código do link é assinado (HMAC) e carrega só o cliente e a validade: não há tabela nova, e um link adulterado,
// de outro cliente ou vencido não abre nada. Só servidor (usa a chave do sistema).

import { createHmac, timingSafeEqual } from 'node:crypto';

/** Quantos dias o link vale. Passado esse prazo o administrador gera outro, no próximo fechamento. */
export const PAYMENT_LINK_TTL_DAYS = 45;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function secret(): string {
  const value = process.env.PAYMENT_LINK_SECRET || process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error('Falta a chave para assinar o link de pagamento (NEXTAUTH_SECRET).');
  return value;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(`pay:${payload}`).digest().subarray(0, 16).toString('base64url');
}

/** Gera o código do link. `idB64.validadeBase36.assinatura` (cerca de 50 caracteres). */
export function signPaymentToken(customerId: string, now: Date = new Date(), ttlDays: number = PAYMENT_LINK_TTL_DAYS): string {
  if (!UUID.test(customerId)) throw new Error('Cliente inválido para o link de pagamento.');
  const id = Buffer.from(customerId.replace(/-/g, ''), 'hex').toString('base64url');
  const expires = Math.floor(now.getTime() / 1000) + Math.round(ttlDays * 86_400);
  const payload = `${id}.${expires.toString(36)}`;
  return `${payload}.${sign(payload)}`;
}

export type PaymentTokenResult = { ok: true; customerId: string; expiresAt: Date } | { ok: false; reason: 'invalid' | 'expired' };

/** Confere o código: assinatura, formato e validade. Só devolve o cliente se tudo bater. */
export function verifyPaymentToken(token: string, now: Date = new Date()): PaymentTokenResult {
  const parts = typeof token === 'string' ? token.split('.') : [];
  if (parts.length !== 3 || token.length > 120) return { ok: false, reason: 'invalid' };
  const [id, expiresRaw, signature] = parts;
  if (!/^[A-Za-z0-9_-]{22}$/.test(id) || !/^[0-9a-z]{1,10}$/.test(expiresRaw) || !/^[A-Za-z0-9_-]{22}$/.test(signature)) return { ok: false, reason: 'invalid' };

  const expected = Buffer.from(sign(`${id}.${expiresRaw}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: 'invalid' };

  const hex = Buffer.from(id, 'base64url').toString('hex');
  if (hex.length !== 32) return { ok: false, reason: 'invalid' };
  const customerId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  const expiresAt = new Date(parseInt(expiresRaw, 36) * 1000);
  if (Number.isNaN(expiresAt.getTime())) return { ok: false, reason: 'invalid' };
  if (expiresAt.getTime() <= now.getTime()) return { ok: false, reason: 'expired' };
  return { ok: true, customerId, expiresAt };
}

/** Endereço público da loja, sem barra no fim. */
export function publicAppUrl(): string {
  return (process.env.APP_PUBLIC_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

/** O link completo de pagamento deste cliente. */
export function paymentLinkFor(customerId: string, now: Date = new Date()): string {
  return `${publicAppUrl()}/pagar/${signPaymentToken(customerId, now)}`;
}
