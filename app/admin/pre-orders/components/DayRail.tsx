"use client";

import { cn } from "@/lib/utils";
import { Layers, Package, Scale } from "lucide-react";
import * as React from "react";
import {
  RAIL_ORDER,
  STAGE_META,
  formatCurrency,
  formatTallyAmount,
  type ItemTally,
  type PreOrderStage,
} from "../lib/preOrderView";

export type StageTally = Record<PreOrderStage, { count: number; totalCents: number }>;

type RailView = "stages" | "items";

const VIEW_STORAGE_KEY = "admin-pre-orders-rail-view-v2";
/** Acima disso os produtos viram fatias ilegíveis; o resto vira um único bloco. */
const MAX_ITEM_BARS = 9;

interface DayRailProps {
  tally: StageTally;
  activeStage: PreOrderStage | null;
  onStageChange: (stage: PreOrderStage | null) => void;
  openCents: number;
  dueCents: number;
  billedCents: number;
  items: ItemTally[];
  itemsOrderCount: number;
}

/**
 * A trilha do dia, em duas leituras do mesmo recorte:
 *
 * - **Etapas**: onde o dia está entalado. Segmento proporcional à quantidade de
 *   pedidos; clicar filtra a lista.
 * - **Itens**: o que precisa ser produzido. Segmento proporcional à quantidade
 *   do produto, com quilos e unidades contados separadamente.
 *
 * Etapa vazia não vira segmento — contagem sobre nada é ruído.
 */
export function DayRail({
  tally,
  activeStage,
  onStageChange,
  openCents,
  dueCents,
  billedCents,
  items,
  itemsOrderCount,
}: DayRailProps) {
  // A tela abre em "Itens": a primeira pergunta do dia é o que produzir.
  const [view, setView] = React.useState<RailView>("items");

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === "items" || saved === "stages") setView(saved);
    } catch {
      // storage indisponível: fica na visão padrão
    }
  }, []);

  const changeView = (next: RailView) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // preferência não persiste, mas a troca funciona
    }
  };

  const stages = RAIL_ORDER.filter((stage) => tally[stage].count > 0);
  const totalOrders = stages.reduce((sum, stage) => sum + tally[stage].count, 0);

  const shownItems = items.slice(0, MAX_ITEM_BARS);
  const restItems = items.slice(MAX_ITEM_BARS);
  // O medidor compara cada produto com o maior do recorte.
  const maxItemSize = shownItems.reduce(
    (max, item) => Math.max(max, item.byWeight ? item.kg : item.units),
    0,
  );

  return (
    <section
      aria-label="Resumo do dia"
      className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 shadow-card"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.11em] text-[color:var(--muted-foreground-strong)]">
          O dia
        </h2>

        <div
          role="group"
          aria-label="Exibição da trilha"
          className="flex rounded-lg border border-[color:var(--border)] p-0.5"
        >
          <ViewTab active={view === "items"} onClick={() => changeView("items")} icon={Package}>
            Itens
          </ViewTab>
          <ViewTab active={view === "stages"} onClick={() => changeView("stages")} icon={Layers}>
            Etapas
          </ViewTab>
        </div>

        <p className="text-xs text-[color:var(--muted-foreground-strong)]">
          {view === "stages"
            ? `${totalOrders} pedido${totalOrders !== 1 ? "s" : ""}`
            : `${items.length} produto${items.length !== 1 ? "s" : ""} em ${itemsOrderCount} pedido${itemsOrderCount !== 1 ? "s" : ""}`}
        </p>

        <dl className="ml-auto flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <Figure label="em aberto" value={formatCurrency(openCents)} />
          {dueCents > 0 && (
            <Figure label="na rua" value={formatCurrency(dueCents)} tone="var(--state-cobrar)" />
          )}
          {billedCents > 0 && (
            <Figure label="faturado" value={formatCurrency(billedCents)} tone="var(--state-faturado)" />
          )}
        </dl>
      </div>

      {view === "stages" && stages.length > 0 && (
        <div className="mt-2.5 flex gap-[3px]">
          {stages.map((stage) => {
            const { count, totalCents } = tally[stage];
            const meta = STAGE_META[stage];
            const active = activeStage === stage;

            return (
              <button
                key={stage}
                type="button"
                onClick={() => onStageChange(active ? null : stage)}
                aria-pressed={active}
                title={`${count} ${meta.label} · ${formatCurrency(totalCents)}`}
                style={{
                  flexGrow: count,
                  flexBasis: 0,
                  backgroundColor: `var(--state-${meta.token}-solid)`,
                  color: `var(--state-${meta.token}-on)`,
                }}
                className={cn(
                  "flex h-9 min-w-0 items-center gap-2 overflow-hidden rounded-lg px-2.5 text-left",
                  "text-xs font-semibold transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2",
                  "hover:brightness-110",
                  active && "ring-2 ring-[color:var(--foreground)] ring-offset-2 ring-offset-[color:var(--card)]",
                )}
              >
                <span className="text-sm font-bold tabular-nums">{count}</span>
                <span className="truncate opacity-90">{meta.railLabel}</span>
              </button>
            );
          })}
        </div>
      )}

      {view === "items" && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {shownItems.length === 0 && (
            <p className="py-2 text-xs text-[color:var(--muted-foreground-strong)]">
              Nenhum item nos pedidos deste recorte.
            </p>
          )}
          {shownItems.map((item) => (
            <ItemTile key={item.productId} item={item} max={maxItemSize} />
          ))}
          {restItems.length > 0 && (
            <span
              title={restItems.map((item) => `${item.name}: ${formatTallyAmount(item)}`).join("\n")}
              className="flex min-w-[110px] flex-1 items-center justify-center rounded-lg border border-dashed border-[color:var(--border-dark)] px-2.5 py-2 text-xs font-semibold text-[color:var(--muted-foreground-strong)]"
            >
              +{restItems.length} produto{restItems.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Um lote por produto. Largura igual de propósito: a distribuição é de cauda
 * longa e, escalada por quantidade, o produto de uma unidade vira uma fatia
 * ilegível. Aqui o nome sempre cabe e a proporção vai para o medidor.
 */
function ItemTile({ item, max }: { item: ItemTally; max: number }) {
  const size = item.byWeight ? item.kg : item.units;
  const share = max > 0 ? Math.max(4, Math.round((size / max) * 100)) : 0;

  return (
    <span
      title={`${item.name}: ${formatTallyAmount(item)}`}
      className="flex min-w-[132px] max-w-[220px] flex-1 flex-col gap-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)] px-2.5 py-1.5"
    >
      <span className="flex items-baseline gap-1.5">
        {item.byWeight && (
          <Scale className="h-3 w-3 flex-none self-center text-[color:var(--muted-foreground-strong)]" aria-hidden="true" />
        )}
        <span className="text-[15px] font-bold tabular-nums leading-none tracking-tight text-[color:var(--foreground)]">
          {item.byWeight ? item.kg.toFixed(3).replace(".", ",") : item.units}
        </span>
        <span className="text-[10.5px] font-semibold text-[color:var(--muted-foreground-strong)]">
          {item.byWeight ? "kg" : "un"}
        </span>
      </span>

      <span className="truncate text-[11.5px] font-medium leading-tight text-[color:var(--foreground)]">
        {item.name}
      </span>

      <span aria-hidden="true" className="h-[3px] w-full overflow-hidden rounded-full bg-[color:var(--border)]">
        <span
          className="block h-full rounded-full"
          style={{ width: `${share}%`, background: "var(--primary)" }}
        />
      </span>
    </span>
  );
}

function ViewTab({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Layers;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]",
        active
          ? "bg-primary text-white"
          : "text-[color:var(--muted-foreground-strong)] hover:text-[color:var(--foreground)]",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </button>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dd
        className="text-[15px] font-bold tabular-nums tracking-tight"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </dd>
      <dt className="text-xs text-[color:var(--muted-foreground-strong)]">{label}</dt>
    </div>
  );
}
