// Senha gerada pelo sistema: fácil de ler, ditar e digitar. Só letras minúsculas e números, sem símbolo
// e sem caracteres que se confundem (0/o, 1/l/i). Funciona no navegador e no servidor.
// É temporária: o cliente troca no primeiro acesso (mustChangePassword).

const LETTERS = 'abcdefghjkmnpqrstuvwxyz';
const DIGITS = '23456789';
const ALPHABET = LETTERS + DIGITS;
export const GENERATED_PASSWORD_LENGTH = 8;

function randomIndex(max: number): number {
  // sorteio sem viés: descarta os valores que sobram na divisão
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < limit) return buffer[0] % max;
  }
}

/** "kp7mrx4a": 8 caracteres (o mínimo do sistema), com pelo menos uma letra e um número. */
export function generatePassword(): string {
  for (;;) {
    const raw = Array.from({ length: GENERATED_PASSWORD_LENGTH }, () => ALPHABET[randomIndex(ALPHABET.length)]).join('');
    if (/[0-9]/.test(raw) && /[a-z]/.test(raw)) return raw;
  }
}
