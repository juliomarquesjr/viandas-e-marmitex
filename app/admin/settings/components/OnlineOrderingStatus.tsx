"use client";

import { Button } from "@/app/components/ui/button";
import { Switch } from "@/app/components/ui/switch";
import { Eye, Loader2, Pause, Play } from "lucide-react";
import {
  closingTime,
  formatPrice,
  plural,
  SWITCH_OFF_CLASS,
  type OOPreview,
  type OOProduct,
} from "./OnlineOrderingShared";

type Tone = "faturado" | "cobrar" | "pronto" | "cancelado";

interface Situation {
  tone: Tone;
  pill: string;
  title: string;
  text: string;
}

function duration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** A situação da loja em uma frase, vinda do que o servidor calculou. */
function describe(preview: OOPreview): Situation {
  if (preview.open) {
    const until = closingTime(preview);
    return {
      tone: "faturado",
      pill: "Aberto agora",
      title: until ? `Recebendo pedidos até ${until}` : "Recebendo pedidos",
      text:
        preview.minutesToClose != null
          ? `Faltam ${duration(preview.minutesToClose)} para fechar o horário atual.`
          : "Os clientes conseguem pedir agora.",
    };
  }
  switch (preview.reason) {
    case "disabled":
      return {
        tone: "cancelado",
        pill: "Desligado",
        title: "Seus clientes não podem pedir",
        text: "Ligue o interruptor quando quiser começar a receber pedidos pelo app. Vale na hora.",
      };
    case "paused":
      return {
        tone: "pronto",
        pill: "Pausado",
        title: "Pausado até amanhã",
        text: preview.nextOpening
          ? `O cliente vê a loja fechada. Os pedidos voltam ${preview.nextOpening}.`
          : "O cliente vê a loja fechada. Amanhã os pedidos voltam sozinhos.",
      };
    case "no_windows":
      return {
        tone: "cobrar",
        pill: "Fechado",
        title: "Nenhum horário cadastrado",
        text: "O cliente vê a loja fechada. Crie um horário abaixo para começar a receber pedidos.",
      };
    default:
      return {
        tone: "cobrar",
        pill: "Fechado agora",
        title: preview.nextOpening ? `Abre ${preview.nextOpening}` : "Fora do horário de pedidos",
        text: "Fora do horário, o cliente só vê o cardápio e não consegue pedir.",
      };
  }
}

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold"
      style={{ background: `var(--state-${tone}-bg)`, color: `var(--state-${tone}-fg)` }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: `var(--state-${tone})` }} aria-hidden="true" />
      {children}
    </span>
  );
}

interface Props {
  enabled: boolean;
  paused: boolean;
  preview: OOPreview;
  soldOutCount: number;
  /** Produtos que o cliente pode pedir neste momento (já sem os esgotados). */
  openProducts: OOProduct[];
  busyMaster: boolean;
  busyPause: boolean;
  onToggleEnabled: (value: boolean) => void;
  onPause: () => void;
  onResume: () => void;
}

export function OnlineOrderingStatus({
  enabled,
  paused,
  preview,
  soldOutCount,
  openProducts,
  busyMaster,
  busyPause,
  onToggleEnabled,
  onPause,
  onResume,
}: Props) {
  const s = describe(preview);
  const sample = openProducts.slice(0, 3);

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
      <section
        aria-labelledby="oo-status-title"
        className="flex min-w-0 flex-1 flex-col gap-5 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0" aria-live="polite">
            <Pill tone={s.tone}>{s.pill}</Pill>
            <h3 id="oo-status-title" className="mt-3.5 text-xl font-bold leading-tight text-[color:var(--foreground)] sm:text-2xl">
              {s.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--muted-foreground)]">{s.text}</p>
          </div>
          <div className="flex flex-shrink-0 flex-col items-center gap-2">
            <div className="flex min-h-[44px] items-center gap-2">
              {busyMaster && <Loader2 className="h-4 w-4 animate-spin text-[color:var(--muted-foreground)]" aria-hidden="true" />}
              <Switch
                id="oo-enabled"
                checked={enabled}
                disabled={busyMaster}
                className={SWITCH_OFF_CLASS}
                onCheckedChange={onToggleEnabled}
                aria-label="Receber pedidos dos clientes pelo app"
              />
            </div>
            <label htmlFor="oo-enabled" className="cursor-pointer text-xs font-bold text-[color:var(--foreground)]">
              {enabled ? "Ligado" : "Desligado"}
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-[color:var(--border)] pt-4">
          {paused ? (
            <Button type="button" className="min-h-[44px]" onClick={onResume} loading={busyPause}>
              {!busyPause && <Play className="h-4 w-4" aria-hidden="true" />}
              Voltar a receber agora
            </Button>
          ) : (
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={onPause} loading={busyPause} disabled={!enabled}>
              {!busyPause && <Pause className="h-4 w-4" aria-hidden="true" />}
              Pausar pedidos até amanhã
            </Button>
          )}
          <span className="min-w-[12rem] flex-1 text-sm text-[color:var(--muted-foreground)]">
            {enabled
              ? "Não vai dar para atender hoje? Os pedidos voltam sozinhos amanhã."
              : "Ligue os pedidos pelo app para usar a pausa."}
          </span>
        </div>
      </section>

      <aside
        aria-labelledby="oo-seen-title"
        className="w-full flex-shrink-0 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 lg:w-[300px]"
      >
        <p
          id="oo-seen-title"
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          Agora o cliente vê
        </p>
        <div className="mt-3">
          <Pill tone={s.tone}>{preview.open ? "ABERTO" : s.pill.toUpperCase()}</Pill>
        </div>
        {preview.open && sample.length > 0 ? (
          <ul className="mt-3 divide-y divide-[color:var(--border)]">
            {sample.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt=""
                    loading="lazy"
                    className="h-9 w-9 flex-shrink-0 rounded-lg border border-[color:var(--border)] object-cover"
                  />
                ) : (
                  <span
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[color:var(--muted)] text-xs font-semibold text-[color:var(--muted-foreground)]"
                    aria-hidden="true"
                  >
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[color:var(--foreground)]">{p.name}</span>
                  <span className="block text-xs text-[color:var(--muted-foreground)]">{formatPrice(p.priceCents)}</span>
                </span>
              </li>
            ))}
            {openProducts.length > sample.length && (
              <li className="pt-2 text-xs text-[color:var(--muted-foreground)]">
                e mais {plural(openProducts.length - sample.length, "produto", "produtos")} para pedir
              </li>
            )}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[color:var(--muted-foreground)]">
            {preview.open ? "Nenhum produto liberado neste horário." : "Fora do horário, o cliente só vê o cardápio."}
          </p>
        )}
        {soldOutCount > 0 && (
          <p className="mt-3 text-sm font-medium" style={{ color: "var(--state-cobrar-fg)" }}>
            {plural(soldOutCount, "produto esgotado", "produtos esgotados")} hoje
          </p>
        )}
      </aside>
    </div>
  );
}
