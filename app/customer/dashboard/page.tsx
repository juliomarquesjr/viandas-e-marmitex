"use client";

import { ChevronRight, MapPin, Navigation } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import * as React from "react";
import type { CustomerPaymentIntentsResponse } from "@/lib/notification-types";
import { MovementRow } from "../components/ficha/MovementRow";
import { buildMovements } from "../components/ficha/movements";
import { ErrorState, EmptyState, LoadingRows, Money, PixIcon, StatusArt, Stepper, cx } from "../components/kit";
import { PaymentIntentCards } from "../components/pagamento/PaymentIntentCards";
import { PixPaymentSheet } from "../components/PixPaymentSheet";
import { firstName, formatBRL, formatTime, formatTodayLabel, greeting } from "../lib/format";
import { fulfillmentOf, isFinished, toneOf } from "../lib/order-status";
import { PAYMENT_INTENTS_URL } from "../lib/payment-intents";
import type { CustomerAddress, CustomerProfile, ExpensesResponse, PreOrder, PreOrdersResponse } from "../lib/types";
import { useRealtimeEvent } from "../lib/realtime";
import { useCustomerData } from "../lib/useCustomerData";
import "./dashboard.css";

/** A Início mostra só o começo de cada assunto; o resto fica a um toque (e nos avisos). */
const HOME_MOVEMENTS = 5;
const HOME_ORDERS = 1;

/** "Mais 5 lançamentos" no fim de um bloco que mostrou só o último. */
function MoreLink({ href, count, one, many }: { href: string; count: number; one: string; many: string }) {
  if (count <= 0) return null;
  return (
    <Link href={href} className="c-more">
      <span>
        Mais <b className="c-num">{count}</b> {count === 1 ? one : many}
      </span>
      <ChevronRight size={18} aria-hidden="true" />
    </Link>
  );
}

const rise = (i: number) => ({ ["--c-i" as string]: i }) as React.CSSProperties;

export default function CustomerDashboardPage() {
  const expenses = useCustomerData<ExpensesResponse>("/api/customer/expenses");
  const preOrders = useCustomerData<PreOrdersResponse>("/api/customer/pre-orders");
  const profile = useCustomerData<CustomerProfile>("/api/customer/profile");
  // Secundária: se falhar, o Início segue sem o andamento dos pagamentos
  const intents = useCustomerData<CustomerPaymentIntentsResponse>(PAYMENT_INTENTS_URL);
  useRealtimeEvent("ficha.updated", expenses.reload);
  useRealtimeEvent("pre-order.updated", preOrders.reload);
  useRealtimeEvent("payment-intent.reviewed", intents.reload);
  const [pixOpen, setPixOpen] = React.useState(false);
  const closePix = React.useCallback(() => setPixOpen(false), []);

  const reloadExpenses = expenses.reload;
  const reloadPreOrders = preOrders.reload;
  const reloadIntents = intents.reload;

  // Depois de "Já paguei", mostra o aviso na hora e confere o saldo
  const onInformed = React.useCallback(() => {
    reloadIntents();
    reloadExpenses();
  }, [reloadIntents, reloadExpenses]);

  // Ao voltar para a aba (ex.: depois de ver o app do banco), busca tudo de novo
  // para a confirmação do pagamento aparecer sem sair da tela.
  const lastRefresh = React.useRef(Date.now());
  React.useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastRefresh.current < 5000) return;
      lastRefresh.current = Date.now();
      reloadIntents();
      reloadExpenses();
      reloadPreOrders();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reloadIntents, reloadExpenses, reloadPreOrders]);

  const failed = Boolean(expenses.error || preOrders.error);
  const loading = (expenses.loading && !expenses.data) || (preOrders.loading && !preOrders.data);

  const retry = () => {
    if (expenses.error) expenses.reload();
    if (preOrders.error) preOrders.reload();
  };

  const address = profile.data ? formatAddress(profile.data.address) : null;

  return (
    <div className="c-page c-home">
      <div className="c-home-col">
        <Greeting />

        {failed ? (
          <div className="c-card c-home-err">
            <ErrorState
              message={expenses.error || preOrders.error || "Não foi possível carregar agora."}
              onRetry={retry}
            />
          </div>
        ) : loading || !expenses.data ? (
          <HeroSkeleton />
        ) : (
          <BalanceHero data={expenses.data} onPay={() => setPixOpen(true)} />
        )}

        {!failed && (
          <section className="c-block c-home-mov c-rise" style={rise(3)} aria-labelledby="home-mov-h">
            <div className="c-block-h">
              <h2 id="home-mov-h">Últimas movimentações</h2>
              <Link href="/customer/expenses" className="c-link">
                Ver ficha
              </Link>
            </div>
            <div className="c-card">
              {loading || !expenses.data ? <LoadingRows rows={HOME_MOVEMENTS} /> : <RecentMovements data={expenses.data} />}
            </div>
          </section>
        )}
      </div>

      <div className="c-home-col">
        {intents.data && <PaymentIntentCards intents={intents.data.intents ?? []} rise={rise(2)} />}
        {!failed && loading && <ActiveSkeleton />}
        {!failed && !loading && preOrders.data && <ActiveOrders orders={preOrders.data.data ?? []} />}

        {address && (
          <section className="c-card c-home-addr c-rise" style={rise(4)} aria-label="Endereço de entrega">
            <span className="c-oic" aria-hidden="true">
              <MapPin size={20} />
            </span>
            <div>
              <strong>Entrega em</strong>
              <p>
                {address.line1}
                {address.line2 && (
                  <>
                    <br />
                    {address.line2}
                  </>
                )}
              </p>
            </div>
          </section>
        )}
      </div>

      {expenses.data && expenses.data.balanceCents > 0 && (
        <PixPaymentSheet
          open={pixOpen}
          onClose={closePix}
          balanceCents={expenses.data.balanceCents}
          onInformed={onInformed}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- saudação */

function Greeting() {
  const { data: session } = useSession();
  // hora e data são do aparelho: só depois de montar, para o HTML do servidor
  // (em outro fuso) não brigar com o do navegador
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => setNow(new Date()), []);

  const name = firstName(session?.user?.name);
  return (
    <header className="c-greet c-rise" style={rise(0)}>
      <h1>{now ? `${greeting(now)}${name ? `, ${name}` : ""}` : "\u00a0"}</h1>
      <p className="c-eyebrow">{now ? formatTodayLabel(now) : "\u00a0"}</p>
    </header>
  );
}

/* ------------------------------------------------------------------- saldo */

function BalanceHero({ data, onPay }: { data: ExpensesResponse; onPay: () => void }) {
  const balance = data.balanceCents;
  const credit = balance < 0;
  const owes = balance > 0;
  const purchases = data.totalPending;
  const paid = data.totalPayments;
  const pct = purchases > 0 ? Math.min(100, Math.round((paid / purchases) * 100)) : 0;

  return (
    <section className="c-hero c-rise" style={rise(1)} aria-label="Saldo da ficha">
      <p className="c-eyebrow">{credit ? "Você tem crédito" : "Saldo da sua ficha"}</p>
      <Money cents={balance} countUp />
      <p>
        {credit
          ? "Esse valor abate as próximas compras."
          : owes
            ? "Pague quando quiser, pelo app ou no balcão."
            : "Ficha em dia."}
      </p>

      <div className="c-stats">
        <div>
          <div className="c-stats-k">Compras</div>
          <div className="c-stats-v">{formatBRL(purchases)}</div>
        </div>
        <div>
          <div className="c-stats-k">Já pago</div>
          <div className="c-stats-v">{formatBRL(paid)}</div>
        </div>
      </div>

      {purchases > 0 && (
        <div className="c-bar" role="img" aria-label={`${pct}% do consumo já foi pago`}>
          <i style={{ width: `${pct}%` }} />
        </div>
      )}

      {owes && (
        <div className="c-hero-cta">
          <button type="button" className="c-btn is-primary" onClick={onPay}>
            <PixIcon size={18} />
            Pagar com PIX
          </button>
        </div>
      )}
    </section>
  );
}

function HeroSkeleton() {
  return (
    <div className="c-hero c-hero-skel" aria-busy="true" aria-label="Carregando o saldo">
      <span className="c-skel" style={{ height: 12, width: 140 }} />
      <span className="c-skel" style={{ height: 48, width: 210 }} />
      <span className="c-skel" style={{ height: 14, width: "60%" }} />
      <span className="c-skel" style={{ height: 6, width: "100%", marginTop: 10 }} />
    </div>
  );
}

/* ---------------------------------------------------------- movimentações */

function RecentMovements({ data }: { data: ExpensesResponse }) {
  const all = buildMovements(data);
  const recent = all.slice(0, HOME_MOVEMENTS);
  if (recent.length === 0) {
    return <EmptyState title="Nada na ficha ainda" text="Suas compras e pagamentos na ficha aparecem aqui." />;
  }
  const more = all.length - recent.length;
  return (
    <>
      <div className="c-rows">
        {recent.map((m) => (
          <MovementRow key={m.id} movement={m} href={`/customer/expenses?item=${encodeURIComponent(m.id)}`} />
        ))}
      </div>
      <MoreLink href="/customer/expenses" count={more} one="lançamento" many="lançamentos" />
    </>
  );
}

/* ---------------------------------------------------------- em andamento */

function ActiveOrders({ orders }: { orders: PreOrder[] }) {
  const active = orders
    .filter((o) => !isFinished(o))
    .map((o, i) => ({ o, i, go: toneOf(o) === "go" }))
    .sort((a, b) => Number(b.go) - Number(a.go) || a.i - b.i)
    .map(({ o }) => o);

  if (active.length === 0) return null;

  return (
    <section className="c-block c-home-act c-rise" style={rise(2)} aria-labelledby="home-act-h">
      <div className="c-block-h">
        <h2 id="home-act-h">Em andamento</h2>
        <Link href="/customer/pre-orders" className="c-link">
          Ver pedidos
        </Link>
      </div>
      {active.slice(0, HOME_ORDERS).map((o) =>
        o.deliveryStatus === "out_for_delivery" || o.deliveryStatus === "in_transit" ? (
          <OnTheWayCard key={o.id} order={o} />
        ) : (
          <ActiveCard key={o.id} order={o} />
        )
      )}
      <MoreLink href="/customer/pre-orders" count={active.length - HOME_ORDERS} one="pedido em andamento" many="pedidos em andamento" />
    </section>
  );
}

const ACTIVE_TITLE: Partial<Record<PreOrder["deliveryStatus"], string>> = {
  ready: "Pronto para retirar",
  preparing: "Em preparo",
  pending: "Recebido",
};

function itemsLabel(order: PreOrder) {
  const n = order.items?.length ?? 0;
  return `${n} ${n === 1 ? "item" : "itens"}`;
}

function ActiveCard({ order }: { order: PreOrder }) {
  const fulfillment = fulfillmentOf(order);
  const kind = fulfillment === "pickup" ? "Retirada" : fulfillment === "delivery" ? "Entrega" : null;
  const ready = order.deliveryStatus === "ready";
  return (
    <Link
      href={`/customer/pre-orders?item=${encodeURIComponent(order.id)}`}
      className={cx("c-act-card", toneOf(order) === "go" && "is-go")}
    >
      <StatusArt order={order} size={44} />
      <span className="c-row-main">
        <strong>{ACTIVE_TITLE[order.deliveryStatus] ?? "Em andamento"}</strong>
        <small>{kind ? `${kind} · ${itemsLabel(order)}` : itemsLabel(order)}</small>
        {ready && <small className="c-hint">Retire no balcão e diga o seu nome</small>}
      </span>
      <span className="c-chev" aria-hidden="true">
        <ChevronRight size={20} />
      </span>
    </Link>
  );
}

function OnTheWayCard({ order }: { order: PreOrder }) {
  return (
    <section className="c-card c-live" aria-label="Pedido saindo para entrega">
      <div className="c-live-top">
        <StatusArt order={order} size={56} />
        <div>
          <p className="c-eyebrow">Saiu para entrega · {itemsLabel(order)}</p>
          <h3>
            {order.estimatedDeliveryTime
              ? `Chega por volta das ${formatTime(order.estimatedDeliveryTime)}`
              : "O entregador já está a caminho"}
          </h3>
        </div>
      </div>
      <Stepper order={order} compact />
      <div className="c-actions">
        <Link href={`/customer/pre-orders?item=${encodeURIComponent(order.id)}`} className="c-btn is-ghost">
          Ver pedido
        </Link>
        <Link href={`/customer/pre-orders/${encodeURIComponent(order.id)}/tracking`} className="c-btn is-primary">
          <Navigation size={18} aria-hidden="true" />
          Acompanhar no mapa
        </Link>
      </div>
    </section>
  );
}

function ActiveSkeleton() {
  return (
    <section className="c-block c-home-act" aria-busy="true" aria-label="Carregando pedidos">
      <span className="c-skel" style={{ height: 20, width: 150 }} />
      <div className="c-act-card c-act-skel">
        <span className="c-skel" style={{ width: 44, height: 44, borderRadius: "50%", flex: "none" }} />
        <span className="c-row-main" style={{ gap: 8 }}>
          <span className="c-skel" style={{ height: 18, width: "60%" }} />
          <span className="c-skel" style={{ height: 12, width: "35%" }} />
        </span>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- endereço */

function parseAddress(raw: CustomerProfile["address"] | string | undefined): CustomerAddress | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as CustomerAddress) : null;
    } catch {
      return null;
    }
  }
  return raw;
}

function formatAddress(raw: CustomerProfile["address"] | string | undefined): { line1: string; line2: string } | null {
  const a = parseAddress(raw);
  if (!a) return null;
  const clean = (v?: string) => (typeof v === "string" ? v.trim() : "");
  const street = [clean(a.street), clean(a.number)].filter(Boolean).join(", ");
  const withComplement = [street, clean(a.complement)].filter(Boolean).join(" - ");
  const line1 = [withComplement, clean(a.neighborhood)].filter(Boolean).join(" · ");
  const line2 = [clean(a.city), clean(a.state)].filter(Boolean).join(" - ");
  if (!clean(a.street) && !line2) return null;
  return line1 ? { line1, line2 } : { line1: line2, line2: "" };
}
