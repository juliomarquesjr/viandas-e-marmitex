// Regras puras das chaves de aviso dispensado/visto (sem banco), para o teste e o navegador.

export const DISMISS_KEY_MAX_LENGTH = 120;
export const DISMISS_BATCH_MAX = 100;
export const KEEP_DAYS = 90;

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

