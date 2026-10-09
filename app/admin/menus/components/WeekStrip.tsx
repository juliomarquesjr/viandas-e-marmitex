"use client";

import { Button } from "@/app/components/ui/button";
import { ChevronLeft, ChevronRight, Info, Plus } from "lucide-react";
import { addDays, dayNumber, weekdayShort, weekRange, type MenuSummary } from "../lib";

interface Props {
  monday: string;
  today: string;
  byDay: Map<string, MenuSummary>;
  onOpen: (day: string) => void;
  onWeek: (delta: number) => void;
  onThisWeek: () => void;
}

function StatusPill({ status }: { status: "draft" | "published" | "none" }) {
  const tone = status === "published" ? "faturado" : status === "draft" ? "pronto" : "cancelado";
  const label = status === "published" ? "Publicado" : status === "draft" ? "Rascunho" : "Sem cardápio";
  return (
    <span
      className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-bold"
      style={{ background: `var(--state-${tone}-bg)`, color: `var(--state-${tone}-fg)` }}
    >
      {label}
    </span>
  );
}

/** A semana de segunda a domingo: um cartão por dia, com a situação do cardápio. */
export function WeekStrip({ monday, today, byDay, onOpen, onWeek, onThisWeek }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return (
    <section aria-labelledby="menus-week" className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 pb-5 pt-5 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="menus-week" className="text-base font-semibold text-[color:var(--foreground)]">
            Semana de {weekRange(monday)}
          </h2>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Toque num dia para criar ou editar o cardápio.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="min-h-[44px] min-w-[44px] px-0" onClick={() => onWeek(-1)} aria-label="Semana anterior">
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" className="min-h-[44px]" onClick={onThisWeek}>
            Esta semana
          </Button>
          <Button type="button" variant="outline" className="min-h-[44px] min-w-[44px] px-0" onClick={() => onWeek(1)} aria-label="Próxima semana">
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[860px] grid-cols-7 gap-3">
          {days.map((day) => {
            const menu = byDay.get(day);
            const isToday = day === today;
            return (
              <button
                key={day}
                type="button"
                onClick={() => onOpen(day)}
                aria-label={`${weekdayShort(day)} ${dayNumber(day)}: ${menu ? (menu.status === "published" ? "publicado" : "rascunho") : "sem cardápio"}. Abrir`}
                className={`flex min-h-[168px] min-w-0 flex-col items-stretch gap-1.5 rounded-[14px] p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  isToday
                    ? "border-2 border-primary bg-primary/5"
                    : menu
                      ? "border border-[color:var(--border)] bg-[color:var(--card)] hover:bg-[color:var(--muted)]"
                      : "border border-dashed border-[color:var(--border-dark)] bg-[color:var(--muted)]/40 hover:bg-[color:var(--muted)]"
                }`}
              >
                <span className={`text-xs font-bold uppercase tracking-wider ${isToday ? "text-primary" : "text-[color:var(--muted-foreground)]"}`}>
                  {weekdayShort(day)}
                  {isToday && " · hoje"}
                </span>
                <span className="text-[26px] font-bold leading-none text-[color:var(--foreground)]">{dayNumber(day)}</span>
                <StatusPill status={menu ? menu.status : "none"} />
                {menu ? (
                  <>
                    <span className="text-sm font-bold leading-snug text-[color:var(--foreground)]">{menu.highlight ?? menu.title ?? "Cardápio"}</span>
                    <span className="text-[13px] text-[color:var(--muted-foreground)]">
                      {menu.itemCount} {menu.itemCount === 1 ? "item" : "itens"}
                      {menu.status === "draft" ? ", falta publicar" : ""}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="mt-1 text-[13px] text-[color:var(--muted-foreground)]">Nenhum cardápio para este dia.</span>
                    <span className="mt-auto flex items-center gap-1.5 text-sm font-bold text-primary">
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Criar
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-primary/10 px-3.5 py-3 text-sm leading-relaxed text-[color:var(--foreground)]">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />
        <span>
          Dia sem cardápio publicado: o cliente vê “O cardápio de hoje ainda não foi publicado” e consegue consultar os anteriores.
        </span>
      </p>
    </section>
  );
}
