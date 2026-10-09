/**
 * Depois de aceitar, recusar ou conferir, o item some da lista e o foco do teclado se perderia.
 * Leva o foco ao primeiro botão do próximo item (ou ao de mesmo lugar, se era o último) e,
 * sem mais itens, ao título da seção.
 */
export function focusAfterAnswer(container: HTMLElement | null, rowIndex: number, fallback: HTMLElement | null) {
  // Espera o refresh pintar e o diálogo devolver o foco antes de mexer
  window.setTimeout(() => {
    const rows = container ? Array.from(container.querySelectorAll<HTMLElement>("[data-attention-row]")) : [];
    const target = rows[Math.min(rowIndex, rows.length - 1)];
    const button = target?.querySelector<HTMLElement>("button:not([disabled])");
    (button ?? fallback)?.focus();
  }, 120);
}
