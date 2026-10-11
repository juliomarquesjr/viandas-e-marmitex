// Pequenas funções de texto da tela da RO (puras, testadas em tests/ro-painel.test.ts).

/** O id que acompanha o botão "Ver ficha" serve ao sistema, não à pessoa: não aparece na conversa. */
export const semId = (texto: string): string => texto.replace(/\s*\[id:[0-9a-f-]{36}\]/gi, "");

/** Tira as marcas de negrito e itálico (para copiar o texto). */
export const textoSimples = (texto: string): string => texto.replace(/\*\*/g, "").replace(/(?<![A-Za-z0-9])_(.+?)_(?![A-Za-z0-9])/g, "$1");

/** "45 segundos", "1 minuto", "3 minutos". */
export function tempoCurto(segundos: number): string {
  if (segundos < 60) return `${Math.max(1, Math.ceil(segundos))} segundos`;
  const minutos = Math.ceil(segundos / 60);
  return minutos === 1 ? "1 minuto" : `${minutos} minutos`;
}
