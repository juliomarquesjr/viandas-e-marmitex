"use client";

import * as React from "react";
import { AlertTriangle, Clock, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AwaitingOrderDTO } from "@/lib/notification-types";
import { formatCurrency, formatRelativeTime } from "../notifications/format";
import { OrderResponseButtons } from "../online-orders/OrderResponse";
import { AgeBar } from "./AgeBar";
import "./attention.css";
import { getUrgency, urgencyAccent, type Urgency } from "./urgency";

/** "há 7 min": normal; em negrito na cor de atenção a partir de 10 min; vermelho acima de 20. */
export function AgeLabel({ createdAt, now, urgency }: { createdAt: string; now: number; urgency: Urgency }) {
  return (
    <time
      dateTime={createdAt}
      className={cn(
        "text-xs tabular-nums",
        urgency === "calm" ? "text-[color:var(--muted-foreground)]" : "inline-flex items-center gap-1 font-bold"
      )}
      style={
        urgency === "warning"
          ? { color: "var(--state-pronto-fg)" }
          : urgency === "urgent"
            ? { color: "var(--state-cobrar-fg)" }
            : undefined
      }
    >
      {urgency === "warning" && <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      {formatRelativeTime(createdAt, now)}
    </time>
  );
}

/** Aviso urgente com ícone E texto (nunca só cor). */
export function UrgencyNotice({
  urgency,
  createdAt,
  now,
  expired,
}: {
  urgency: Urgency;
  createdAt: string;
  now: number;
  expired?: boolean;
}) {
  if (urgency !== "urgent") return null;
  return (
    <p
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold"
      style={{ background: "var(--state-cobrar-solid)", color: "var(--state-cobrar-on)" }}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {expired ? "Expirado: só dá para recusar" : `Esperando ${formatRelativeTime(createdAt, now)}`}
    </p>
  );
}

interface AwaitingOrderRowProps {
  order: AwaitingOrderDTO;
  now: number;
  /** "home" é o cartão largo do painel de atenção; "bell" é a linha compacta do sino. */
  variant?: "home" | "bell";
  onResponded: (order: AwaitingOrderDTO, action: "accept" | "reject") => void;
}

export function AwaitingOrderRow({ order, now, variant = "home", onResponded }: AwaitingOrderRowProps) {
  const urgency = getUrgency(order.createdAt, now, order.expired);
  const who = order.customerName?.trim() || "Cliente";
  const compact = variant === "bell";

  if (!compact) {
    return (
      <li
        data-attention-row
        data-att-level={urgency}
        className="att-row flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4 sm:py-3.5"
      >
        <span
          className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:flex"
          style={{ background: "var(--state-producao-bg)", color: "var(--state-producao-fg)" }}
          aria-hidden
        >
          <ShoppingBag className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[15px] font-bold text-[color:var(--foreground)]">{who}</span>
            <span
              className="rounded-md px-2 py-0.5 text-[11px] font-bold"
              style={{ background: "var(--state-producao-bg)", color: "var(--state-producao-fg)" }}
            >
              Pedido
            </span>
          </div>
          <p className="line-clamp-2 text-sm text-[color:var(--muted-foreground)]">{order.summary}</p>
          {order.notes && (
            <p className="line-clamp-2 text-xs italic text-[color:var(--muted-foreground)]">Obs.: {order.notes}</p>
          )}
          <AgeBar createdAt={order.createdAt} now={now} urgency={urgency} />
          {order.expired && (
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--state-cobrar-fg)" }}>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Expirado: só dá para recusar
            </p>
          )}
        </div>
        <div className="text-xl font-bold tabular-nums text-[color:var(--foreground)] sm:text-2xl">{formatCurrency(order.totalCents)}</div>
        <OrderResponseButtons
          orderId={order.id}
          customerName={order.customerName}
          expired={order.expired}
          summary={order.summary}
          totalCents={order.totalCents}
          onResponded={(action) => onResponded(order, action)}
          className="w-full shrink-0 sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none"
        />
      </li>
    );
  }

  const details = (
    <div className="min-w-0 flex-1 space-y-1">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-sm font-semibold text-[color:var(--foreground)]">{who}</span>
        <span className="text-sm font-semibold tabular-nums text-[color:var(--foreground)]">
          {formatCurrency(order.totalCents)}
        </span>
        <span aria-hidden className="text-xs text-[color:var(--muted-foreground)]">
          ·
        </span>
        <AgeLabel createdAt={order.createdAt} now={now} urgency={urgency} />
      </div>
      <p className="line-clamp-2 text-sm text-[color:var(--muted-foreground)]">{order.summary}</p>
      {order.notes && (
        <p className="line-clamp-2 text-xs italic text-[color:var(--muted-foreground)]">Obs.: {order.notes}</p>
      )}
      <UrgencyNotice urgency={urgency} createdAt={order.createdAt} now={now} expired={order.expired} />
    </div>
  );

  const buttons = (
    <OrderResponseButtons
      orderId={order.id}
      customerName={order.customerName}
      expired={order.expired}
      summary={order.summary}
      totalCents={order.totalCents}
      onResponded={(action) => onResponded(order, action)}
      className={cn("shrink-0 [&>button]:flex-1", compact ? "w-full" : "w-full sm:w-auto sm:[&>button]:flex-none")}
    />
  );

  return (
    <li
      data-attention-row
      className={cn(
        "rounded-lg border border-l-4 border-[color:var(--border)]",
        compact ? "px-3 py-3" : "p-3"
      )}
      style={{
        borderLeftColor: urgencyAccent(urgency),
        background: urgency === "urgent" ? "var(--state-cobrar-bg)" : "var(--card)",
      }}
    >
      <div className={cn("flex gap-3", compact ? "flex-col" : "flex-col sm:flex-row sm:items-center sm:justify-between")}>
        {details}
        {buttons}
      </div>
    </li>
  );
}
