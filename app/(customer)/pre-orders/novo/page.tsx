"use client";

import { ChevronLeft, Search, X } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import * as React from "react";
import { CartBar } from "../../components/pedido/CartBar";
import { CartPanel, type SendProblem } from "../../components/pedido/CartPanel";
import { MenuProductRow } from "../../components/pedido/MenuProductRow";
import { OrderSent, type SentOrder } from "../../components/pedido/OrderSent";
import { StoreBanner } from "../../components/pedido/StoreBanner";
import "../../components/pedido/pedido.css";
import { EmptyState, ErrorState, LoadingRows, Sheet, Toast, cx } from "../../components/kit";
import { countItems, resolveLines, totalOf, useCart, type CartLine, type SendAttempt } from "../../lib/cart";
import { ORDERING_MENU_URL, sendOrder } from "../../lib/order-api";
import { minutesLeft, storeView } from "../../lib/store-status";
import type { MenuProduct, OrderingMenu, PreOrder, PreOrdersResponse } from "../../lib/types";
import { useCustomerData } from "../../lib/useCustomerData";
import { useIsDesktop } from "../../lib/useIsDesktop";

/** Mais que isto e a busca aparece; com poucos produtos ela só ocuparia espaço. */
const SEARCH_MIN_PRODUCTS = 12;
const MENU_REFRESH_MS = 60_000;
/** Espaço que as categorias fixas no topo ocupam: a seção que o chip leva pára logo abaixo delas. */
const CHIPS_OFFSET = 72;

const normalize = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const sectionId = (id: string) => `c-ped-cat-${id}`;

interface Section {
  id: string;
  name: string;
  products: MenuProduct[];
}

function groupByCategory(products: MenuProduct[]): Section[] {
  const map = new Map<string, Section>();
  for (const product of products) {
    const category = product.category ?? { id: "sem-categoria", name: "Outros" };
    let section = map.get(category.id);
    if (!section) {
      section = { id: category.id, name: category.name, products: [] };
      map.set(category.id, section);
    }
    section.products.push(product);
  }
  return [...map.values()];
}

/* ----------------------------------------------------- relógio da loja */

/**
 * Minutos até a loja fechar, contados com o relógio do servidor (`serverNow`), não o do aparelho.
 * Também pede o cardápio de novo quando a hora de fechar ou de abrir chega.
 */
function useStoreMinutes(menu: OrderingMenu | null, reload: () => void): number | null {
  const [minutes, setMinutes] = React.useState<number | null>(null);
  const reloadRef = React.useRef(reload);
  reloadRef.current = reload;
  const lastForced = React.useRef(0);

  React.useEffect(() => {
    if (!menu) {
      setMinutes(null);
      return;
    }
    const offset = Date.parse(menu.serverNow) - Date.now();
    const opensAt = !menu.open && menu.nextOpening ? Date.parse(menu.nextOpening.at) : null;
    const force = () => {
      // no máximo uma vez a cada 15 s, para uma loja que não vira o estado não gerar um laço
      if (Date.now() - lastForced.current < 15_000) return;
      lastForced.current = Date.now();
      reloadRef.current();
    };
    const run = () => {
      const left = minutesLeft(menu, offset);
      setMinutes(left);
      if (left !== null && left <= 0) force();
      if (left === null && opensAt !== null && Date.now() + offset >= opensAt) force();
    };
    run();
    const timer = window.setInterval(run, 5000);
    return () => window.clearInterval(timer);
  }, [menu]);

  return minutes;
}

/* -------------------------------------------------------------- página */

export default function NewOrderPage() {
  const { data: session } = useSession();
  const customerId = (session?.user as { customerId?: string } | undefined)?.customerId ?? null;
  const isDesktop = useIsDesktop();

  const menuState = useCustomerData<OrderingMenu>(ORDERING_MENU_URL);
  const menu = menuState.data;
  const reloadMenu = menuState.reload;

  const cart = useCart(customerId);
  const minutes = useStoreMinutes(menu, reloadMenu);
  const view = menu ? storeView(menu, minutes) : null;
  const storeOpen = view?.kind === "open" || view?.kind === "closing";

  /* ---------- cardápio sempre fresco: a cada minuto e ao voltar para a aba ---------- */
  React.useEffect(() => {
    const tick = window.setInterval(() => {
      if (document.visibilityState === "visible") reloadMenu();
    }, MENU_REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") reloadMenu();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [reloadMenu]);

  /* ---------- carrinho conferido com o cardápio de agora ---------- */
  const [serverFlags, setServerFlags] = React.useState<Record<string, string>>({});
  const resolved = React.useMemo(
    () => resolveLines(cart.lines, menu, storeOpen, serverFlags),
    [cart.lines, menu, storeOpen, serverFlags]
  );
  const itemCount = countItems(cart.lines);
  const total = totalOf(resolved);
  const needsReview = resolved.some((r) => r.issue);
  const quantities = React.useMemo(() => new Map(cart.lines.map((l) => [l.productId, l.quantity])), [cart.lines]);

  const [notice, setNotice] = React.useState<string | null>(null);
  const clearNotice = React.useCallback(() => setNotice(null), []);

  const limits = menu?.limits;
  const changeProduct = (product: MenuProduct, quantity: number) => {
    if (quantity > 0 && !quantities.has(product.id) && limits && cart.lines.length >= limits.maxItems) {
      setNotice(`O pedido aceita até ${limits.maxItems} produtos diferentes.`);
      return;
    }
    cart.setQuantity(product, quantity);
    setServerFlags((prev) => {
      if (!(product.id in prev)) return prev;
      const { [product.id]: _removed, ...rest } = prev;
      return rest;
    });
  };
  const changeLine = (line: CartLine, quantity: number) => {
    cart.setQuantity(
      { id: line.productId, name: line.name, priceCents: line.priceCents, imageUrl: line.imageUrl },
      quantity
    );
    setServerFlags((prev) => {
      if (!(line.productId in prev)) return prev;
      const { [line.productId]: _removed, ...rest } = prev;
      return rest;
    });
  };
  const onLimit = React.useCallback(
    () => setNotice(`No máximo ${limits?.maxQuantity ?? 20} de cada produto por pedido.`),
    [limits?.maxQuantity]
  );

  const removeFlagged = () => {
    const ids = resolved.filter((r) => r.issue).map((r) => r.line.productId);
    cart.remove(ids);
    setServerFlags({});
    setProblem(null);
  };

  /* ---------- folha do carrinho ---------- */
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const closeSheet = React.useCallback(() => setSheetOpen(false), []);
  const openSheet = () => {
    // ao abrir, o cardápio é conferido de novo: o carrinho mostra o que mudou
    reloadMenu();
    setProblem(null);
    setNetworkFailed(false);
    setSheetOpen(true);
  };
  React.useEffect(() => {
    if (sheetOpen && cart.ready && cart.lines.length === 0) setSheetOpen(false);
  }, [sheetOpen, cart.ready, cart.lines.length]);

  /* ---------- envio ---------- */
  const [sending, setSending] = React.useState(false);
  const sendingRef = React.useRef(false);
  const [problem, setProblem] = React.useState<SendProblem | null>(null);
  const [networkFailed, setNetworkFailed] = React.useState(false);
  const [sent, setSent] = React.useState<SentOrder | null>(null);
  const alive = React.useRef(true);
  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const finish = React.useCallback(
    (id: string, totalCents: number, lines: CartLine[]) => {
      cart.clear();
      setServerFlags({});
      setSheetOpen(false);
      setSent({ id, totalCents, lines: lines.map((l) => ({ productId: l.productId, name: l.name, quantity: l.quantity })) });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart.clear]
  );

  const send = async () => {
    if (sendingRef.current || !menu) return;
    sendingRef.current = true;
    setSending(true);
    setProblem(null);
    setNetworkFailed(false);

    const lines = cart.lines;
    const key = cart.beginAttempt();
    const result = await sendOrder(lines, cart.notes, key);
    sendingRef.current = false;

    if (result.ok) {
      // Mesmo que a tela tenha sido fechada nesse meio tempo, o carrinho enviado não pode voltar
      cart.clear();
      if (!alive.current) return;
      setSending(false);
      finish(result.id, result.totalCents, lines);
      return;
    }
    if (!alive.current) return;
    setSending(false);

    if (result.kind === "auth") {
      window.location.href = "/login";
      return;
    }
    if (result.kind === "network") {
      setNetworkFailed(true);
      return;
    }

    // O servidor respondeu "não": nada foi criado com esta chave
    cart.settleAttempt();
    const message = result.message.replace(/\.+$/, "");
    switch (result.code) {
      case "WINDOW_CLOSED":
        setProblem({ text: `A loja fechou para pedidos. ${message}. Seu carrinho foi guardado.` });
        reloadMenu();
        break;
      case "PRODUCT_UNAVAILABLE":
      case "OUT_OF_STOCK": {
        const flags: Record<string, string> = {};
        for (const product of result.products) {
          flags[product.productId] =
            result.code === "OUT_OF_STOCK"
              ? product.available && product.available > 0
                ? `Temos só ${product.available} agora.`
                : "Esgotou."
              : "A loja não pode vender este produto agora.";
        }
        setServerFlags((prev) => ({ ...prev, ...flags }));
        setProblem({ text: `${message}.` });
        reloadMenu();
        break;
      }
      case "TOO_MANY_PENDING":
        setProblem({
          text: "Você já tem pedidos esperando a loja confirmar. Aguarde a resposta para enviar outro.",
          linkToOrders: true,
        });
        reloadMenu();
        break;
      case "ORDERING_DISABLED":
        setProblem({ text: `${message}. Seu carrinho foi guardado.` });
        reloadMenu();
        break;
      case "CUSTOMER_INACTIVE":
        setProblem({ text: "Seu cadastro está inativo. Fale com a loja." });
        break;
      default:
        setProblem({ text: `${message}.` });
    }
  };

  /* ---------- resposta perdida: antes de oferecer reenvio, confere Pedidos ---------- */
  const checkedAttempt = React.useRef<SendAttempt | null>(null);
  React.useEffect(() => {
    const attempt = cart.attempt;
    if (!cart.ready || !attempt || !attempt.unsure || sendingRef.current || checkedAttempt.current?.key === attempt.key) return;
    checkedAttempt.current = attempt;
    const lines = cart.lines;
    fetch("/api/customer/pre-orders", { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<PreOrdersResponse>) : null))
      .then((body) => {
        if (!alive.current || sendingRef.current || !body || !Array.isArray(body.data)) return;
        const match = body.data.find((order) => sameOrder(order, lines, attempt.startedAt));
        if (match) finish(match.id, match.totalCents, lines);
      })
      .catch(() => undefined);
  }, [cart.ready, cart.attempt, cart.lines, finish]);

  /* ---------- busca e categorias ---------- */
  const [query, setQuery] = React.useState("");
  const products = React.useMemo(() => menu?.products ?? [], [menu]);
  const searchable = products.length > SEARCH_MIN_PRODUCTS;
  const needle = searchable ? normalize(query.trim()) : "";
  const shown = React.useMemo(
    () => (needle ? products.filter((p) => normalize(`${p.name} ${p.description ?? ""}`).includes(needle)) : products),
    [products, needle]
  );
  const sections = React.useMemo(() => groupByCategory(shown), [shown]);

  const paneRef = React.useRef<HTMLDivElement>(null);
  const chipsRef = React.useRef<HTMLUListElement>(null);
  const [activeCat, setActiveCat] = React.useState<string | null>(null);
  const showChips = sections.length > 1;
  const current = activeCat && sections.some((s) => s.id === activeCat) ? activeCat : sections[0]?.id ?? null;

  // Scroll-spy: a categoria ativa é a última cujo título já passou das categorias fixas
  React.useEffect(() => {
    const pane = paneRef.current;
    if (!pane || !showChips) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = pane.getBoundingClientRect().top + CHIPS_OFFSET;
      let id = sections[0].id;
      for (const section of sections) {
        const el = document.getElementById(sectionId(section.id));
        if (el && el.getBoundingClientRect().top <= line) id = section.id;
      }
      if (pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 2) id = sections[sections.length - 1].id;
      setActiveCat(id);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    pane.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      pane.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [sections, showChips]);

  // O chip ativo acompanha a rolagem na própria fileira de chips
  React.useEffect(() => {
    const list = chipsRef.current;
    const chip = list?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!list || !chip) return;
    const left = chip.offsetLeft - (list.clientWidth - chip.offsetWidth) / 2;
    list.scrollTo({ left: Math.max(0, left), behavior: "auto" });
  }, [current]);

  const goToCategory = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    const el = document.getElementById(sectionId(id));
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setActiveCat(id);
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  /* ---------- peças de tela ---------- */
  const panelProps = {
    resolved,
    menu,
    storeKind: view?.kind ?? null,
    notes: cart.notes,
    onNotes: cart.setNotes,
    onQuantity: changeLine,
    onRemoveFlagged: removeFlagged,
    onSend: send,
    sending,
    problem,
    networkFailed,
    onDismissNetwork: () => setNetworkFailed(false),
    onLimit,
  };

  if (sent) {
    return (
      <div className="c-pedido is-sent">
        <div className="c-ped-menu">
          <OrderSent order={sent} />
        </div>
      </div>
    );
  }

  const showBar = !isDesktop && cart.lines.length > 0 && Boolean(menu) && view?.kind !== "off";
  const showAside = isDesktop && Boolean(menu) && view?.kind !== "off";

  let body: React.ReactNode;
  if (!menu && menuState.error) {
    body = <ErrorState message={menuState.error} onRetry={reloadMenu} />;
  } else if (!menu) {
    body = <LoadingRows rows={6} />;
  } else if (view?.kind === "off") {
    body = (
      <EmptyState
        title="A loja não está recebendo pedidos pelo app agora"
        text="Quando ela liberar, o cardápio aparece aqui. Os pedidos que você já fez continuam em Pedidos."
      >
        <Link href="/pre-orders" className="c-btn is-ghost">
          Ver meus pedidos
        </Link>
      </EmptyState>
    );
  } else if (products.length === 0) {
    body = (
      <EmptyState
        title="O cardápio está vazio por enquanto"
        text="A loja ainda não liberou produtos para pedir pelo app. Tente de novo mais tarde."
      />
    );
  } else {
    body = (
      <>
        {searchable && (
          <div className="c-ped-search">
            <Search size={20} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar no cardápio"
              aria-label="Buscar no cardápio"
              autoComplete="off"
              enterKeyHint="search"
            />
            {query && (
              <button type="button" className="c-ped-search-x" onClick={() => setQuery("")} aria-label="Limpar a busca">
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {showChips && (
          <nav className="c-ped-chips" aria-label="Categorias do cardápio">
            <ul ref={chipsRef}>
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${sectionId(section.id)}`}
                    className="c-ped-chip"
                    aria-current={section.id === current ? "location" : undefined}
                    onClick={(e) => goToCategory(e, section.id)}
                  >
                    {section.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {sections.length === 0 ? (
          <EmptyState title={`Nenhum produto com “${query.trim()}”`} text="Confira a escrita ou busque por outra palavra.">
            <button type="button" className="c-btn is-ghost" onClick={() => setQuery("")}>
              Limpar a busca
            </button>
          </EmptyState>
        ) : (
          sections.map((section) => (
            <section key={section.id} id={sectionId(section.id)} className="c-ped-sec" aria-labelledby={`${sectionId(section.id)}-h`}>
              <h2 id={`${sectionId(section.id)}-h`}>{section.name}</h2>
              <ul className="c-pm-list">
                {section.products.map((product) => (
                  <MenuProductRow
                    key={product.id}
                    product={product}
                    quantity={quantities.get(product.id) ?? 0}
                    canOrder={storeOpen}
                    maxQuantity={limits?.maxQuantity ?? 20}
                    onChange={changeProduct}
                    onLimit={onLimit}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </>
    );
  }

  return (
    <div className={cx("c-pedido", showBar && "has-bar")}>
      <div ref={paneRef} className="c-ped-menu">
        <div className="c-ped-wrap">
          <header className="c-ped-head">
            <Link href="/pre-orders" className="c-ped-back">
              <ChevronLeft size={20} aria-hidden="true" />
              Pedidos
            </Link>
            <h1 className="c-page-title">Fazer pedido</h1>
          </header>

          {menu && view && view.kind !== "off" && <StoreBanner view={view} minutes={minutes} />}
          {menu && menuState.error && (
            <p className="c-pixnote" role="status">
              Não deu para atualizar o cardápio agora. Você vê a última versão e tentamos de novo em instantes.
            </p>
          )}

          {body}
        </div>
      </div>

      {showAside && (
        <aside className="c-ped-aside" aria-label="Carrinho">
          <CartPanel variant="aside" {...panelProps} />
        </aside>
      )}

      {showBar && <CartBar items={itemCount} totalCents={total} needsReview={needsReview} onOpen={openSheet} />}

      <Sheet open={sheetOpen && !isDesktop} onClose={closeSheet} label="Seu pedido" className="c-cart-sheet">
        <CartPanel variant="sheet" {...panelProps} onClose={closeSheet} />
      </Sheet>

      <Toast message={notice} onDone={clearNotice} />
    </div>
  );
}

/** O pedido do servidor tem os mesmos produtos e quantidades do carrinho e foi criado depois da tentativa? */
function sameOrder(order: PreOrder, lines: CartLine[], startedAt: number): boolean {
  if (order.source !== "online") return false;
  if (new Date(order.createdAt).getTime() < startedAt - 5000) return false;
  if (order.items.length !== lines.length) return false;
  return lines.every((line) => order.items.some((item) => item.product.id === line.productId && item.quantity === line.quantity));
}
