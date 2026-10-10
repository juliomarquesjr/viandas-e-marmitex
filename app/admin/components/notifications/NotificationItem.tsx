"use client";

import * as React from "react";
import { Banknote, Bell, Check, CheckCheck, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationDTO } from "@/lib/notification-types";
import { formatCurrency, formatRelativeTime } from "./format";

/** Id da intenção de pagamento quando a notificação é desse tipo. */
export function getPaymentIntentId(notification: NotificationDTO): string | null {
  if (notification.paymentIntent) return notification.paymentIntent.id;
  if (notification.refType === "PaymentIntent") return notification.refId;
  return null;
}

function TypeIcon({ type, compact }: { type: string; compact: boolean }) {
  const Icon = type === "payment_intent" ? Banknote : type === "whatsapp" ? MessageCircle : Bell;
  return (
    <div
      className={cn(
        "mt-0.5 flex flex-shrink-0 items-center justify-center",
        compact ? "h-7 w-7 rounded-lg" : "h-8 w-8 rounded-xl"
      )}
      style={{
        background: "var(--modal-header-icon-bg)",
        outline: "1px solid var(--modal-header-icon-ring)",
      }}
      aria-hidden
    >
      <Icon className={cn("text-primary", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
    </div>
  );
}

const BADGE_BASE = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none";

/** Selo de situação: "Revisar" (âmbar) enquanto pede ação; depois o resultado. */
export function NotificationStatusBadge({ notification }: { notification: NotificationDTO }) {
  const intent = notification.paymentIntent;

  if (intent?.status === "confirmed") {
    const cents = intent.confirmedAmountCents ?? intent.amountCents;
    return (
      <span className={BADGE_BASE} style={{ background: "var(--state-faturado-bg)", color: "var(--state-faturado-fg)" }}>
        Confirmado {formatCurrency(cents)}
      </span>
    );
  }
  if (intent?.status === "rejected") {
    return (
      <span className={BADGE_BASE} style={{ background: "var(--state-fila-bg)", color: "var(--state-fila-fg)" }}>
        Recusado
      </span>
    );
  }
  if (!notification.resolvedAt) {
    return (
      <span className={BADGE_BASE} style={{ background: "var(--state-pronto-bg)", color: "var(--state-pronto-fg)" }}>
        Revisar
      </span>
    );
  }
  return null;
}

interface NotificationItemProps {
  notification: NotificationDTO;
  onSelect: (notification: NotificationDTO) => void;
  /** "panel" é o dropdown compacto; "history" é o modal. */
  variant?: "panel" | "history";
  /** Mostra "Marcar como lida" nas não lidas. */
  onMarkRead?: (notification: NotificationDTO) => void;
  /** Mostra "Conferido" nas que ainda pedem ação (pagamento pendente usa "Conferir", que abre a revisão). */
  onResolve?: (notification: NotificationDTO) => void;
}

const ACTION =
  "inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function NotificationItem({ notification, onSelect, variant = "panel", onMarkRead, onResolve }: NotificationItemProps) {
  const compact = variant === "panel";
  const unread = !notification.readAt;
  const pendingPayment = notification.paymentIntent?.status === "pending" && !notification.resolvedAt;
  const canResolve = !!onResolve && !notification.resolvedAt && !pendingPayment;
  const canMarkRead = !!onMarkRead && unread;
  const hasActions = canMarkRead || canResolve || (!!onResolve && pendingPayment);

  return (
    <div className={cn(unread && "bg-[color:var(--accent)]", !compact && "rounded-lg")}>
    <button
      type="button"
      data-notification-item
      onClick={() => onSelect(notification)}
      className={cn(
        "flex w-full min-h-[44px] items-start gap-3 text-left transition-colors",
        "hover:bg-[color:var(--muted)] focus-visible:bg-[color:var(--muted)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
        compact ? "px-4 py-3" : "rounded-lg px-3 py-3",
        hasActions && "pb-1.5"
      )}
    >
      <TypeIcon type={notification.type} compact={compact} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm text-[color:var(--foreground)]",
              compact && "truncate",
              unread ? "font-semibold" : "font-medium"
            )}
          >
            {notification.title}
          </p>
          <span className="mt-0.5 flex flex-shrink-0 items-center gap-1.5 text-xs text-[color:var(--muted-foreground)]">
            {unread && (
              <span className="h-2 w-2 rounded-full bg-primary" role="img" aria-label="Não lida" />
            )}
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
        {notification.message && (
          <p className="mt-0.5 line-clamp-2 text-xs text-[color:var(--muted-foreground)]">
            {notification.message}
          </p>
        )}
        <div className="mt-1.5 empty:hidden">
          <NotificationStatusBadge notification={notification} />
        </div>
      </div>
    </button>
    {hasActions && (
      <div className={cn("flex flex-wrap items-center gap-1 pb-2", compact ? "pl-[3.25rem] pr-3" : "pl-[3.5rem] pr-3")}>
        {pendingPayment && onResolve && (
          <button type="button" onClick={() => onSelect(notification)} className={cn(ACTION, "bg-primary text-primary-foreground hover:bg-primary-hover")}>
            <Check className="h-3.5 w-3.5" aria-hidden />
            Conferir
          </button>
        )}
        {canResolve && (
          <button
            type="button"
            onClick={() => onResolve?.(notification)}
            className={cn(ACTION, "bg-primary text-primary-foreground hover:bg-primary-hover")}
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden />
            Conferido
          </button>
        )}
        {canMarkRead && (
          <button
            type="button"
            onClick={() => onMarkRead?.(notification)}
            className={cn(ACTION, "text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]")}
          >
            Marcar como lida
          </button>
        )}
      </div>
    )}
    </div>
  );
}
