"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { formatDayMonth, formatMonthLabel } from "../../lib/format";

/* Datas do calendário são "AAAA-MM-DD" no fuso do aparelho. */

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseKey(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

const longDate = (d: Date) => d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

interface Preset {
  label: string;
  range: (today: Date) => [Date, Date];
}

const PRESETS: Preset[] = [
  { label: "Hoje", range: (t) => [t, t] },
  {
    label: "Ontem",
    range: (t) => {
      const y = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1);
      return [y, y];
    },
  },
  { label: "30 dias", range: (t) => [new Date(t.getFullYear(), t.getMonth(), t.getDate() - 29), t] },
  {
    label: "Mês passado",
    range: (t) => [new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0)],
  },
  { label: "Este ano", range: (t) => [new Date(t.getFullYear(), 0, 1), t] },
];

/**
 * Um calendário só para escolher o período: toque na data de início e depois
 * na de fim. Datas futuras ficam desabilitadas (a ficha não tem lançamentos nelas).
 */
export function RangeCalendar({
  start,
  end,
  onChange,
}: {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
}) {
  const today = React.useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);
  const todayKey = keyOf(today);

  const anchor = parseKey(start) ?? today;
  const [view, setView] = React.useState({ year: anchor.getFullYear(), month: anchor.getMonth() });

  const first = new Date(view.year, view.month, 1);
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const lead = first.getDay();
  const isCurrentMonth = view.year === today.getFullYear() && view.month === today.getMonth();

  const showMonth = (offset: number) => {
    const d = new Date(view.year, view.month + offset, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  const pick = (key: string) => {
    if (!start || end) onChange(key, "");
    else if (key < start) onChange(key, "");
    else onChange(start, key);
  };

  const applyPreset = (preset: Preset) => {
    const [s, e] = preset.range(today);
    onChange(keyOf(s), keyOf(e));
    setView({ year: e.getFullYear(), month: e.getMonth() });
  };

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < lead; i++) cells.push(<span key={`b${i}`} className="c-cal-blank" aria-hidden="true" />);
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(view.year, view.month, day);
    const key = keyOf(date);
    const isStart = key === start;
    const isEnd = key === (end || start);
    const inRange = Boolean(start) && Boolean(end) && key > start && key < end;
    const edge = isStart || isEnd;
    cells.push(
      <button
        key={key}
        type="button"
        className="c-cal-day"
        data-edge={edge ? (isStart && isEnd ? "single" : isStart ? "start" : "end") : undefined}
        data-range={inRange ? "true" : undefined}
        data-today={key === todayKey ? "true" : undefined}
        aria-pressed={edge || inRange}
        aria-label={longDate(date)}
        disabled={key > todayKey}
        onClick={() => pick(key)}
      >
        {day}
      </button>
    );
  }

  const startDate = parseKey(start);
  const endDate = parseKey(end);
  const choosingEnd = Boolean(startDate) && !endDate;

  return (
    <div className="c-cal">
      <div className="c-cal-presets" role="group" aria-label="Atalhos de período">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" className="c-chip" onClick={() => applyPreset(p)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="c-cal-sum" aria-live="polite">
        <div className="c-cal-box" data-active={!choosingEnd ? "true" : undefined}>
          <span>Início</span>
          <strong>{startDate ? formatDayMonth(startDate) : "Escolha"}</strong>
        </div>
        <div className="c-cal-box" data-active={choosingEnd ? "true" : undefined}>
          <span>Fim</span>
          <strong>{endDate ? formatDayMonth(endDate) : startDate ? "Escolha ou só 1 dia" : "—"}</strong>
        </div>
      </div>

      <div className="c-cal-nav">
        <button type="button" className="c-x" onClick={() => showMonth(-1)} aria-label="Mês anterior">
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <strong aria-live="polite">{formatMonthLabel(first)}</strong>
        <button type="button" className="c-x" onClick={() => showMonth(1)} aria-label="Próximo mês" disabled={isCurrentMonth}>
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="c-cal-grid" role="group" aria-label={`Dias de ${formatMonthLabel(first)}`}>
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="c-cal-wd" aria-hidden="true">
            {w}
          </span>
        ))}
        {cells}
      </div>
    </div>
  );
}
