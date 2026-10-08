"use client";

import { Phone, User } from "lucide-react";
import type { PaymentIntentReviewDTO } from "@/lib/notification-types";
import { formatCurrency, formatDateTime } from "./format";

function BalanceRow({
  label,
  cents,
  highlight,
}: {
  label: string;
  cents: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-sm text-[color:var(--muted-foreground)]">{label}</dt>
      <dd
        className="text-sm font-semibold text-[color:var(--foreground)]"
        style={highlight ? { color: "var(--state-pronto-fg)" } : undefined}
      >
        {formatCurrency(cents)}
      </dd>
    </div>
  );
}

/** Quem pagou, quanto informou e como estava a ficha. */
export function PaymentReviewSummary({ intent }: { intent: PaymentIntentReviewDTO }) {
  const balanceChanged = intent.balanceAtInformCents !== intent.currentBalanceCents;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-[color:var(--foreground)]">
          <User className="h-4 w-4 flex-shrink-0 text-[color:var(--muted-foreground)]" aria-hidden />
          {intent.customer.name}
        </p>
        {intent.customer.phone && (
          <p className="flex items-center gap-2 text-sm text-[color:var(--muted-foreground)]">
            <Phone className="h-4 w-4 flex-shrink-0" aria-hidden />
            {intent.customer.phone}
          </p>
        )}
      </div>

      <div
        className="rounded-xl border border-[color:var(--border)] px-4 py-3"
        style={{ background: "var(--modal-header-icon-bg)" }}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground-strong)]">
          Informou pagar
        </p>
        <p className="mt-0.5 text-2xl font-bold text-[color:var(--foreground)]">
          {formatCurrency(intent.amountCents)}
        </p>
        <p className="text-xs text-[color:var(--muted-foreground-strong)]">
          por PIX, {formatDateTime(intent.createdAt)}
        </p>
      </div>

      <dl className="space-y-2 rounded-xl border border-[color:var(--border)] px-4 py-3">
        <BalanceRow label="Saldo da ficha quando informou" cents={intent.balanceAtInformCents} />
        <BalanceRow label="Saldo da ficha agora" cents={intent.currentBalanceCents} highlight={balanceChanged} />
        {balanceChanged && (
          <p
            className="rounded-md px-2.5 py-1.5 text-xs font-medium"
            style={{ background: "var(--state-pronto-bg)", color: "var(--state-pronto-fg)" }}
          >
            O saldo mudou desde que o cliente informou.
          </p>
        )}
      </dl>
    </div>
  );
}
