/**
 * "Já paguei": o cliente avisa o estabelecimento de um PIX, e o operador
 * confere no banco antes de o saldo mudar. Roda no navegador.
 */

import type { CreatePaymentIntentResponse, CustomerPaymentIntentDTO } from "@/lib/notification-types";
import { formatDayMonth, formatTime } from "./format";

export const PAYMENT_INTENTS_URL = "/api/customer/payment-intents";

export type InformResult =
  | { ok: true; intent: CustomerPaymentIntentDTO; duplicate: boolean }
  | { ok: false; error: string };

const OFFLINE = "Sem conexão. Confira a internet e tente de novo.";
const GENERIC = "Não foi possível avisar o estabelecimento agora. Tente de novo.";

/**
 * Avisa o estabelecimento de um PIX de `amountCents`. Sessão vencida (401)
 * leva ao login; as demais falhas voltam com a mensagem da API para o cliente ler.
 */
export async function informPayment(amountCents: number): Promise<InformResult> {
  try {
    const response = await fetch(PAYMENT_INTENTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents }),
      cache: "no-store",
    });
    if (response.status === 401) {
      window.location.href = "/login";
      return { ok: false, error: "Sua sessão venceu. Entre de novo para continuar." };
    }
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.intent) {
      return { ok: false, error: typeof body?.error === "string" && body.error ? body.error : GENERIC };
    }
    const { intent, duplicate } = body as CreatePaymentIntentResponse;
    return { ok: true, intent, duplicate: Boolean(duplicate) };
  } catch {
    return { ok: false, error: OFFLINE };
  }
}

/* ------------------------------------------------------------ dispensados */

const DISMISSED_KEY = "customer:dismissed-payment-intents";
const DISMISSED_MAX = 50;

/** Ids de intenções que o cliente já dispensou neste aparelho. */
export function readDismissedIntents(): string[] {
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** Guarda a lista (só os mais recentes). Sem armazenamento, só vale até recarregar. */
export function writeDismissedIntents(ids: string[]): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids.slice(-DISMISSED_MAX)));
  } catch {
    /* modo privado ou armazenamento bloqueado: o cartão some só nesta visita */
  }
}

/* ------------------------------------------------------------------ texto */

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "às 14:32", "ontem às 14:32" ou "em 29/09 às 14:32", conforme o dia. */
export function whenLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const time = formatTime(date);
  if (isSameDay(date, now)) return `às ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return `ontem às ${time}`;
  return `em ${formatDayMonth(date)} às ${time}`;
}
