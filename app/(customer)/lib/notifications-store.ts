"use client";

import { useEffect, useSyncExternalStore } from "react";
import { seenKey } from "@/lib/customer-notice-keys";
import { backfillOnce, flushDismissals, syncDismissed, syncUndo } from "./dismissals";

export type NoticeTone = "go" | "prog" | "done" | "off" | "pay";
export type NoticeKind = "order" | "buy" | "pay" | "menu";

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
 * Os avisos do cliente, em um lugar só: o sino do cabeçalho, o do menu lateral e a folha de
 * avisos leem daqui, então a busca acontece uma vez e todos mostram o mesmo número.
 *
 * O que o cliente já viu e o que ele limpou vale para todos os aparelhos: fica no servidor
 * (CustomerDismissal; o "visto" com a chave `seen:<aviso>`) e uma cópia no aparelho (localStorage)
 * serve de reserva sem internet. Tocar num aviso, marcá-lo como visto ou limpá-lo mexe só nele, e
 * a contagem do sino acompanha. Nada vira "visto" sozinho pelo tempo: quem decide é o cliente.
 */
interface State {
  items: Notice[];
  loaded: boolean;
  /**
   * Só em aparelhos que já usavam o aplicativo antes de o "visto" ir para o servidor: avisos até esta
   * data já apareciam como vistos, então entram como vistos uma vez e a regra deixa de existir.
   */
  legacyBaseline: string | null;
  read: ReadonlySet<string>;
  dismissed: ReadonlySet<string>;
  /** O que o último "limpar" tirou, para o "Desfazer". */
  lastCleared: readonly string[];
}

const POLL_MS = 60_000;
/** O feed cobre 30 dias; guardar mais que isso de ids só incharia o armazenamento. */
const MAX_STORED = 300;

const EMPTY: State = {
  items: [],
  loaded: false,
  legacyBaseline: null,
  read: new Set(),
  dismissed: new Set(),
  lastCleared: [],
};

let state: State = EMPTY;
let customerKey = "";
let timer: number | null = null;
let consumers = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => state;
// O React compara o valor do servidor entre chamadas: precisa ser sempre o mesmo objeto
const getServerSnapshot = () => EMPTY;

const storageKey = () => `customer:notices:${customerKey}`;

interface Stored {
  /** Só existe em aparelhos de antes; ver State.legacyBaseline. */
  baseline?: string;
  read: string[];
  dismissed: string[];
}

function readStored(): Pick<State, "legacyBaseline" | "read" | "dismissed"> {
  try {
    const raw = window.localStorage.getItem(storageKey());
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Stored>;
      return {
        legacyBaseline: typeof parsed.baseline === "string" ? parsed.baseline : null,
        read: new Set(Array.isArray(parsed.read) ? parsed.read : []),
        dismissed: new Set(Array.isArray(parsed.dismissed) ? parsed.dismissed : []),
      };
    }
  } catch {
    // sem armazenamento ou conteúdo estragado: começa do zero
  }
  return { legacyBaseline: null, read: new Set(), dismissed: new Set() };
}

const lastN = (ids: ReadonlySet<string>) => [...ids].slice(-MAX_STORED);

function persist(next: State) {
  if (!customerKey) return; // sem cliente identificado (saiu da conta): não há de quem guardar
  try {
    const stored: Stored = { ...(next.legacyBaseline ? { baseline: next.legacyBaseline } : {}), read: lastN(next.read), dismissed: lastN(next.dismissed) };
    window.localStorage.setItem(storageKey(), JSON.stringify(stored));
  } catch {
    // sem armazenamento: o que foi visto volta como novo na próxima visita
  }
}

function update(patch: Partial<State>) {
  const next = { ...state, ...patch };
  persist(next);
  emit(next);
}

/** Busca os avisos; chamadas repetidas enquanto uma está em andamento aproveitam a mesma. */
export function loadNotices(): Promise<void> {
  if (inflight) return inflight;
  inflight = fetch("/api/customer/notifications", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((body: { data?: Notice[]; seen?: string[] } | null) => {
      if (body?.data) applyLoaded(body.data, body.seen ?? []);
      void flushDismissals();
    })
    .catch(() => undefined)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Junta o que o servidor sabe (o "visto" de qualquer aparelho) com o que este aparelho já tinha. */
function applyLoaded(items: Notice[], seenOnServer: string[]) {
  const read = new Set(state.read);
  seenOnServer.forEach((id) => read.add(id));

  // Aparelho de antes: o que já aparecia como visto por ser antigo passa a ser visto de verdade, uma vez só
  const migrated: string[] = [];
  const baseline = state.legacyBaseline;
  if (baseline) {
    for (const notice of items) {
      if (notice.at <= baseline && !read.has(notice.id) && !state.dismissed.has(notice.id)) {
        read.add(notice.id);
        migrated.push(notice.id);
      }
    }
  }

  update({ items, loaded: true, read, legacyBaseline: null });
  syncDismissed(migrated.map(seenKey));
}

export const isNoticeUnread = (s: Pick<State, "read" | "dismissed">, notice: Notice) =>
  !s.dismissed.has(notice.id) && !s.read.has(notice.id);

/** Marca um aviso como visto (tocar nele ou usar o botão de visto). */
export function markNoticeRead(id: string) {
  if (state.read.has(id)) return;
  update({ read: new Set(state.read).add(id) });
  syncDismissed([seenKey(id)]);
}

/** Marca todos os avisos de agora como vistos. */
export function markAllNoticesRead() {
  const read = new Set(state.read);
  const fresh = state.items.filter((notice) => !read.has(notice.id)).map((notice) => notice.id);
  if (fresh.length === 0) return;
  fresh.forEach((id) => read.add(id));
  update({ read });
  syncDismissed(fresh.map(seenKey));
}

/** Limpa um aviso (ele some da lista; "Desfazer" traz de volta). */
export function dismissNotice(id: string) {
  update({ dismissed: new Set(state.dismissed).add(id), lastCleared: [id] });
  syncDismissed([id]);
}

/** Limpa todos os avisos da lista. */
export function dismissAllNotices() {
  const ids = state.items.filter((notice) => !state.dismissed.has(notice.id)).map((notice) => notice.id);
  if (ids.length === 0) return;
  const dismissed = new Set(state.dismissed);
  ids.forEach((id) => dismissed.add(id));
  update({ dismissed, lastCleared: ids });
  syncDismissed(ids);
}

/** Desfaz o último "limpar". */
export function undoClearNotices() {
  if (state.lastCleared.length === 0) return;
  const undone = [...state.lastCleared];
  const dismissed = new Set(state.dismissed);
  undone.forEach((id) => dismissed.delete(id));
  update({ dismissed, lastCleared: [] });
  // o servidor já tinha escondido esses avisos: depois de esquecer, busca de novo para eles voltarem
  void syncUndo(undone).then(() => loadNotices());
}

/** Esquece o que sabe, para a próxima conta que entrar não ver os avisos da anterior. */
export function resetNotices() {
  customerKey = "";
  emit(EMPTY);
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
 * `customerId` separa o "visto" e o "limpo" de cada cliente no mesmo aparelho. Enquanto o sino
 * estiver na tela, os avisos se atualizam sozinhos a cada minuto e quando o aplicativo volta ao
 * primeiro plano.
 */
export function useNotices(customerId: string | undefined) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!customerId) return;
    if (customerKey !== customerId) {
      customerKey = customerId;
      const stored = readStored();
      emit({ ...EMPTY, ...stored });
      // o que foi limpo só neste aparelho, antes de existir o guardado no servidor, sobe uma vez
      backfillOnce(`notices:${customerId}`, [...stored.dismissed]);
      // o mesmo para o que já foi marcado como visto só neste aparelho
      backfillOnce(`notices-seen:${customerId}`, [...stored.read].map(seenKey));
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

  const items = snapshot.items.filter((notice) => !snapshot.dismissed.has(notice.id));
  const unread = items.filter((notice) => isNoticeUnread(snapshot, notice)).length;
  return {
    items,
    loaded: snapshot.loaded,
    unread,
    canUndo: snapshot.lastCleared.length > 0,
    clearedCount: snapshot.lastCleared.length,
    isUnread: (notice: Notice) => isNoticeUnread(snapshot, notice),
  };
}
