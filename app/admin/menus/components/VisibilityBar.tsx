"use client";

import { MENU_DAYS_AHEAD } from "@/lib/daily-menu";
import { Eye } from "lucide-react";
import { addDays, longDay } from "../lib";

const OPTION_LABEL: Record<number, string> = { 1: "Só hoje e amanhã", 7: "7 dias", 14: "14 dias", 30: "30 dias" };

interface Props {
  today: string;
  daysAhead: number;
  saving: boolean;
  onChange: (days: number) => void;
}

/** Quanto o cliente enxerga: os cardápios publicados até N dias à frente. Rascunho ele nunca vê. */
export function VisibilityBar({ today, daysAhead, saving, onChange }: Props) {
  const last = addDays(today, daysAhead);
  const options = MENU_DAYS_AHEAD.OPTIONS.includes(daysAhead as never) ? [...MENU_DAYS_AHEAD.OPTIONS] : [...MENU_DAYS_AHEAD.OPTIONS, daysAhead].sort((a, b) => a - b);
  return (
    <section aria-label="Quanto o cliente enxerga" className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
      <Eye className="h-[18px] w-[18px] shrink-0 text-blue-700 dark:text-blue-300" aria-hidden="true" />
      <p className="min-w-[240px] flex-1 text-[13px] leading-relaxed">
        O cliente vê os cardápios <b>publicados</b> até <b>{daysAhead === 1 ? "amanhã" : `${daysAhead} dias à frente`}</b> (até {longDay(last).toLowerCase()}). O que está além disso fica guardado e aparece
        sozinho quando o dia chegar perto. <b>Rascunho</b> o cliente nunca vê.
      </p>
      <label className="inline-flex items-center gap-2 text-xs font-semibold">
        Mostrar
        <select
          value={daysAhead}
          disabled={saving}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Dias à frente que o cliente vê"
          className="h-9 rounded-md border border-blue-300 bg-white px-2 text-xs font-semibold text-slate-900 disabled:opacity-60"
        >
          {options.map((n) => (
            <option key={n} value={n}>
              {OPTION_LABEL[n] ?? `${n} dias`}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
