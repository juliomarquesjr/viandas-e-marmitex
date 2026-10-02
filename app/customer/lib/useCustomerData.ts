"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface CustomerDataState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  /** Busca de novo, mantendo os dados atuais na tela enquanto isso. */
  reload: () => void;
}

/**
 * Busca um endpoint da área do cliente.
 *
 * Sessão vencida (401) volta para o login em vez de mostrar números zerados,
 * e qualquer outra falha vira `error`, para a tela oferecer "Tentar de novo".
 * Passar `null` como URL não busca nada.
 */
export function useCustomerData<T>(url: string | null): CustomerDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(url !== null);
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.href = "/customer/login";
          return;
        }
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(body?.error || "Não foi possível carregar agora.");
        }
        if (mounted.current) setData(body as T);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || !mounted.current) return;
        setError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Sem conexão. Confira a internet e tente de novo.");
      })
      .finally(() => {
        if (!controller.signal.aborted && mounted.current) setLoading(false);
      });

    return () => controller.abort();
  }, [url, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { data, error, loading, reload };
}
