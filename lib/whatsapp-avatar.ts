// Foto de perfil do contato no WhatsApp: o que é aceito e por quanto tempo vale (puro, testado em tests/whatsapp-avatar.test.ts).

/** Maior imagem que o sistema repassa (uma foto de perfil tem poucas dezenas de KB). */
export const AVATAR_MAX_BYTES = 1_500_000;
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Quanto tempo uma foto achada vale antes de buscar de novo, e quanto vale a resposta "sem foto". */
export const AVATAR_TTL_HIT_MS = 6 * 60 * 60 * 1000;
export const AVATAR_TTL_MISS_MS = 60 * 60 * 1000;
/** Falha de rede/Evolution: tenta de novo logo. */
export const AVATAR_TTL_ERROR_MS = 2 * 60 * 1000;

const HOSTS = ['whatsapp.net', 'whatsapp.com', 'fbcdn.net'];

/**
 * O endereço que a Evolution devolve é de um servidor do WhatsApp (https). Qualquer outro lugar é recusado, para
 * a rota nunca virar um jeito de o servidor buscar endereços internos. Em desenvolvimento, `localhost` também vale (testes).
 */
export function isAllowedAvatarUrl(raw: string, development: boolean = process.env.NODE_ENV !== 'production'): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  if (development && (host === 'localhost' || host === '127.0.0.1') && (url.protocol === 'http:' || url.protocol === 'https:')) return true;
  return url.protocol === 'https:' && HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

/** O tipo da imagem sem parâmetros, se for um dos aceitos. */
export function avatarContentType(header: string | null | undefined): (typeof AVATAR_TYPES)[number] | null {
  const base = (header ?? '').split(';')[0].trim().toLowerCase();
  return (AVATAR_TYPES as readonly string[]).includes(base) ? (base as (typeof AVATAR_TYPES)[number]) : null;
}
