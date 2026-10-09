import { addDaysToDay, dateStringSP, instantOfMinuteSP, weekdayAndMinuteSP } from '@/lib/date-range';

/**
 * Regras do pedido online (o cliente pede pela área dele; o admin libera produtos, dias e horários).
 * Tudo aqui é função pura: recebe `now` e as janelas, devolve o resultado. Quem decide é sempre o
 * servidor, em Brasília (o servidor roda em UTC; ver docs/fuso-horario.md). Descrição: docs/pedido-online.md.
 */

export const ORDERING = {
  /** Chaves em SystemConfig (categoria "ordering"). */
  ENABLED_KEY: 'online_ordering_enabled',
  PAUSED_UNTIL_KEY: 'online_ordering_paused_until',
  SOLD_OUT_KEY: 'online_ordering_sold_out',
  /** Depois do fim da janela o servidor ainda aceita o pedido por este tempo (cliente que montou o carrinho em cima da hora). */
  GRACE_MINUTES: 3,
  MAX_PENDING_PER_CUSTOMER: 3,
  MAX_PER_HOUR: 10,
  MAX_ITEMS: 10,
  MAX_QTY_PER_ITEM: 20,
  NOTES_MAX: 200,
  /** Pedido sem resposta do admin expira depois disto (e nunca atravessa o dia). */
  TTL_MINUTES: 20,
  /** Minutos prometidos pelo admin ao aceitar. */
  ACCEPT_MINUTES: [15, 30, 45, 60] as const,
} as const;

export interface WindowDef {
  id: string;
  name: string;
  weekdays: number[];
  startMinute: number;
  endMinute: number;
  active: boolean;
  productIds: string[];
}

export const WEEKDAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** A janela vale neste instante? `graceMinutes` estende o fim (só para validar o envio). */
export function isWindowOpen(window: WindowDef, now: Date, graceMinutes = 0): boolean {
  if (!window.active) return false;
  const { weekday, minute } = weekdayAndMinuteSP(now);
  if (!window.weekdays.includes(weekday)) return false;
  return minute >= window.startMinute && minute < Math.min(window.endMinute + graceMinutes, 1440);
}

/** Janelas abertas agora (com tolerância opcional). */
export function openWindows(windows: WindowDef[], now: Date, graceMinutes = 0): WindowDef[] {
  return windows.filter((w) => isWindowOpen(w, now, graceMinutes));
}

/** Ids dos produtos que o cliente pode pedir agora. */
export function productsOpenNow(windows: WindowDef[], now: Date, graceMinutes = 0): Set<string> {
  const ids = new Set<string>();
  for (const window of openWindows(windows, now, graceMinutes)) window.productIds.forEach((id) => ids.add(id));
  return ids;
}

export interface NextOpening {
  /** "AAAA-MM-DD" em Brasília. */
  day: string;
  weekday: number;
  startMinute: number;
  /** 0 = hoje, 1 = amanhã... */
  dayOffset: number;
  at: Date;
}

/** Próxima abertura a partir de agora (olha até 7 dias à frente). `null` se nenhuma janela abre. */
export function nextOpening(windows: WindowDef[], now: Date): NextOpening | null {
  const today = dateStringSP(now);
  const { weekday: todayWeekday, minute: nowMinute } = weekdayAndMinuteSP(now);
  const active = windows.filter((w) => w.active && w.productIds.length > 0);

  for (let offset = 0; offset <= 7; offset++) {
    const weekday = (todayWeekday + offset) % 7;
    const starts = active
      .filter((w) => w.weekdays.includes(weekday))
      .map((w) => w.startMinute)
      .filter((start) => offset > 0 || start > nowMinute)
      .sort((a, b) => a - b);
    if (starts.length > 0) {
      const day = addDaysToDay(today, offset);
      const at = instantOfMinuteSP(day, starts[0]);
      if (at) return { day, weekday, startMinute: starts[0], dayOffset: offset, at };
    }
  }
  return null;
}

export type ClosedReason = 'disabled' | 'paused' | 'no_windows' | 'closed';

export interface OrderingStatus {
  open: boolean;
  reason?: ClosedReason;
  /** Quando a janela aberta mais tardia fecha (só se aberto). */
  closesAt?: Date;
  /** Minutos até fechar (só se aberto). */
  minutesToClose?: number;
  nextOpening?: NextOpening | null;
}

export interface OrderingSettings {
  enabled: boolean;
  /** Pausa até este instante (ex.: "hoje não" = até 00:00 de amanhã em Brasília). */
  pausedUntil: Date | null;
}

/** Estado da loja para o cliente: aberta, ou por que está fechada e quando abre. */
export function orderingStatus(windows: WindowDef[], settings: OrderingSettings, now: Date): OrderingStatus {
  if (!settings.enabled) return { open: false, reason: 'disabled' };
  const usable = windows.filter((w) => w.active && w.productIds.length > 0);
  if (usable.length === 0) return { open: false, reason: 'no_windows' };
  if (settings.pausedUntil && settings.pausedUntil.getTime() > now.getTime()) {
    return { open: false, reason: 'paused', nextOpening: nextOpeningAfter(usable, now, settings.pausedUntil) };
  }

  const open = openWindows(usable, now);
  if (open.length === 0) return { open: false, reason: 'closed', nextOpening: nextOpening(usable, now) };

  const day = dateStringSP(now);
  const latestEnd = Math.max(...open.map((w) => w.endMinute));
  const closesAt = instantOfMinuteSP(day, latestEnd) ?? undefined;
  const minutesToClose = closesAt ? Math.max(0, Math.ceil((closesAt.getTime() - now.getTime()) / 60_000)) : undefined;
  return { open: true, closesAt, minutesToClose };
}

/** Primeira abertura depois de um instante (usado na pausa: a loja volta quando a pausa acaba e há janela). */
function nextOpeningAfter(windows: WindowDef[], now: Date, after: Date): NextOpening | null {
  const found = nextOpening(windows, after.getTime() > now.getTime() ? after : now);
  return found;
}

/** O pedido online sem resposta expirou? Vale 20 min após o envio e nunca passa do fim do dia em Brasília. */
export function isOrderExpired(createdAt: Date, now: Date): boolean {
  if (dateStringSP(createdAt) !== dateStringSP(now)) return true;
  return now.getTime() - createdAt.getTime() > ORDERING.TTL_MINUTES * 60_000;
}

/** "HH:mm" a partir de minutos desde 00:00 (1440 vira "24:00"). */
export function formatMinute(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Texto de quando abre: "hoje às 11:00", "amanhã às 11:00", "segunda às 11:00". */
export function describeOpening(next: NextOpening): string {
  const when = next.dayOffset === 0 ? 'hoje' : next.dayOffset === 1 ? 'amanhã' : WEEKDAY_NAMES[next.weekday];
  return `${when} às ${formatMinute(next.startMinute)}`;
}

/** Valida a lista de dias e o horário de uma janela vinda do admin. Devolve a mensagem do 1º erro. */
export function validateWindowInput(input: {
  name: unknown;
  weekdays: unknown;
  startMinute: unknown;
  endMinute: unknown;
  productIds: unknown;
}): string | null {
  if (typeof input.name !== 'string' || input.name.trim().length === 0 || input.name.trim().length > 60) {
    return 'Dê um nome à janela (até 60 letras).';
  }
  if (!Array.isArray(input.weekdays) || input.weekdays.length === 0) return 'Escolha pelo menos um dia da semana.';
  if (!input.weekdays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) || new Set(input.weekdays).size !== input.weekdays.length) {
    return 'Dias da semana inválidos.';
  }
  const { startMinute: s, endMinute: e } = input;
  if (!Number.isInteger(s) || !Number.isInteger(e) || (s as number) < 0 || (e as number) > 1440) return 'Horário inválido.';
  if ((s as number) >= (e as number)) return 'A hora final precisa ser depois da inicial.';
  if (!Array.isArray(input.productIds) || input.productIds.length === 0) return 'Marque pelo menos 1 produto nesta janela.';
  if (input.productIds.length > 200 || !input.productIds.every((id) => typeof id === 'string')) return 'Produtos inválidos.';
  return null;
}
