"use client";

import * as React from "react";
import { useToast } from "@/app/components/Toast";
import type { AwaitingOrderDTO, NotificationDTO, NotificationListResponse } from "@/lib/notification-types";
import { openEventStream } from "@/lib/realtime-stream";

/** De quanto em quanto tempo o sino consulta o servidor (só com a aba visível). */
export const NOTIFICATIONS_POLL_MS = 30_000;
/** Com o tempo real conectado, a consulta só cobre um aviso que se perdeu. */
const SAFETY_POLL_MS = 120_000;
/** Vários eventos seguidos viram uma consulta só. */
const REALTIME_DEBOUNCE_MS = 250;
/** Quantas a consulta do sino traz; o painel mostra só as mais recentes. */
const FETCH_LIMIT = 20;
/** Acima disso, os avisos na hora viram um só, para não empilhar toasts. */
const MAX_INDIVIDUAL_TOASTS = 3;

export interface UseNotificationsResult {
  notifications: NotificationDTO[];
  /** O número do sino, da aba e da barra lateral: pedidos aguardando + pagamentos a conferir + avisos não lidos. */
  badgeCount: number;
  /** Quanto pede ação agora: pedidos aguardando + pagamentos a conferir. */
  pendingCount: number;
  /** Pedidos do cliente aguardando resposta, o mais antigo primeiro (até 10). */
  awaitingOrders: AwaitingOrderDTO[];
  /** Quantos pedidos aguardam (pode passar do tamanho da lista). */
  awaitingOrdersCount: number;
  /** Pagamentos informados esperando conferência, o mais antigo primeiro (dentre as notificações carregadas). */
  pendingPayments: NotificationDTO[];
  /** Quantos pagamentos aguardam conferência (conta do servidor, pode passar do tamanho da lista). */
  pendingPaymentsCount: number;
  /** Já houve ao menos uma resposta com sucesso. */
  loaded: boolean;
  /** A última consulta falhou (o último dado bom continua disponível). */
  error: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  /** "Conferido": deixa de pedir ação e sai do sino (continua no histórico). */
  markResolved: (id: string) => Promise<boolean>;
  markAllRead: () => Promise<void>;
}

function isListResponse(value: unknown): value is NotificationListResponse {
  return (
    !!value &&
    typeof value === "object" &&
    Array.isArray((value as NotificationListResponse).notifications) &&
    typeof (value as NotificationListResponse).badgeCount === "number"
  );
}

/** Pagamento informado que ainda espera conferência (a mesma regra que o sino usa para "Revisar"). */
export function isPendingPayment(notification: NotificationDTO): boolean {
  return notification.paymentIntent?.status === "pending" && !notification.resolvedAt;
}

export interface UseNotificationsOptions {
  /** Desligado, não consulta nem escuta nada (ex.: telas imersivas sem o sino). */
  enabled?: boolean;
}

/**
 * O motor das notificações do admin. Roda UMA vez, no NotificationsProvider; as telas leem dele
 * por useNotificationsContext. Notificações do sino: o servidor avisa pelo tempo real (Ably) e a consulta periódica fica como
 * rede de segurança (30 s sem conexão, 2 min com ela).
 * Falha de rede nunca derruba nada: mantém o último dado e tenta de novo no ciclo seguinte.
 */
export function useNotificationsEngine({ enabled = true }: UseNotificationsOptions = {}): UseNotificationsResult {
  const { showToast } = useToast();
  const [notifications, setNotifications] = React.useState<NotificationDTO[]>([]);
  const [badgeCount, setBadgeCount] = React.useState(0);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [awaitingOrders, setAwaitingOrders] = React.useState<AwaitingOrderDTO[]>([]);
  const [awaitingOrdersCount, setAwaitingOrdersCount] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [realtime, setRealtime] = React.useState(false);

  const mountedRef = React.useRef(true);
  const inflightRef = React.useRef<Promise<void> | null>(null);
  /** Ids já vistos; o aviso na hora só vale para o que chegar depois da primeira carga. */
  const seenRef = React.useRef<Set<string>>(new Set());
  const baselineRef = React.useRef(false);

  const seenOrdersRef = React.useRef<Set<string>>(new Set());
  const lastAwaitingCountRef = React.useRef(0);

  const announceNew = React.useCallback(
    (list: NotificationDTO[], orders: AwaitingOrderDTO[], ordersCount: number) => {
      const seen = seenRef.current;
      const seenOrders = seenOrdersRef.current;
      const freshPayments = list.filter((n) => !seen.has(n.id) && !n.resolvedAt);
      const freshOrders = orders.filter((o) => !seenOrders.has(o.id));
      list.forEach((n) => seen.add(n.id));
      orders.forEach((o) => seenOrders.add(o.id));
      const previousCount = lastAwaitingCountRef.current;
      lastAwaitingCountRef.current = ordersCount;
      if (!baselineRef.current) {
        baselineRef.current = true;
        return;
      }
      // Há mais pedidos do que a lista traz (só os 10 mais antigos vêm nela): avisa pela contagem
      const unlistedOrders = freshOrders.length === 0 && ordersCount > previousCount ? ordersCount - previousCount : 0;
      const total = freshPayments.length + freshOrders.length + unlistedOrders;
      if (total === 0) return;
      if (total > MAX_INDIVIDUAL_TOASTS) {
        showToast("Abra o sino para responder.", "info", `${total} novidades esperando por você`);
        return;
      }
      // Da mais antiga para a mais nova, para a última chegada ficar por cima
      [...freshOrders].reverse().forEach((o) => {
        const who = o.customerName?.trim();
        showToast("Veja na tela inicial ou no sino.", "info", who ? `Novo pedido de ${who}` : "Novo pedido");
      });
      if (unlistedOrders > 0) {
        showToast("Veja na tela inicial ou no sino.", "info", unlistedOrders === 1 ? "Novo pedido" : `${unlistedOrders} novos pedidos`);
      }
      [...freshPayments].reverse().forEach((n) => showToast("Abra o sino para revisar.", "info", n.title));
    },
    [showToast]
  );

  const refresh = React.useCallback((): Promise<void> => {
    if (inflightRef.current) return inflightRef.current;

    const run = (async () => {
      try {
        const response = await fetch(`/api/notifications?limit=${FETCH_LIMIT}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: unknown = await response.json();
        if (!isListResponse(data)) throw new Error("Resposta inesperada");
        if (!mountedRef.current) return;
        setNotifications(data.notifications);
        setBadgeCount(data.badgeCount);
        setPendingCount(data.pendingCount);
        const orders = Array.isArray(data.awaitingOrders) ? data.awaitingOrders : [];
        const ordersCount = typeof data.awaitingOrdersCount === "number" ? data.awaitingOrdersCount : orders.length;
        setAwaitingOrders(orders);
        setAwaitingOrdersCount(ordersCount);
        setLoaded(true);
        setError(false);
        announceNew(data.notifications, orders, ordersCount);
      } catch {
        if (mountedRef.current) setError(true);
      } finally {
        inflightRef.current = null;
      }
    })();

    inflightRef.current = run;
    return run;
  }, [announceNew]);

  // A primeira consulta acontece uma vez só, ao montar (mudar de polling quando o tempo real conecta
  // não pode disparar outra)
  React.useEffect(() => {
    if (!enabled) return;
    mountedRef.current = true;
    void refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh, enabled]);

  React.useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, realtime ? SAFETY_POLL_MS : NOTIFICATIONS_POLL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh, realtime, enabled]);

  // Tempo real: o servidor avisa quando uma notificação nasce ou é resolvida (ver lib/realtime.ts)
  React.useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    const stop = openEventStream({
      tokenUrl: "/api/realtime/staff-token",
      onConnectedChange: setRealtime,
      onEvent: (name) => {
        if (name !== "notification.changed") return;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => void refresh(), REALTIME_DEBOUNCE_MS);
      },
    });
    return () => {
      window.clearTimeout(timer);
      stop();
    };
  }, [refresh, enabled]);

  const markRead = React.useCallback(
    async (id: string) => {
      const target = notifications.find((n) => n.id === id);
      if (target && !target.readAt) {
        const readAt = new Date().toISOString();
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt } : n)));
        // O que ainda pede ação continua contando no sino
        if (target.resolvedAt) setBadgeCount((prev) => Math.max(0, prev - 1));
      }
      try {
        await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
      } catch {
        // O próximo refresh reconcilia
      }
      await refresh();
    },
    [notifications, refresh]
  );

  const markResolved = React.useCallback(
    async (id: string): Promise<boolean> => {
      const target = notifications.find((n) => n.id === id);
      const now = new Date().toISOString();
      // Some do sino na hora; se o servidor recusar, o refresh traz de volta
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? now, resolvedAt: n.resolvedAt ?? now } : n)));
      if (target && (!target.readAt || !target.resolvedAt)) setBadgeCount((prev) => Math.max(0, prev - 1));
      let ok = false;
      try {
        const response = await fetch(`/api/notifications/${encodeURIComponent(id)}/resolve`, { method: "POST" });
        ok = response.ok;
      } catch {
        // O próximo refresh reconcilia
      }
      await refresh();
      return ok;
    },
    [notifications, refresh]
  );

  const markAllRead = React.useCallback(async () => {
    const readAt = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt })));
    setBadgeCount(pendingCount);
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
    } catch {
      // O próximo refresh reconcilia
    }
    await refresh();
  }, [pendingCount, refresh]);

  const pendingPayments = React.useMemo(
    () =>
      notifications
        .filter(isPendingPayment)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [notifications]
  );
  // O servidor conta todos; a lista só tem os carregados. O maior dos dois não subconta.
  const pendingPaymentsCount = Math.max(pendingPayments.length, pendingCount - awaitingOrdersCount, 0);

  return {
    notifications,
    badgeCount,
    pendingCount,
    awaitingOrders,
    awaitingOrdersCount,
    pendingPayments,
    pendingPaymentsCount,
    loaded,
    error,
    refresh,
    markRead,
    markResolved,
    markAllRead,
  };
}
