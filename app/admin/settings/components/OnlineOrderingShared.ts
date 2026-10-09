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

export function formatMinute(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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
    name: 'Novo horário',
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
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(at);
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
