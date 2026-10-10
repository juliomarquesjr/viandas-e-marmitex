"use client";

import * as React from "react";
import {
  isAlertDue,
  playPendingSound,
  readAlertSoundPreference,
  readLastPlayedAt,
  saveAlertSoundPreference,
  saveLastPlayedAt,
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
  /** Conversas do WhatsApp com mensagem nova (0 para quem não é administrador). */
  chatUnread: number;
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
  chatUnread: 0,
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

const CHAT_POLL_MS = 20_000;

/**
 * Quantas conversas do WhatsApp têm mensagem nova. Fica no provider, e não no item do menu, para valer em
 * qualquer tela do admin (inclusive com o menu recolhido ou fechado no celular) e para entrar no título da aba.
 */
function useChatUnread(enabled: boolean): number {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }
    let alive = true;
    const load = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/admin/whatsapp/unread", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : { count: 0 }))
        .then((data: { count?: number }) => alive && setCount(data.count ?? 0))
        .catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, CHAT_POLL_MS);
    // voltar para a aba atualiza na hora, sem esperar o próximo ciclo
    document.addEventListener("visibilitychange", load);
    window.addEventListener("focus", load);
    window.addEventListener("whatsapp-unread-changed", load);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
      window.removeEventListener("focus", load);
      window.removeEventListener("whatsapp-unread-changed", load);
    };
  }, [enabled]);
  return count;
}

export function NotificationsProvider({
  children,
  enabled = true,
  chatEnabled = false,
}: {
  children: React.ReactNode;
  enabled?: boolean;
  /** Só administradores veem as conversas do WhatsApp. */
  chatEnabled?: boolean;
}) {
  const engine = useNotificationsEngine({ enabled });
  const chatUnread = useChatUnread(enabled && chatEnabled);
  const { badgeCount, pendingCount, loaded } = engine;

  const [soundEnabled, setSoundState] = React.useState(false);
  const [historyRequest, setHistoryRequest] = React.useState(0);

  React.useEffect(() => {
    setSoundState(readAlertSoundPreference());
  }, []);

  const setSoundEnabled = React.useCallback((next: boolean) => {
    setSoundState(next);
    saveAlertSoundPreference(next);
    if (next) void playPendingSound(); // o clique no botão é o gesto que libera o áudio no navegador
  }, []);

  const requestHistory = React.useCallback(() => setHistoryRequest((n) => n + 1), []);

  // Som enquanto houver pagamento não confirmado ou pedido aguardando: toca ao aparecer algo novo e se repete
  // a cada 5 minutos até tudo ser resolvido. O horário do último aviso fica no navegador, então recarregar a
  // página ou abrir outra aba não faz tocar de novo antes da hora. Se o navegador ainda bloquear o áudio
  // (nenhum clique na página), tenta de novo no próximo ciclo. Vale para a área administrativa: o PDV não
  // carrega notificações.
  const previousPending = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!loaded) return;
    // na primeira carga não força: quem recarrega a página não ouve o aviso de novo antes da hora
    const increased = previousPending.current !== null && pendingCount > previousPending.current;
    previousPending.current = pendingCount;
    if (pendingCount === 0) saveLastPlayedAt(0);
    if (!soundEnabled || pendingCount === 0) return;

    let cancelled = false;
    let playing = false;
    const tick = async (force: boolean) => {
      if (cancelled || playing) return; // aba em segundo plano também avisa: o operador costuma deixá-la aberta
      if (!force && !isAlertDue(Date.now(), readLastPlayedAt())) return;
      playing = true;
      const played = await playPendingSound();
      playing = false;
      if (played && !cancelled) saveLastPlayedAt(Date.now());
    };
    void tick(increased);
    const timer = window.setInterval(() => void tick(false), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [loaded, pendingCount, soundEnabled]);

  useTabTitleCount((loaded ? badgeCount : 0) + chatUnread, enabled);

  const value = React.useMemo<NotificationsContextValue>(
    () => ({ ...engine, soundEnabled, setSoundEnabled, historyRequest, requestHistory, chatUnread }),
    [engine, soundEnabled, setSoundEnabled, historyRequest, requestHistory, chatUnread]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
