// Formatação de mensagem no estilo do WhatsApp: *negrito*, _itálico_, ~tachado~ e ```monoespaçado```.
// Puro: serve à prévia da tela, ao e-mail (que converte o mesmo texto em HTML) e aos testes.
// O WhatsApp aplica a formatação sozinho ao receber; aqui só mostramos o resultado antes de enviar.

export type FormatNode =
  | { type: 'text'; text: string }
  | { type: 'bold' | 'italic' | 'strike'; children: FormatNode[] }
  | { type: 'mono'; text: string };

const MARKS = { '*': 'bold', _: 'italic', '~': 'strike' } as const;
type Mark = keyof typeof MARKS;

// O marcador abre colado numa letra e fecha colado noutra; não atravessa linhas; "_" e "~" não grudam em palavra
const INLINE = /(```)([\s\S]+?)\1|([*_~])(?=\S)([^\n]*?\S)\3(?![\p{L}\p{N}])/gu;

export function parseFormatting(text: string): FormatNode[] {
  const nodes: FormatNode[] = [];
  let last = 0;
  // um regex por chamada: a recursão (negrito dentro de itálico) não pode dividir o lastIndex
  const re = new RegExp(INLINE.source, INLINE.flags);
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const start = m.index;
    // "_" no meio de uma palavra (maria_souza_x) não abre itálico
    if (m[3] && start > 0 && /[\p{L}\p{N}]/u.test(text[start - 1])) {
      re.lastIndex = start + 1;
      continue;
    }
    if (start > last) nodes.push({ type: 'text', text: text.slice(last, start) });
    if (m[1]) nodes.push({ type: 'mono', text: m[2] });
    else nodes.push({ type: MARKS[m[3] as Mark], children: parseFormatting(m[4]) });
    last = start + m[0].length;
  }
  if (last < text.length) nodes.push({ type: 'text', text: text.slice(last) });
  return nodes;
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Nós formatados → HTML de e-mail (texto sempre escapado). */
export function formattingToHtml(nodes: FormatNode[]): string {
  return nodes
    .map((n) => {
      if (n.type === 'text') return escapeHtml(n.text);
      if (n.type === 'mono') return `<code style="font-family:'Courier New',monospace;background:#f1f5f9;padding:1px 4px;border-radius:4px;">${escapeHtml(n.text)}</code>`;
      const inner = formattingToHtml(n.children);
      return n.type === 'bold' ? `<strong>${inner}</strong>` : n.type === 'italic' ? `<em>${inner}</em>` : `<s>${inner}</s>`;
    })
    .join('');
}

/** Tira os marcadores (para contar o tamanho "limpo" ou gerar a versão texto puro do e-mail). */
export function stripFormatting(text: string): string {
  const plain = (nodes: FormatNode[]): string =>
    nodes.map((n) => (n.type === 'text' || n.type === 'mono' ? n.text : plain(n.children))).join('');
  return plain(parseFormatting(text));
}

export type WrapKind = 'bold' | 'italic' | 'strike' | 'mono';
const WRAP: Record<WrapKind, string> = { bold: '*', italic: '_', strike: '~', mono: '```' };

/**
 * Aplica ou tira o marcador na seleção do texto. Sem seleção, deixa o par de marcadores com o cursor no meio.
 * Devolve o texto novo e a seleção que o campo deve ter depois.
 */
export function toggleWrap(text: string, start: number, end: number, kind: WrapKind): { text: string; start: number; end: number } {
  const mark = WRAP[kind];
  const before = text.slice(0, start);
  const selected = text.slice(start, end);
  const after = text.slice(end);

  // já está marcado (marcadores logo fora da seleção): tira
  if (before.endsWith(mark) && after.startsWith(mark)) {
    return { text: before.slice(0, -mark.length) + selected + after.slice(mark.length), start: start - mark.length, end: end - mark.length };
  }
  // seleção que já inclui os marcadores nas pontas: tira
  if (selected.length > mark.length * 2 && selected.startsWith(mark) && selected.endsWith(mark)) {
    const inner = selected.slice(mark.length, -mark.length);
    return { text: before + inner + after, start, end: start + inner.length };
  }
  // não deixa espaço colado por dentro do marcador (o WhatsApp não formata assim)
  const lead = selected.match(/^\s*/)?.[0] ?? '';
  const trail = selected.slice(lead.length).match(/\s*$/)?.[0] ?? '';
  const core = selected.slice(lead.length, selected.length - trail.length);
  const wrapped = `${lead}${mark}${core}${mark}${trail}`;
  const cursor = start + lead.length + mark.length;
  return core
    ? { text: before + wrapped + after, start: cursor, end: cursor + core.length }
    : { text: before + mark + mark + after, start: start + mark.length, end: start + mark.length };
}

/** Emojis oferecidos no editor: todos suportados pelo WhatsApp (Unicode padrão). */
export const EMOJI_GROUPS: { name: string; emojis: string[] }[] = [
  { name: 'Comida', emojis: ['🍽️', '🍲', '🍛', '🍗', '🥩', '🍝', '🍚', '🥗', '🥘', '🍕', '🍰', '🍮', '🥤', '☕'] },
  { name: 'Carinhas', emojis: ['😀', '😊', '😋', '😉', '🙂', '🤗', '😍', '😎'] },
  { name: 'Gestos', emojis: ['👋', '👍', '👏', '🙏', '💪', '🤝'] },
  { name: 'Símbolos', emojis: ['❤️', '⭐', '✨', '🔥', '🎉', '✅', '⚠️', '📅', '🕐', '📍', '📞', '📲', '🛵', '🛒', '💳', '🔑', '☀️'] },
];
