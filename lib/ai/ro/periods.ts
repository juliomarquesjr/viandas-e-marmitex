// Períodos de tempo que a RO entende, sempre no dia de Brasília (puro, testado em tests/ro.test.ts).

import { addDaysToDay, endOfDaySP, startOfDaySP } from '@/lib/date-range';

export const PERIODOS = [
  'hoje',
  'ontem',
  'esta_semana',
  'semana_passada',
  'ultimos_7_dias',
  'este_mes',
  'mes_passado',
  'ultimos_30_dias',
  'este_ano',
  'intervalo',
] as const;
export type Periodo = (typeof PERIODOS)[number];

export interface PeriodoResolvido {
  de: string;
  ate: string;
  inicio: Date;
  fim: Date;
  /** Já com a preposição, para ler no meio ou no começo da frase: "hoje (11/10)", "nesta semana (...)", "em setembro de 2026". */
  rotulo: string;
  dias: number;
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const dm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
const dmy = (dia: string) => `${dm(dia)}/${dia.slice(0, 4)}`;
const segunda = (dia: string) => addDaysToDay(dia, -((new Date(`${dia}T12:00:00Z`).getUTCDay() + 6) % 7));
const primeiroDoMes = (dia: string) => `${dia.slice(0, 7)}-01`;
const ultimoDoMes = (dia: string) => addDaysToDay(`${addDaysToDay(primeiroDoMes(dia), 32).slice(0, 7)}-01`, -1);
const diaValido = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && startOfDaySP(v) !== null;

/** Transforma o pedido (ex.: "este_mes") em datas e instantes de Brasília. `hoje` é "AAAA-MM-DD". */
export function resolverPeriodo(periodo: string | undefined, hoje: string, de?: string, ate?: string): PeriodoResolvido {
  let a: string;
  let b: string;
  let rotulo: string;

  switch (periodo) {
    case 'ontem':
      a = b = addDaysToDay(hoje, -1);
      rotulo = `ontem (${dm(a)})`;
      break;
    case 'esta_semana':
      a = segunda(hoje);
      b = addDaysToDay(a, 6) > hoje ? hoje : addDaysToDay(a, 6);
      rotulo = `nesta semana (${dm(a)} a ${dm(b)})`;
      break;
    case 'semana_passada':
      a = addDaysToDay(segunda(hoje), -7);
      b = addDaysToDay(a, 6);
      rotulo = `na semana passada (${dm(a)} a ${dm(b)})`;
      break;
    case 'ultimos_7_dias':
      a = addDaysToDay(hoje, -6);
      b = hoje;
      rotulo = `nos últimos 7 dias (${dm(a)} a ${dm(b)})`;
      break;
    case 'este_mes':
      a = primeiroDoMes(hoje);
      b = hoje;
      rotulo = `neste mês, em ${MESES[Number(hoje.slice(5, 7)) - 1]} (até hoje)`;
      break;
    case 'mes_passado': {
      const ultimo = addDaysToDay(primeiroDoMes(hoje), -1);
      a = primeiroDoMes(ultimo);
      b = ultimoDoMes(ultimo);
      rotulo = `em ${MESES[Number(a.slice(5, 7)) - 1]} de ${a.slice(0, 4)}`;
      break;
    }
    case 'ultimos_30_dias':
      a = addDaysToDay(hoje, -29);
      b = hoje;
      rotulo = `nos últimos 30 dias (${dm(a)} a ${dm(b)})`;
      break;
    case 'este_ano':
      a = `${hoje.slice(0, 4)}-01-01`;
      b = hoje;
      rotulo = `em ${hoje.slice(0, 4)} (até hoje)`;
      break;
    case 'intervalo':
      if (diaValido(de) && diaValido(ate)) {
        a = de <= ate ? de : ate;
        b = de <= ate ? ate : de;
        rotulo = a === b ? `em ${dmy(a)}` : `entre ${dmy(a)} e ${dmy(b)}`;
        break;
      }
      if (diaValido(de) || diaValido(ate)) {
        a = b = (diaValido(de) ? de : ate) as string;
        rotulo = `em ${dmy(a)}`;
        break;
      }
      a = b = hoje;
      rotulo = `hoje (${dm(hoje)})`;
      break;
    case 'hoje':
    default:
      a = b = hoje;
      rotulo = `hoje (${dm(hoje)})`;
  }

  const inicio = startOfDaySP(a) as Date;
  const fim = endOfDaySP(b) as Date;
  const dias = Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86_400_000) + 1;
  return { de: a, ate: b, inicio, fim, rotulo, dias };
}
