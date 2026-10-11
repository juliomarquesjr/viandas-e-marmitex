// Texto e dinheiro da RO (puro, testado em tests/ro.test.ts).

/** Minúsculo, sem acento, só letras e números separados por um espaço. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'para', 'pra', 'pro', 'com', 'em', 'no', 'na', 'nos', 'nas', 'um', 'uma']);

/** Palavras do texto, já normalizadas e sem "de/da/do…". */
export function palavras(texto: string): string[] {
  return normalizar(texto)
    .split(' ')
    .filter((p) => p && !STOP.has(p));
}

export function soDigitos(texto: string): string {
  return texto.replace(/\D/g, '');
}

/**
 * Distância de edição (inserir, apagar, trocar uma letra ou trocar duas letras vizinhas de lugar, que conta como 1 só),
 * com corte: devolve `max + 1` quando passa de `max`.
 */
export function distancia(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const n = a.length;
  const m = b.length;
  let anterior2: number[] = [];
  let anterior = Array.from({ length: m + 1 }, (_, j) => j);
  let menorAnterior = 0;
  for (let i = 1; i <= n; i++) {
    const atual = [i];
    let menor = i;
    for (let j = 1; j <= m; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      let valor = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + custo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) valor = Math.min(valor, anterior2[j - 2] + 1);
      atual.push(valor);
      if (valor < menor) menor = valor;
    }
    // com a troca de vizinhas, uma linha pode se apoiar na de duas antes: só desiste quando as duas passaram do corte
    if (menor > max && menorAnterior > max) return max + 1;
    menorAnterior = menor;
    anterior2 = anterior;
    anterior = atual;
  }
  return Math.min(anterior[m], max + 1);
}

export const brl = (cents: number): string =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** "(55) 99192-8021" a partir de dígitos guardados de qualquer jeito. */
export function formatarTelefone(valor: string | null | undefined): string | null {
  if (!valor) return null;
  let d = soDigitos(valor).replace(/^0+/, '');
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return valor.trim() || null;
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || nome;
}

export function plural(n: number, um: string, varios: string): string {
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`;
}

/** "1 cliente" / "2 clientes" sem o número (para frases do tipo "Tem 1 cliente que combina"). */
export const concorda = (n: number, um: string, varios: string): string => (n === 1 ? um : varios);

/** "12/10/2026" a partir de "2026-10-12". */
export const dataBR = (dia: string): string => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;

/** Quanto falta, em linguagem de gente ("daqui a alguns minutos", "daqui a cerca de 3 horas", "amanhã"). */
export function esperaHumana(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos <= 90) return 'daqui a um minuto';
  const minutos = Math.ceil(segundos / 60);
  if (minutos <= 10) return 'daqui a alguns minutos';
  if (minutos < 60) return `daqui a uns ${Math.round(minutos / 5) * 5} minutos`;
  const horas = Math.round(minutos / 60);
  if (horas < 2) return 'daqui a cerca de uma hora';
  if (horas <= 12) return `daqui a cerca de ${horas} horas`;
  return 'amanhã';
}
