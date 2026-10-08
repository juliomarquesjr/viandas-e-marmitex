"use client";

import { useSession } from "next-auth/react";
import * as React from "react";
import { openEventStream } from "@/lib/realtime-stream";

/** Mesmos nomes de lib/realtime.ts (o servidor). O sinal só diz "mudou"; os dados vêm das APIs de sempre. */
export type CustomerEvent = "pre-order.updated" | "ficha.updated" | "payment-intent.reviewed";

type Listener = (event: CustomerEvent) => void;

interface RealtimeValue {
  /** Conectado ao Ably agora; sem isso as telas ficam só no polling. */
  connected: boolean;
  subscribe: (listener: Listener) => () => void;
}

const RealtimeContext = React.createContext<RealtimeValue>({ connected: false, subscribe: () => () => undefined });

const EVENTS: CustomerEvent[] = ["pre-order.updated", "ficha.updated", "payment-intent.reviewed"];

/**
 * Uma conexão com o Ably para a área do cliente inteira (ver lib/realtime-stream.ts). Sem a chave
 * no servidor, ou se qualquer coisa falhar, nada muda e as telas seguem com o polling de sempre.
 */
export function CustomerRealtimeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const customerId = (session?.user as { customerId?: string } | undefined)?.customerId;

  const listeners = React.useRef(new Set<Listener>());
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    if (!customerId) return;
    return openEventStream({
      tokenUrl: "/api/customer/realtime-token",
      onConnectedChange: setConnected,
      onEvent: (name) => {
        if (EVENTS.includes(name as CustomerEvent)) listeners.current.forEach((listener) => listener(name as CustomerEvent));
      },
    });
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
