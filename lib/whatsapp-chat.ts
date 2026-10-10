// Conversa do WhatsApp com os clientes: leitura do que a Evolution manda e rótulos (puro, testado em tests/whatsapp-chat.test.ts).

export type ChatMessageType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'sticker' | 'other';
export type ChatStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface ParsedMessage {
  externalId: string;
  /** Telefone do contato, só dígitos (com 55). */
  number: string;
  fromMe: boolean;
  type: ChatMessageType;
  body: string | null;
  at: Date;
}

const MEDIA: Record<string, ChatMessageType> = {
  imageMessage: 'image',
  audioMessage: 'audio',
  pttMessage: 'audio',
  videoMessage: 'video',
  ptvMessage: 'video',
  documentMessage: 'document',
  documentWithCaptionMessage: 'document',
  locationMessage: 'location',
  liveLocationMessage: 'location',
  stickerMessage: 'sticker',
};

/** O que não é mensagem de verdade (reação, apagar, chaves de criptografia): não entra na conversa. */
const IGNORED = new Set(['reactionMessage', 'protocolMessage', 'senderKeyDistributionMessage', 'messageContextInfo', 'editedMessage', 'pollUpdateMessage']);

type Json = Record<string, unknown>;
const obj = (v: unknown): Json | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

/** "5562999998888@s.whatsapp.net" → "5562999998888"; grupos, status e transmissões viram null. */
export function numberFromChatJid(jid: unknown): string | null {
  const value = str(jid);
  if (!value) return null;
  const [user, server] = value.split('@');
  if (!server || server === 'g.us' || server === 'broadcast' || user === 'status') return null;
  if (server !== 's.whatsapp.net' && server !== 'c.us') return null; // @lid: o telefone vem por outro campo
  const digits = user.replace(/\D/g, '');
  return digits.length >= 10 ? digits : null;
}

function timestampOf(value: unknown): Date {
  const raw = typeof value === 'object' && value !== null ? Number((value as { low?: number }).low ?? 0) : Number(value);
  if (Number.isFinite(raw) && raw > 0) return new Date(raw > 1e12 ? raw : raw * 1000);
  return new Date();
}

/** Lê uma mensagem do webhook `messages.upsert`/`send.message` da Evolution v2. Devolve null se não for de um contato (grupo, reação…). */
export function parseWebhookMessage(data: unknown): ParsedMessage | null {
  const d = obj(data);
  const key = obj(d?.key);
  if (!d || !key) return null;
  const externalId = str(key.id);
  if (!externalId) return null;
  // mensagens novas do WhatsApp podem vir com @lid: o telefone real vem em outro campo
  const number = numberFromChatJid(key.remoteJid) ?? numberFromChatJid(key.remoteJidAlt) ?? numberFromChatJid(d.senderPn) ?? numberFromChatJid(key.senderPn);
  if (!number) return null;

  const message = obj(d.message) ?? {};
  const kind = str(d.messageType) ?? Object.keys(message).find((k) => k !== 'messageContextInfo') ?? '';
  if (IGNORED.has(kind)) return null;

  let type: ChatMessageType = 'other';
  let body: string | null = null;
  if (kind === 'conversation') {
    type = 'text';
    body = str(message.conversation);
  } else if (kind === 'extendedTextMessage') {
    type = 'text';
    body = str(obj(message.extendedTextMessage)?.text);
  } else if (MEDIA[kind]) {
    type = MEDIA[kind];
    const inner = obj(message[kind]);
    body = str(inner?.caption) ?? (type === 'document' ? str(inner?.fileName) : null);
  } else if (!kind) {
    return null;
  }
  if (type === 'text' && !body) return null;

  return { externalId, number, fromMe: key.fromMe === true, type, body, at: timestampOf(d.messageTimestamp) };
}

/** Situação que a Evolution informa (`messages.update`) → a nossa. */
export function chatStatusFrom(value: unknown): ChatStatus | null {
  const s = String(value ?? '').toUpperCase();
  if (s === 'SERVER_ACK' || s === 'SENT') return 'sent';
  if (s === 'DELIVERY_ACK' || s === 'DELIVERED') return 'delivered';
  if (s === 'READ' || s === 'PLAYED') return 'read';
  if (s === 'ERROR' || s === 'FAILED') return 'failed';
  return null;
}

/** Os dois telefones são o mesmo número? Ignora o 55, o formato e o nono dígito (DDD + últimos 8). */
export function sameBrazilNumber(a: string, b: string): boolean {
  const norm = (v: string) => {
    const d = v.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    return d.length >= 10 ? { ddd: d.slice(0, 2), tail: d.slice(-8) } : null;
  };
  const x = norm(a);
  const y = norm(b);
  return !!x && !!y && x.ddd === y.ddd && x.tail === y.tail;
}

const LABEL: Record<ChatMessageType, string> = {
  text: '',
  image: 'Foto',
  audio: 'Áudio',
  video: 'Vídeo',
  document: 'Documento',
  location: 'Localização',
  sticker: 'Figurinha',
  other: 'Tipo de mensagem não suportado nesta tela',
};

/** Texto curto para a lista e para balões sem texto: o texto, ou o tipo ("Foto", "Áudio"). */
export function messageLabel(type: string, body: string | null | undefined): string {
  if (type === 'text') return body ?? '';
  const label = LABEL[type as ChatMessageType] ?? LABEL.other;
  return body ? `${label}: ${body}` : label;
}

/** Mensagens do sistema que levam dado sensível: só o tipo fica gravado, nunca o texto. */
export const SYSTEM_LABEL: Record<string, string> = {
  daily_menu: 'Cardápio do dia',
  customer_orders: 'Resumo das compras',
  customer_balance: 'Saldo da ficha',
  customer_password: 'Senha de acesso',
  customer_password_reset: 'Link para redefinir senha',
};
