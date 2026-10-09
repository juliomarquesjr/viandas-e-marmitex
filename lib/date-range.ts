/**
 * "O dia" do negócio é o dia em Brasília, não o dia em UTC.
 *
 * O servidor roda em UTC (Vercel). Meia-noite UTC é 21h em Brasília: montar o dia assim joga as
 * vendas da noite (depois das 21h) para o dia seguinte, e o filtro "hoje" deixa de mostrá-las.
 * Toda conta de início e fim de dia passa por aqui, no servidor e no navegador.
 */

// Brasil sem horário de verão desde 2019: o deslocamento é fixo
export const SAO_PAULO_OFFSET = '-03:00';

const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Instante de uma hora de um dia ("AAAA-MM-DD") em Brasília. `null` se não for uma data de verdade:
 * o JS aceita 2026-02-30 e devolve 02/03, então confere que o dia continua o mesmo.
 */
function instantOfDay(day: string, time: string): Date | null {
  if (!DAY_ONLY.test(day)) return null;
  const date = new Date(`${day}T${time}${SAO_PAULO_OFFSET}`);
  if (Number.isNaN(date.getTime())) return null;
  return dateStringSP(date) === day ? date : null;
}

/** Instante do começo do dia ("AAAA-MM-DD") em Brasília, ou `null` se não for uma data. */
export function startOfDaySP(day: string): Date | null {
  return instantOfDay(day, '00:00:00.000');
}

/** Instante do fim do dia ("AAAA-MM-DD") em Brasília, ou `null` se não for uma data. */
export function endOfDaySP(day: string): Date | null {
  return instantOfDay(day, '23:59:59.999');
}

/** Meio-dia do dia em Brasília: para datas informadas à mão (venda retroativa), longe das bordas do dia. */
export function noonOfDaySP(day: string): Date | null {
  return instantOfDay(day, '12:00:00.000');
}

export type DayRange = { gte?: Date; lte?: Date };

/** Filtro `createdAt` para um período de dias. `null` sem filtro; `'invalid'` se alguma data não for data. */
export function parseDayRange(startDate: string | null, endDate: string | null): DayRange | null | 'invalid' {
  if (!startDate && !endDate) return null;

  const range: DayRange = {};
  if (startDate) {
    const gte = startOfDaySP(startDate);
    if (!gte) return 'invalid';
    range.gte = gte;
  }
  if (endDate) {
    const lte = endOfDaySP(endDate);
    if (!lte) return 'invalid';
    range.lte = lte;
  }
  return range;
}

/** O dia ("AAAA-MM-DD") em que o instante cai em Brasília, em qualquer servidor ou aparelho. */
export function dateStringSP(date: Date = new Date()): string {
  // formatToParts não depende do formato do idioma (um Node sem ICU completo mudaria a ordem)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Hoje ("AAAA-MM-DD") em Brasília. Substitui `new Date().toISOString().split("T")[0]`, que é o dia em UTC. */
export function todaySP(): string {
  return dateStringSP(new Date());
}

/** "AAAA-MM-DD" de uma data montada no aparelho (ex.: `new Date(ano, mes, 1)`): usa o dia local, não o de UTC. */
export function localDateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Dia da semana (0 = domingo) e minuto do dia (0..1439) de um instante, em Brasília. */
export function weekdayAndMinuteSP(date: Date): { weekday: number; minute: number } {
  const day = dateStringSP(date);
  // meio-dia UTC do próprio dia: o dia da semana não depende do fuso de quem calcula
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  // hourCycle h23 evita o "24:00" da meia-noite
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? '0');
  return { weekday, minute: get('hour') * 60 + get('minute') };
}

/** Instante de um minuto do dia ("AAAA-MM-DD" + minutos desde 00:00) em Brasília. */
export function instantOfMinuteSP(day: string, minute: number): Date | null {
  const start = startOfDaySP(day);
  return start ? new Date(start.getTime() + minute * 60_000) : null;
}

/** "AAAA-MM-DD" do dia seguinte (calendário, sem depender de fuso). */
export function addDaysToDay(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
