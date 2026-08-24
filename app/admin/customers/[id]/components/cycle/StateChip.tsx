import { cn } from "@/lib/utils";
import { CYCLE_STATE_META, type CycleState } from "../../lib/cycle";

/**
 * A pílula de estado do ciclo. Existe uma só para que o stepper, o cabeçalho da
 * fatura e a lista de ciclos anteriores nunca pintem o mesmo estado de duas
 * cores diferentes — as cores vêm dos tokens `--cycle-*`.
 */
export function StateChip({
  state,
  className,
  onSurface = false,
}: {
  state: CycleState;
  className?: string;
  /** Sobre o painel azul da fatura, o chip vira translúcido em vez de colorido. */
  onSurface?: boolean;
}) {
  const meta = CYCLE_STATE_META[state];

  return (
    <span
      title={meta.description}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap",
        className
      )}
      style={
        onSurface
          ? { background: "rgba(255,255,255,0.18)", color: "#ffffff" }
          : {
              background: `var(--cycle-${meta.token}-bg)`,
              color: `var(--cycle-${meta.token}-fg)`,
            }
      }
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: onSurface ? "#ffffff" : `var(--cycle-${meta.token})` }}
      />
      {meta.label}
    </span>
  );
}
