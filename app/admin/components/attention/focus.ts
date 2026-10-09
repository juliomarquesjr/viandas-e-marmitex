/**
 * Depois de aceitar, recusar ou conferir, o item some da lista e o foco do teclado se perderia.
 * Leva o foco ao primeiro botão do próximo item (ou ao de mesmo lugar, se era o último) e, sem mais
 * itens, ao alvo de reserva (o título da seção ou a faixa "Tudo em dia", que só aparece depois da
 * animação de saída: por isso tenta de novo por um instante).
 */
export function focusAfterAnswer(
  container: HTMLElement | null,
  rowIndex: number,
  getFallback: () => HTMLElement | null
) {
  let attempts = 0;
  const attempt = () => {
    const rows = container?.isConnected ? Array.from(container.querySelectorAll<HTMLElement>("[data-attention-row]")) : [];
    const target = rows[Math.min(rowIndex, rows.length - 1)];
    const button = target?.querySelector<HTMLElement>("button:not([disabled])");
    const fallback = getFallback();
    const next = button ?? (fallback?.isConnected ? fallback : null);
    if (next) {
      next.focus();
      return;
    }
    if (++attempts < 10) window.setTimeout(attempt, 100);
  };
  // Espera o refresh pintar e o diálogo devolver o foco antes de mexer
  window.setTimeout(attempt, 120);
}
