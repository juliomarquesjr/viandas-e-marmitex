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

/** Distância de edição (inserir, apagar ou trocar uma letra), com corte: devolve cedo se passar de `max`. */
export function distancia(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    let menor = i;
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      const valor = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + custo);
      atual.push(valor);
      if (valor < menor) menor = valor;
    }
    if (menor > max) return max + 1;
    anterior = atual;
  }
  return anterior[b.length];
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
  return `${n} ${n === 1 ? um : varios}`;
}
