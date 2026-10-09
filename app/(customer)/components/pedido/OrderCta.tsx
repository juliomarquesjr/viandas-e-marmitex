"use client";

import { ChevronRight, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { ORDERING_MENU_URL } from "../../lib/order-api";
import { cardStatus } from "../../lib/store-status";
import type { OrderingMenu } from "../../lib/types";
import { useCustomerData } from "../../lib/useCustomerData";
import { cx } from "../kit";
import "./pedido.css";

/** Busca o estado da loja e some sozinho se o recurso estiver desligado ou a busca falhar. */
function useOrderingMenuState() {
  const state = useCustomerData<OrderingMenu>(ORDERING_MENU_URL);
  const { reload } = state;
  React.useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload]);
  return state.data;
}

/** A loja liberou o pedido pelo app? Falso enquanto carrega e quando a busca falha: nada de botão que leva a lugar nenhum. */
export function useOrderingEnabled(): boolean {
  return useOrderingMenuState()?.enabled === true;
}

/** Estado da loja em texto curto ("Aberto até 14:00"), para quem mostra um botão de pedido. */
export function useOrderStatus(): { enabled: boolean; open: boolean; text: string } {
  const menu = useOrderingMenuState();
  if (!menu || !menu.enabled) return { enabled: false, open: false, text: "" };
  const { text, open } = cardStatus(menu);
  return { enabled: true, open, text };
}

/** Cartão "Fazer pedido" do Início, com o estado da loja vindo do servidor. */
export function OrderCta({ style }: { style?: React.CSSProperties }) {
  const menu = useOrderingMenuState();
  if (!menu || !menu.enabled) return null;
  const { text, open } = cardStatus(menu);
  return (
    <Link href="/pre-orders/novo" className={cx("c-order-cta c-rise", open && "is-open")} style={style}>
      <span className="c-oic is-go" aria-hidden="true">
        <UtensilsCrossed size={18} />
      </span>
      <span className="c-order-cta-t">
        <strong>Fazer pedido</strong>
        <span className="c-order-cta-s">
          <i className="c-order-dot" aria-hidden="true" />
          {text}
        </span>
      </span>
      <span className="c-chev" aria-hidden="true">
        <ChevronRight size={18} />
      </span>
    </Link>
  );
}
