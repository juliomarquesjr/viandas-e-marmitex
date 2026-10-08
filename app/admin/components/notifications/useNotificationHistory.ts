"use client";

import * as React from "react";
import type { NotificationDTO, NotificationListResponse } from "@/lib/notification-types";

export type HistoryFilter = "all" | "pending";

const PAGE_SIZE = 20;

interface Options {
  /** Só busca enquanto o modal está aberto. */
  enabled: boolean;
  filter: HistoryFilter;
  /** Muda quando algo foi resolvido fora do histórico; força nova busca. */
  version: number;
}

export interface UseNotificationHistoryResult {
  items: NotificationDTO[];
  loading: boolean;
  loadingMore: boolean;
  error: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  reload: () => Promise<void>;
  markLocalRead: (id: string) => void;
}

async function fetchPage(filter: HistoryFilter, before: string | null): Promise<NotificationListResponse> {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (filter === "pending") params.set("filter", "pending");
  if (before) params.set("before", before);
  const response = await fetch(`/api/notifications?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = (await response.json()) as NotificationListResponse;
  if (!Array.isArray(data?.notifications)) throw new Error("Resposta inesperada");
  return data;
}

/** Histórico completo das notificações, com abas e paginação por `nextBefore`. */
export function useNotificationHistory({ enabled, filter, version }: Options): UseNotificationHistoryResult {
  const [items, setItems] = React.useState<NotificationDTO[]>([]);
  const [nextBefore, setNextBefore] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState(false);
  const requestRef = React.useRef(0);

  const load = React.useCallback(
    async (silent: boolean) => {
      const request = ++requestRef.current;
      if (!silent) setLoading(true);
      try {
        const data = await fetchPage(filter, null);
        if (request !== requestRef.current) return;
        setItems(data.notifications);
        setNextBefore(data.nextBefore);
        setError(false);
      } catch {
        if (request === requestRef.current) setError(true);
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    },
    [filter]
  );

  React.useEffect(() => {
    if (!enabled) return;
    // Troca de aba mostra o carregando; nova versão (algo foi resolvido) atualiza sem piscar
    void load(false);
  }, [enabled, load]);

  const versionRef = React.useRef(version);
  React.useEffect(() => {
    if (versionRef.current === version) return;
    versionRef.current = version;
    if (enabled) void load(true);
  }, [version, enabled, load]);

  const loadMore = React.useCallback(async () => {
    if (!nextBefore || loadingMore) return;
    const request = requestRef.current;
    setLoadingMore(true);
    try {
      const data = await fetchPage(filter, nextBefore);
      if (request !== requestRef.current) return;
      setItems((prev) => {
        const known = new Set(prev.map((n) => n.id));
        return [...prev, ...data.notifications.filter((n) => !known.has(n.id))];
      });
      setNextBefore(data.nextBefore);
      setError(false);
    } catch {
      if (request === requestRef.current) setError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [filter, nextBefore, loadingMore]);

  const markLocalRead = React.useCallback((id: string) => {
    const readAt = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt } : n)));
  }, []);

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore: nextBefore !== null,
    loadMore,
    reload: () => load(false),
    markLocalRead,
  };
}
