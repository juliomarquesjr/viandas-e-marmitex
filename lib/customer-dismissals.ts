// Avisos e cartões que o cliente dispensou. Ficam no servidor (por cliente) para valer em todos os
// aparelhos e não voltarem quando o navegador limpa o armazenamento.
//
// Chaves: o id do aviso ("po:<id>:ready", "pay:<id>", "buy:<id>") ou "intent:<id>" para os cartões de
// pagamento informado. Tolera a tabela ainda não criada (migration pendente): nesse caso nada é
// filtrado e o aparelho segue com a dispensa que guardou localmente.

import prisma from '@/lib/prisma';

export const DISMISS_KEY_MAX_LENGTH = 120;
export const DISMISS_BATCH_MAX = 100;
const KEEP_DAYS = 90;

/** Aceita só texto curto e sem repetição; o resto é descartado. */
export function cleanDismissKeys(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const keys = new Set<string>();
  for (const item of input) {
    if (typeof item !== 'string') continue;
    const key = item.trim();
    if (key && key.length <= DISMISS_KEY_MAX_LENGTH) keys.add(key);
    if (keys.size >= DISMISS_BATCH_MAX) break;
  }
  return [...keys];
}

/** Dentre `keys`, as que o cliente já dispensou. */
export async function dismissedAmong(customerId: string, keys: string[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  try {
    const rows = await prisma.customerDismissal.findMany({
      where: { customerId, key: { in: keys } },
      select: { key: true },
    });
    return new Set(rows.map((row) => row.key));
  } catch {
    return new Set();
  }
}

export async function addDismissals(customerId: string, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await prisma.customerDismissal.createMany({
    data: keys.map((key) => ({ customerId, key })),
    skipDuplicates: true,
  });
  // Limpa o que já saiu da janela dos avisos (30 dias) e dos cartões (72 h) faz tempo
  const cutoff = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000);
  await prisma.customerDismissal.deleteMany({ where: { customerId, createdAt: { lt: cutoff } } }).catch(() => undefined);
}

export async function removeDismissals(customerId: string, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await prisma.customerDismissal.deleteMany({ where: { customerId, key: { in: keys } } });
}
