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

/** Instante do começo do dia ("AAAA-MM-DD") em Brasília, ou `null` se não for uma data. */
export function startOfDaySP(day: string): Date | null {
  if (!DAY_ONLY.test(day)) return null;
  const date = new Date(`${day}T00:00:00.000${SAO_PAULO_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Instante do fim do dia ("AAAA-MM-DD") em Brasília, ou `null` se não for uma data. */
export function endOfDaySP(day: string): Date | null {
  if (!DAY_ONLY.test(day)) return null;
  const date = new Date(`${day}T23:59:59.999${SAO_PAULO_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Meio-dia do dia em Brasília: para datas informadas à mão (venda retroativa), longe das bordas do dia. */
export function noonOfDaySP(day: string): Date | null {
  if (!DAY_ONLY.test(day)) return null;
  const date = new Date(`${day}T12:00:00.000${SAO_PAULO_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
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
  // en-CA formata como AAAA-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
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
