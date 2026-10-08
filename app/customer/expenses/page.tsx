"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { MovementRow } from "../components/ficha/MovementRow";
import { buildMovements, type Movement } from "../components/ficha/movements";
import { EmptyState, ErrorState, LoadingRows, Money, PixIcon, Sheet, SheetHeader } from "../components/kit";
import { PixPaymentSheet } from "../components/PixPaymentSheet";
import { endOfDayISO, formatBRL, formatDayMonth, formatMonthLabel, monthKey, startOfDayISO } from "../lib/format";
import type { ExpensesResponse } from "../lib/types";
import { useRealtimeEvent } from "../lib/realtime";
import { useCustomerData } from "../lib/useCustomerData";
import "./expenses.css";
import { Receipt } from "./Receipt";

/* ------------------------------------------------------------------ filtro */

type FilterKind = "all" | "month" | "week" | "custom";

/**
 * O filtro é estado da tela, e a URL da busca sai dele a cada render. Assim
 * "Limpar" não tem como buscar com o período antigo guardado num closure.
 */
interface Filter {
  kind: FilterKind;
  startISO?: string;
  endISO?: string;
  /** Valores dos campos de data ("AAAA-MM-DD"), para reabrir o período escolhido. */
  startInput?: string;
  endInput?: string;
}

const ALL: Filter = { kind: "all" };

function monthFilter(now = new Date()): Filter {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { kind: "month", startISO: startOfDayISO(start), endISO: endOfDayISO(now) };
}

function weekFilter(now = new Date()): Filter {
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  return { kind: "week", startISO: startOfDayISO(start), endISO: endOfDayISO(now) };
}

/** "2026-09-15" no fuso do aparelho (new Date("2026-09-15") seria meia-noite UTC). */
function parseInputDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function customFilter(startInput: string, endInput: string): Filter {
  const start = parseInputDate(startInput);
  const end = parseInputDate(endInput);
  if (!start && !end) return ALL;
  return {
    kind: "custom",
    startISO: start ? startOfDayISO(start) : undefined,
    endISO: end ? endOfDayISO(end) : undefined,
    startInput: start ? startInput : undefined,
    endInput: end ? endInput : undefined,
  };
}

function expensesUrl(filter: Filter): string {
  const params = new URLSearchParams();
  if (filter.startISO) params.set("startDate", filter.startISO);
  if (filter.endISO) params.set("endDate", filter.endISO);
  const qs = params.toString();
  return qs ? `/api/customer/expenses?${qs}` : "/api/customer/expenses";
}

function customLabel(filter: Filter): string {
  const start = filter.startInput ? parseInputDate(filter.startInput) : null;
  const end = filter.endInput ? parseInputDate(filter.endInput) : null;
  if (start && end) return `${formatDayMonth(start)} a ${formatDayMonth(end)}`;
  if (start) return `Desde ${formatDayMonth(start)}`;
  if (end) return `Até ${formatDayMonth(end)}`;
  return "Período…";
}

/* ----------------------------------------------------------------- layout */

const DESKTOP = "(min-width: 860px)";

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useIsDesktop(): boolean {
  return React.useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP).matches,
    () => false
  );
}

/* ------------------------------------------------------------------- tela */

export default function CustomerExpensesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="c-page">
          <LoadingRows rows={6} />
        </div>
      }
    >
      <FichaScreen />
    </React.Suspense>
  );
}

function FichaScreen() {
  const router = useRouter();
  const pathname = usePathname() ?? "/customer/expenses";
  const searchParams = useSearchParams();
  const itemId = searchParams.get("item");
  const isDesktop = useIsDesktop();

  const [filter, setFilter] = React.useState<Filter>(ALL);
  const [periodOpen, setPeriodOpen] = React.useState(false);
  const [pixOpen, setPixOpen] = React.useState(false);
  const closePeriod = React.useCallback(() => setPeriodOpen(false), []);
  const closePix = React.useCallback(() => setPixOpen(false), []);

  const { data, error, loading, reload } = useCustomerData<ExpensesResponse>(expensesUrl(filter));
  useRealtimeEvent("ficha.updated", reload);
  const movements = React.useMemo(() => (data ? buildMovements(data) : []), [data]);
  const listReady = Boolean(data) && !loading && !error;

  // seleção na URL: empurrada aqui, o voltar do aparelho volta para a lista
  const pushed = React.useRef(false);
  const listPane = React.useRef<HTMLDivElement>(null);
  const savedScroll = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!itemId) pushed.current = false;
  }, [itemId]);

  // no celular a lista some enquanto o detalhe aparece; ao voltar, ela
  // reabre onde o cliente estava
  React.useLayoutEffect(() => {
    if (itemId || isDesktop || savedScroll.current === null) return;
    if (listPane.current) listPane.current.scrollTop = savedScroll.current;
    savedScroll.current = null;
  }, [itemId, isDesktop]);

  const select = (id: string) => {
    if (id === itemId) return;
    savedScroll.current = listPane.current?.scrollTop ?? null;
    pushed.current = true;
    router.push(`${pathname}?item=${encodeURIComponent(id)}`, { scroll: false });
  };

  const backToList = () => {
    if (pushed.current) {
      pushed.current = false;
      router.back();
    } else {
      router.replace(pathname, { scroll: false });
    }
  };

  const changeFilter = (next: Filter) => {
    setFilter(next);
    if (itemId) router.replace(pathname, { scroll: false });
  };

  const selected = itemId ? movements.find((m) => m.id === itemId) ?? null : null;
  const shown: Movement | null = itemId ? selected : isDesktop ? movements[0] ?? null : null;

  const balance = data?.balanceCents ?? 0;

  return (
    <div className="c-split c-ficha" data-has-selection={itemId ? "true" : undefined}>
      {/* ------------------------------------------------------- lista */}
      <div ref={listPane} className="c-pane c-list">
        <div className="c-list-head">
          <h1 className="c-page-title c-rise">Minha ficha</h1>

          {data ? (
            <section className="c-balline c-rise" style={{ ["--c-i" as string]: 1 }} aria-label="Saldo da ficha">
              <p className="c-eyebrow">{balance < 0 ? "Você tem crédito" : "Saldo atual"}</p>
              <Money cents={balance} />
              {loading ? (
                <span className="c-skel c-ficha-skel" style={{ height: 12, width: "65%", marginTop: 12 }} />
              ) : (
                <p className="c-balline-per c-num">
                  {data.period
                    ? `No período: compras ${formatBRL(data.period.pendingCents)} · pago ${formatBRL(data.period.paymentsCents)}`
                    : `Compras ${formatBRL(data.totalPending)} · pago ${formatBRL(data.totalPayments)}`}
                </p>
              )}
              {balance > 0 && (
                <button type="button" className="c-btn is-primary" onClick={() => setPixOpen(true)}>
                  <PixIcon size={18} />
                  Pagar com PIX
                </button>
              )}
            </section>
          ) : (
            !error && (
              <div className="c-balline" aria-busy="true" aria-label="Carregando o saldo">
                <span className="c-skel c-ficha-skel" style={{ height: 12, width: 90 }} />
                <span className="c-skel c-ficha-skel" style={{ height: 32, width: 160, marginTop: 10 }} />
                <span className="c-skel c-ficha-skel" style={{ height: 12, width: "65%", marginTop: 12 }} />
              </div>
            )
          )}

          <div className="c-chips c-rise" style={{ ["--c-i" as string]: 2 }} role="group" aria-label="Período">
            <button type="button" className="c-chip" aria-pressed={filter.kind === "all"} onClick={() => changeFilter(ALL)}>
              Tudo
            </button>
            <button
              type="button"
              className="c-chip"
              aria-pressed={filter.kind === "month"}
              onClick={() => changeFilter(monthFilter())}
            >
              Este mês
            </button>
            <button
              type="button"
              className="c-chip"
              aria-pressed={filter.kind === "week"}
              onClick={() => changeFilter(weekFilter())}
            >
              Últimos 7 dias
            </button>
            <button
              type="button"
              className="c-chip"
              aria-pressed={filter.kind === "custom"}
              aria-haspopup="dialog"
              onClick={() => setPeriodOpen(true)}
            >
              {filter.kind === "custom" ? customLabel(filter) : "Período…"}
            </button>
          </div>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !listReady ? (
          <LoadingRows rows={6} />
        ) : movements.length === 0 ? (
          filter.kind === "all" ? (
            <EmptyState title="Sua ficha está vazia" text="Quando você comprar na ficha, as compras aparecem aqui." />
          ) : (
            <EmptyState title="Nenhum lançamento neste período" text="Escolha outro período ou veja a ficha inteira.">
              <button type="button" className="c-btn is-ghost" onClick={() => changeFilter(ALL)}>
                Ver tudo
              </button>
            </EmptyState>
          )
        ) : (
          <MovementList movements={movements} currentId={shown?.id ?? null} onSelect={select} />
        )}
      </div>

      {/* ----------------------------------------------------- detalhe */}
      <div className="c-pane c-detail">
        <button type="button" className="c-back" onClick={backToList}>
          <ChevronLeft size={20} aria-hidden="true" />
          Ficha
        </button>
        <div className="c-dpad">
          {error ? (
            itemId ? <ErrorState message={error} onRetry={reload} /> : null
          ) : !listReady ? (
            <ReceiptSkeleton />
          ) : shown ? (
            <Receipt key={shown.id} movement={shown} />
          ) : itemId ? (
            <EmptyState title="Lançamento não encontrado" text="Ele pode ter saído do período escolhido.">
              <button type="button" className="c-btn is-ghost" onClick={backToList}>
                Ver a ficha
              </button>
            </EmptyState>
          ) : null}
        </div>
      </div>

      {balance > 0 && <PixPaymentSheet open={pixOpen} onClose={closePix} balanceCents={balance} />}

      <PeriodSheet
        open={periodOpen}
        onClose={closePeriod}
        filter={filter}
        onApply={(start, end) => {
          changeFilter(customFilter(start, end));
          setPeriodOpen(false);
        }}
        onClear={() => {
          changeFilter(ALL);
          setPeriodOpen(false);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------- lista por mês */

function MovementList({
  movements,
  currentId,
  onSelect,
}: {
  movements: Movement[];
  currentId: string | null;
  onSelect: (id: string) => void;
}) {
  const out: React.ReactNode[] = [];
  let lastMonth = "";
  for (const m of movements) {
    const key = monthKey(m.createdAt);
    if (key !== lastMonth) {
      lastMonth = key;
      out.push(
        <h2 key={`g-${key}`} className="c-group">
          {formatMonthLabel(m.createdAt)}
        </h2>
      );
    }
    out.push(<MovementRow key={m.id} movement={m} onSelect={onSelect} current={m.id === currentId} />);
  }
  return <div className="c-rows">{out}</div>;
}

function ReceiptSkeleton() {
  return (
    <div className="c-ficha-receipt-skel" aria-busy="true" aria-label="Carregando">
      <span className="c-skel c-ficha-skel" style={{ height: 12, width: 120 }} />
      <span className="c-skel c-ficha-skel" style={{ height: 24, width: "70%" }} />
      <span className="c-skel c-ficha-skel" style={{ height: 14, width: "45%" }} />
      <span className="c-skel c-ficha-skel" style={{ height: 14, width: "55%" }} />
      <span className="c-skel c-ficha-skel" style={{ height: 22, width: "100%", marginTop: 8 }} />
    </div>
  );
}

/* ------------------------------------------------------ período escolhido */

function PeriodSheet({
  open,
  onClose,
  filter,
  onApply,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  filter: Filter;
  onApply: (start: string, end: string) => void;
  onClear: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} label="Escolher período">
      {/* montado só com a folha aberta: os campos partem do período atual */}
      <PeriodForm
        initialStart={filter.kind === "custom" ? filter.startInput ?? "" : ""}
        initialEnd={filter.kind === "custom" ? filter.endInput ?? "" : ""}
        onClose={onClose}
        onApply={onApply}
        onClear={onClear}
      />
    </Sheet>
  );
}

function PeriodForm({
  initialStart,
  initialEnd,
  onClose,
  onApply,
  onClear,
}: {
  initialStart: string;
  initialEnd: string;
  onClose: () => void;
  onApply: (start: string, end: string) => void;
  onClear: () => void;
}) {
  const [start, setStart] = React.useState(initialStart);
  const [end, setEnd] = React.useState(initialEnd);
  const [problem, setProblem] = React.useState<string | null>(null);
  const startId = React.useId();
  const endId = React.useId();
  const errId = React.useId();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = parseInputDate(start);
    const t = parseInputDate(end);
    if (!s && !t) {
      setProblem("Escolha pelo menos uma das datas.");
      return;
    }
    if (s && t && s.getTime() > t.getTime()) {
      setProblem("A data de início vem depois da data de fim.");
      return;
    }
    onApply(s ? start : "", t ? end : "");
  };

  return (
    <form className="c-ficha-period" onSubmit={submit} noValidate>
      <SheetHeader title="Escolher período" subtitle="Mostre só os lançamentos entre duas datas." onClose={onClose} />
      <div className="c-fields2">
        <div className="c-field" data-invalid={problem ? "true" : undefined}>
          <label htmlFor={startId}>Início</label>
          <input
            id={startId}
            type="date"
            value={start}
            max={end || undefined}
            onChange={(e) => {
              setStart(e.target.value);
              setProblem(null);
            }}
            aria-describedby={problem ? errId : undefined}
          />
        </div>
        <div className="c-field" data-invalid={problem ? "true" : undefined}>
          <label htmlFor={endId}>Fim</label>
          <input
            id={endId}
            type="date"
            value={end}
            min={start || undefined}
            onChange={(e) => {
              setEnd(e.target.value);
              setProblem(null);
            }}
            aria-describedby={problem ? errId : undefined}
          />
        </div>
      </div>
      {problem && (
        <p id={errId} className="c-field-error" role="alert" style={{ margin: 0 }}>
          {problem}
        </p>
      )}
      <div className="c-ficha-period-actions">
        <button type="button" className="c-btn is-ghost" onClick={onClear}>
          Limpar
        </button>
        <button type="submit" className="c-btn is-primary">
          Aplicar
        </button>
      </div>
    </form>
  );
}
