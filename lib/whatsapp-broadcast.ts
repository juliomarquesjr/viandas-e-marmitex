// Envio em massa pelo WhatsApp (puro): quem recebe, quanto leva e o ritmo entre as mensagens.

export type AudienceId = 'all' | 'debt' | 'idle' | 'pick';

export interface BroadcastRecipient {
  id: string;
  name: string;
  /** Positivo é o que o cliente deve; zero ou negativo, nada em aberto. */
  debtCents: number;
  /** Fez alguma compra hoje (dia de Brasília). */
  orderedToday: boolean;
}

/** A mensagem personalizada segue o mesmo limite da conversa. */
export const BROADCAST_TEXT_MAX = 1500;

/** Uma mensagem a cada 6 a 12 segundos: ritmo de gente, para o WhatsApp não bloquear o número. */
export const MIN_DELAY_MS = 6000;
export const MAX_DELAY_MS = 12000;
const AVERAGE_SECONDS = 9;

export const randomDelay = () => MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);

/** Quanto leva enviar `count` mensagens, em minutos inteiros (no mínimo 1). */
export function estimateMinutes(count: number): number {
  return Math.max(1, Math.round((count * AVERAGE_SECONDS) / 60));
}

export function minutesLabel(count: number): string {
  const minutes = estimateMinutes(count);
  return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
}

/** Quem entra em cada público. "pick" usa só os marcados na lista. */
export function audienceMembers(list: BroadcastRecipient[], audience: AudienceId, picked: ReadonlySet<string> = new Set()): BroadcastRecipient[] {
  switch (audience) {
    case 'debt':
      return list.filter((r) => r.debtCents > 0);
    case 'idle':
      return list.filter((r) => !r.orderedToday);
    case 'pick':
      return list.filter((r) => picked.has(r.id));
    default:
      return list;
  }
}

export function audienceCounts(list: BroadcastRecipient[]): Record<Exclude<AudienceId, 'pick'>, number> {
  return {
    all: list.length,
    debt: audienceMembers(list, 'debt').length,
    idle: audienceMembers(list, 'idle').length,
  };
}
