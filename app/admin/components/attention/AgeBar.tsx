"use client";

import { AlertTriangle } from "lucide-react";
import { formatRelativeTime } from "../notifications/format";
import { ageInMinutes, URGENT_AFTER_MIN, type Urgency } from "./urgency";

/**
 * Régua do tempo de espera: enche até o limite de urgência (20 min) e muda de cor no caminho.
 * O texto "há X min" vai junto, e o urgente leva ícone: a cor nunca fala sozinha.
 */
export function AgeBar({ createdAt, now, urgency }: { createdAt: string; now: number; urgency: Urgency }) {
  const minutes = ageInMinutes(createdAt, now);
  const pct = Math.min(100, Math.max(6, Math.round((minutes / URGENT_AFTER_MIN) * 100)));
  return (
    <div className="flex items-center gap-2.5" data-att-level={urgency}>
      <div className="att-track h-[5px] w-24 shrink-0 rounded-full sm:w-32" aria-hidden>
        <div className="att-fill h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <time dateTime={createdAt} className="inline-flex items-center gap-1 text-xs font-bold tabular-nums" style={{ color: "var(--att-ink)" }}>
        {urgency === "urgent" && <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        {formatRelativeTime(createdAt, now)}
        {urgency === "urgent" && <span className="sr-only"> (urgente)</span>}
      </time>
    </div>
  );
}
