"use client";

import { useMemo, useState } from "react";
import { Order } from "../types";
import {
  buildCycles,
  buildLedger,
  creditBalanceOf,
  cycleKeyOf,
  type Cycle,
} from "../lib/cycle";

/**
 * Transforma os lançamentos brutos em competências e controla qual delas está
 * na tela. A seleção é por chave (`2026-08`) e não por índice, para sobreviver
 * a um recarregamento que muda o tamanho da lista — por exemplo depois de
 * registrar um pagamento no mês corrente.
 */
export function useCycles(orders: Order[]) {
  // Um único "agora" por render evita que a grade do calendário e o texto do
  // stepper discordem se a página virar a meia-noite.
  const now = useMemo(() => new Date(), [orders]);

  const ledger = useMemo(() => buildLedger(orders), [orders]);
  const cycles = useMemo(() => buildCycles(ledger, now), [ledger, now]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const defaultKey = useMemo(() => defaultCycleKey(cycles, now), [cycles, now]);

  const activeKey =
    selectedKey && cycles.some((cycle) => cycle.key === selectedKey)
      ? selectedKey
      : defaultKey;

  const index = Math.max(0, cycles.findIndex((cycle) => cycle.key === activeKey));
  const cycle: Cycle | undefined = cycles[index];

  // Os ciclos vêm do mais recente para o mais antigo, então "anterior" avança
  // no array e "próximo" recua.
  const goPrevious = () => {
    const next = cycles[index + 1];
    if (next) setSelectedKey(next.key);
  };
  const goNext = () => {
    const next = cycles[index - 1];
    if (next) setSelectedKey(next.key);
  };

  const totalBalanceCents = ledger.length
    ? ledger[ledger.length - 1].balanceAfterCents
    : 0;

  // O que está em aberto fora deste ciclo, separado por posição no tempo:
  // dizer "meses anteriores" olhando um ciclo antigo estaria errado, porque
  // a dívida restante pode ser toda de depois dele.
  const earlierOpenCents = cycles
    .filter((item) => item.key < activeKey)
    .reduce((sum, item) => sum + item.openCents, 0);
  const laterOpenCents = cycles
    .filter((item) => item.key > activeKey)
    .reduce((sum, item) => sum + item.openCents, 0);
  const creditCents = creditBalanceOf(ledger);

  return {
    earlierOpenCents,
    laterOpenCents,
    creditCents,
    now,
    ledger,
    cycles,
    cycle,
    selectedKey: activeKey,
    setSelectedKey,
    goPrevious,
    goNext,
    canGoPrevious: index < cycles.length - 1,
    canGoNext: index > 0,
    totalBalanceCents,
    previousCycles: cycles.filter((item) => item.key !== activeKey).slice(0, 6),
  };
}

/**
 * Qual competência abrir primeiro.
 *
 * O mês corrente é o padrão óbvio para quem compra toda semana, mas abrir um
 * mês vazio num cliente parado seria mostrar uma tela em branco justamente
 * quando há uma conta esquecida para trás. Então: mês corrente se tiver
 * movimento, senão o mês mais recente que ainda deve, senão o último com
 * movimento.
 */
function defaultCycleKey(cycles: Cycle[], now: Date): string {
  const fallback = cycleKeyOf(now);
  if (!cycles.length) return fallback;

  const current = cycles.find((cycle) => cycle.isCurrent);
  if (current?.entries.length) return current.key;

  const owing = cycles.find((cycle) => cycle.openCents > 0);
  if (owing) return owing.key;

  const withMovement = cycles.find((cycle) => cycle.entries.length > 0);
  return withMovement?.key ?? current?.key ?? fallback;
}
