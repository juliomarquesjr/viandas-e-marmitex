"use client";

import * as React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Bell, BellRing, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/app/components/ui/switch";
import type { AwaitingOrderDTO, NotificationDTO } from "@/lib/notification-types";
import { AwaitingOrderRow } from "../attention/AwaitingOrderRow";
import { useNow } from "../attention/useNow";
import { NotificationItem } from "./NotificationItem";

/** Quantas aparecem no dropdown; o resto fica no histórico. */
export const PANEL_ITEMS = 8;
/** Quantos pedidos aguardando aparecem no topo do sino; o resto fica em Pré-Pedidos. */
export const PANEL_ORDERS = 3;

interface NotificationPanelProps {
  id: string;
  notifications: NotificationDTO[];
  /** Pedidos do cliente aguardando resposta (o mais antigo primeiro) e o total deles. */
  awaitingOrders: AwaitingOrderDTO[];
  awaitingOrdersCount: number;
  onOrderResponded: (order: AwaitingOrderDTO) => void;
  soundEnabled: boolean;
  onSoundChange: (enabled: boolean) => void;
  onNavigate: () => void;
  loaded: boolean;
  error: boolean;
  onSelect: (notification: NotificationDTO) => void;
  onMarkAllRead: () => void;
  onMarkRead: (notification: NotificationDTO) => void;
  onResolve: (notification: NotificationDTO) => void;
  onShowHistory: () => void;
  onRetry: () => void;
  className?: string;
}

function Skeleton() {
  return (
    <div className="space-y-3 px-4 py-3" aria-hidden>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-start gap-3">
          <div className="h-7 w-7 flex-shrink-0 animate-pulse rounded-lg bg-[color:var(--muted)]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-[color:var(--muted)]" />
            <div className="h-3 w-full animate-pulse rounded bg-[color:var(--muted)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Dropdown do sino: as mais recentes, com atalhos para marcar como lidas e abrir o histórico. */
export const NotificationPanel = React.forwardRef<HTMLDivElement, NotificationPanelProps>(
  function NotificationPanel(
    {
      id,
      notifications,
      awaitingOrders,
      awaitingOrdersCount,
      onOrderResponded,
      soundEnabled,
      onSoundChange,
      onNavigate,
      loaded,
      error,
      onSelect,
      onMarkAllRead,
      onMarkRead,
      onResolve,
      onShowHistory,
      onRetry,
      className,
    },
    ref
  ) {
    const now = useNow();
    const orders = awaitingOrders.slice(0, PANEL_ORDERS);
    const hiddenOrders = Math.max(0, awaitingOrdersCount - orders.length);
    // O que já foi lido e conferido sai do sino e fica só no histórico
    const visible = notifications.filter((n) => !n.readAt || !n.resolvedAt).slice(0, PANEL_ITEMS);
    const hasUnread = notifications.some((n) => !n.readAt);

    // Setas ↑/↓ percorrem os itens (Tab também funciona, são botões)
    const handleKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-notification-item]"));
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (index === -1) return;
      event.preventDefault();
      const next = event.key === "ArrowDown" ? index + 1 : index - 1;
      items[(next + items.length) % items.length]?.focus();
    };

    return (
      <motion.div
        ref={ref}
        id={id}
        role="dialog"
        aria-label="Notificações"
        tabIndex={-1}
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className={cn(
          "fixed inset-x-3 top-[4.25rem] z-50 overflow-hidden sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-lg outline-none",
          className
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[color:var(--border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-sm font-semibold text-[color:var(--foreground)]">Notificações</span>
          </div>
          {hasUnread && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="-my-1.5 min-h-[36px] rounded-md px-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        <div className="max-h-[min(26rem,calc(100dvh-20rem))] min-h-[120px] overflow-y-auto">
          {loaded && awaitingOrdersCount > 0 && (
            <section aria-labelledby={`${id}-needs-you`} className="border-b border-[color:var(--border)] bg-[color:var(--muted)]/40 px-3 py-3">
              <h3
                id={`${id}-needs-you`}
                className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)]"
              >
                <BellRing className="h-3.5 w-3.5" style={{ color: "var(--state-pronto)" }} aria-hidden />
                Precisa de você ({awaitingOrdersCount})
              </h3>
              <ul className="space-y-2">
                {orders.map((order) => (
                  <AwaitingOrderRow
                    key={order.id}
                    order={order}
                    now={now}
                    variant="bell"
                    onResponded={onOrderResponded}
                  />
                ))}
              </ul>
              {hiddenOrders > 0 && (
                <Link
                  href="/admin/pre-orders"
                  onClick={onNavigate}
                  className="mt-1 flex min-h-[44px] items-center px-1 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {hiddenOrders === 1 ? "Mais 1 pedido aguardando" : `Mais ${hiddenOrders} pedidos aguardando`}
                </Link>
              )}
            </section>
          )}
          {!loaded && !error ? (
            <Skeleton />
          ) : !loaded && error ? (
            <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
              <p className="text-sm text-[color:var(--muted-foreground)]">Não foi possível carregar as notificações.</p>
              <button
                type="button"
                onClick={onRetry}
                className="min-h-[36px] rounded-lg border border-[color:var(--border-dark)] px-4 text-sm font-medium text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Tentar de novo
              </button>
            </div>
          ) : visible.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-[color:var(--muted-foreground)]">
              Nada pendente. O que já foi conferido está no histórico.
            </p>
          ) : (
            <ul onKeyDown={handleKeyDown} className="divide-y divide-[color:var(--border)]">
              {visible.map((notification) => (
                <li key={notification.id}>
                  <NotificationItem notification={notification} onSelect={onSelect} onMarkRead={onMarkRead} onResolve={onResolve} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[color:var(--border)]">
          <div className="grid grid-cols-2 divide-x divide-[color:var(--border)]">
            <Link
              href="/admin/pre-orders"
              onClick={onNavigate}
              className="flex min-h-[44px] items-center justify-center px-2 py-3 text-center text-sm font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            >
              Ver pedidos
            </Link>
            <button
              type="button"
              onClick={onShowHistory}
              className="min-h-[44px] px-2 py-3 text-center text-sm font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            >
              Ver histórico
            </button>
          </div>
          <div className="flex min-h-[44px] items-center justify-between gap-3 border-t border-[color:var(--border)] px-4 py-2">
            <label
              htmlFor={`${id}-sound`}
              className="flex cursor-pointer items-center gap-2 text-sm text-[color:var(--foreground)]"
            >
              <Volume2 className="h-4 w-4 text-[color:var(--muted-foreground)]" aria-hidden />
              Avisar com som
            </label>
            <Switch
              id={`${id}-sound`}
              checked={soundEnabled}
              onCheckedChange={onSoundChange}
              aria-label="Avisar com som, a cada 5 minutos, enquanto houver pedido ou pagamento em aberto"
            />
          </div>
        </div>
      </motion.div>
    );
  }
);
