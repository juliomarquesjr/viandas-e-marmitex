// Regras do WhatsApp do estabelecimento (sem rede, sem banco): estados, números e quando checar.

/** `not_created`: a instância ainda não existe na Evolution. `unknown`: não deu para saber agora. */
export type WhatsAppState = 'open' | 'connecting' | 'close' | 'not_created' | 'unknown';

/** O estado que a Evolution devolve ("open", "connecting", "close") vira um dos nossos. */
export function mapEvolutionState(raw: unknown): WhatsAppState {
  const value = typeof raw === 'string' ? raw.toLowerCase() : '';
  if (value === 'open' || value === 'connected') return 'open';
  if (value === 'connecting' || value === 'qrcode') return 'connecting';
  if (value === 'close' || value === 'closed' || value === 'disconnected' || value === 'refused') return 'close';
  return 'unknown';
}

/** "5562999998888@s.whatsapp.net" → "5562999998888" (só dígitos) ou null. */
export function numberFromJid(jid: unknown): string | null {
  if (typeof jid !== 'string') return null;
  const digits = jid.split('@')[0]?.split(':')[0]?.replace(/\D/g, '') ?? '';
  return digits.length >= 10 ? digits : null;
}

/**
 * Número brasileiro no formato que a Evolution espera (DDI + DDD + número, só dígitos).
 * Aceita "(62) 99999-8888", "062 99999-8888", "+55 62 99999-8888". Devolve null se não parecer um telefone.
 */
export function normalizeBrazilNumber(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.replace(/^0+/, '');
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (!digits.startsWith('55') || (digits.length !== 12 && digits.length !== 13)) return null;
  const ddd = Number(digits.slice(2, 4));
  return ddd >= 11 && ddd <= 99 ? digits : null;
}

/** "5562999998888" → "+55 (62) 99999-8888" (para mostrar na tela). */
export function formatPhoneBR(number: string | null | undefined): string {
  if (!number) return '';
  const m = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(number);
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : `+${number}`;
}

/** A última checagem é antiga (ou não houve)? */
export function isStale(checkedAt: string | Date | null | undefined, now: Date, maxAgeMs: number): boolean {
  if (!checkedAt) return true;
  const at = new Date(checkedAt).getTime();
  return Number.isNaN(at) || now.getTime() - at >= maxAgeMs;
}

/** Avisar o administrador: estava conectado (e ele quer assim) e deixou de estar. */
export function shouldAlertDisconnect(previous: WhatsAppState | null, next: WhatsAppState, wanted: boolean): boolean {
  return wanted && previous === 'open' && (next === 'close' || next === 'connecting');
}

/**
 * Endereço que a Evolution usa para avisar o nosso sistema. Só existe com um endereço público em https
 * (a Evolution não alcança localhost).
 */
export function publicWebhookUrl(appUrl: string | undefined | null): string | null {
  if (!appUrl) return null;
  try {
    const url = new URL(appUrl);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.hostname.endsWith('.local');
    if (url.protocol !== 'https:' || local) return null;
    return `${url.origin}/api/webhooks/evolution`;
  } catch {
    return null;
  }
}
