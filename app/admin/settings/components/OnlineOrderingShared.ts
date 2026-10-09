// Tipos e regras puras da aba "Pedidos online" (sem React).

export interface OOWindow {
  id: string;
  name: string;
  weekdays: number[];
  startMinute: number;
  endMinute: number;
  active: boolean;
  productIds: string[];
  schedule: string;
}

export interface OOProduct {
  id: string;
  name: string;
  priceCents: number;
  imageUrl: string | null;
  category: { id: string; name: string } | null;
  stockEnabled: boolean;
  stock: number;
  eligible: boolean;
  reason?: string;
}

export interface OOPreview {
  open: boolean;
  reason: 'disabled' | 'paused' | 'no_windows' | 'closed' | null;
  minutesToClose: number | null;
  nextOpening: string | null;
  today: string;
  serverNow: string;
}

export interface OOSnapshot {
  enabled: boolean;
  pausedUntil: string | null;
  windows: OOWindow[];
  soldOutToday: string[];
  products: OOProduct[];
  preview: OOPreview;
}

/** Horário em edição (ainda pode não estar salvo). `key` é só para o React. */
export interface DraftWindow {
  key: string;
  id?: string;
  name: string;
  weekdays: number[];
  startMinute: number;
  endMinute: number;
  active: boolean;
  productIds: string[];
}

export const MAX_WINDOWS = 20;

/** Cor de cada horário na grade da semana (a ordem se repete se houver mais de 6). */
export const WINDOW_COLORS = [
  { dot: '#2563eb', bg: 'rgba(37,99,235,0.14)', border: 'rgba(37,99,235,0.5)' },
  { dot: '#7c3aed', bg: 'rgba(124,58,237,0.14)', border: 'rgba(124,58,237,0.5)' },
  { dot: '#0d9488', bg: 'rgba(13,148,136,0.14)', border: 'rgba(13,148,136,0.5)' },
  { dot: '#d97706', bg: 'rgba(217,119,6,0.16)', border: 'rgba(217,119,6,0.55)' },
  { dot: '#db2777', bg: 'rgba(219,39,119,0.13)', border: 'rgba(219,39,119,0.5)' },
  { dot: '#4f46e5', bg: 'rgba(79,70,229,0.14)', border: 'rgba(79,70,229,0.5)' },
] as const;

/** Dia da semana (0 = domingo) e minuto do dia, em Brasília, no instante informado. */
export function nowInSaoPaulo(iso: string): { weekday: number; minute: number } {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(Number.isNaN(date.getTime()) ? new Date() : date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  const hour = Number(get('hour')) % 24;
  return { weekday: weekday < 0 ? 0 : weekday, minute: hour * 60 + Number(get('minute')) };
}

/** Texto curto dos dias: "Seg a sex", "Todos os dias", "Sáb e dom", "Ter, qui". */
export function daysLabel(weekdays: number[]): string {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const names: Record<number, string> = { 0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sáb' };
  const set = new Set(weekdays);
  if (set.size === 7) return 'Todos os dias';
  if (set.size === 0) return 'Nenhum dia';
  const sorted = order.filter((d) => set.has(d));
  const consecutive = sorted.length > 2 && sorted.every((d, i) => i === 0 || order.indexOf(d) === order.indexOf(sorted[i - 1]) + 1);
  const text = consecutive
    ? `${names[sorted[0]]} a ${names[sorted[sorted.length - 1]]}`
    : sorted.length === 2
      ? `${names[sorted[0]]} e ${names[sorted[1]]}`
      : sorted.map((d) => names[d]).join(', ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Ordem de exibição: segunda a domingo (0 = domingo no servidor)
export const WEEKDAY_CHIPS: { value: number; short: string; full: string }[] = [
  { value: 1, short: 'Seg', full: 'Segunda-feira' },
  { value: 2, short: 'Ter', full: 'Terça-feira' },
  { value: 3, short: 'Qua', full: 'Quarta-feira' },
  { value: 4, short: 'Qui', full: 'Quinta-feira' },
  { value: 5, short: 'Sex', full: 'Sexta-feira' },
  { value: 6, short: 'Sáb', full: 'Sábado' },
  { value: 0, short: 'Dom', full: 'Domingo' },
];

/** Interruptores com trilha e borda visíveis quando desligados (inclusive no tema escuro). */
export const SWITCH_OFF_CLASS =
  'data-[state=unchecked]:bg-[color:var(--muted-foreground)]/45 data-[state=unchecked]:border-[color:var(--muted-foreground)]';

/** Interruptores sobre fundo de alerta (vermelho): ligado usa o tom de alerta, não o azul. */
export const SWITCH_ALERT_CLASS =
  'data-[state=checked]:bg-[color:var(--state-cobrar-solid)] data-[state=checked]:border-[color:var(--state-cobrar-solid)]';

export function formatMinute(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Texto da hora nos campos: o fim 24:00 aparece como meia-noite. */
export function minuteLabel(kind: 'start' | 'end', minute: number): string {
  return kind === 'end' && minute === 1440 ? '24:00 (meia-noite)' : formatMinute(minute);
}

/** Opções de hora de 30 em 30 minutos; mantém um valor "quebrado" já salvo para não sumir do campo. */
export function minuteOptions(kind: 'start' | 'end', current: number): number[] {
  const list: number[] = [];
  if (kind === 'start') {
    for (let m = 0; m <= 1410; m += 30) list.push(m);
  } else {
    for (let m = 30; m <= 1440; m += 30) list.push(m);
  }
  if (!list.includes(current)) list.push(current);
  return list.sort((a, b) => a - b);
}

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

let keyCounter = 0;
export function newKey(): string {
  keyCounter += 1;
  return `novo-${keyCounter}`;
}

export function toDraft(w: OOWindow): DraftWindow {
  return {
    key: w.id,
    id: w.id,
    name: w.name,
    weekdays: [...w.weekdays],
    startMinute: w.startMinute,
    endMinute: w.endMinute,
    active: w.active,
    productIds: [...w.productIds],
  };
}

export function blankWindow(overrides: Partial<DraftWindow> = {}): DraftWindow {
  return {
    key: newKey(),
    name: 'Horário novo',
    weekdays: [1, 2, 3, 4, 5],
    startMinute: 600,
    endMinute: 780,
    active: true,
    productIds: [],
    ...overrides,
  };
}

export interface Preset {
  id: string;
  label: string;
  description: string;
  build: () => DraftWindow[];
}

export const PRESETS: Preset[] = [
  {
    id: 'lunch',
    label: 'Almoço seg–sex 10:00–13:00',
    description: 'Um horário só, de segunda a sexta.',
    build: () => [blankWindow({ name: 'Almoço' })],
  },
  {
    id: 'lunch-dinner',
    label: 'Almoço + jantar',
    description: 'Dois horários: 10:00–13:00 e 17:00–20:00.',
    build: () => [
      blankWindow({ name: 'Almoço' }),
      blankWindow({ name: 'Jantar', startMinute: 1020, endMinute: 1200 }),
    ],
  },
  {
    id: 'all-days',
    label: 'Todos os dias 10:00–22:00',
    description: 'Aberto toda a semana, o dia inteiro.',
    build: () => [
      blankWindow({ name: 'Todos os dias', weekdays: [0, 1, 2, 3, 4, 5, 6], startMinute: 600, endMinute: 1320 }),
    ],
  },
  {
    id: 'blank',
    label: 'Em branco',
    description: 'Um horário para você preencher.',
    build: () => [blankWindow()],
  },
];

export interface WindowErrors {
  name?: string;
  weekdays?: string;
  time?: string;
  products?: string;
}

/** Validações no navegador (as mesmas do servidor, em texto simples). */
export function validateDraft(w: DraftWindow, eligibleIds: Set<string>): WindowErrors {
  const errors: WindowErrors = {};
  const name = w.name.trim();
  if (name.length === 0) errors.name = 'Dê um nome ao horário.';
  else if (name.length > 60) errors.name = 'Use um nome com até 60 letras.';
  if (w.weekdays.length === 0) errors.weekdays = 'Escolha pelo menos um dia.';
  if (w.startMinute >= w.endMinute) errors.time = 'A hora final precisa ser depois da inicial.';
  if (w.productIds.length === 0) errors.products = 'Marque pelo menos 1 produto.';
  else if (w.productIds.some((id) => !eligibleIds.has(id))) {
    errors.products = 'Há produtos que não podem mais ser pedidos pelo app. Tire-os da lista.';
  }
  return errors;
}

export function hasErrors(e: WindowErrors): boolean {
  return Boolean(e.name || e.weekdays || e.time || e.products);
}

/** Mesma forma usada para comparar o que está na tela com o que está salvo. */
function normalize(w: Pick<DraftWindow, 'id' | 'name' | 'weekdays' | 'startMinute' | 'endMinute' | 'active' | 'productIds'>) {
  return {
    id: w.id ?? null,
    name: w.name.trim(),
    weekdays: [...w.weekdays].sort((a, b) => a - b),
    startMinute: w.startMinute,
    endMinute: w.endMinute,
    active: w.active,
    productIds: [...w.productIds].sort(),
  };
}

export function serializeWindows(list: Parameters<typeof normalize>[0][]): string {
  return JSON.stringify(list.map(normalize));
}

export function toPayload(list: DraftWindow[]) {
  return list.map((w) => {
    const n = normalize(w);
    return {
      ...(n.id ? { id: n.id } : {}),
      name: n.name,
      weekdays: n.weekdays,
      startMinute: n.startMinute,
      endMinute: n.endMinute,
      active: n.active,
      productIds: w.productIds,
    };
  });
}

/** Horários ativos que se encostam no mesmo dia (aviso informativo, não bloqueia). */
export function findOverlaps(list: DraftWindow[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  const valid = list.filter((w) => w.active && w.weekdays.length > 0 && w.startMinute < w.endMinute);
  for (const a of valid) {
    for (const b of valid) {
      if (a.key === b.key) continue;
      const sharesDay = a.weekdays.some((d) => b.weekdays.includes(d));
      if (sharesDay && a.startMinute < b.endMinute && b.startMinute < a.endMinute) {
        result.set(a.key, [...(result.get(a.key) ?? []), b.name.trim() || 'outro horário']);
      }
    }
  }
  return result;
}

/** Hora de fechamento (Brasília) a partir do que o servidor informou. */
export function closingTime(preview: { serverNow: string; minutesToClose: number | null }): string | null {
  if (preview.minutesToClose == null) return null;
  const base = new Date(preview.serverNow).getTime();
  if (Number.isNaN(base)) return null;
  const at = new Date(base + preview.minutesToClose * 60_000);
  const text = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(at);
  return text === '00:00' || text === '24:00' ? 'meia-noite' : text;
}

export type ApiResult =
  | { ok: true; data: OOSnapshot }
  | { ok: false; message: string; network: boolean };

export async function callOrdering(method: 'GET' | 'PUT', body?: unknown): Promise<ApiResult> {
  try {
    const res = await fetch('/api/admin/customer-ordering', {
      method,
      cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    if (!res.ok) {
      const serverMessage = (json as { error?: string } | null)?.error;
      if (res.status === 401 || res.status === 403) {
        return { ok: false, network: false, message: serverMessage || 'Só o administrador pode mexer nos pedidos online.' };
      }
      return { ok: false, network: false, message: serverMessage || 'Algo deu errado. Tente de novo.' };
    }
    return { ok: true, data: json as OOSnapshot };
  } catch {
    return { ok: false, network: true, message: 'Sem conexão. Tente de novo.' };
  }
}

/** "Bebidas (9), Pratos (1)": quantos produtos do horário há em cada categoria. */
export function categorySummary(productIds: string[], products: OOProduct[]): string {
  const byId = new Map(products.map((p) => [p.id, p]));
  const counts = new Map<string, number>();
  for (const id of productIds) {
    const p = byId.get(id);
    if (!p) continue;
    const name = p.category?.name ?? 'Sem categoria';
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
    .map(([name, n]) => `${name} (${n})`)
    .join(', ');
}

/** Quantos horários do rascunho são novos, mudaram ou foram apagados em relação ao salvo. */
export function countChangedWindows(draft: DraftWindow[], saved: OOWindow[]): number {
  const savedById = new Map(saved.map((w) => [w.id, w]));
  let changed = 0;
  for (const w of draft) {
    const original = w.id ? savedById.get(w.id) : undefined;
    if (!original || serializeWindows([w]) !== serializeWindows([original])) changed += 1;
  }
  const draftIds = new Set(draft.map((w) => w.id).filter(Boolean));
  for (const w of saved) if (!draftIds.has(w.id)) changed += 1;
  return changed;
}
