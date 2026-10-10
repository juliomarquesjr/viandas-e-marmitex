// Senha gerada pelo sistema: forte, fácil de ler e de digitar (sem 0/O, 1/l/I). Funciona no navegador e no servidor.

const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomIndex(max: number): number {
  // sorteio sem viés: descarta os valores que sobram na divisão
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < limit) return buffer[0] % max;
  }
}

/** "Kp7m-Rx4a9Q": 10 letras e números com um hífen no meio (mais de 8 caracteres, o mínimo do sistema). */
export function generatePassword(): string {
  const pick = (n: number) => Array.from({ length: n }, () => ALPHABET[randomIndex(ALPHABET.length)]).join('');
  // garante pelo menos um número e uma letra
  for (;;) {
    const raw = pick(10);
    if (/[0-9]/.test(raw) && /[a-zA-Z]/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  }
}
