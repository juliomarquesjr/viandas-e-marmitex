"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "../../constants";
import type { Cycle } from "../../lib/cycle";
import { StateChip } from "./StateChip";

/**
 * Os ciclos anteriores como linhas com valor e estado — não 92 registros
 * paginados. Cada linha carrega a forma do consumo daquele mês numa sparkline
 * semanal, então um mês atípico fica visível sem abrir nada.
 */
export function PreviousCycles({
  cycles,
  selectedKey,
  onSelect,
}: {
  cycles: Cycle[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  if (!cycles.length) return null;

  return (
    <section className="rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_-8px_rgba(15,23,42,0.16)]">
      <h2 className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Histórico de ciclos
      </h2>

      <ul>
        {cycles.map((cycle) => {
          const isSelected = cycle.key === selectedKey;
          return (
            <li key={cycle.key}>
              <button
                onClick={() => onSelect(cycle.key)}
                aria-current={isSelected ? "true" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-border/50 py-2.5 text-left transition-colors last:border-b-0",
                  isSelected ? "text-foreground" : "hover:bg-muted/50"
                )}
              >
                <span
                  className={cn(
                    "w-[68px] shrink-0 text-xs",
                    isSelected ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}
                >
                  {cycle.label.split(" de ")[0]}
                </span>

                <WeeklySparkline cycle={cycle} />

                <span className="ml-auto text-xs font-semibold tabular-nums text-foreground">
                  {formatCurrency(cycle.fichaCents)}
                </span>

                <StateChip state={cycle.state} className="shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Cinco barras: o consumo do mês fatiado por semana. */
function WeeklySparkline({ cycle }: { cycle: Cycle }) {
  const weeks = [0, 0, 0, 0, 0];
  for (const [day, cents] of Object.entries(cycle.byDay)) {
    const index = Math.min(4, Math.floor((Number(day) - 1) / 7));
    weeks[index] += cents;
  }
  const max = Math.max(...weeks);

  if (!max) {
    return (
      <span className="h-4 w-14 shrink-0" aria-hidden="true">
        <span className="mt-[7px] block h-px w-full bg-border" />
      </span>
    );
  }

  const peak = weeks.indexOf(max);

  return (
    <span
      className="flex h-4 w-14 shrink-0 items-end gap-[1.5px]"
      aria-hidden="true"
      title={`Consumo por semana em ${cycle.label}`}
    >
      {weeks.map((cents, index) => (
        <span
          key={index}
          className="flex-1 rounded-[1px]"
          style={{
            height: `${Math.max(8, (cents / max) * 100)}%`,
            background: index === peak ? "var(--heat-3)" : "var(--heat-2)",
          }}
        />
      ))}
    </span>
  );
}
