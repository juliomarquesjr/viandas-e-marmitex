import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CYCLE_STATE_META,
  CYCLE_STEPS,
  stepIndexOf,
  type Cycle,
} from "../../lib/cycle";

/**
 * Os três passos do ciclo: aberta → a cobrar → paga. "Em atraso" não é um passo
 * a mais, é o segundo passo pintado de vermelho — o ciclo não avançou, só
 * envelheceu.
 *
 * O quarto passo do desenho original ("enviada") ficou de fora de propósito:
 * registrar o envio exige persistir a fatura, e nada aqui deve fingir um estado
 * que o banco não sabe.
 */
export function CycleStepper({ cycle, now }: { cycle: Cycle; now: Date }) {
  const current = stepIndexOf(cycle.state);
  const isLate = cycle.state === "em-atraso";
  const token = CYCLE_STATE_META[cycle.state].token;

  return (
    <section className="rounded-2xl border border-border/60 bg-card px-5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_-8px_rgba(15,23,42,0.16)]">
      <div className="flex flex-wrap items-center gap-y-2">
        {CYCLE_STEPS.map((step, index) => {
          const done = index < current;
          const active = index === current;
          const activeToken = active && isLate ? "atraso" : token;

          return (
            <div key={step.key} className="flex items-center">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10.5px] font-bold",
                    !done && !active && "bg-muted text-muted-foreground"
                  )}
                  style={
                    done
                      ? { background: "var(--cycle-paga-solid)", color: "var(--cycle-paga-on)" }
                      : active
                        ? {
                            background: `var(--cycle-${activeToken}-solid)`,
                            color: `var(--cycle-${activeToken}-on)`,
                            boxShadow: `0 0 0 4px color-mix(in srgb, var(--cycle-${activeToken}) 18%, transparent)`,
                          }
                        : undefined
                  }
                >
                  {done ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "text-[12.5px]",
                    active ? "font-semibold" : "text-muted-foreground"
                  )}
                  style={active ? { color: `var(--cycle-${activeToken}-fg)` } : undefined}
                >
                  {active && isLate ? "Em atraso" : step.label}
                </span>
              </div>
              {index < CYCLE_STEPS.length - 1 && (
                <span
                  className="mx-2.5 h-0.5 w-7 rounded-full sm:mx-3 sm:w-8"
                  style={{
                    background: done
                      ? "var(--cycle-paga-solid)"
                      : "color-mix(in srgb, var(--border) 90%, transparent)",
                  }}
                />
              )}
            </div>
          );
        })}

        <p className="ml-auto pl-3 text-[12px] text-muted-foreground">
          {describeTiming(cycle, now)}
        </p>
      </div>
    </section>
  );
}

function describeTiming(cycle: Cycle, now: Date) {
  const lastDay = new Date(cycle.year, cycle.month + 1, 0);

  if (cycle.isCurrent) {
    const remaining = lastDay.getDate() - now.getDate();
    if (remaining <= 0) return "O ciclo fecha hoje";
    return `Fecha em ${remaining} ${remaining === 1 ? "dia" : "dias"} · ${lastDay.toLocaleDateString("pt-BR")}`;
  }

  if (cycle.state === "paga") return "Ciclo encerrado e liquidado";
  if (cycle.state === "sem-movimento") return "Nenhum lançamento neste mês";

  const days = Math.floor((now.getTime() - lastDay.getTime()) / 86_400_000);
  return `Fechou há ${days} ${days === 1 ? "dia" : "dias"} · ${lastDay.toLocaleDateString("pt-BR")}`;
}
