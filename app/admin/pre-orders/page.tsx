"use client";

import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { DeleteConfirmDialog } from "@/app/components/DeleteConfirmDialog";
import { PreOrderFormDialog } from "@/app/components/PreOrderFormDialog";
import { useToast } from "@/app/components/Toast";
import { EmptyState } from "@/app/admin/components/data-display/EmptyState";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  getDesktopPrintPreferences,
  isDesktopRuntime,
  printBitmapToDesktopPrinter,
} from "@/lib/runtime/capabilities";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Maximize2,
  Minimize2,
  MousePointerClick,
  Plus,
  Search,
  ShoppingCart,
  WifiOff,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAdminChrome, useFullBleedLayout } from "@/app/admin/components/layout/AdminChromeProvider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DayRail, type StageTally } from "./components/DayRail";
import { PreOrderDossier, TicketColumn } from "./components/PreOrderDossier";
import { MoneyBoard } from "./components/MoneyBoard";
import { PreOrderRow } from "./components/PreOrderRow";
import { ViewSettings } from "./components/ViewSettings";
import type { PaymentMethod } from "./components/ReceivePanel";
import {
  RAIL_ORDER,
  STAGE_META,
  STAGE_ORDER,
  aggregateItems,
  formatCurrency,
  stageOf,
  type PreOrder,
  type PreOrderStage,
} from "./lib/preOrderView";

const DESKTOP_PRINT_FRAME_ID = "desktop-print-frame";
/** Teto de carregamento. A tela nunca afirma contagem além do que carregou. */
const PAGE_SIZE = 200;
const RAIL_PREF_KEY = "admin-pre-orders-show-rail";
const CANCELLED_PREF_KEY = "admin-pre-orders-show-cancelled";

type RangeKey = "today" | "week" | "all";

// "Tudo" primeiro por ser o recorte padrão: a tela abre mostrando tudo.
const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: "all", label: "Tudo" },
  { key: "today", label: "Hoje" },
  { key: "week", label: "7 dias" },
];

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function rangeParams(range: RangeKey): string {
  const params = new URLSearchParams({ size: String(PAGE_SIZE), page: "1" });
  const today = new Date();

  if (range === "today") {
    params.set("startDate", toISODate(today));
    params.set("endDate", toISODate(today));
  } else if (range === "week") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    params.set("startDate", toISODate(from));
    params.set("endDate", toISODate(today));
  }

  return params.toString();
}

/**
 * A mensagem do servidor é a única que sabe o motivo real — estoque
 * insuficiente, pedido já convertido, produto removido. Engolir isso e mostrar
 * um genérico deixa o operador sem saída.
 */
async function errorMessageOf(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.error === "string" && body.error.trim()) return body.error;
  } catch {
    // resposta sem corpo JSON: fica o texto padrão
  }
  return fallback;
}

function emptyTally(): StageTally {
  return RAIL_ORDER.reduce((acc, stage) => {
    acc[stage] = { count: 0, totalCents: 0 };
    return acc;
  }, {} as StageTally);
}

export default function AdminPreOrdersPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const { immersive, toggleImmersive, exitImmersive } = useAdminChrome();

  // A Mesa de Trabalho ocupa toda a área: quem cuida do espaçamento é ela.
  useFullBleedLayout();

  const [preOrders, setPreOrders] = useState<PreOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [staleError, setStaleError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  const [range, setRange] = useState<RangeKey>("all");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<PreOrderStage | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRail, setShowRail] = useState(true);
  const [showCancelled, setShowCancelled] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<PreOrder | null>(null);

  const [receiving, setReceiving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [printWaiting, setPrintWaiting] = useState(false);
  const [bitmapPrinting, setBitmapPrinting] = useState(false);

  // Relógio de um minuto: alimenta os "há 1h19" sem re-render por segundo.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const rail = window.localStorage.getItem(RAIL_PREF_KEY);
      const cancelled = window.localStorage.getItem(CANCELLED_PREF_KEY);
      if (rail !== null) setShowRail(rail === "true");
      if (cancelled !== null) setShowCancelled(cancelled === "true");
    } catch {
      // storage indisponível: seguem os padrões
    }
  }, []);

  const persist = useCallback((key: string, value: boolean) => {
    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      // a preferência não persiste, mas a troca funciona
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Carregamento
  // ---------------------------------------------------------------------------

  const loadPreOrders = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!options.silent) setLoading(true);

      try {
        const response = await fetch(`/api/pre-orders?${rangeParams(range)}`);
        if (!response.ok) throw new Error("Não foi possível carregar os pré-pedidos.");

        const result = await response.json();
        setPreOrders(result.data ?? []);
        setTotal(result.pagination?.total ?? (result.data ?? []).length);
        setLastLoadedAt(new Date());
        setStaleError(null);
        return result.data as PreOrder[];
      } catch (error) {
        // A lista não some: numa cozinha, dado velho é melhor que tela vazia.
        setStaleError(error instanceof Error ? error.message : "Falha ao carregar.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [range],
  );

  useEffect(() => {
    loadPreOrders();
  }, [loadPreOrders]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("openModal") === "true") {
      const url = new URL(window.location.href);
      url.searchParams.delete("openModal");
      window.history.replaceState({}, "", url.toString());
      setEditingId(null);
      setFormOpen(true);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Recortes
  // ---------------------------------------------------------------------------

  // Cancelado é ruído por padrão: sai da lista, da trilha e das contagens até
  // alguém pedir para ver.
  const scoped = useMemo(
    () => (showCancelled ? preOrders : preOrders.filter((preOrder) => stageOf(preOrder) !== "cancelado")),
    [preOrders, showCancelled],
  );

  const cancelledCount = useMemo(
    () => preOrders.filter((preOrder) => stageOf(preOrder) === "cancelado").length,
    [preOrders],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return scoped.filter((preOrder) => {
      if (stageFilter && stageOf(preOrder) !== stageFilter) return false;
      if (!term) return true;

      const haystack = [
        preOrder.customer?.name,
        preOrder.customer?.phone,
        preOrder.notes,
        ...preOrder.items.map((item) => item.product.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [scoped, search, stageFilter]);

  const tally = useMemo(() => {
    const result = emptyTally();
    for (const preOrder of scoped) {
      const stage = stageOf(preOrder);
      result[stage].count += 1;
      result[stage].totalCents += preOrder.totalCents;
    }
    return result;
  }, [scoped]);

  const money = useMemo(() => {
    let open = 0;
    let due = 0;
    let billed = 0;

    for (const preOrder of scoped) {
      const stage = stageOf(preOrder);
      if (STAGE_META[stage].open) open += preOrder.totalCents;
      if (stage === "cobrar") due += preOrder.totalCents;
      if (stage === "faturado") billed += preOrder.totalCents;
    }

    return { open, due, billed };
  }, [scoped]);

  const grouped = useMemo(() => {
    return STAGE_ORDER.map((stage) => ({
      stage,
      items: visible.filter((preOrder) => stageOf(preOrder) === stage),
    })).filter((group) => group.items.length > 0);
  }, [visible]);

  const ordered = useMemo(() => grouped.flatMap((group) => group.items), [grouped]);

  // A visão de itens da trilha acompanha o que está na lista: filtrar por etapa
  // passa a responder "o que a cozinha tem em mãos".
  const itemTally = useMemo(() => aggregateItems(visible), [visible]);

  const selected = useMemo(
    () => preOrders.find((preOrder) => preOrder.id === selectedId) ?? null,
    [preOrders, selectedId],
  );

  // Mantém sempre um pedido em foco, sem escolher um que o filtro escondeu.
  useEffect(() => {
    if (ordered.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!selectedId || !ordered.some((preOrder) => preOrder.id === selectedId)) {
      setSelectedId(ordered[0].id);
      setReceiving(false);
    }
  }, [ordered, selectedId]);

  // ---------------------------------------------------------------------------
  // Teclado
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (typing || receiving) return;

      // Rede de segurança: se o navegador recusar a tela cheia, o Esc do
      // próprio navegador não dispara e o Esc daqui é a única saída.
      if (event.key === "Escape" && immersive) {
        event.preventDefault();
        exitImmersive();
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (ordered.length === 0) return;
        event.preventDefault();
        const index = ordered.findIndex((preOrder) => preOrder.id === selectedId);
        const next = event.key === "ArrowDown" ? index + 1 : index - 1;
        const clamped = Math.max(0, Math.min(ordered.length - 1, next));
        setSelectedId(ordered[clamped].id);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ordered, selectedId, receiving, immersive, exitImmersive]);

  // ---------------------------------------------------------------------------
  // Impressão térmica (mantida da tela anterior)
  // ---------------------------------------------------------------------------

  const tryDirectThermalPrint = useCallback(async (preOrderId: string) => {
    const preferences = await getDesktopPrintPreferences();
    const target =
      preferences.defaultThermalPrinterName?.trim() || preferences.defaultThermalPrinterId?.trim() || null;

    if (!target || !preferences.thermalAutoPrintModules.preOrders) return false;

    const printSessionId = crypto.randomUUID();
    setBitmapPrinting(true);

    try {
      const bitmap = await new Promise<{ imageData: number[]; width: number; height: number }>((resolve, reject) => {
        const iframe = document.createElement("iframe");
        iframe.style.cssText =
          "position:absolute;left:-9999px;top:-9999px;width:320px;height:1px;opacity:0;pointer-events:none;border:none;";
        iframe.src = `/print/pre-order-thermal?preOrderId=${preOrderId}&printSessionId=${printSessionId}&captureMode=true`;
        document.body.appendChild(iframe);

        const timeout = window.setTimeout(() => {
          iframe.remove();
          reject(new Error("Tempo esgotado aguardando a comanda."));
        }, 30_000);

        const handler = (event: MessageEvent) => {
          if (event.data?.type === "thermal-bitmap-capture" && event.data.printSessionId === printSessionId) {
            window.clearTimeout(timeout);
            window.removeEventListener("message", handler);
            iframe.remove();
            resolve({ imageData: event.data.imageData, width: event.data.width, height: event.data.height });
          }
        };

        window.addEventListener("message", handler);
      });

      await printBitmapToDesktopPrinter(
        target,
        bitmap.imageData,
        bitmap.width,
        bitmap.height,
        `Pre-pedido ${preOrderId.slice(-8).toUpperCase()}`,
      );
    } finally {
      setBitmapPrinting(false);
    }

    return true;
  }, []);

  const printTicket = useCallback(
    async (preOrderId: string) => {
      const printSessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      if (!isDesktopRuntime()) {
        window.open(`/print/pre-order-thermal?preOrderId=${preOrderId}&printSessionId=${printSessionId}`, "_blank");
        return;
      }

      try {
        if (await tryDirectThermalPrint(preOrderId)) {
          showToast("Comanda enviada para a impressora térmica.", "success");
          return;
        }
      } catch (error) {
        console.warn("Impressão direta indisponível:", error);
        showToast("Impressora térmica indisponível. Abrindo a janela de impressão.", "warning");
      }

      setPrintWaiting(true);
      document.getElementById(DESKTOP_PRINT_FRAME_ID)?.remove();

      const iframe = document.createElement("iframe");
      iframe.id = DESKTOP_PRINT_FRAME_ID;
      iframe.src = `/print/pre-order-thermal?preOrderId=${preOrderId}&printSessionId=${printSessionId}&autoPrint=0`;
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.cssText =
        "position:fixed;width:1px;height:1px;right:-9999px;bottom:-9999px;opacity:0;pointer-events:none;border:0;";
      document.body.appendChild(iframe);

      window.setTimeout(() => {
        setPrintWaiting(false);
        iframe.remove();
      }, 30_000);
    },
    [showToast, tryDirectThermalPrint],
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const type = (event.data as { type?: string } | null)?.type;
      if (type === "desktop-print-dialog-opening" || type === "desktop-print-finished") {
        setPrintWaiting(false);
        if (type === "desktop-print-finished") document.getElementById(DESKTOP_PRINT_FRAME_ID)?.remove();
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // ---------------------------------------------------------------------------
  // Ações
  // ---------------------------------------------------------------------------

  const advanceStatus = useCallback(
    async (nextStatus: string) => {
      if (!selected) return;
      setAdvancing(true);

      try {
        const response = await fetch(`/api/pre-orders/${selected.id}/delivery`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        });

        if (!response.ok) {
          throw new Error(
            await errorMessageOf(response, "Não foi possível mudar a etapa. Verifique a conexão e tente de novo."),
          );
        }

        await loadPreOrders({ silent: true });
        showToast(`Pedido movido para "${STAGE_META[stageOf({ deliveryStatus: nextStatus })].label}".`, "success");
      } catch (error) {
        console.error(error);
        showToast(error instanceof Error ? error.message : "Não foi possível mudar a etapa.", "error");
      } finally {
        setAdvancing(false);
      }
    },
    [loadPreOrders, selected, showToast],
  );

  const confirmReceive = useCallback(
    async (input: { paymentMethod: PaymentMethod; cashReceived?: number; change?: number }) => {
      if (!selected) return;
      setConverting(true);

      const apiMethod = input.paymentMethod === "ficha_payment" ? "invoice" : input.paymentMethod;

      try {
        const response = await fetch("/api/pre-orders?convert=true", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            preOrderId: selected.id,
            paymentMethod: apiMethod,
            ...(input.paymentMethod === "cash" && input.cashReceived !== undefined
              ? { cashReceived: input.cashReceived, change: input.change ?? 0 }
              : {}),
          }),
        });

        if (!response.ok) {
          // Pode ser corrida: outra pessoa já converteu e o registro sumiu.
          const fresh = await loadPreOrders({ silent: true });
          if (fresh && !fresh.some((preOrder) => preOrder.id === selected.id)) {
            setReceiving(false);
            showToast("Este pedido já foi convertido por outra pessoa.", "warning");
            return;
          }
          throw new Error(
            await errorMessageOf(response, "Não foi possível concluir o recebimento. Nada foi alterado."),
          );
        }

        setReceiving(false);
        setSelectedId(null);
        await loadPreOrders({ silent: true });
        showToast(`Recebido ${formatCurrency(selected.totalCents)}. Venda criada e estoque baixado.`, "success");
      } catch (error) {
        console.error(error);
        // O painel continua aberto: o operador corrige e tenta de novo sem refazer o caminho.
        showToast(
          error instanceof Error ? error.message : "Não foi possível concluir o recebimento. Nada foi alterado.",
          "error",
        );
      } finally {
        setConverting(false);
      }
    },
    [loadPreOrders, selected, showToast],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteId) return;
    setDeleting(true);

    try {
      const response = await fetch(`/api/pre-orders?id=${deleteId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Falha ao excluir.");

      setPreOrders((current) => current.filter((preOrder) => preOrder.id !== deleteId));
      setDeleteId(null);
      showToast("Pré-pedido excluído.", "success");
    } catch (error) {
      console.error(error);
      showToast("Não foi possível excluir o pré-pedido.", "error");
    } finally {
      setDeleting(false);
    }
  }, [deleteId, showToast]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const truncated = total > preOrders.length;
  const filtering = Boolean(search.trim() || stageFilter);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <header className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShoppingCart className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold text-[color:var(--foreground)]">Pré-Pedidos</h1>
          <p className="text-xs text-[color:var(--muted-foreground)]">
            {loading
              ? "Carregando…"
              : filtering
                ? `${visible.length} de ${scoped.length} pedido${scoped.length !== 1 ? "s" : ""}`
                : `${scoped.length} pedido${scoped.length !== 1 ? "s" : ""}${truncated ? ` de ${total}` : ""}`}
            {lastLoadedAt && ` · atualizado ${lastLoadedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
          </p>
        </div>

        <MoneyBoard openCents={money.open} dueCents={money.due} />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div
            role="group"
            aria-label="Período"
            className="flex shrink-0 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-0.5"
          >
            {RANGES.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setRange(item.key)}
                aria-pressed={range === item.key}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]",
                  range === item.key
                    ? "bg-primary text-white"
                    : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Input
            ref={searchRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cliente, telefone, produto"
            aria-label="Buscar pré-pedido"
            className="w-56 min-w-[160px] shrink"
            leftIcon={<Search className="h-4 w-4" />}
            rightIcon={
              search ? (
                <button type="button" onClick={() => setSearch("")} aria-label="Limpar busca">
                  <X className="h-4 w-4" />
                </button>
              ) : undefined
            }
          />

          <Button
            onClick={() => {
              setEditingId(null);
              setFormOpen(true);
            }}
            leftIcon={<Plus className="h-4 w-4" />}
            className="shrink-0"
          >
            Novo pré-pedido
          </Button>

          <ViewSettings
            showRail={showRail}
            onShowRailChange={(value) => {
              setShowRail(value);
              persist(RAIL_PREF_KEY, value);
            }}
            showCancelled={showCancelled}
            onShowCancelledChange={(value) => {
              setShowCancelled(value);
              persist(CANCELLED_PREF_KEY, value);
            }}
            cancelledCount={cancelledCount}
          />

          <Button
            variant="outline"
            size="icon"
            onClick={toggleImmersive}
            aria-pressed={immersive}
            title={immersive ? "Sair da tela cheia (Esc)" : "Tela cheia"}
            aria-label={immersive ? "Sair da tela cheia" : "Tela cheia"}
            className="h-10 w-10 shrink-0"
          >
            {immersive ? <Minimize2 className="h-[18px] w-[18px]" /> : <Maximize2 className="h-[18px] w-[18px]" />}
          </Button>
        </div>
      </header>

      {staleError && (
        <p
          role="status"
          className="flex items-center gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-[13px] text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <WifiOff className="h-4 w-4 flex-none" />
          Sem conexão com o servidor. Mostrando os dados de{" "}
          {lastLoadedAt?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) ?? "antes"}.
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => loadPreOrders()}>
            Tentar de novo
          </Button>
        </p>
      )}

      {showRail && (
        <DayRail
          tally={tally}
          activeStage={stageFilter}
          onStageChange={setStageFilter}
          billedCents={money.billed}
          items={itemTally}
          itemsOrderCount={visible.length}
        />
      )}

      {/* Altura travada: cada coluna rola por dentro, como no PDV. A terceira
          coluna, o cupom, só entra quando há largura para ela. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-card lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_368px]">
        <div className="scroll-slim flex min-h-0 flex-col overflow-y-auto border-[color:var(--border)] lg:border-r">
          {loading && preOrders.length === 0 ? (
            <ListSkeleton />
          ) : ordered.length === 0 ? (
            <div className="flex flex-1 items-start justify-center pt-16">
              {search || stageFilter ? (
                <EmptyState
                  size="sm"
                  variant="search"
                  title="Nenhum pedido corresponde"
                  description={
                    stageFilter && search
                      ? `Nada em "${STAGE_META[stageFilter].label}" com "${search}".`
                      : stageFilter
                        ? `Nenhum pedido em "${STAGE_META[stageFilter].label}" neste período.`
                        : `Nenhum pedido para "${search}" neste período.`
                  }
                  action={{
                    label: "Limpar filtros",
                    onClick: () => {
                      setSearch("");
                      setStageFilter(null);
                    },
                  }}
                />
              ) : (
                <EmptyState
                  size="sm"
                  variant="orders"
                  title="Nenhum pré-pedido no período"
                  description="Os pedidos anotados aparecem aqui, agrupados por etapa."
                  action={{
                    label: "Novo pré-pedido",
                    onClick: () => {
                      setEditingId(null);
                      setFormOpen(true);
                    },
                  }}
                />
              )}
            </div>
          ) : (
            grouped.map((group) => {
              const meta = STAGE_META[group.stage];
              const sum = group.items.reduce((acc, preOrder) => acc + preOrder.totalCents, 0);

              return (
                <section key={group.stage}>
                  <h2 className="flex items-center justify-between gap-2 border-b border-[color:var(--border)] bg-[color:var(--muted)] px-3.5 py-2 text-[10.5px] font-bold uppercase tracking-[0.09em] text-[color:var(--muted-foreground-strong)]">
                    <span className="flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: `var(--state-${meta.token})` }}
                      />
                      {meta.label} · {group.items.length}
                    </span>
                    <span className="tabular-nums">{formatCurrency(sum)}</span>
                  </h2>
                  {group.items.map((preOrder) => (
                    <PreOrderRow
                      key={preOrder.id}
                      preOrder={preOrder}
                      selected={preOrder.id === selectedId}
                      now={now}
                      onSelect={(next) => {
                        setSelectedId(next.id);
                        setReceiving(false);
                      }}
                    />
                  ))}
                </section>
              );
            })
          )}

          {truncated && (
            <p className="border-t border-[color:var(--border)] px-3.5 py-3 text-[11.5px] text-[color:var(--muted-foreground)]">
              Mostrando {preOrders.length} de {total}. Restrinja o período para ver o resto.
            </p>
          )}
        </div>

        {selected ? (
          <PreOrderDossier
            key={selected.id}
            preOrder={selected}
            now={now}
            receiving={receiving}
            converting={converting}
            advancing={advancing}
            onStartReceive={() => setReceiving(true)}
            onCancelReceive={() => setReceiving(false)}
            onConfirmReceive={confirmReceive}
            onAdvance={advanceStatus}
            onPrint={() => printTicket(selected.id)}
            onEdit={() => {
              setEditingId(selected.id);
              setFormOpen(true);
            }}
            onTrack={() => router.push(`/admin/pre-orders/${selected.id}/tracking`)}
            onCancel={() => setCancelTarget(selected)}
            onDelete={() => setDeleteId(selected.id)}
          />
        ) : (
          <div className="hidden items-start justify-center bg-[color:var(--background)] pt-16 lg:flex">
            <EmptyState
              size="sm"
              variant="default"
              icon={MousePointerClick}
              title="Escolha um pedido na lista"
              description="Aqui aparecem os dados do cliente, o histórico e as ações do pedido."
            />
          </div>
        )}

        <TicketColumn preOrder={selected} onPrint={() => selected && printTicket(selected.id)} />
      </div>

      <PreOrderFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        preOrderId={editingId || undefined}
        onPreOrderSaved={() => loadPreOrders({ silent: true })}
      />

      <ConfirmDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title={stageOf(cancelTarget ?? {}) === "cancelado" ? "Reabrir pedido" : "Cancelar pedido"}
        description={
          stageOf(cancelTarget ?? {}) === "cancelado"
            ? "O pedido volta para a fila e entra de novo nas contagens do dia."
            : "O pedido sai das contagens e some da lista, mas continua no banco e pode ser reaberto. Nada é lançado no caixa."
        }
        confirmText={stageOf(cancelTarget ?? {}) === "cancelado" ? "Reabrir" : "Cancelar pedido"}
        cancelText="Voltar"
        isLoading={advancing}
        onConfirm={async () => {
          const target = cancelTarget;
          if (!target) return;
          setCancelTarget(null);
          await advanceStatus(stageOf(target) === "cancelado" ? "pending" : "cancelled");
        }}
      />

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir pré-pedido"
        description="O pedido some da lista e não pode ser recuperado. Nada é lançado no caixa."
        onConfirm={confirmDelete}
        confirmText="Excluir"
        cancelText="Cancelar"
        isLoading={deleting}
      />

      {(printWaiting || bitmapPrinting) && (
        <div
          role="status"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-[1px]"
        >
          <div className="w-full max-w-sm rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 shadow-lg">
            <div className="flex items-start gap-3">
              <Loader2 className="mt-0.5 h-6 w-6 flex-none animate-spin text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-[color:var(--foreground)]">
                  {bitmapPrinting ? "Enviando para a impressora" : "Preparando a impressão"}
                </h3>
                <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                  {bitmapPrinting
                    ? "A comanda está sendo enviada para a impressora térmica."
                    : "A janela de escolha da impressora aparece em seguida."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex gap-3 border-b border-[color:var(--border)] py-3 pl-[18px] pr-3.5">
          <div className="h-9 w-9 flex-none animate-pulse rounded-[11px] bg-[color:var(--muted)]" />
          <div className="flex-1 space-y-2 py-0.5">
            <div className="h-3 w-2/3 animate-pulse rounded bg-[color:var(--muted)]" />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-[color:var(--muted)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
