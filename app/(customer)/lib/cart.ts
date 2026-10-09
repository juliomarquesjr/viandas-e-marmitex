"use client";

/**
 * Carrinho do pedido online.
 *
 * Fica no aparelho (localStorage), uma chave por cliente, e vale 24 h. Todo acesso ao
 * armazenamento é protegido: janela privada, dados bloqueados ou cota cheia não podem
 * derrubar a tela nem esvaziar o carrinho que está na memória.
 *
 * O carrinho guarda só o que o cliente escolheu (produto e quantidade) mais o nome, a foto e
 * o último preço visto, para mostrar algo mesmo se o cardápio não carregar. Quem decide preço,
 * horário e estoque é sempre o servidor: a tela confere o carrinho contra o cardápio atual
 * (resolveLines) e o servidor confere de novo ao enviar.
 */

import * as React from "react";
import type { MenuProduct, OrderingMenu } from "./types";

export interface CartLine {
  productId: string;
  name: string;
  /** Último preço visto; o preço de verdade vem do cardápio atual. */
  priceCents: number;
  imageUrl: string | null;
  quantity: number;
}

/** Uma tentativa de envio: a mesma chave se repete enquanto o conteúdo do carrinho não muda. */
export interface SendAttempt {
  key: string;
  fingerprint: string;
  startedAt: number;
  /** Sem resposta definitiva do servidor (rede caiu, tempo esgotou): o pedido pode ter chegado. */
  unsure: boolean;
}

export interface CartState {
  lines: CartLine[];
  notes: string;
  attempt: SendAttempt | null;
}

interface StoredCart extends CartState {
  v: 1;
  savedAt: number;
}

const TTL_MS = 24 * 60 * 60 * 1000;
/** Quanto tempo uma tentativa de envio pode ser repetida com a mesma chave (30 min). */
const RETRY_KEY_MAX_AGE_MS = 30 * 60 * 1000;

const EMPTY: CartState = { lines: [], notes: "", attempt: null };

const storageKey = (customerId: string) => `viandas:pedido-online:${customerId}`;

function readStored(customerId: string): CartState {
  try {
    const raw = window.localStorage.getItem(storageKey(customerId));
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<StoredCart> | null;
    if (!parsed || parsed.v !== 1 || typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > TTL_MS) {
      window.localStorage.removeItem(storageKey(customerId));
      return EMPTY;
    }
    const lines = (Array.isArray(parsed.lines) ? parsed.lines : []).filter(
      (line): line is CartLine =>
        !!line &&
        typeof line.productId === "string" &&
        typeof line.name === "string" &&
        Number.isInteger(line.quantity) &&
        line.quantity > 0 &&
        Number.isFinite(line.priceCents)
    );
    const attempt = parsed.attempt && typeof parsed.attempt.key === "string" ? parsed.attempt : null;
    return { lines, notes: typeof parsed.notes === "string" ? parsed.notes : "", attempt };
  } catch {
    return EMPTY;
  }
}

function writeStored(customerId: string, state: CartState) {
  try {
    if (state.lines.length === 0 && !state.notes && !state.attempt) {
      window.localStorage.removeItem(storageKey(customerId));
      return;
    }
    const stored: StoredCart = { v: 1, savedAt: Date.now(), ...state };
    window.localStorage.setItem(storageKey(customerId), JSON.stringify(stored));
  } catch {
    // sem armazenamento: o carrinho segue vivo na memória desta aba
  }
}

/** Chave de idempotência: UUID; o servidor aceita letras, números, "-" e "_" (8 a 100). */
function newKey(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // contexto sem crypto.randomUUID (http fora de localhost): cai no gerador abaixo
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Impressão digital do que vai no pedido (produtos, quantidades e observação). */
export function fingerprintOf(state: Pick<CartState, "lines" | "notes">): string {
  const items = [...state.lines].sort((a, b) => a.productId.localeCompare(b.productId)).map((l) => `${l.productId}:${l.quantity}`);
  return `${items.join(",")}|${state.notes.trim()}`;
}

export type CartProduct = Pick<MenuProduct, "id" | "name" | "priceCents" | "imageUrl">;

export function useCart(customerId: string | null) {
  const [state, setState] = React.useState<CartState>(EMPTY);
  const [ready, setReady] = React.useState(false);
  const latest = React.useRef(state);
  latest.current = state;
  const customer = React.useRef(customerId);
  customer.current = customerId;

  // Lê do aparelho depois de montar (o servidor não tem localStorage)
  React.useEffect(() => {
    if (!customerId) return;
    const stored = readStored(customerId);
    latest.current = stored;
    setState(stored);
    setReady(true);
  }, [customerId]);

  React.useEffect(() => {
    if (!ready || !customerId) return;
    writeStored(customerId, state);
  }, [ready, customerId, state]);

  /** Define a quantidade de um produto (0 tira do carrinho). */
  const setQuantity = React.useCallback((product: CartProduct, quantity: number) => {
    setState((prev) => {
      const rest = prev.lines.filter((l) => l.productId !== product.id);
      if (quantity <= 0) return { ...prev, lines: rest };
      const line: CartLine = {
        productId: product.id,
        name: product.name,
        priceCents: product.priceCents,
        imageUrl: product.imageUrl,
        quantity,
      };
      const index = prev.lines.findIndex((l) => l.productId === product.id);
      const lines = index >= 0 ? prev.lines.map((l, i) => (i === index ? line : l)) : [...prev.lines, line];
      return { ...prev, lines };
    });
  }, []);

  const remove = React.useCallback((ids: string[]) => {
    setState((prev) => ({ ...prev, lines: prev.lines.filter((l) => !ids.includes(l.productId)) }));
  }, []);

  const setNotes = React.useCallback((notes: string) => setState((prev) => ({ ...prev, notes })), []);

  const clear = React.useCallback(() => {
    latest.current = EMPTY;
    setState(EMPTY);
    // grava já: se a tela sair antes do próximo ciclo, o carrinho enviado não volta
    if (customer.current) writeStored(customer.current, EMPTY);
  }, []);

  /**
   * Começa (ou repete) o envio. A chave é a mesma enquanto o conteúdo do carrinho for o mesmo,
   * inclusive depois de um erro de rede; muda se o cliente mexeu no carrinho; some junto com
   * o carrinho quando o envio dá certo (clear).
   */
  const beginAttempt = React.useCallback((): string => {
    const current = latest.current;
    const fingerprint = fingerprintOf(current);
    // A chave só se repete por um tempo curto: se o admin já aceitou e converteu em venda o pedido de uma tentativa
    // antiga (o pré-pedido some), reenviar com a mesma chave criaria um pedido duplicado.
    const previous = current.attempt;
    const reuse = !!previous && previous.fingerprint === fingerprint && Date.now() - previous.startedAt < RETRY_KEY_MAX_AGE_MS;
    const key = reuse ? previous!.key : newKey();
    const attempt: SendAttempt = { key, fingerprint, startedAt: reuse ? previous!.startedAt : Date.now(), unsure: true };
    latest.current = { ...current, attempt };
    setState((prev) => ({ ...prev, attempt }));
    return key;
  }, []);

  /** O servidor respondeu com um "não" definitivo: o pedido com esta chave não existe. */
  const settleAttempt = React.useCallback(() => {
    setState((prev) => (prev.attempt ? { ...prev, attempt: { ...prev.attempt, unsure: false } } : prev));
  }, []);

  return { ...state, ready, setQuantity, remove, setNotes, clear, beginAttempt, settleAttempt };
}

/* ------------------------------------------------- conferência com o cardápio */

export type LineIssueKind = "gone" | "soldOut" | "unavailable" | "server";

export interface ResolvedLine {
  line: CartLine;
  product: MenuProduct | null;
  /** Preço atual: o do cardápio; o guardado só quando o produto não está mais nele. */
  unitCents: number;
  issue: { kind: LineIssueKind; text: string } | null;
}

/**
 * Confere cada item do carrinho com o cardápio de agora. Sem cardápio carregado, ou com a loja
 * fechada, nada é marcado: o carrinho espera a loja abrir, em vez de acusar item por item.
 * `serverFlags` são os produtos que o servidor recusou ao enviar (produto -> mensagem).
 */
export function resolveLines(lines: CartLine[], menu: OrderingMenu | null, storeOpen: boolean, serverFlags: Record<string, string>): ResolvedLine[] {
  const byId = new Map((menu?.products ?? []).map((p) => [p.id, p]));
  return lines.map((line) => {
    const product = byId.get(line.productId) ?? null;
    const unitCents = product?.priceCents ?? line.priceCents;
    let issue: ResolvedLine["issue"] = null;
    if (menu && storeOpen) {
      if (!product) issue = { kind: "gone", text: "Saiu do cardápio." };
      else if (product.soldOut) issue = { kind: "soldOut", text: "Esgotou." };
      else if (!product.availableNow) {
        issue = {
          kind: "unavailable",
          text: product.schedule.length > 0 ? `Fora do horário. Só ${product.schedule.join(" · ")}.` : "Fora do horário agora.",
        };
      }
    }
    if (!issue && serverFlags[line.productId]) issue = { kind: "server", text: serverFlags[line.productId] };
    return { line, product, unitCents, issue };
  });
}

export const countItems = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.quantity, 0);

/** Soma só dos itens sem problema: é o que o servidor aceitaria. */
export const totalOf = (resolved: ResolvedLine[]) =>
  resolved.reduce((sum, r) => (r.issue ? sum : sum + r.unitCents * r.line.quantity), 0);
