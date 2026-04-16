/**
 * Prepara e dispara a impressão de páginas térmicas.
 *
 * Estratégia: NÃO forçar um tamanho de página customizado via @page size.
 * Drivers com papel fixo (ex: CUPS 58×210mm) ignoram a declaração CSS e
 * cortam o conteúdo. A abordagem correta é deixar o browser usar o tamanho
 * configurado na impressora e paginar o conteúdo naturalmente em múltiplos
 * segmentos — o que garante que todo o conteúdo seja impresso.
 *
 * Apenas o margin do @page é sobrescrito (remove o 0.25in do layout global).
 */
export function printThermalPage(): void {
  const styleId = 'thermal-dynamic-page';
  document.getElementById(styleId)?.remove();

  const style = document.createElement('style');
  style.id = styleId;
  // Sobrescreve apenas o margin; deixa o size para o driver da impressora
  style.textContent = `@page { margin: 0; }`;
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
