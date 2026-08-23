"use client";

import { cn } from "@/lib/utils";
import { Scale, StickyNote } from "lucide-react";
import {
  STAGE_META,
  describeItems,
  formatCurrency,
  formatElapsed,
  initialsOf,
  stageOf,
  stageVars,
  weightOf,
  type PreOrder,
} from "../lib/preOrderView";

interface PreOrderRowProps {
  preOrder: PreOrder;
  selected: boolean;
  onSelect: (preOrder: PreOrder) => void;
  now: Date;
}

/**
 * A linha da lista. Trilho, avatar e chip herdam o matiz da etapa via as
 * variáveis `--st*`, então a linha inteira fala a mesma língua de cor.
 */
export function PreOrderRow({ preOrder, selected, onSelect, now }: PreOrderRowProps) {
  const stage = stageOf(preOrder);
  const meta = STAGE_META[stage];
  const name = preOrder.customer?.name ?? "Venda avulsa";
  const anonymous = !preOrder.customer;
  const closed = stage === "faturado" || stage === "cancelado";

  return (
    <button
      type="button"
      onClick={() => onSelect(preOrder)}
      aria-current={selected ? "true" : undefined}
      style={stageVars(stage)}
      className={cn(
        "relative flex w-full items-start gap-3 border-b border-[color:var(--border)] py-3 pl-[18px] pr-3.5 text-left",
        "transition-colors duration-150",
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[color:var(--st)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--ring)]",
        selected
          ? "bg-[color:var(--primary-lighter)] shadow-[inset_-4px_0_0_var(--primary)]"
          : "hover:bg-[color:var(--muted)]",
        closed && "opacity-65",
      )}
    >
      <span
        aria-hidden="true"
        className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px] text-[12.5px] font-bold"
        style={{ background: "var(--st-bg)", color: "var(--st-fg)" }}
      >
        {anonymous ? "—" : initialsOf(name)}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm font-semibold",
              anonymous ? "text-[color:var(--muted-foreground)]" : "text-[color:var(--foreground)]",
            )}
          >
            {name}
          </span>
          <span className="flex-none text-sm font-bold tabular-nums tracking-tight text-[color:var(--foreground)]">
            {formatCurrency(preOrder.totalCents)}
          </span>
        </span>

        {preOrder.notes?.trim() && (
          <span
            title={preOrder.notes}
            className="flex items-center gap-1.5 truncate text-[11.5px] text-[color:var(--muted-foreground-strong)]"
          >
            <StickyNote className="h-3 w-3 flex-none" aria-hidden="true" />
            <span className="truncate">{preOrder.notes}</span>
          </span>
        )}

        <span className="flex items-center gap-1.5 truncate text-xs text-[color:var(--muted-foreground-strong)]">
          {preOrder.items.some((item) => weightOf(item) !== null) && (
            <Scale className="h-3 w-3 flex-none" aria-hidden="true" />
          )}
          <span className="truncate">{describeItems(preOrder.items)}</span>
        </span>

        <span className="mt-0.5 flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={{ background: "var(--st-bg)", color: "var(--st-fg)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            {meta.label}
          </span>
          <RowTick preOrder={preOrder} stage={stage} now={now} />
        </span>
      </span>
    </button>
  );
}

/** A marca de tempo: só aparece quando tem o que dizer sobre a espera. */
function RowTick({
  preOrder,
  stage,
  now,
}: {
  preOrder: PreOrder;
  stage: ReturnType<typeof stageOf>;
  now: Date;
}) {
  if (stage === "cobrar" && preOrder.deliveredAt) {
    const elapsed = formatElapsed(preOrder.deliveredAt, now);
    return (
      <span className="text-[11px] font-semibold tabular-nums" style={{ color: "var(--st-fg)" }}>
        entregue {elapsed ?? "agora"}
      </span>
    );
  }

  if (stage === "rota" && preOrder.deliveryStartedAt) {
    const person = preOrder.deliveryPerson?.name;
    return (
      <span className="text-[11px] text-[color:var(--muted-foreground-strong)]">
        {person ? `${person} · ` : ""}
        saiu {formatElapsed(preOrder.deliveryStartedAt, now) ?? "agora"}
      </span>
    );
  }

  const elapsed = formatElapsed(preOrder.createdAt, now);
  if (!elapsed) return null;
  return <span className="text-[11px] text-[color:var(--muted-foreground-strong)]">{elapsed}</span>;
}
