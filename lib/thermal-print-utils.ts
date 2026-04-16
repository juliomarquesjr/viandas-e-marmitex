/**
 * Mede a altura real do conteúdo térmico e injeta um @page com dimensões
 * explícitas antes de chamar window.print(). Resolve o corte de conteúdo
 * em impressoras térmicas com driver "normal" (CUPS / spooler do SO) que
 * ignoram `@page { size: 58mm auto; }` e usam a altura padrão configurada.
 */
export function printThermalPage(): void {
  const container =
    document.querySelector<HTMLElement>('.thermal-report') ??
    document.querySelector<HTMLElement>('.thermal-receipt');

  if (!container) {
    window.print();
    return;
  }

  const heightPx = container.getBoundingClientRect().height;
  // Converte px → mm (96 dpi padrão) e adiciona 8mm de buffer para rodapé
  const heightMm = Math.ceil(heightPx * 25.4 / 96) + 8;

  const styleId = 'thermal-dynamic-page';
  document.getElementById(styleId)?.remove();

  const style = document.createElement('style');
  style.id = styleId;
  // Inserido por último no <head>, sobrescreve qualquer @page anterior
  style.textContent = `@page { size: 58mm ${heightMm}mm; margin: 0; }`;
  document.head.appendChild(style);

  const cleanup = () => {
    document.getElementById(styleId)?.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup, { once: true });
  // Fallback: webviews Tauri nem sempre disparam afterprint
  setTimeout(cleanup, 8000);

  window.print();
}
