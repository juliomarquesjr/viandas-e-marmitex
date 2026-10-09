/**
 * Período dos filtros da área do cliente.
 *
 * A tela manda o instante exato (ISO com hora), calculado no fuso do aparelho
 * de quem pediu, e a API usa como veio. O formato antigo "AAAA-MM-DD" ainda é
 * aceito e vira o dia inteiro em America/Sao_Paulo: o servidor roda em UTC, e
 * meia-noite UTC cortaria as compras da noite para o dia seguinte.
 */

import { SAO_PAULO_OFFSET } from '@/lib/date-range';

const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function toInstant(value: string, edge: 'start' | 'end'): Date | null {
  const iso = DAY_ONLY.test(value)
    ? `${value}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}${SAO_PAULO_OFFSET}`
    : value;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type CustomerDateRange = { gte?: Date; lte?: Date };

/** `null` sem filtro; `'invalid'` quando alguma data não é uma data. */
export function parseCustomerDateRange(
  startDate: string | null,
  endDate: string | null
): CustomerDateRange | null | 'invalid' {
  if (!startDate && !endDate) return null;

  const range: CustomerDateRange = {};
  if (startDate) {
    const gte = toInstant(startDate, 'start');
    if (!gte) return 'invalid';
    range.gte = gte;
  }
  if (endDate) {
    const lte = toInstant(endDate, 'end');
    if (!lte) return 'invalid';
    range.lte = lte;
  }
  return range;
}
