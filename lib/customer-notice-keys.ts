// Chaves guardadas em CustomerDismissal (puro: serve ao servidor e ao navegador).
//
// A tabela guarda "cliente + chave em texto". O aviso dispensado usa o próprio id do aviso
// ("po:<id>:ready", "pay:<id>"...); o aviso visto usa o mesmo id com este prefixo. Os dois não se
// confundem: nenhum id de aviso começa com "seen:".

export const SEEN_PREFIX = 'seen:';

export const seenKey = (noticeId: string) => `${SEEN_PREFIX}${noticeId}`;

/** Dentre as chaves, as de "visto", já sem o prefixo. */
export function seenIdsFromKeys(keys: Iterable<string>): string[] {
  const ids: string[] = [];
  for (const key of keys) if (key.startsWith(SEEN_PREFIX)) ids.push(key.slice(SEEN_PREFIX.length));
  return ids;
}
