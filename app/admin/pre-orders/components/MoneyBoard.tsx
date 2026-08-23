"use client";

import { formatCurrency } from "../lib/preOrderView";

interface MoneyBoardProps {
  openCents: number;
  dueCents: number;
}

/**
 * O dinheiro do recorte, separado do resto do cabeçalho.
 *
 * São duas leituras diferentes e a separação é o ponto: "em aberto" é o que
 * ainda não fechou, "na rua" é o que já foi entregue e não voltou como caixa.
 * O segundo é um subconjunto do primeiro, por isso o divisor entre eles em vez
 * de dois cartões soltos.
 */
export function MoneyBoard({ openCents, dueCents }: MoneyBoardProps) {
  return (
    <dl className="flex shrink-0 items-stretch overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
      <Figure label="Em aberto" value={formatCurrency(openCents)} />
      <span aria-hidden="true" className="w-px shrink-0 bg-[color:var(--border)]" />
      <Figure
        label="Na rua"
        value={formatCurrency(dueCents)}
        tone={dueCents > 0 ? "var(--state-cobrar)" : undefined}
      />
    </dl>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col justify-center px-3.5 py-1.5">
      <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-[color:var(--muted-foreground-strong)]">
        {label}
      </dt>
      <dd
        className="mt-0.5 text-[15px] font-bold leading-none tabular-nums tracking-tight"
        style={{ color: tone ?? "var(--foreground)" }}
      >
        {value}
      </dd>
    </div>
  );
}
