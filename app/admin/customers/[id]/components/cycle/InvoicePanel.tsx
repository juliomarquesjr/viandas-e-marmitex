"use client";

import { ArrowDownLeft, MessageCircle, Plus, Printer, Wallet } from "lucide-react";
import { formatCurrency } from "../../constants";
import { summarizeBalance, type Cycle } from "../../lib/cycle";
import { StateChip } from "./StateChip";

interface InvoicePanelProps {
  cycle: Cycle;
  /** Saldo da ficha inteira, somando todos os ciclos. */
  totalBalanceCents: number;
  onReceivePayment: () => void;
  onPreview: () => void;
  onSendWhatsApp: () => void;
  hasPhone: boolean;
}

const RING_RADIUS = 19;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * O herói cromático da tela: a única superfície colorida, onde está a decisão.
 * Mostra o que este ciclo tem a cobrar e, logo abaixo, avisa quando o saldo da
 * ficha é maior que isso — para ninguém cobrar só o mês e achar que zerou.
 */
export function InvoicePanel({
  cycle,
  totalBalanceCents,
  onReceivePayment,
  onPreview,
  onSendWhatsApp,
  hasPhone,
}: InvoicePanelProps) {
  const balance = summarizeBalance(totalBalanceCents);
  const previousCents = totalBalanceCents - cycle.openCents;
  const showsPrevious = Math.abs(previousCents) >= 1;
  const avulsosCents = cycle.consumptionCents - cycle.fichaCents;
  // Quanto do consumo deste mês já foi coberto por pagamentos (baixa FIFO).
  const settledCents = cycle.fichaCents - cycle.openCents;
  const progress = cycle.businessDays
    ? Math.min(1, cycle.daysWithConsumption / cycle.businessDays)
    : 0;

  return (
    <div className="flex flex-col gap-3.5">
      <div
        className="relative overflow-hidden rounded-2xl px-5 py-5 text-white"
        style={{
          background:
            "radial-gradient(120% 140% at 88% 6%, #4f7ffb 0%, #2563eb 46%, #1a44b8 100%)",
          boxShadow:
            "0 2px 4px rgba(26,68,184,0.28), 0 18px 36px -18px rgba(26,68,184,0.75)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.13), transparent 42%)",
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-2">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/70">
              Fatura de {cycle.label.split(" de ")[0]}
            </p>
            <StateChip state={cycle.state} onSurface className="ml-auto" />
          </div>

          <p className="mt-1.5 text-[36px] font-semibold leading-[1.05] tracking-[-0.04em] tabular-nums">
            <span className="mr-1.5 text-[17px] font-medium opacity-70">R$</span>
            {formatCurrency(Math.abs(cycle.openCents)).replace("R$", "").trim()}
          </p>

          <p className="mt-1.5 text-[11.5px] text-white/80">
            {summarizeCycle(cycle)}
          </p>

          {cycle.isCurrent && cycle.businessDays > 0 && (
            <div className="mt-4 flex items-center gap-2.5">
              <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true" className="shrink-0">
                <circle
                  cx="23" cy="23" r={RING_RADIUS}
                  fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="4"
                />
                <circle
                  cx="23" cy="23" r={RING_RADIUS}
                  fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${progress * RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                  transform="rotate(-90 23 23)"
                />
              </svg>
              <p className="text-[11.5px] leading-[1.45] text-white/80">
                <span className="font-semibold text-white">
                  {cycle.daysWithConsumption} de {cycle.businessDays}
                </span>{" "}
                dias úteis
                <br />
                lançados no ciclo
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_4px_14px_-8px_rgba(15,23,42,0.16)]">
        <Row
          label={`${cycle.daysWithConsumption} ${cycle.daysWithConsumption === 1 ? "dia" : "dias"} na ficha`}
          value={formatCurrency(cycle.fichaCents)}
        />
        {avulsosCents > 0 && (
          <Row
            label="Pago no ato"
            value={formatCurrency(avulsosCents)}
            muted
            title="Vendas já quitadas no balcão. Entram no consumo do mês, mas não na cobrança."
          />
        )}
        {settledCents > 0 && (
          <Row
            label="Já liquidado"
            value={`− ${formatCurrency(settledCents)}`}
            tone="ok"
            title="Parte do consumo deste mês já foi coberta por pagamentos."
          />
        )}

        <div className="mt-1.5 flex items-center border-t border-border pt-2.5">
          <span className="text-[13.5px] font-semibold text-foreground">A cobrar</span>
          <span className="ml-auto text-[13.5px] font-semibold tabular-nums text-foreground">
            {formatCurrency(cycle.openCents)}
          </span>
        </div>

        {/* Pagamento não carrega competência: o dinheiro que entra liquida o
            débito mais antigo. Então o total recebido no mês é informação à
            parte — misturá-lo na conta acima faria as linhas não fecharem. */}
        {cycle.paymentsCents > 0 && (
          <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <ArrowDownLeft
              className="mt-0.5 h-3 w-3 shrink-0"
              style={{ color: "var(--cycle-paga)" }}
            />
            <span>
              Recebido em {cycle.label.split(" de ")[0]}:{" "}
              <strong className="font-semibold text-foreground tabular-nums">
                {formatCurrency(cycle.paymentsCents)}
              </strong>
              {settledCents < cycle.paymentsCents && (
                <> — o excedente abateu meses anteriores.</>
              )}
            </span>
          </p>
        )}

        {showsPrevious && (
          <p
            className="mt-3 rounded-lg px-3 py-2 text-[11px] leading-relaxed"
            style={{
              background: previousCents > 0 ? "var(--cycle-atraso-bg)" : "var(--cycle-paga-bg)",
              color: previousCents > 0 ? "var(--cycle-atraso-fg)" : "var(--cycle-paga-fg)",
            }}
          >
            {previousCents > 0 ? (
              <>
                Somando meses anteriores, a ficha tem{" "}
                <strong className="font-semibold">{formatCurrency(totalBalanceCents)}</strong> em
                aberto.
              </>
            ) : (
              <>
                O cliente tem{" "}
                <strong className="font-semibold">{formatCurrency(Math.abs(previousCents))}</strong>{" "}
                de crédito de meses anteriores.
              </>
            )}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={onReceivePayment}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] text-[11.5px] font-semibold text-white transition-transform active:scale-[0.98]"
            style={{
              background: "linear-gradient(180deg, #3b82f6, #2563eb)",
              boxShadow:
                "0 1px 2px rgba(37,99,235,0.35), 0 6px 16px -6px rgba(37,99,235,0.6)",
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Receber pagamento
          </button>

          <div className="flex gap-2">
            <button
              onClick={onPreview}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card text-[11.5px] font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
            >
              <Printer className="h-3.5 w-3.5" />
              Prévia
            </button>
            <button
              onClick={onSendWhatsApp}
              disabled={!hasPhone}
              title={hasPhone ? undefined : "Cliente sem telefone cadastrado"}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card text-[11.5px] font-semibold text-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-border/60 bg-card px-4 py-3">
        <Wallet
          className="mt-0.5 h-3.5 w-3.5 shrink-0"
          style={{ color: `var(--cycle-${balance.tone === "devedor" ? "atraso" : balance.tone === "credito" ? "aberta" : "paga"})` }}
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">{balance.label}:</span>{" "}
          <span className="tabular-nums">{formatCurrency(Math.abs(balance.cents))}</span>
          <br />
          Considera o histórico completo da ficha, não só este mês.
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
  muted,
  title,
}: {
  label: string;
  value: string;
  tone?: "ok";
  muted?: boolean;
  title?: string;
}) {
  return (
    <div className="flex items-center py-1.5 text-xs" title={title}>
      <span
        className={muted ? "text-muted-foreground/70" : "text-muted-foreground"}
        style={tone === "ok" ? { color: "var(--cycle-paga-fg)" } : undefined}
      >
        {label}
      </span>
      <span
        className="ml-auto font-semibold tabular-nums text-foreground"
        style={tone === "ok" ? { color: "var(--cycle-paga-fg)" } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function summarizeCycle(cycle: Cycle) {
  if (cycle.state === "sem-movimento") return "Nenhum lançamento neste mês";

  const parts = [
    `${cycle.daysWithConsumption} ${cycle.daysWithConsumption === 1 ? "dia de consumo" : "dias de consumo"}`,
  ];
  if (cycle.paymentDays.length) {
    parts.push(
      `${cycle.paymentDays.length} ${cycle.paymentDays.length === 1 ? "pagamento" : "pagamentos"}`
    );
  }
  if (cycle.state === "paga") parts.push("liquidado");
  return parts.join(" · ");
}
