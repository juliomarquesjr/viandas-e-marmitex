"use client";

import { Button } from "@/app/components/ui/button";
import { Switch } from "@/app/components/ui/switch";
import { Pencil, Plus, Sparkles } from "lucide-react";
import { useMemo } from "react";
import {
  daysLabel,
  formatMinute,
  MAX_WINDOWS,
  nowInSaoPaulo,
  plural,
  SWITCH_OFF_CLASS,
  WEEKDAY_CHIPS,
  WINDOW_COLORS,
  type OOWindow,
} from "./OnlineOrderingShared";

interface Props {
  windows: OOWindow[];
  /** Instante do servidor (ISO): marca "agora" na grade e destaca o dia de hoje. */
  serverNow: string;
  busyIds: Set<string>;
  onEdit: (id: string) => void;
  onToggleActive: (id: string, value: boolean) => void;
  onAdd: () => void;
  onPresets: () => void;
}

const TICK_STEP = 180;

export function OnlineOrderingWeek({ windows, serverNow, busyIds, onEdit, onToggleActive, onAdd, onPresets }: Props) {
  const now = useMemo(() => nowInSaoPaulo(serverNow), [serverNow]);
  const atLimit = windows.length >= MAX_WINDOWS;

  // A grade começa às 6h; se algum horário abre antes, ela começa na hora cheia anterior
  const lo = useMemo(() => {
    const earliest = windows.reduce((min, w) => Math.min(min, w.startMinute), 360);
    return Math.floor(earliest / 60) * 60;
  }, [windows]);
  const pct = (minute: number) => ((minute - lo) / (1440 - lo)) * 100;
  const ticks = useMemo(() => {
    const list: number[] = [];
    for (let m = lo; m <= 1440; m += TICK_STEP) list.push(m);
    if (list[list.length - 1] !== 1440) list.push(1440);
    return list;
  }, [lo]);

  const colorOf = (index: number) => WINDOW_COLORS[index % WINDOW_COLORS.length];
  const showNow = now.minute >= lo && now.minute <= 1440;

  return (
    <section aria-labelledby="oo-week-title" className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pb-1 pt-5 sm:px-6">
        <div className="min-w-0 flex-1 basis-64">
          <h3 id="oo-week-title" className="text-base font-semibold text-[color:var(--foreground)]">
            Quando o cliente pode pedir
          </h3>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            Cada barra é um horário. Toque numa barra para mudar dias, horas e produtos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" className="min-h-[44px]" onClick={onPresets} disabled={atLimit}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Usar um modelo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px]"
            onClick={onAdd}
            disabled={atLimit}
            title={atLimit ? `Limite de ${MAX_WINDOWS} horários` : undefined}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adicionar horário
          </Button>
        </div>
      </div>

      {/* Grade da semana (telas maiores) */}
      <div className="hidden overflow-x-auto px-4 pb-4 pt-8 sm:block sm:px-6">
        <div className="min-w-[560px]">
          <div className="relative ml-[92px] h-5 text-xs text-[color:var(--muted-foreground)]" aria-hidden="true">
            {ticks.map((m) => (
              <span key={m} className="absolute top-0 -translate-x-1/2" style={{ left: `${pct(m)}%` }}>
                {m === 1440 ? "24h" : `${m / 60}h`}
              </span>
            ))}
          </div>
          <div role="list" aria-label="Horários por dia da semana">
            {WEEKDAY_CHIPS.map((day) => {
              const isToday = day.value === now.weekday;
              const bars = windows
                .map((w, i) => ({ w, i }))
                .filter(({ w }) => w.weekdays.includes(day.value));
              const hasActive = bars.some(({ w }) => w.active);
              return (
                <div
                  key={day.value}
                  role="listitem"
                  className={`flex min-h-[52px] items-center border-t ${
                    isToday ? "rounded-xl border-transparent bg-primary/10" : "border-[color:var(--border)]"
                  }`}
                >
                  <div className="w-[92px] flex-shrink-0 pl-3 text-sm font-bold text-[color:var(--foreground)]">
                    {day.short}
                    {isToday && <span className="block text-xs font-medium text-primary">hoje</span>}
                  </div>
                  <div className="relative h-[52px] flex-1">
                    {ticks.map((m) => (
                      <span
                        key={m}
                        className="absolute bottom-0 top-0 w-px bg-[color:var(--border)]"
                        style={{ left: `${pct(m)}%` }}
                        aria-hidden="true"
                      />
                    ))}
                    {isToday && showNow && (
                      <span
                        className="absolute -bottom-0.5 -top-0.5 z-10 w-0.5"
                        style={{ left: `${pct(now.minute)}%`, background: "var(--state-cobrar)" }}
                        title={`Agora ${formatMinute(now.minute)}`}
                        aria-hidden="true"
                      />
                    )}
                    {!hasActive && (
                      <span className="absolute inset-y-0 left-3 flex items-center text-sm text-[color:var(--muted-foreground)]">
                        Fechado
                      </span>
                    )}
                    {bars.map(({ w, i }) => {
                      const c = colorOf(i);
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => onEdit(w.id)}
                          aria-label={`Editar ${w.name}, ${formatMinute(w.startMinute)} às ${formatMinute(w.endMinute)}${w.active ? "" : " (inativo)"}`}
                          title={`${w.name} · ${formatMinute(w.startMinute)} às ${formatMinute(w.endMinute)}${w.active ? "" : " · inativo"}`}
                          className="absolute top-2 flex h-9 min-w-0 items-center overflow-hidden whitespace-nowrap rounded-[10px] border px-2.5 text-left text-[13px] font-bold text-[color:var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          style={{
                            left: `${pct(w.startMinute)}%`,
                            width: `${((w.endMinute - w.startMinute) / (1440 - lo)) * 100}%`,
                            background: c.bg,
                            borderColor: c.border,
                            borderStyle: w.active ? "solid" : "dashed",
                            opacity: w.active ? 1 : 0.55,
                          }}
                        >
                          <span className="truncate">{w.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lista dos horários (a única visão no celular) */}
      <ul className="mt-2 border-t border-[color:var(--border)] sm:mt-0">
        {windows.map((w, i) => {
          const c = colorOf(i);
          const toggleId = `oo-active-${w.id}`;
          return (
            <li key={w.id} className="border-b border-[color:var(--border)] px-4 py-3.5 last:border-b-0 sm:px-6">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: c.dot }} aria-hidden="true" />
                <div className="min-w-0 flex-1 basis-32 sm:basis-48">
                  <p className="truncate text-[15px] font-bold text-[color:var(--foreground)]">{w.name}</p>
                  <p className="mt-0.5 text-sm text-[color:var(--muted-foreground)]">
                    {daysLabel(w.weekdays)} · {formatMinute(w.startMinute)} às {formatMinute(w.endMinute)}
                  </p>
                </div>
                <Button type="button" variant="outline" className="order-3 min-h-[44px] sm:order-5" onClick={() => onEdit(w.id)}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Editar
                </Button>
                <div className="order-4 flex basis-full items-center justify-between gap-4 pl-7 sm:basis-auto sm:justify-start sm:pl-0">
                  <p className="text-sm text-[color:var(--muted-foreground)] sm:w-24 sm:flex-shrink-0">
                    {plural(w.productIds.length, "produto", "produtos")}
                  </p>
                  <div className="flex min-h-[44px] items-center gap-2">
                    <Switch
                      id={toggleId}
                      checked={w.active}
                      disabled={busyIds.has(w.id)}
                      className={SWITCH_OFF_CLASS}
                      onCheckedChange={(v) => onToggleActive(w.id, v)}
                      aria-label={`Horário ${w.name} ${w.active ? "ativo" : "inativo"}`}
                    />
                    <label htmlFor={toggleId} className="w-12 cursor-pointer text-sm text-[color:var(--foreground)]">
                      {w.active ? "Ativo" : "Inativo"}
                    </label>
                  </div>
                </div>
              </div>
              {/* Dias em bolinhas: leitura rápida no celular */}
              <div className="mt-1 flex gap-1.5 pl-7 sm:hidden" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                  const on = w.weekdays.includes(d);
                  return (
                    <span
                      key={d}
                      className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-xs font-bold"
                      style={on ? { background: c.bg, color: "var(--foreground)", border: `1px solid ${c.border}` } : { background: "var(--muted)", color: "var(--muted-foreground)" }}
                    >
                      {["D", "S", "T", "Q", "Q", "S", "S"][d]}
                    </span>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
