"use client";

import * as React from "react";
import { AlertTriangle, DollarSign } from "lucide-react";
import { Textarea } from "@/app/components/ui/input";
import type { PaymentIntentReviewDTO } from "@/lib/notification-types";
import { formatCurrency, reaisInputToCents } from "./format";
import type { ReviewMode } from "./usePaymentReview";

interface PaymentReviewFormProps {
  intent: PaymentIntentReviewDTO;
  mode: ReviewMode;
  amountText: string;
  onAmountChange: (value: string) => void;
  reason: string;
  onReasonChange: (value: string) => void;
  disabled: boolean;
  error: string | null;
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="flex items-start gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium"
      style={{ background: "var(--state-pronto-bg)", color: "var(--state-pronto-fg)" }}
    >
      <AlertTriangle className="mt-px h-3.5 w-3.5 flex-shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** Etapa de revisão: valor recebido (editável) ou, ao recusar, o motivo opcional. */
export function PaymentReviewForm({
  intent,
  mode,
  amountText,
  onAmountChange,
  reason,
  onReasonChange,
  disabled,
  error,
}: PaymentReviewFormProps) {
  const cents = reaisInputToCents(amountText);
  const valid = cents !== null && cents > 0;
  const differs = valid && cents !== intent.amountCents;
  const exceedsBalance = valid && cents > intent.currentBalanceCents;

  if (mode === "reject") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-[color:var(--muted-foreground)]">
          O saldo da ficha não muda. O cliente vê que o pagamento foi recusado.
        </p>
        <label htmlFor="payment-review-reason" className="text-sm font-medium text-[color:var(--foreground)]">
          Motivo (opcional)
        </label>
        <Textarea
          id="payment-review-reason"
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          disabled={disabled}
          maxLength={300}
          rows={3}
          placeholder="Ex.: não encontrei o PIX na conta"
        />
        {error && <p role="alert" className="text-xs font-medium text-[color:var(--state-cobrar-fg)]">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-[color:var(--muted-foreground)]">Confira no seu banco antes de confirmar.</p>
      <label htmlFor="payment-review-amount" className="text-sm font-medium text-[color:var(--foreground)]">
        Valor recebido
      </label>
      <div
        className={
          "flex items-center overflow-hidden rounded-xl border bg-[color:var(--card)] transition-all " +
          (error
            ? "border-[color:var(--state-cobrar)] ring-2 ring-[color:var(--state-cobrar)]/20"
            : "border-[color:var(--border-dark)] focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20")
        }
      >
        <div className="flex flex-shrink-0 items-center gap-1.5 border-r border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3">
          <DollarSign className="h-4 w-4 text-[color:var(--muted-foreground)]" aria-hidden />
          <span className="text-sm font-medium text-[color:var(--muted-foreground)]">R$</span>
        </div>
        <input
          id="payment-review-amount"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          value={amountText}
          disabled={disabled}
          onChange={(event) => onAmountChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          placeholder="0,00"
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-xl font-bold text-[color:var(--foreground)] outline-none placeholder:font-normal disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      {error && <p role="alert" className="text-xs font-medium text-[color:var(--state-cobrar-fg)]">{error}</p>}
      {differs && <Warning>Diferente do que o cliente informou ({formatCurrency(intent.amountCents)}).</Warning>}
      {exceedsBalance && <Warning>Passa do saldo: a diferença fica como crédito do cliente.</Warning>}
    </div>
  );
}
