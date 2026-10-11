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
  'ano_passado',
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
      rotulo = a === b ? `nesta semana (só hoje, ${dm(a)})` : `nesta semana (${dm(a)} a ${dm(b)})`;
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
      rotulo = a === b ? `neste mês (só hoje, ${dm(a)})` : `neste mês, em ${MESES[Number(hoje.slice(5, 7)) - 1]} (até hoje)`;
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
    case 'ano_passado':
      a = `${Number(hoje.slice(0, 4)) - 1}-01-01`;
      b = `${Number(hoje.slice(0, 4)) - 1}-12-31`;
      rotulo = `em ${a.slice(0, 4)}`;
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

/* ------------------------------------------------------------------ pedido vindo da IA ou do atalho */

export type PedidoDePeriodo = { periodo?: unknown; de?: unknown; ate?: unknown };

const PRIMEIRO_DIA_POSSIVEL = '2000-01-01';

/** Lê uma data escrita como AAAA-MM-DD, DD/MM/AAAA ou AAAAMMDD. `null` = não veio; `'invalida'` = veio mas não é um dia de verdade. */
export function lerDia(valor: unknown): string | null | 'invalida' {
  if (valor === undefined || valor === null) return null;
  const bruto = String(valor).trim();
  if (!bruto) return null;
  let dia: string | null = null;
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(bruto);
  if (m) dia = `${m[1]}-${m[2]}-${m[3]}`;
  else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(bruto))) dia = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  else if ((m = /^(\d{4})(\d{2})(\d{2})$/.exec(bruto))) dia = `${m[1]}-${m[2]}-${m[3]}`;
  if (!dia || !diaValido(dia) || dia < PRIMEIRO_DIA_POSSIVEL || dia > '2100-12-31') return 'invalida';
  return dia;
}

const PEDIR_PERIODO = 'Não entendi o período. Diga, por exemplo: hoje, ontem, esta semana, este mês, o mês passado, ou duas datas (dia/mês/ano).';

/**
 * Transforma o que a IA (ou o atalho) mandou em um período. Regras:
 * - com `de` e/ou `ate` e sem um período com nome, vale o intervalo (só `de` = até hoje; só `ate` = desde o começo);
 * - data que não existe (31/11/2025) volta como erro pedindo a data, nunca como outro período em silêncio.
 */
export function periodoDosArgs(pedido: PedidoDePeriodo, hoje: string, padrao: string): PeriodoResolvido | { erro: string } {
  const nome = typeof pedido.periodo === 'string' ? pedido.periodo.trim() : '';
  const de = lerDia(pedido.de);
  const ate = lerDia(pedido.ate);
  const temNome = nome !== '' && nome !== 'intervalo';
  if (temNome) {
    if (!(PERIODOS as readonly string[]).includes(nome)) return { erro: PEDIR_PERIODO };
    return resolverPeriodo(nome, hoje);
  }
  if (de === 'invalida' || ate === 'invalida') {
    const ruim = de === 'invalida' ? pedido.de : pedido.ate;
    return { erro: `Não entendi a data ${String(ruim).trim().slice(0, 12)}. Escreva o dia, o mês e o ano, por exemplo 15/11/2025.` };
  }
  if (de === null && ate === null) {
    if (nome === 'intervalo') return { erro: 'De que dia a que dia você quer ver? Escreva as datas com dia, mês e ano, por exemplo de 01/11/2025 a 30/11/2025.' };
    return resolverPeriodo(padrao, hoje);
  }
  if (de && ate) return resolverPeriodo('intervalo', hoje, de, ate);
  const a = de ?? PRIMEIRO_DIA_POSSIVEL;
  const b = ate ?? (de! > hoje ? de! : hoje);
  const base = resolverPeriodo('intervalo', hoje, a, b);
  return { ...base, rotulo: de ? `desde ${dmy(a)}` : `até ${dmy(b)}` };
}

/**
 * Limites de uma despesa. `Expense.date` é uma data pura guardada às 00:00 UTC (não um instante de Brasília):
 * compara com os dias do período em UTC, senão a despesa do dia D cai no dia D-1.
 */
export function limitesDeDespesa(p: Pick<PeriodoResolvido, 'de' | 'ate'>): { inicio: Date; fim: Date } {
  return { inicio: new Date(`${p.de}T00:00:00.000Z`), fim: new Date(`${p.ate}T23:59:59.999Z`) };
}
