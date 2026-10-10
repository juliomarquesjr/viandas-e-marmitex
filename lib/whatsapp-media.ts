// Mídia das conversas do WhatsApp: o que pode ser mostrado e como servir (puro, testado em tests/whatsapp-media.test.ts).

/** Tipos de mensagem que têm arquivo para buscar na Evolution. */
export const MEDIA_MESSAGE_TYPES = ['image', 'audio', 'video', 'document', 'sticker'] as const;
export const isMediaMessageType = (type: string) => (MEDIA_MESSAGE_TYPES as readonly string[]).includes(type);

/** Maior arquivo que o sistema repassa (foto e áudio cabem folgados; vídeo grande fica para o celular). */
export const MAX_MEDIA_BYTES = 16 * 1024 * 1024;

const INLINE_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const INLINE_AUDIO = new Set(['audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/webm', 'audio/wav', 'audio/x-wav', 'audio/amr']);
const INLINE_VIDEO = new Set(['video/mp4', 'video/webm', 'video/3gpp', 'video/quicktime']);

/**
 * Só tipos conhecidos aparecem na tela; qualquer outro (inclusive SVG e HTML, que poderiam rodar código)
 * é entregue como download genérico. O `;codecs=opus` do WhatsApp é descartado.
 */
export function classifyMedia(mimetype: string | null | undefined, kind: string): { contentType: string; inline: boolean } {
  const base = (mimetype ?? '').split(';')[0].trim().toLowerCase();
  const allowed =
    (kind === 'image' || kind === 'sticker') ? INLINE_IMAGE : kind === 'audio' ? INLINE_AUDIO : kind === 'video' ? INLINE_VIDEO : null;
  if (allowed && allowed.has(base)) return { contentType: base, inline: true };
  if (kind === 'document' && base === 'application/pdf') return { contentType: base, inline: false };
  return { contentType: 'application/octet-stream', inline: false };
}

/** O arquivo em base64 → bytes. Aceita com ou sem o prefixo "data:...;base64,". */
export function decodeBase64Media(base64: string): Buffer {
  const comma = base64.startsWith('data:') ? base64.indexOf(',') : -1;
  return Buffer.from(comma >= 0 ? base64.slice(comma + 1) : base64, 'base64');
}

/** Cabeçalho Range (o vídeo e o áudio pedem pedaços para poder avançar). null = sem Range; 'invalid' = fora do arquivo. */
export function parseRange(header: string | null, size: number): { start: number; end: number } | null | 'invalid' {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start: number;
  let end: number;
  if (m[1] === '') {
    const last = Number(m[2]);
    start = Math.max(0, size - last);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  return start >= size || start > end ? 'invalid' : { start, end };
}

/** Nome seguro para o cabeçalho de download. */
export function safeFileName(name: string | null | undefined, fallback: string): string {
  const clean = (name ?? '').replace(/[\\/\r\n"]/g, '_').trim();
  return clean.slice(0, 120) || fallback;
}
