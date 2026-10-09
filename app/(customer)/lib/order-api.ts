/**
 * Chamadas do pedido online. Cada uma devolve um resultado em vez de lançar erro:
 * a tela decide o que dizer e o que oferecer a cada caso.
 */

import type { CartLine } from "./cart";

export const ORDERING_MENU_URL = "/api/customer/ordering/menu";

export interface RefusedProduct {
  productId: string;
  name: string | null;
  /** Só em OUT_OF_STOCK: quanto ainda há. */
  available?: number;
}

export type SendResult =
  | { ok: true; id: string; totalCents: number; duplicate: boolean }
  | { ok: false; kind: "auth" }
  /** Sem resposta: a internet caiu ou demorou demais. O pedido pode ter chegado. */
  | { ok: false; kind: "network" }
  | { ok: false; kind: "api"; status: number; code: string | null; message: string; products: RefusedProduct[] };

const SEND_TIMEOUT_MS = 25_000;

export async function sendOrder(lines: CartLine[], notes: string, idempotencyKey: string): Promise<SendResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const response = await fetch("/api/customer/ordering/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        notes: notes.trim(),
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (response.status === 401) return { ok: false, kind: "auth" };
    const body = (await response.json().catch(() => null)) as {
      id?: string;
      totalCents?: number;
      duplicate?: boolean;
      error?: string;
      code?: string;
      details?: { products?: RefusedProduct[] } | null;
    } | null;
    if (response.ok && body?.id) {
      return { ok: true, id: body.id, totalCents: body.totalCents ?? 0, duplicate: Boolean(body.duplicate) };
    }
    // Resposta que não é do nosso servidor (página de erro de proxy, por exemplo): vale como sem resposta
    if (!body || (response.status >= 502 && !body.error)) return { ok: false, kind: "network" };
    return {
      ok: false,
      kind: "api",
      status: response.status,
      code: body.code ?? null,
      message: body.error || "Não foi possível enviar o pedido agora. Tente de novo.",
      products: Array.isArray(body.details?.products) ? body.details!.products! : [],
    };
  } catch {
    return { ok: false, kind: "network" };
  } finally {
    window.clearTimeout(timer);
  }
}

export type CancelResult = { ok: true } | { ok: false; kind: "auth" } | { ok: false; kind: "conflict" | "error"; message: string };

export async function cancelOrder(id: string): Promise<CancelResult> {
  try {
    const response = await fetch(`/api/customer/pre-orders/${encodeURIComponent(id)}/cancel`, { method: "POST", cache: "no-store" });
    if (response.status === 401) return { ok: false, kind: "auth" };
    if (response.ok) return { ok: true };
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (response.status === 409) {
      return { ok: false, kind: "conflict", message: body?.error || "A loja já respondeu este pedido. Fale com a loja para cancelar." };
    }
    return { ok: false, kind: "error", message: body?.error || "Não foi possível cancelar agora. Tente de novo." };
  } catch {
    return { ok: false, kind: "error", message: "Sem conexão. O pedido não foi cancelado. Confira a internet e tente de novo." };
  }
}
