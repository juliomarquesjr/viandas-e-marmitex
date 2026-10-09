"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Banknote, BellRing, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";
import type { AwaitingOrderDTO, NotificationDTO } from "@/lib/notification-types";
import { formatCurrency } from "../notifications/format";
import { getPaymentIntentId } from "../notifications/NotificationItem";
import { useNotificationsContext } from "../notifications/NotificationsProvider";
import { PaymentReviewDialog } from "../notifications/PaymentReviewDialog";
import { AgeLabel, AwaitingOrderRow, UrgencyNotice } from "./AwaitingOrderRow";
import { focusAfterAnswer } from "./focus";
import { getUrgency, urgencyAccent, worstUrgency } from "./urgency";
import { useNow } from "./useNow";

const COLLAPSED_KEY = "admin:attention-collapsed";
/** Quantos itens de cada grupo aparecem antes do "Ver todos". */
const VISIBLE_ITEMS = 4;

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function PaymentRow({
  notification,
  now,
  onReview,
}: {
  notification: NotificationDTO;
  now: number;
  onReview: (notification: NotificationDTO) => void;
}) {
  const urgency = getUrgency(notification.createdAt, now);
  const who = notification.customerName?.trim() || "Cliente";
  const amount = notification.paymentIntent?.amountCents;

  return (
    <li
      data-attention-row
      className="rounded-lg border border-l-4 border-[color:var(--border)] p-3"
      style={{
        borderLeftColor: urgencyAccent(urgency),
        background: urgency === "urgent" ? "var(--state-cobrar-bg)" : "var(--card)",
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--muted-foreground)]" aria-hidden />
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-semibold text-[color:var(--foreground)]">{who}</span>
              {typeof amount === "number" && (
                <span className="text-sm text-[color:var(--foreground)]">
                  informou <span className="font-semibold tabular-nums">{formatCurrency(amount)}</span>
                </span>
              )}
              <span aria-hidden className="text-xs text-[color:var(--muted-foreground)]">
                ·
              </span>
              <AgeLabel createdAt={notification.createdAt} now={now} urgency={urgency} />
            </div>
            <UrgencyNotice urgency={urgency} createdAt={notification.createdAt} now={now} />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="min-h-[44px] w-full shrink-0 sm:w-auto"
          onClick={() => onReview(notification)}
          aria-label={`Conferir pagamento de ${who}`}
        >
          Conferir
        </Button>
      </div>
    </li>
  );
}

function GroupTitle({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">
      {children} <span className="tabular-nums">({count})</span>
    </h3>
  );
}

/** "Ver todos (N)" / "Mostrar menos" para listas maiores que o limite. */
function ExpandToggle({ expanded, count, onToggle }: { expanded: boolean; count: number; onToggle: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onToggle}
      aria-expanded={expanded}
      className="min-h-[44px] text-primary hover:text-primary"
    >
      {expanded ? "Mostrar menos" : `Ver todos (${count})`}
    </Button>
  );
}

/**
 * Painel de atenção da tela inicial: o que está esperando o dono (pedidos novos do cliente e
 * pagamentos para conferir), do mais antigo para o mais novo. Lê do mesmo estado do sino.
 */
export function AttentionPanel() {
  const {
    loaded,
    awaitingOrders,
    awaitingOrdersCount,
    pendingPayments,
    pendingPaymentsCount,
    refresh,
    markRead,
    requestHistory,
  } = useNotificationsContext();
  const now = useNow();
  const reduceMotion = useReducedMotion();
  const uid = React.useId();
  const headingId = `${uid}-title`;
  const bodyId = `${uid}-body`;

  const [collapsed, setCollapsed] = React.useState(false);
  const [showAllOrders, setShowAllOrders] = React.useState(false);
  const [showAllPayments, setShowAllPayments] = React.useState(false);
  const [review, setReview] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const [pulseKey, setPulseKey] = React.useState(0);

  const sectionRef = React.useRef<HTMLElement>(null);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const clearRef = React.useRef<HTMLParagraphElement>(null);

  const total = awaitingOrdersCount + pendingPaymentsCount;
  const totalRef = React.useRef(total);
  totalRef.current = total;
  const expiredCount = awaitingOrders.filter((o) => o.expired).length;

  // A preferência de recolher vem do navegador; o painel só aparece depois da primeira carga,
  // então ler aqui não causa salto na tela
  React.useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      // Sem armazenamento: começa aberto
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      if (next) window.localStorage.setItem(COLLAPSED_KEY, "1");
      else window.localStorage.removeItem(COLLAPSED_KEY);
    } catch {
      // Vale só até recarregar
    }
  };

  // Chegou item novo: anuncia o resumo (nunca a lista), dá um pulso na borda e reabre se estava recolhido.
  // Não mexe no foco.
  const seenRef = React.useRef<Set<string>>(new Set());
  const baselinedRef = React.useRef(false);
  const lastTotalRef = React.useRef(0);
  React.useEffect(() => {
    if (!loaded) return;
    const ids = [...awaitingOrders.map((o) => `o:${o.id}`), ...pendingPayments.map((n) => `p:${n.id}`)];
    const seen = seenRef.current;
    if (!baselinedRef.current) {
      baselinedRef.current = true;
      ids.forEach((id) => seen.add(id));
      lastTotalRef.current = total;
      return;
    }
    const freshOrders = awaitingOrders.filter((o) => !seen.has(`o:${o.id}`));
    const freshPayments = pendingPayments.filter((n) => !seen.has(`p:${n.id}`));
    ids.forEach((id) => seen.add(id));
    const grew = total > lastTotalRef.current;
    lastTotalRef.current = total;
    const freshCount = freshOrders.length + freshPayments.length;
    if (freshCount === 0 && !grew) return;

    let summary: string;
    if (freshCount === 1 && freshOrders.length === 1) {
      const who = freshOrders[0].customerName?.trim();
      summary = who ? `Novo pedido de ${who}` : "Novo pedido";
    } else if (freshCount === 1) {
      const who = freshPayments[0].customerName?.trim();
      summary = who ? `Novo pagamento de ${who} para conferir` : "Novo pagamento para conferir";
    } else {
      summary = "Chegaram novidades";
    }
    setAnnouncement(`${summary}. ${total} aguardando`);
    setPulseKey((key) => key + 1);
    setCollapsed(false);
    try {
      window.localStorage.removeItem(COLLAPSED_KEY);
    } catch {
      // Sem armazenamento
    }
  }, [loaded, awaitingOrders, pendingPayments, total]);

  const visibleOrders = showAllOrders ? awaitingOrders : awaitingOrders.slice(0, VISIBLE_ITEMS);
  const visiblePayments = showAllPayments ? pendingPayments : pendingPayments.slice(0, VISIBLE_ITEMS);

  const answered = async (rowIndex: number) => {
    await refresh();
    // Sem mais nada esperando, o painel vira "Tudo em dia": o foco vai para a faixa
    focusAfterAnswer(sectionRef.current, rowIndex, () =>
      totalRef.current === 0 ? clearRef.current : headingRef.current
    );
  };

  const handleOrderResponded = (order: AwaitingOrderDTO) => {
    const index = Math.max(0, visibleOrders.findIndex((o) => o.id === order.id));
    void answered(index);
  };

  const reviewIndexRef = React.useRef(0);
  const handleReview = (notification: NotificationDTO) => {
    const intentId = getPaymentIntentId(notification);
    if (!intentId) return;
    void markRead(notification.id);
    reviewIndexRef.current = visibleOrders.length + Math.max(0, visiblePayments.findIndex((n) => n.id === notification.id));
    setReview(intentId);
  };

  const urgentLevel = worstUrgency([
    ...awaitingOrders.map((o) => getUrgency(o.createdAt, now, o.expired)),
    ...pendingPayments.map((n) => getUrgency(n.createdAt, now)),
  ]);

  const duration = reduceMotion ? 0 : 0.2;
  const enter = {
    initial: { height: 0, opacity: 0, overflow: "hidden" as const },
    animate: { height: "auto", opacity: 1, transitionEnd: { overflow: "visible" as const } },
    exit: { height: 0, opacity: 0, overflow: "hidden" as const },
    transition: { duration, ease: "easeOut" as const },
  };

  return (
    <>
      {/* Anuncia só o resumo; a lista não é lida em voz alta */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <AnimatePresence initial={false} mode="wait">
        {loaded && total > 0 && (
          <motion.div key="attention" className="mt-6" {...enter}>
            <section
              ref={sectionRef}
              aria-labelledby={headingId}
              className="relative rounded-xl border-2 bg-[color:var(--card)] shadow-sm"
              style={{ borderColor: urgentLevel === "urgent" ? "var(--state-cobrar)" : "var(--state-pronto)" }}
            >
              {!reduceMotion && pulseKey > 0 && (
                <motion.span
                  key={pulseKey}
                  aria-hidden
                  className="pointer-events-none absolute -inset-1 rounded-2xl border-4"
                  style={{ borderColor: urgentLevel === "urgent" ? "var(--state-cobrar)" : "var(--state-pronto)" }}
                  initial={{ opacity: 0.85 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              )}

              <div className="flex items-center justify-between gap-3 px-4 py-2">
                <h2
                  id={headingId}
                  ref={headingRef}
                  tabIndex={-1}
                  className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold text-[color:var(--foreground)] outline-none"
                >
                  <BellRing className="h-4 w-4 shrink-0" style={{ color: "var(--state-pronto)" }} aria-hidden />
                  <span>Atenção</span>
                  {awaitingOrdersCount > 0 && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="sr-only">, </span>
                      <span>{plural(awaitingOrdersCount, "pedido aguardando", "pedidos aguardando")}</span>
                    </>
                  )}
                  {pendingPaymentsCount > 0 && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="sr-only">, </span>
                      <span>{plural(pendingPaymentsCount, "pagamento para conferir", "pagamentos para conferir")}</span>
                    </>
                  )}
                  {expiredCount > 0 && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="sr-only">, </span>
                      <span
                        className="inline-flex items-center gap-1 font-bold"
                        style={{ color: "var(--state-cobrar-fg)" }}
                      >
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {plural(expiredCount, "expirado", "expirados")}
                      </span>
                    </>
                  )}
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px] shrink-0"
                  onClick={toggleCollapsed}
                  aria-expanded={!collapsed}
                  aria-controls={bodyId}
                >
                  {collapsed ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronUp className="h-4 w-4" aria-hidden />}
                  {collapsed ? "Mostrar" : "Recolher"}
                </Button>
              </div>

              <div id={bodyId} hidden={collapsed}>
                {!collapsed && (
                  <div className="space-y-4 border-t border-[color:var(--border)] px-4 pb-3 pt-3">
                    {awaitingOrdersCount > 0 && (
                      <div className="space-y-2">
                        <GroupTitle count={awaitingOrdersCount}>Pedidos novos</GroupTitle>
                        <ul className="space-y-2">
                          {visibleOrders.map((order) => (
                            <AwaitingOrderRow
                              key={order.id}
                              order={order}
                              now={now}
                              onResponded={handleOrderResponded}
                            />
                          ))}
                        </ul>
                        {awaitingOrders.length > VISIBLE_ITEMS && (
                          <ExpandToggle
                            expanded={showAllOrders}
                            count={awaitingOrdersCount}
                            onToggle={() => setShowAllOrders((v) => !v)}
                          />
                        )}
                      </div>
                    )}

                    {pendingPaymentsCount > 0 && (
                      <div className="space-y-2">
                        <GroupTitle count={pendingPaymentsCount}>Pagamentos Pix</GroupTitle>
                        <ul className="space-y-2">
                          {visiblePayments.map((notification) => (
                            <PaymentRow
                              key={notification.id}
                              notification={notification}
                              now={now}
                              onReview={handleReview}
                            />
                          ))}
                        </ul>
                        {pendingPayments.length > VISIBLE_ITEMS && (
                          <ExpandToggle
                            expanded={showAllPayments}
                            count={pendingPaymentsCount}
                            onToggle={() => setShowAllPayments((v) => !v)}
                          />
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 border-t border-[color:var(--border)] pt-1 text-sm font-medium">
                      <Link
                        href="/admin/pre-orders"
                        className={cn(
                          "inline-flex min-h-[44px] items-center rounded-md text-primary underline-offset-4 hover:underline",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        )}
                      >
                        Ver todos os pedidos
                      </Link>
                      <button
                        type="button"
                        onClick={requestHistory}
                        className={cn(
                          "inline-flex min-h-[44px] items-center rounded-md text-primary underline-offset-4 hover:underline",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        )}
                      >
                        Ver todas as notificações
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </motion.div>
        )}

        {loaded && total === 0 && (
          <motion.div key="all-clear" className="mt-6" {...enter}>
            <p
              ref={clearRef}
              tabIndex={-1}
              className="flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{ background: "var(--state-faturado-bg)", color: "var(--state-faturado-fg)" }}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              Tudo em dia. Nenhum pedido ou pagamento esperando.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <PaymentReviewDialog
        intentId={review}
        onClose={() => setReview(null)}
        onResolved={() => void answered(reviewIndexRef.current)}
      />
    </>
  );
}
