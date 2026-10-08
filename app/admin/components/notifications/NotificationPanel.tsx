"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationDTO } from "@/lib/notification-types";
import { NotificationItem } from "./NotificationItem";

/** Quantas aparecem no dropdown; o resto fica no histórico. */
export const PANEL_ITEMS = 8;

interface NotificationPanelProps {
  id: string;
  notifications: NotificationDTO[];
  loaded: boolean;
  error: boolean;
  onSelect: (notification: NotificationDTO) => void;
  onMarkAllRead: () => void;
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
    { id, notifications, loaded, error, onSelect, onMarkAllRead, onShowHistory, onRetry, className },
    ref
  ) {
    const visible = notifications.slice(0, PANEL_ITEMS);
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
          "absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-lg outline-none",
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

        <div className="max-h-[22rem] min-h-[120px] overflow-y-auto">
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
              Nenhuma notificação por enquanto.
            </p>
          ) : (
            <ul onKeyDown={handleKeyDown} className="divide-y divide-[color:var(--border)]">
              {visible.map((notification) => (
                <li key={notification.id}>
                  <NotificationItem notification={notification} onSelect={onSelect} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[color:var(--border)]">
          <button
            type="button"
            onClick={onShowHistory}
            className="min-h-[44px] w-full px-4 py-3 text-center text-sm font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            Mostrar histórico completo
          </button>
        </div>
      </motion.div>
    );
  }
);
