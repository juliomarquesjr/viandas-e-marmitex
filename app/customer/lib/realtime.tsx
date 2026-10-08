"use client";

import { useSession } from "next-auth/react";
import * as React from "react";

/** Mesmos nomes de lib/realtime.ts (o servidor). O sinal só diz "mudou"; os dados vêm das APIs de sempre. */
export type CustomerEvent = "pre-order.updated" | "ficha.updated";

type Listener = (event: CustomerEvent) => void;

interface RealtimeValue {
  /** Conectado ao Ably agora; sem isso as telas ficam só no polling. */
  connected: boolean;
  subscribe: (listener: Listener) => () => void;
}

const RealtimeContext = React.createContext<RealtimeValue>({ connected: false, subscribe: () => () => undefined });

const EVENTS: CustomerEvent[] = ["pre-order.updated", "ficha.updated"];

/** Canal de eventos do Ably (Server-Sent Events): o navegador ouve direto, sem biblioteca. */
const ABLY_EVENT_STREAM = "https://realtime.ably.io/event-stream";
/** Pede outro token um pouco antes de o atual vencer. */
const RENEW_MARGIN_MS = 5 * 60 * 1000;
const RETRY_MIN_MS = 5_000;
const RETRY_MAX_MS = 60_000;

interface TokenResponse {
  token: string;
  expires: number;
  channel: string;
}

/**
 * Uma conexão com o Ably para a área do cliente inteira, pelo canal de eventos nativo (EventSource,
 * que o navegador já reconecta sozinho). O token só deixa ouvir o canal do próprio cliente. Sem a
 * chave no servidor (a rota de token responde 204), ou se qualquer coisa falhar, nada muda e as
 * telas seguem com o polling de sempre.
 */
export function CustomerRealtimeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const customerId = (session?.user as { customerId?: string } | undefined)?.customerId;

  const listeners = React.useRef(new Set<Listener>());
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    if (!customerId) return;

    let stopped = false;
    let source: EventSource | null = null;
    let timer: number | undefined;
    let retryMs = RETRY_MIN_MS;

    const disconnect = () => {
      source?.close();
      source = null;
      window.clearTimeout(timer);
    };

    const connect = async () => {
      disconnect();
      try {
        const response = await fetch("/api/customer/realtime-token", { cache: "no-store" });
        // Sem chave configurada (204) ou sem sessão: sem tempo real, e não adianta tentar de novo
        if (response.status === 204 || response.status === 401) return;
        if (!response.ok) throw new Error(`token ${response.status}`);
        const { token, expires, channel } = (await response.json()) as TokenResponse;
        if (stopped) return;

        const url = `${ABLY_EVENT_STREAM}?${new URLSearchParams({ channels: channel, v: "1.2", accessToken: token })}`;
        const es = new EventSource(url);
        source = es;

        es.onopen = () => {
          retryMs = RETRY_MIN_MS;
          setConnected(true);
        };
        es.onmessage = (message) => {
          try {
            const name = (JSON.parse(message.data) as { name?: string }).name as CustomerEvent;
            if (EVENTS.includes(name)) listeners.current.forEach((listener) => listener(name));
          } catch {
            // mensagem que não é nossa: ignora
          }
        };
        // Token vencido ou rede caída: fecha, avisa as telas (voltam ao polling rápido) e tenta de novo
        es.onerror = () => {
          setConnected(false);
          disconnect();
          if (stopped) return;
          timer = window.setTimeout(connect, retryMs);
          retryMs = Math.min(retryMs * 2, RETRY_MAX_MS);
        };

        // Renova antes de o token vencer
        timer = window.setTimeout(connect, Math.max(RETRY_MIN_MS, expires - Date.now() - RENEW_MARGIN_MS));
      } catch {
        if (stopped) return;
        timer = window.setTimeout(connect, retryMs);
        retryMs = Math.min(retryMs * 2, RETRY_MAX_MS);
      }
    };

    void connect();

    return () => {
      stopped = true;
      disconnect();
      setConnected(false);
    };
  }, [customerId]);

  const value = React.useMemo<RealtimeValue>(
    () => ({
      connected,
      subscribe: (listener) => {
        listeners.current.add(listener);
        return () => listeners.current.delete(listener);
      },
    }),
    [connected]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export const useRealtimeConnected = () => React.useContext(RealtimeContext).connected;

const DEBOUNCE_MS = 250;

/**
 * Chama `handler` quando um destes eventos chega. Vários eventos em sequência (um pedido que vira
 * venda na ficha publica dois) viram uma chamada só.
 */
export function useRealtimeEvent(events: CustomerEvent | CustomerEvent[], handler: () => void) {
  const { subscribe } = React.useContext(RealtimeContext);
  const latest = React.useRef(handler);
  latest.current = handler;
  const wanted = Array.isArray(events) ? events.join(",") : events;

  React.useEffect(() => {
    let timer: number | undefined;
    const off = subscribe((event) => {
      if (!wanted.split(",").includes(event)) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => latest.current(), DEBOUNCE_MS);
    });
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, [subscribe, wanted]);
}
