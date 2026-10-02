/**
 * Constantes do tema da área do cliente. Ficam fora do provider ("use client")
 * porque o layout raiz, que é componente de servidor, injeta o script abaixo.
 */

export type CustomerThemeChoice = "light" | "dark" | "auto";
export type CustomerThemeMode = "light" | "dark";

export const CUSTOMER_THEME_STORAGE_KEY = "customer:theme";

/** Sem escolha salva, a área do cliente segue o tema do aparelho. */
export const DEFAULT_CUSTOMER_THEME: CustomerThemeChoice = "auto";

/**
 * Roda antes da primeira pintura e escreve a escolha em <html>, para a página
 * não piscar no tema errado. Sozinho o atributo não muda nada: só vale onde
 * existe um [data-customer-scope] (ver app/customer/customer.css).
 */
export const CUSTOMER_THEME_BOOTSTRAP_SCRIPT = `(function(){try{var m=window.localStorage.getItem(${JSON.stringify(
  CUSTOMER_THEME_STORAGE_KEY
)});if(m!=="light"&&m!=="dark"){m="auto";}document.documentElement.setAttribute("data-customer-theme",m);}catch(e){}})();`;
