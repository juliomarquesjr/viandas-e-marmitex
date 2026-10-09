/**
 * Texto do estado da loja (aberta, fechando, fechada, pausada, desligada), a partir do cardápio
 * que o servidor devolveu. O relógio é o do servidor: quem chama passa os minutos que faltam
 * para fechar, já calculados com `serverNow`.
 */

import type { OrderingMenu } from "./types";

export type StoreKind = "open" | "closing" | "closed" | "paused" | "off";

export interface StoreView {
  kind: StoreKind;
  title: string;
  detail?: string;
  /** Faltam 10 minutos ou menos: vira aviso. */
  urgent: boolean;
}

/** "14:00": o horário da loja, que é o de Brasília, sem depender do fuso do aparelho. */
export function formatStoreClock(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  } catch {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
}

/** Minutos até as 14:00 etc. a partir do relógio do servidor (null se a loja não está aberta). */
export function minutesLeft(menu: OrderingMenu, offsetMs: number, now = Date.now()): number | null {
  if (!menu.open || !menu.closesAt) return null;
  return Math.max(0, Math.ceil((Date.parse(menu.closesAt) - (now + offsetMs)) / 60_000));
}

export function storeView(menu: OrderingMenu, minutes: number | null): StoreView {
  if (!menu.enabled || menu.reason === "disabled" || menu.reason === "no_windows") {
    return { kind: "off", title: "A loja não está recebendo pedidos pelo app agora", urgent: false };
  }
  if (menu.reason === "paused") {
    return {
      kind: "paused",
      title: "A loja pausou os pedidos por hoje",
      detail: menu.nextOpening ? `Volta ${menu.nextOpening.label}.` : undefined,
      urgent: false,
    };
  }
  const left = minutes ?? menu.minutesToClose;
  const closedNow = !menu.open || (left !== null && left <= 0);
  if (closedNow) {
    return {
      kind: "closed",
      title: menu.nextOpening ? `Fechado agora · Abre ${menu.nextOpening.label}` : "Fechado agora",
      urgent: false,
    };
  }
  const until = menu.closesAt ? `Aberto até ${formatStoreClock(menu.closesAt)}` : "Aberto agora";
  if (left !== null && left <= 30) {
    return { kind: "closing", title: `Fecha em ${left} min`, detail: until, urgent: left <= 10 };
  }
  return { kind: "open", title: until, urgent: false };
}

/** Linha do cartão "Fazer pedido" no Início: um retrato do estado quando a página carregou. */
export function cardStatus(menu: OrderingMenu): { text: string; open: boolean } {
  if (menu.open && menu.closesAt) return { text: `Aberto até ${formatStoreClock(menu.closesAt)}`, open: true };
  if (menu.reason === "closed" && menu.nextOpening) return { text: `Abre ${menu.nextOpening.label}`, open: false };
  if (menu.reason === "paused") return { text: "Pausado por hoje", open: false };
  return { text: "Fechado", open: false };
}
