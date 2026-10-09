"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationDTO } from "@/lib/notification-types";
import { NotificationHistoryDialog } from "./NotificationHistoryDialog";
import { getPaymentIntentId } from "./NotificationItem";
import { NotificationPanel } from "./NotificationPanel";
import { PaymentReviewDialog } from "./PaymentReviewDialog";
import { useNotificationsContext } from "./NotificationsProvider";

const PANEL_ID = "admin-notifications-panel";

type ReviewOrigin = "panel" | "history";

function bellLabel(count: number): string {
  if (count <= 0) return "Notificações, nenhuma nova";
  return `Notificações, ${count} ${count === 1 ? "nova" : "novas"}`;
}

function badgeText(count: number): string {
  return count > 99 ? "99+" : String(count);
}

/** Há um diálogo (Radix) aberto por cima da tela, como o de aceitar ou recusar um pedido. */
function hasOpenDialog(): boolean {
  return document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]') !== null;
}

/**
 * Sino de notificações do cabeçalho do admin: contador, painel com as mais
 * recentes, histórico completo e revisão dos pagamentos informados.
 */
export function NotificationBell() {
  const {
    notifications,
    badgeCount,
    pendingPaymentsCount,
    awaitingOrders,
    awaitingOrdersCount,
    loaded,
    error,
    refresh,
    markRead,
    markAllRead,
    soundEnabled,
    setSoundEnabled,
    historyRequest,
  } = useNotificationsContext();
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyVersion, setHistoryVersion] = React.useState(0);
  const [review, setReview] = React.useState<{ id: string; origin: ReviewOrigin } | null>(null);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const bellRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  /** De onde a revisão abriu; guardado à parte porque `review` já é nulo quando o foco volta. */
  const reviewOriginRef = React.useRef<ReviewOrigin>("panel");

  const closePanel = React.useCallback((restoreFocus: boolean) => {
    setPanelOpen(false);
    if (restoreFocus) bellRef.current?.focus();
  }, []);

  // Clique fora fecha o painel
  React.useEffect(() => {
    if (!panelOpen) return;
    function handleClickOutside(event: MouseEvent) {
      // Um diálogo aberto a partir do painel (aceitar/recusar) vive fora dele: clicar nele não fecha o painel
      if (hasOpenDialog()) return;
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [panelOpen]);

  // Esc fecha o painel e devolve o foco ao sino
  React.useEffect(() => {
    if (!panelOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !hasOpenDialog()) closePanel(true);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [panelOpen, closePanel]);

  // Ao abrir, o foco vai para o painel (o Tab segue para o primeiro item)
  React.useEffect(() => {
    if (panelOpen) panelRef.current?.focus();
  }, [panelOpen]);

  const togglePanel = () => {
    if (panelOpen) {
      setPanelOpen(false);
      return;
    }
    setPanelOpen(true);
    void refresh();
  };

  const handleSelect = (notification: NotificationDTO, origin: ReviewOrigin) => {
    void markRead(notification.id);
    const intentId = getPaymentIntentId(notification);
    if (origin === "panel") setPanelOpen(false);
    if (intentId) {
      reviewOriginRef.current = origin;
      setReview({ id: intentId, origin });
    }
  };

  const handleResolved = React.useCallback(() => {
    void refresh();
    setHistoryVersion((version) => version + 1);
  }, [refresh]);

  // A tela inicial pede o histórico ("Ver todas as notificações")
  const lastHistoryRequest = React.useRef(historyRequest);
  React.useEffect(() => {
    if (historyRequest === lastHistoryRequest.current) return;
    lastHistoryRequest.current = historyRequest;
    setPanelOpen(false);
    setHistoryOpen(true);
  }, [historyRequest]);

  const handleOrderResponded = React.useCallback(() => {
    void refresh().then(() => {
      // O pedido sai da lista: leva o foco ao painel para o teclado não se perder
      window.setTimeout(() => {
        const next = panelRef.current?.querySelector<HTMLElement>("[data-attention-row] button:not([disabled])");
        (next ?? panelRef.current)?.focus();
      }, 120);
    });
    setHistoryVersion((version) => version + 1);
  }, [refresh]);

  const handleCloseReview = React.useCallback(() => setReview(null), []);

  const focusBell = (event: Event) => {
    event.preventDefault();
    bellRef.current?.focus();
  };

  return (
    <>
      <div className="relative" ref={containerRef}>
        <button
          ref={bellRef}
          type="button"
          onClick={togglePanel}
          className={cn(
            "relative flex h-11 w-11 items-center justify-center rounded-lg transition-all duration-200",
            "hover:bg-[color:var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]",
            panelOpen && "bg-[color:var(--muted)] text-[color:var(--foreground)]"
          )}
          aria-label={bellLabel(badgeCount)}
          aria-expanded={panelOpen}
          aria-haspopup="dialog"
          aria-controls={panelOpen ? PANEL_ID : undefined}
        >
          <Bell className="h-5 w-5" aria-hidden />
          {badgeCount > 0 && (
            <span
              aria-hidden
              className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none ring-2 ring-[color:var(--card)]"
              style={{ background: "var(--state-cobrar-solid)", color: "var(--state-cobrar-on)" }}
            >
              {badgeText(badgeCount)}
            </span>
          )}
        </button>

        {panelOpen && (
          <NotificationPanel
            ref={panelRef}
            id={PANEL_ID}
            notifications={notifications}
            awaitingOrders={awaitingOrders}
            awaitingOrdersCount={awaitingOrdersCount}
            onOrderResponded={handleOrderResponded}
            soundEnabled={soundEnabled}
            onSoundChange={setSoundEnabled}
            onNavigate={() => setPanelOpen(false)}
            loaded={loaded}
            error={error}
            onSelect={(notification) => handleSelect(notification, "panel")}
            onMarkAllRead={() => void markAllRead()}
            onShowHistory={() => {
              setPanelOpen(false);
              setHistoryOpen(true);
            }}
            onRetry={() => void refresh()}
          />
        )}
      </div>

      <NotificationHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        version={historyVersion}
        pendingCount={pendingPaymentsCount}
        onSelect={(notification) => handleSelect(notification, "history")}
        onCloseAutoFocus={focusBell}
      />

      <PaymentReviewDialog
        intentId={review?.id ?? null}
        onClose={handleCloseReview}
        onResolved={handleResolved}
        onCloseAutoFocus={(event) => {
          if (reviewOriginRef.current === "panel") focusBell(event);
        }}
      />
    </>
  );
}
