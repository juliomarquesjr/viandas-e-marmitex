"use client";

import { useEffect } from "react";

/**
 * Publica a área realmente visível da tela em `--vv-h` e `--vv-top` (em px) e marca `data-keyboard="open"` no
 * <html> enquanto o teclado está aberto (a área do cliente usa para esconder a barra de baixo e deixar o
 * botão Salvar acima do teclado).
 *
 * No celular o teclado cobre a parte de baixo sem mudar `100vh`/`100dvh` (iOS e Chrome Android por padrão):
 * um modal centrado nessa altura ficaria com o botão Salvar escondido atrás do teclado. Os modais (ver
 * `[data-vv-dialog]` em globals.css) usam essas variáveis para caber na parte visível. Com zoom de pinça
 * ativo as variáveis voltam ao tamanho da janela, para o modal não encolher junto.
 */
export function ViewportVars() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement.style;
    let frame = 0;

    const apply = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const zoomed = vv.scale > 1.01;
        root.setProperty("--vv-h", `${zoomed ? window.innerHeight : vv.height}px`);
        root.setProperty("--vv-top", `${zoomed ? 0 : vv.offsetTop}px`);
        // teclado aberto: a janela visual perde bem mais que a barra do navegador (que some e volta ao rolar)
        const keyboard = !zoomed && window.innerHeight - vv.height > 150;
        if (keyboard) document.documentElement.setAttribute("data-keyboard", "open");
        else document.documentElement.removeAttribute("data-keyboard");
      });
    };

    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      window.cancelAnimationFrame(frame);
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      root.removeProperty("--vv-h");
      root.removeProperty("--vv-top");
      document.documentElement.removeAttribute("data-keyboard");
    };
  }, []);

  return null;
}
