"use client";

import { AlertCircle, CalendarCheck2, CalendarDays, Gauge, Wallet } from "lucide-react";
import { SectionTitle } from "./SectionTitle";
import { cn } from "@/lib/utils";
import { formatCurrency } from "../../constants";
import { consumptionLevel, type Cycle } from "../../lib/cycle";

const WEEKDAY_INITIALS = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEKDAY_NAMES = [
  "domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado",
];

/**
 * O mês inteiro num quadrado. Para um negócio de refeição diária, é o artefato
 * mais informativo possível: o dia em que o cliente não comeu salta aos olhos,
 * e a pergunta "eu não comi no dia 12" se responde em um olhar.
 */
export function ConsumptionCalendar({ cycle, now }: { cycle: Cycle; now: Date }) {
  const maxCents = cycle.topDay?.cents ?? 0;
  const paymentDays = new Set(cycle.paymentDays);
  const missingDays = new Set(cycle.tracksDailyPattern ? cycle.missingDays : []);
  const isToday = (day: number) =>
    cycle.isCurrent && day === now.getDate();

  const cells = [
    ...Array.from({ length: cycle.firstWeekday }, () => null),
    ...Array.from({ length: cycle.daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <section className="@container rounded-2xl border border-border/60 bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_-8px_rgba(15,23,42,0.16)]">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SectionTitle icon={CalendarDays}>
          Consumo de {cycle.label.split(" de ")[0]}
        </SectionTitle>
        <div className="ml-auto hidden items-center gap-1.5 text-[12px] text-muted-foreground @[560px]:flex">
          <span>menos</span>
          {[0, 1, 2, 3].map((level) => (
            <span
              key={level}
              className="h-[11px] w-[11px] rounded-[3px]"
              style={{ background: `var(--heat-${level})` }}
            />
          ))}
          <span>mais</span>
        </div>
      </div>

      <div className="flex flex-col gap-5 @[620px]:flex-row @[620px]:items-start @[620px]:gap-6 @[980px]:gap-8">
        <div className="w-full max-w-[320px] shrink-0 @[980px]:max-w-[380px]">
          <div className="grid grid-cols-7 gap-2">
            {WEEKDAY_INITIALS.map((initial, index) => (
              <span
                key={index}
                className="pb-1 text-center text-[10.5px] font-semibold tracking-wide text-muted-foreground"
              >
                {initial}
              </span>
            ))}

            {cells.map((day, index) => {
              if (day === null) return <span key={`empty-${index}`} aria-hidden="true" />;

              const cents = cycle.byDay[day] ?? 0;
              const level = consumptionLevel(cents, maxCents);
              const isPayment = paymentDays.has(day);
              const isMissing = missingDays.has(day);

              return (
                <span
                  key={day}
                  title={dayTitle(cycle, day, cents, isPayment, isMissing)}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-[9px] text-[12px] font-medium transition-transform",
                    cents > 0 && "hover:scale-105",
                    isToday(day) && "ring-2 ring-offset-1 ring-offset-[color:var(--card)]"
                  )}
                  style={{
                    background: isPayment ? "var(--cycle-paga-bg)" : `var(--heat-${level})`,
                    color: isPayment ? "var(--cycle-paga-fg)" : `var(--heat-${level}-fg)`,
                    boxShadow: isPayment
                      ? "inset 0 0 0 1.5px var(--cycle-paga)"
                      : isMissing
                        ? "inset 0 0 0 1.5px var(--cycle-atraso)"
                        : level === 3
                          ? "0 3px 9px -3px color-mix(in srgb, var(--heat-3) 60%, transparent)"
                          : undefined,
                    ...(isMissing && !isPayment
                      ? { background: "var(--card)", color: "var(--cycle-atraso-fg)" }
                      : null),
                    ...(isToday(day) ? { ["--tw-ring-color" as string]: "var(--primary)" } : null),
                  }}
                >
                  {day}
                </span>
              );
            })}
          </div>
        </div>

        <div className="grid min-w-0 flex-1 gap-x-8 @[560px]:grid-cols-2 @[620px]:grid-cols-1 @[1080px]:grid-cols-2">
          <Stat
            icon={CalendarCheck2}
            tone="info"
            label="Dias com consumo"
            value={`${cycle.daysWithConsumption}`}
            hint={`de ${cycle.businessDays} ${cycle.businessDays === 1 ? "dia útil" : "dias úteis"}`}
          />
          <Stat
            icon={Gauge}
            tone="warn"
            label="Média por dia consumido"
            value={formatCurrency(cycle.averagePerDayCents)}
            hint={
              cycle.topDay
                ? `maior: ${formatCurrency(cycle.topDay.cents)} no dia ${cycle.topDay.day}`
                : undefined
            }
          />
          {cycle.paymentDays.length > 0 && (
            <Stat
              icon={Wallet}
              tone="ok"
              label={cycle.paymentDays.length === 1 ? "Pagamento no mês" : "Pagamentos no mês"}
              value={formatCurrency(cycle.paymentsCents)}
              hint={`dia ${cycle.paymentDays.join(", ")}`}
            />
          )}
          {cycle.tracksDailyPattern && cycle.missingDays.length > 0 && (
            <Stat
              icon={AlertCircle}
              tone="alert"
              label={
                cycle.missingDays.length === 1
                  ? "Dia útil sem lançamento"
                  : "Dias úteis sem lançamento"
              }
              value={cycle.missingDays.slice(0, 4).map((day) => `${day}/${String(cycle.month + 1).padStart(2, "0")}`).join(", ")}
              hint={
                cycle.missingDays.length > 4
                  ? `e mais ${cycle.missingDays.length - 4}`
                  : WEEKDAY_NAMES[new Date(cycle.year, cycle.month, cycle.missingDays[0]).getDay()]
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}

const TONE_STYLE = {
  info: { background: "var(--cycle-aberta-bg)", color: "var(--cycle-aberta-fg)" },
  warn: { background: "var(--cycle-cobrar-bg)", color: "var(--cycle-cobrar-fg)" },
  ok: { background: "var(--cycle-paga-bg)", color: "var(--cycle-paga-fg)" },
  alert: { background: "var(--cycle-atraso-bg)", color: "var(--cycle-atraso-fg)" },
} as const;

function Stat({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  tone: keyof typeof TONE_STYLE;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border/50 py-2.5 last:border-b-0">
      <span
        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px]"
        style={TONE_STYLE[tone]}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <p className="text-[16px] font-semibold tracking-tight text-foreground">
          {value}
          {hint && (
            <span className="ml-1.5 text-[13px] font-normal text-muted-foreground">{hint}</span>
          )}
        </p>
      </div>
    </div>
  );
}

function dayTitle(
  cycle: Cycle,
  day: number,
  cents: number,
  isPayment: boolean,
  isMissing: boolean
) {
  const date = new Date(cycle.year, cycle.month, day);
  const weekday = WEEKDAY_NAMES[date.getDay()];
  const prefix = `${day} de ${cycle.label} · ${weekday}`;

  if (isPayment && cents > 0) {
    return `${prefix} — consumo ${formatCurrency(cents)} e pagamento recebido`;
  }
  if (isPayment) return `${prefix} — pagamento recebido`;
  if (cents > 0) return `${prefix} — ${formatCurrency(cents)}`;
  if (isMissing) return `${prefix} — dia útil sem lançamento`;
  return `${prefix} — sem consumo`;
}
