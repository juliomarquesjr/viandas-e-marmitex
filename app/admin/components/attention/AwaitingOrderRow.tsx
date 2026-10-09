"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AwaitingOrderDTO } from "@/lib/notification-types";
import { formatCurrency, formatRelativeTime } from "../notifications/format";
import { OrderResponseButtons } from "../online-orders/OrderResponse";
import { getUrgency, urgencyAccent, type Urgency } from "./urgency";

/** "há 7 min": normal; em negrito na cor de atenção a partir de 10 min; vermelho acima de 20. */
export function AgeLabel({ createdAt, now, urgency }: { createdAt: string; now: number; urgency: Urgency }) {
  return (
    <time
      dateTime={createdAt}
      className={cn("text-xs tabular-nums", urgency === "calm" ? "text-[color:var(--muted-foreground)]" : "font-bold")}
      style={
        urgency === "warning"
          ? { color: "var(--state-pronto-fg)" }
          : urgency === "urgent"
            ? { color: "var(--state-cobrar-fg)" }
            : undefined
      }
    >
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
