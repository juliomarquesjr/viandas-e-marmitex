/**
 * Formatação da área do cliente. Roda no navegador: os componentes de tela não
 * devem importar de lib/customer-auth, que puxa next-auth e o Prisma.
 *
 * Valores sempre em centavos, como no resto do sistema. Datas no fuso do
 * aparelho do cliente, que é quem lê.
 */

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const decimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "R$ 186,50" */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/** "186,50": o número sem o símbolo, para o R$ ser desenhado à parte. */
export function formatAmount(cents: number): string {
  return decimal.format(Math.abs(cents) / 100);
}

/** "0,650 kg" */
export function formatKg(weightKg: number): string {
  return `${weightKg.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`;
}

const toDate = (value: string | Date) => (value instanceof Date ? value : new Date(value));
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "01/10" */
export function formatDayMonth(value: string | Date): string {
  return toDate(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** "01" */
export function formatDay(value: string | Date): string {
  return toDate(value).toLocaleDateString("pt-BR", { day: "2-digit" });
}

/** "qui" */
export function formatWeekdayShort(value: string | Date): string {
  return toDate(value).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}

/** "12:41" */
export function formatTime(value: string | Date): string {
  return toDate(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** "agora", "há 12 min", "há 3 h", "Ontem · 18:40" ou "30/09 · 11:30" */
export function formatRelative(value: string | Date, now: Date = new Date()): string {
  const date = toDate(value);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  if (minutes < 6 * 60) return `há ${Math.floor(minutes / 60)} h`;
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = formatTime(date);
  if (sameDay(date, now)) return `Hoje · ${time}`;
  if (sameDay(date, yesterday)) return `Ontem · ${time}`;
  return `${formatDayMonth(date)} · ${time}`;
}

/** "Quinta-feira, 1 de outubro" */
export function formatLongDate(value: string | Date): string {
  return capitalize(toDate(value).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }));
}

/** "Sexta, 2 de outubro" (sem o "-feira", para o cabeçalho) */
export function formatTodayLabel(value: string | Date = new Date()): string {
  return formatLongDate(value).replace("-feira", "");
}

/** "Outubro de 2026" */
export function formatMonthLabel(value: string | Date): string {
  return capitalize(toDate(value).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));
}

/** Chave estável para agrupar por mês: "2026-10" */
export function monthKey(value: string | Date): string {
  const d = toDate(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function firstName(name?: string | null): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

export function initials(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

/**
 * Início e fim de um dia no fuso do aparelho, em ISO. A API recebe o instante
 * exato e não precisa adivinhar o fuso de quem pediu.
 */
export function startOfDayISO(value: Date): string {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function endOfDayISO(value: Date): string {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
