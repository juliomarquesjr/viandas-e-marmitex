// Como o cliente se identifica no login: e-mail ou telefone (puro, testado em tests/customer-login.test.ts).

export type LoginIdentifier =
  | { kind: 'email'; email: string }
  | { kind: 'phone'; ddd: string; tail: string }
  | null;

/**
 * Entende o que foi digitado. Tem "@" → e-mail (sem diferenciar maiúsculas, sem espaços nas pontas).
 * Senão, telefone brasileiro: ignora máscara, "+55" e zero na frente, e compara DDD + últimos 8 dígitos
 * (o nono dígito e o formato guardado no cadastro não atrapalham).
 */
export function parseLoginIdentifier(raw: string): LoginIdentifier {
  const text = raw.trim();
  if (!text) return null;
  if (text.includes('@')) return { kind: 'email', email: text.toLowerCase() };
  let digits = text.replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length >= 12 && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length !== 10 && digits.length !== 11) return null;
  return { kind: 'phone', ddd: digits.slice(0, 2), tail: digits.slice(-8) };
}

/** O telefone guardado no cadastro (com ou sem máscara) é o mesmo número do login? */
export function storedPhoneMatches(stored: string | null | undefined, login: { ddd: string; tail: string }): boolean {
  let digits = (stored ?? '').replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length >= 12 && digits.startsWith('55')) digits = digits.slice(2);
  return digits.length >= 10 && digits.slice(0, 2) === login.ddd && digits.slice(-8) === login.tail;
}

/** "(55) 99999-9999" ou "(11) 3222-1234", montando aos poucos enquanto a pessoa digita. */
export function maskLoginPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  const rest = d.slice(2);
  const split = d[2] === '9' ? 5 : 4; // celular começa com 9: a máscara não muda de lugar quando completa
  if (rest.length <= split) return `(${d.slice(0, 2)}) ${rest}`;
  return `(${d.slice(0, 2)}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}
