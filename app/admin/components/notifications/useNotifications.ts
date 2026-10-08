"use client";

import * as React from "react";
import { useToast } from "@/app/components/Toast";
import type { NotificationDTO, NotificationListResponse } from "@/lib/notification-types";
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
  badgeCount: number;
  pendingCount: number;
  /** Já houve ao menos uma resposta com sucesso. */
  loaded: boolean;
  /** A última consulta falhou (o último dado bom continua disponível). */
  error: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
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

/**
 * Notificações do sino: o servidor avisa pelo tempo real (Ably) e a consulta periódica fica como
 * rede de segurança (30 s sem conexão, 2 min com ela).
 * Falha de rede nunca derruba nada: mantém o último dado e tenta de novo no ciclo seguinte.
 */
export function useNotifications(): UseNotificationsResult {
  const { showToast } = useToast();
  const [notifications, setNotifications] = React.useState<NotificationDTO[]>([]);
  const [badgeCount, setBadgeCount] = React.useState(0);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [realtime, setRealtime] = React.useState(false);

  const mountedRef = React.useRef(true);
  const inflightRef = React.useRef<Promise<void> | null>(null);
  /** Ids já vistos; o aviso na hora só vale para o que chegar depois da primeira carga. */
  const seenRef = React.useRef<Set<string>>(new Set());
  const baselineRef = React.useRef(false);

  const announceNew = React.useCallback(
    (list: NotificationDTO[]) => {
      const seen = seenRef.current;
      const fresh = list.filter((n) => !seen.has(n.id) && !n.resolvedAt);
      list.forEach((n) => seen.add(n.id));
      if (!baselineRef.current) {
        baselineRef.current = true;
        return;
      }
      if (fresh.length === 0) return;
      if (fresh.length > MAX_INDIVIDUAL_TOASTS) {
        showToast("Abra o sino para revisar.", "info", `${fresh.length} novas notificações`);
        return;
      }
      // Da mais antiga para a mais nova, para a última chegada ficar por cima
      [...fresh].reverse().forEach((n) => showToast("Abra o sino para revisar.", "info", n.title));
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
        setLoaded(true);
        setError(false);
        announceNew(data.notifications);
      } catch {
        if (mountedRef.current) setError(true);
      } finally {
        inflightRef.current = null;
      }
    })();

    inflightRef.current = run;
    return run;
  }, [announceNew]);

  React.useEffect(() => {
    mountedRef.current = true;
    void refresh();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, realtime ? SAFETY_POLL_MS : NOTIFICATIONS_POLL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh, realtime]);

  // Tempo real: o servidor avisa quando uma notificação nasce ou é resolvida (ver lib/realtime.ts)
  React.useEffect(() => {
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
  }, [refresh]);

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

  return { notifications, badgeCount, pendingCount, loaded, error, refresh, markRead, markAllRead };
}
