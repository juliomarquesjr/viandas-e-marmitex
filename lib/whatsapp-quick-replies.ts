// Respostas rápidas do atendimento (puro, testado em tests/whatsapp-quick-replies.test.ts).

export const QUICK_LIMITS = { TITLE: 60, TEXT: 1000, SHORTCUT: 20 } as const;

export interface QuickReply {
  id: string;
  title: string;
  text: string;
  shortcut: string | null;
}

export interface QuickReplyInput {
  title: string;
  text: string;
  shortcut: string | null;
}

/** "/Pedido " → "pedido": sem a barra, minúsculo, só letras, números, hífen e sublinhado. */
export function normalizeShortcut(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const clean = value
    .trim()
    .replace(/^\/+/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return clean || null;
}

export type QuickReplyValidation = { ok: true; value: QuickReplyInput } | { ok: false; error: string };

export function validateQuickReply(raw: unknown): QuickReplyValidation {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const title = typeof body.title === 'string' ? body.title.replace(/\s+/g, ' ').trim() : '';
  const text = typeof body.text === 'string' ? body.text.replace(/\r\n/g, '\n').trim() : '';
  const shortcut = normalizeShortcut(body.shortcut);
  if (!title) return { ok: false, error: 'Dê um nome à resposta.' };
  if (title.length > QUICK_LIMITS.TITLE) return { ok: false, error: `O nome pode ter até ${QUICK_LIMITS.TITLE} caracteres.` };
  if (!text) return { ok: false, error: 'Escreva o texto da resposta.' };
  if (text.length > QUICK_LIMITS.TEXT) return { ok: false, error: `O texto pode ter até ${QUICK_LIMITS.TEXT} caracteres.` };
  if (shortcut && !/^[a-z0-9_-]{2,20}$/.test(shortcut)) {
    return { ok: false, error: `O atalho usa de 2 a ${QUICK_LIMITS.SHORTCUT} letras, números, hífen ou sublinhado (sem espaços).` };
  }
  const unknown = [...text.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]).filter((v) => v !== 'nome');
  if (unknown.length > 0) return { ok: false, error: `Variável desconhecida: {${unknown[0]}}. Só {nome} está disponível.` };
  return { ok: true, value: { title, text, shortcut } };
}

/** Coloca o primeiro nome do cliente no lugar de {nome}. */
export function applyQuickReply(text: string, customerName: string): string {
  const first = customerName.trim().split(/\s+/)[0] || 'cliente';
  return text.replace(/\{nome\}/g, first);
}

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Filtra pela busca (atalho, nome ou texto); o atalho que começa com a busca vem primeiro. */
export function filterQuickReplies<T extends QuickReply>(list: T[], query: string): T[] {
  const q = fold(query.trim().replace(/^\//, ''));
  if (!q) return list;
  const score = (r: T) => {
    const s = r.shortcut ? fold(r.shortcut) : '';
    if (s === q) return 0;
    if (s.startsWith(q)) return 1;
    if (fold(r.title).startsWith(q)) return 2;
    if (fold(r.title).includes(q)) return 3;
    if (fold(r.text).includes(q)) return 4;
    return 9;
  };
  return list.filter((r) => score(r) < 9).sort((a, b) => score(a) - score(b));
}

/** O "/algo" no fim do texto (no começo ou depois de espaço) que abre a lista de atalhos; devolve a busca e onde começa. */
export function slashQuery(text: string): { query: string; start: number } | null {
  const m = /(^|\s)\/([^\s/]*)$/.exec(text);
  if (!m) return null;
  return { query: m[2], start: text.length - m[2].length - 1 };
}

/** Exemplos para quem ainda não criou nenhuma. */
export const EXAMPLE_REPLIES: QuickReplyInput[] = [
  { title: 'Agradecimento', text: 'Obrigado pelo contato, {nome}! 😊', shortcut: 'obrigado' },
  { title: 'Pedido em separação', text: 'Oi, {nome}! Já vamos separar o seu pedido 🍽️', shortcut: 'pedido' },
  { title: 'Fora do horário', text: 'Oi, {nome}! Estamos fechados agora. Voltamos amanhã! 😊', shortcut: 'fechado' },
];
