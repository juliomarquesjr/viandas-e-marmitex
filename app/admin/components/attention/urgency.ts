/**
 * Quanto tempo o cliente já esperou decide o quanto o item grita:
 * menos de 10 min é normal; de 10 a 20 pede atenção; acima de 20 (ou expirado) é urgente.
 */

export type Urgency = "calm" | "warning" | "urgent";

export const WARNING_AFTER_MIN = 10;
export const URGENT_AFTER_MIN = 20;

export function ageInMinutes(createdAt: string, now: number): number {
  const time = new Date(createdAt).getTime();
  if (Number.isNaN(time)) return 0;
  return Math.max(0, Math.floor((now - time) / 60_000));
}

export function getUrgency(createdAt: string, now: number, expired = false): Urgency {
  const minutes = ageInMinutes(createdAt, now);
  if (expired || minutes > URGENT_AFTER_MIN) return "urgent";
  if (minutes >= WARNING_AFTER_MIN) return "warning";
  return "calm";
}

const ORDER: Record<Urgency, number> = { calm: 0, warning: 1, urgent: 2 };

export function worstUrgency(levels: Urgency[]): Urgency {
  return levels.reduce<Urgency>((worst, level) => (ORDER[level] > ORDER[worst] ? level : worst), "calm");
}

/** Cor da barra lateral do item (calmo e atenção usam o âmbar; urgente, o vermelho). */
export function urgencyAccent(level: Urgency): string {
  return level === "urgent" ? "var(--state-cobrar)" : "var(--state-pronto)";
}
