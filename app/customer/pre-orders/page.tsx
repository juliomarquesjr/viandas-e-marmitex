"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
} from "react";
import { EmptyState, ErrorState, LoadingRows, Toast } from "../components/kit";
import { OrderDetail } from "../components/pedidos/OrderDetail";
import { OrderRow } from "../components/pedidos/OrderRow";
import { isFinished } from "../lib/order-status";
import type { PreOrder, PreOrdersResponse } from "../lib/types";
import { useCustomerData } from "../lib/useCustomerData";
import "./pre-orders.css";

type Filter = "all" | "open" | "done";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "open", label: "Em andamento" },
  { value: "done", label: "Concluídos" },
];

/** "Concluídos" reúne tudo o que já terminou: entregue, retirado ou cancelado. */
const matches = (order: PreOrder, filter: Filter) =>
  filter === "all" ? true : filter === "open" ? !isFinished(order) : isFinished(order);

const REFRESH_MS = 30_000;
const DESKTOP_QUERY = "(min-width: 860px)";

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** Computador (lista e detalhe lado a lado), no mesmo corte do customer.css. */
function useIsDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false
  );
}

function ListHeader({ chips }: { chips?: React.ReactNode }) {
  return (
    <header className="c-list-head">
      <div className="c-orders-intro">
        <h1 className="c-page-title">Meus pedidos</h1>
        <p>Pedidos feitos com o estabelecimento e o andamento de cada um.</p>
      </div>
      {chips}
    </header>
  );
}

function DetailSkeleton() {
  return (
    <div className="c-dskel" aria-hidden="true">
      <span className="c-skel" style={{ height: 196 }} />
      <span className="c-skel" style={{ height: 280 }} />
    </div>
  );
}

function PreOrdersScreen() {
  const router = useRouter();
  const pathname = usePathname() ?? "/customer/pre-orders";
  const searchParams = useSearchParams();
  const itemId = searchParams.get("item");

  const { data, error, reload } = useCustomerData<PreOrdersResponse>("/api/customer/pre-orders");
  const orders = useMemo<PreOrder[]>(() => (Array.isArray(data?.data) ? data.data : []), [data]);
  const loaded = data !== null;

  const [filter, setFilter] = useState<Filter>("all");
  const [notice, setNotice] = useState<string | null>(null);
  const isDesktop = useIsDesktop();

  const visible = useMemo(() => orders.filter((order) => matches(order, filter)), [orders, filter]);
  const picked = itemId ? orders.find((order) => order.id === itemId) ?? null : null;
  // Com ?item o celular mostra o detalhe; um id que não existe mais volta para a lista.
  const hasSelection = Boolean(itemId) && (picked !== null || (!loaded && !error));
  // No computador, sem ?item, o detalhe já mostra o primeiro pedido da lista.
  const shown = picked ?? (isDesktop ? visible[0] ?? null : null);

  /* ---------- URL: ?item=<id> ---------- */

  const pushedRef = useRef(false);
  const listRef = useRef<HTMLElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const savedListScroll = useRef<number | null>(null);

  const hrefFor = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("item", id);
      else params.delete("item");
      const query = params.toString();
      return query ? `${pathname}?${query}` : pathname;
    },
    [pathname, searchParams]
  );

  const openOrder = (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    // Clique com Ctrl/Cmd/Shift ou botão do meio fica com o navegador (nova aba).
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (id === itemId) {
      event.preventDefault();
      return;
    }
    pushedRef.current = true;
    if (!isDesktop && listRef.current) savedListScroll.current = listRef.current.scrollTop;
  };

  const goBack = () => {
    if (pushedRef.current) {
      pushedRef.current = false;
      router.back();
    } else {
      router.replace(hrefFor(null), { scroll: false });
    }
  };

  useEffect(() => {
    if (!itemId) pushedRef.current = false;
  }, [itemId]);

  // De volta à lista no celular, a rolagem fica onde estava.
  useLayoutEffect(() => {
    if (hasSelection || savedListScroll.current === null || !listRef.current) return;
    listRef.current.scrollTop = savedListScroll.current;
    savedListScroll.current = null;
  }, [hasSelection]);

  // Outro pedido no detalhe começa do topo.
  const shownId = shown?.id ?? null;
  useEffect(() => {
    detailRef.current?.scrollTo({ top: 0 });
  }, [shownId]);

  const chooseFilter = (next: Filter) => {
    setFilter(next);
    // O pedido aberto sai do filtro: o detalhe passa para o primeiro da nova lista.
    if (picked && !matches(picked, next)) router.replace(hrefFor(null), { scroll: false });
  };

  /* ---------- atualização enquanto houver pedido andando ---------- */

  const hasOpenOrders = orders.some((order) => !isFinished(order));
  useEffect(() => {
    if (!hasOpenOrders) return;
    const tick = window.setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hasOpenOrders, reload]);

  const clearNotice = useCallback(() => setNotice(null), []);

  /* ---------- lista ---------- */

  const chips =
    orders.length > 0 ? (
      <div className="c-chips" role="group" aria-label="Filtrar pedidos">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className="c-chip"
            aria-pressed={filter === option.value}
            onClick={() => chooseFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    ) : null;

  let list: React.ReactNode;
  if (!loaded && error) {
    list = <ErrorState message={error} onRetry={reload} />;
  } else if (!loaded) {
    list = <LoadingRows />;
  } else if (orders.length === 0) {
    list = (
      <EmptyState
        title="Você ainda não tem pedidos"
        text="Quando o estabelecimento registrar um pedido para você, ele aparece aqui."
      />
    );
  } else if (visible.length === 0) {
    list = (
      <EmptyState title={filter === "open" ? "Nenhum pedido em andamento" : "Nenhum pedido concluído"}>
        <button type="button" className="c-btn is-ghost" onClick={() => chooseFilter("all")}>
          Ver todos
        </button>
      </EmptyState>
    );
  } else {
    list = (
      <div className="c-rows">
        {visible.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            href={hrefFor(order.id)}
            current={order.id === shownId}
            onOpen={openOrder(order.id)}
          />
        ))}
      </div>
    );
  }

  /* ---------- detalhe ---------- */

  let detail: React.ReactNode = null;
  if (shown) detail = <OrderDetail key={shown.id} order={shown} onNotice={setNotice} />;
  else if (!loaded && !error) detail = <DetailSkeleton />;

  return (
    <>
      <div className="c-split" data-has-selection={hasSelection ? "true" : undefined}>
        <section ref={listRef} className="c-pane c-list" aria-label="Lista de pedidos">
          <ListHeader chips={chips} />
          {list}
        </section>
        <section ref={detailRef} className="c-pane c-detail" aria-label="Detalhes do pedido">
          <button type="button" className="c-back" onClick={goBack}>
            <ChevronLeft size={20} aria-hidden="true" />
            Pedidos
          </button>
          <div className="c-dpad">{detail}</div>
        </section>
      </div>
      <Toast message={notice} onDone={clearNotice} />
    </>
  );
}

function PreOrdersFallback() {
  return (
    <div className="c-split">
      <section className="c-pane c-list" aria-label="Lista de pedidos">
        <ListHeader />
        <LoadingRows />
      </section>
      <section className="c-pane c-detail" aria-label="Detalhes do pedido">
        <div className="c-dpad">
          <DetailSkeleton />
        </div>
      </section>
    </div>
  );
}

export default function CustomerPreOrdersPage() {
  return (
    <Suspense fallback={<PreOrdersFallback />}>
      <PreOrdersScreen />
    </Suspense>
  );
}
