"use client";

import * as React from "react";
import {
  playAlertBeep,
  readAlertSoundPreference,
  saveAlertSoundPreference,
} from "./alertSound";
import { useNotificationsEngine, type UseNotificationsResult } from "./useNotifications";

export interface NotificationsContextValue extends UseNotificationsResult {
  /** Beep quando chega algo novo que pede ação (preferência guardada neste navegador). */
  soundEnabled: boolean;
  /** Ligar já toca um teste: o clique é o gesto que libera o áudio no navegador. */
  setSoundEnabled: (enabled: boolean) => void;
  /** Muda a cada pedido para abrir o histórico de notificações (quem o abre é o sino). */
  historyRequest: number;
  requestHistory: () => void;
}

const noop = async () => {};

const FALLBACK: NotificationsContextValue = {
  notifications: [],
  badgeCount: 0,
  pendingCount: 0,
  awaitingOrders: [],
  awaitingOrdersCount: 0,
  pendingPayments: [],
  pendingPaymentsCount: 0,
  loaded: false,
  error: false,
  refresh: noop,
  markRead: noop,
  markResolved: async () => false,
  markAllRead: noop,
  soundEnabled: false,
  setSoundEnabled: () => {},
  historyRequest: 0,
  requestHistory: () => {},
};

const NotificationsContext = React.createContext<NotificationsContextValue>(FALLBACK);

/** Estado único das notificações do admin: sino, tela inicial, título da aba e barra lateral leem daqui. */
export function useNotificationsContext(): NotificationsContextValue {
  return React.useContext(NotificationsContext);
}

const TITLE_PREFIX = /^\((?:\d+|99\+)\)\s+/;

function stripTitlePrefix(title: string): string {
  return title.replace(TITLE_PREFIX, "");
}

/** "(3) Viandas…" na aba enquanto há algo esperando; reaplica quando o Next troca o título. */
function useTabTitleCount(count: number, enabled: boolean) {
  React.useEffect(() => {
    if (!enabled) return;
    const prefix = count > 0 ? `(${count > 99 ? "99+" : count}) ` : "";
    const apply = () => {
      const next = prefix + stripTitlePrefix(document.title);
      if (document.title !== next) document.title = next;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [count, enabled]);

  // Ao sair do admin, devolve o título como era
  React.useEffect(
    () => () => {
      document.title = stripTitlePrefix(document.title);
    },
    []
  );
}

export function NotificationsProvider({ children, enabled = true }: { children: React.ReactNode; enabled?: boolean }) {
  const engine = useNotificationsEngine({ enabled });
  const { badgeCount, pendingCount, loaded } = engine;

  const [soundEnabled, setSoundState] = React.useState(false);
  const [historyRequest, setHistoryRequest] = React.useState(0);

  React.useEffect(() => {
    setSoundState(readAlertSoundPreference());
  }, []);

  const setSoundEnabled = React.useCallback((next: boolean) => {
    setSoundState(next);
    saveAlertSoundPreference(next);
    if (next) playAlertBeep();
  }, []);

  const requestHistory = React.useCallback(() => setHistoryRequest((n) => n + 1), []);

  // Beep só quando o que pede ação AUMENTA depois da primeira carga
  const previousPending = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!loaded) return;
    if (previousPending.current !== null && pendingCount > previousPending.current && soundEnabled) {
      playAlertBeep();
    }
    previousPending.current = pendingCount;
  }, [loaded, pendingCount, soundEnabled]);

  useTabTitleCount(loaded ? badgeCount : 0, enabled);

  const value = React.useMemo<NotificationsContextValue>(
    () => ({ ...engine, soundEnabled, setSoundEnabled, historyRequest, requestHistory }),
    [engine, soundEnabled, setSoundEnabled, historyRequest, requestHistory]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
