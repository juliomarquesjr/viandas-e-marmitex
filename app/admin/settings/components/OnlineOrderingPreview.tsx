"use client";

import { Eye } from "lucide-react";
import { closingTime, plural, type OOPreview } from "./OnlineOrderingShared";

type Tone = "faturado" | "cobrar" | "pronto" | "cancelado";

function describe(preview: OOPreview): { tone: Tone; label: string; detail: string } {
  if (preview.open) {
    const until = closingTime(preview);
    const left =
      preview.minutesToClose != null && preview.minutesToClose <= 90
        ? ` (faltam ${preview.minutesToClose} min)`
        : "";
    return {
      tone: "faturado",
      label: until ? `ABERTO até ${until}` : "ABERTO",
      detail: `Os clientes conseguem pedir agora${left}.`,
    };
  }
  switch (preview.reason) {
    case "disabled":
      return {
        tone: "cancelado",
        label: "DESLIGADO",
        detail: "O cliente vê “sem pedidos online”.",
      };
    case "paused":
      return {
        tone: "pronto",
        label: "PAUSADO hoje",
        detail: preview.nextOpening ? `Volta ${preview.nextOpening}.` : "Volta amanhã.",
      };
    case "no_windows":
      return {
        tone: "cobrar",
        label: "FECHADO — sem horários",
        detail: "Nenhum horário cadastrado: o cliente vê a loja fechada.",
      };
    default:
      return {
        tone: "cobrar",
        label: preview.nextOpening ? `FECHADO — abre ${preview.nextOpening}` : "FECHADO",
        detail: "Fora do horário, o cliente só vê o cardápio.",
      };
  }
}

export function OnlineOrderingPreview({ preview, dirty, soldOutCount }: { preview: OOPreview; dirty: boolean; soldOutCount: number }) {
  const { tone, label, detail } = describe(preview);
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        Agora o cliente vê
      </p>
      <div className="mt-3" aria-live="polite">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-bold"
          style={{ background: `var(--state-${tone}-bg)`, color: `var(--state-${tone}-fg)` }}
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: `var(--state-${tone})` }}
            aria-hidden="true"
          />
          {label}
        </span>
        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{detail}</p>
        {soldOutCount > 0 && (
          <p className="mt-1 text-sm font-medium" style={{ color: "var(--state-cobrar-fg)" }}>
            {plural(soldOutCount, "produto esgotado", "produtos esgotados")} hoje
          </p>
        )}
      </div>
      {dirty && (
        <p className="mt-2 text-xs text-[color:var(--muted-foreground)]">
          Mostra o que está salvo. Salve os horários para ver a mudança aqui.
        </p>
      )}
    </div>
  );
}
