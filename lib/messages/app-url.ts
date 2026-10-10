// Endereço do aplicativo que vai nos links das mensagens ({link_app}). Puro: serve ao servidor e à tela de Configurações.

/** Chave em Configurações → Marca. Em branco, vale o endereço padrão do sistema (variável de ambiente). */
export const APP_URL_KEY = 'branding_app_url';

/**
 * Normaliza o que a pessoa digitou: sem endereço em branco, com https:// quando faltar, só http(s), sem barra no fim,
 * sem parâmetros. Devolve null quando não é um endereço válido.
 */
export function parseAppUrl(raw: string): string | null {
  const text = raw.trim();
  if (!text || /\s/.test(text)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.username || url.password) return null;
    const host = url.hostname;
    if (host !== 'localhost' && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host)) return null;
    return `${url.origin}${url.pathname}`.replace(/\/+$/, '');
  } catch {
    return null;
  }
}
