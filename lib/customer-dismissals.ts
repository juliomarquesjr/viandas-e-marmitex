// Avisos e cartões que o cliente dispensou. Ficam no servidor (por cliente) para valer em todos os
// aparelhos e não voltarem quando o navegador limpa o armazenamento.
//
// Chaves: o id do aviso ("po:<id>:ready", "pay:<id>", "buy:<id>") ou "intent:<id>" para os cartões de
// pagamento informado. Tolera a tabela ainda não criada (migration pendente): nesse caso nada é
// filtrado e o aparelho segue com a dispensa que guardou localmente.

import prisma from '@/lib/prisma';
import { KEEP_DAYS } from '@/lib/customer-dismissals-keys';
import { seenIdsFromKeys, seenKey } from '@/lib/customer-notice-keys';

export { cleanDismissKeys, DISMISS_BATCH_MAX, DISMISS_KEY_MAX_LENGTH } from '@/lib/customer-dismissals-keys';

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

/** Dentre os ids de aviso, os que o cliente já marcou como vistos (em qualquer aparelho). */
export async function seenAmong(customerId: string, noticeIds: string[]): Promise<string[]> {
  const keys = await dismissedAmong(customerId, noticeIds.map(seenKey));
  return seenIdsFromKeys(keys);
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
