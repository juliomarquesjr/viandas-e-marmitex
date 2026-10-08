"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import type { PaymentIntentReviewDTO } from "@/lib/notification-types";
import { formatCurrency, formatDateTime } from "./format";

/** Modo somente leitura: como a intenção foi resolvida. */
export function PaymentReviewResult({ intent }: { intent: PaymentIntentReviewDTO }) {
  const confirmed = intent.status === "confirmed";
  const who = intent.reviewedByName ? ` por ${intent.reviewedByName}` : "";
  const when = intent.reviewedAt ? ` em ${formatDateTime(intent.reviewedAt)}` : "";
  const Icon = confirmed ? CheckCircle2 : XCircle;
  const palette = confirmed
    ? { background: "var(--state-faturado-bg)", color: "var(--state-faturado-fg)" }
    : { background: "var(--state-fila-bg)", color: "var(--state-fila-fg)" };

  return (
    <div className="space-y-1 rounded-xl px-4 py-3" style={palette} role="status">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 flex-shrink-0" aria-hidden />
        {confirmed ? "Confirmado" : "Recusado"}
        {who}
        {when}
      </p>
      {confirmed && (
        <p className="text-sm">
          Valor confirmado: <strong>{formatCurrency(intent.confirmedAmountCents ?? intent.amountCents)}</strong>
        </p>
      )}
      {!confirmed && (
        <p className="text-sm">
          Motivo: {intent.rejectionReason ? intent.rejectionReason : "não informado"}
        </p>
      )}
    </div>
  );
}
