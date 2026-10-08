"use client";

import { useEffect, useSyncExternalStore } from "react";

export type NoticeTone = "go" | "prog" | "done" | "off" | "pay";
export type NoticeKind = "order" | "buy" | "pay";

export interface Notice {
  id: string;
  kind: NoticeKind;
  tone: NoticeTone;
  title: string;
  text: string;
  at: string;
  href: string;
}

/**
 * Os avisos do cliente, em um lugar só: o sino do cabeçalho e o do menu lateral leem daqui,
 * então a busca acontece uma vez e os dois mostram o mesmo número.
 *
 * Quais avisos já foram vistos fica no aparelho (localStorage), guardado como "visto até
 * esta hora" por cliente. Na primeira vez que o aparelho entra, vale o último dia.
 */
interface State {
  items: Notice[];
  loaded: boolean;
  seenAt: string;
}

const POLL_MS = 60_000;
const FIRST_VISIT_WINDOW_MS = 24 * 60 * 60 * 1000;

let state: State = { items: [], loaded: false, seenAt: "" };
let customerKey = "";
let timer: number | null = null;
let consumers = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

// O React compara o valor do servidor entre chamadas: precisa ser sempre o mesmo objeto
const SERVER_STATE: State = state;

function emit(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => state;
const getServerSnapshot = () => SERVER_STATE;

const storageKey = () => `customer:notices-seen:${customerKey}`;

function readSeenAt(): string {
  try {
    const stored = window.localStorage.getItem(storageKey());
    if (stored) return stored;
  } catch {
    // sem armazenamento (janela privada): vale só nesta visita
  }
  return new Date(Date.now() - FIRST_VISIT_WINDOW_MS).toISOString();
}

function writeSeenAt(value: string) {
  try {
    window.localStorage.setItem(storageKey(), value);
  } catch {
    // sem armazenamento: o aviso volta como novo na próxima visita
  }
}

/** Busca os avisos; chamadas repetidas enquanto uma está em andamento aproveitam a mesma. */
export function loadNotices(): Promise<void> {
  if (inflight) return inflight;
  inflight = fetch("/api/customer/notifications", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((body: { data?: Notice[] } | null) => {
      if (body?.data) emit({ ...state, items: body.data, loaded: true });
    })
    .catch(() => undefined)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Marca tudo o que existe agora como visto. */
export function markNoticesSeen() {
  const newest = state.items[0]?.at;
  if (!newest || newest <= state.seenAt) return;
  writeSeenAt(newest);
  emit({ ...state, seenAt: newest });
}

/** Esquece o que sabe, para a próxima conta que entrar não ver os avisos da anterior. */
export function resetNotices() {
  customerKey = "";
  state = { items: [], loaded: false, seenAt: "" };
  listeners.forEach((listener) => listener());
}

function start() {
  if (timer !== null) return;
  timer = window.setInterval(() => {
    if (document.visibilityState === "visible") void loadNotices();
  }, POLL_MS);
}

function stop() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
}

/**
 * `customerId` separa o "visto" de cada cliente no mesmo aparelho. Enquanto o sino estiver
 * na tela, os avisos se atualizam sozinhos a cada minuto e quando o aplicativo volta ao primeiro plano.
 */
export function useNotices(customerId: string | undefined) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!customerId) return;
    if (customerKey !== customerId) {
      customerKey = customerId;
      emit({ items: [], loaded: false, seenAt: readSeenAt() });
    }
    consumers += 1;
    start();
    void loadNotices();

    const onVisible = () => {
      if (document.visibilityState === "visible") void loadNotices();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      consumers -= 1;
      if (consumers <= 0) {
        consumers = 0;
        stop();
      }
    };
  }, [customerId]);

  const unread = snapshot.items.filter((item) => item.at > snapshot.seenAt).length;
  return { items: snapshot.items, loaded: snapshot.loaded, seenAt: snapshot.seenAt, unread };
}
