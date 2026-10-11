// Recuperação de senha pelo próprio cliente (servidor): achar a conta pelo e-mail ou pelo telefone.

import prisma from '@/lib/prisma';
import { parseLoginIdentifier, storedPhoneMatches } from '@/lib/customer-login-id';

export type RecoveryChannel = 'email' | 'whatsapp';

export const parseRecoveryChannel = (value: unknown): RecoveryChannel => (value === 'whatsapp' ? 'whatsapp' : 'email');

/** Chave do limite de pedidos por telefone (DDD + últimos 8 dígitos): o 9º dígito não burla o limite. */
export const phoneLimitKey = (login: { ddd: string; tail: string }) => `forgot-wa:${login.ddd}${login.tail}`;

/**
 * Contas ativas, com o telefone marcado como WhatsApp, que usam este número. O telefone fica guardado
 * como foi digitado no cadastro (com ou sem máscara): compara DDD + últimos 8 dígitos, como o login.
 */
export async function findWhatsappAccountsByPhone(raw: string) {
  const login = parseLoginIdentifier(raw);
  if (!login || login.kind !== 'phone') return { login: null, accounts: [] };
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Customer"
    WHERE active = true AND "phoneIsWhatsapp" = true AND phone IS NOT NULL
      AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 8) = ${login.tail}`;
  const found = rows.length ? await prisma.customer.findMany({ where: { id: { in: rows.map((r) => r.id) }, active: true } }) : [];
  return { login, accounts: found.filter((c) => storedPhoneMatches(c.phone, login)) };
}
