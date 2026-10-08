"use client";

import * as React from "react";
import { useToast } from "@/app/components/Toast";
import type { PaymentIntentReviewDTO } from "@/lib/notification-types";
import { centsToReaisInput, formatCurrency, reaisInputToCents } from "./format";

export type ReviewMode = "review" | "reject";

/** Mesmo teto da API: R$ 100.000,00. */
export const MAX_CONFIRM_CENTS = 10_000_000;

interface Options {
  intentId: string | null;
  /** Algo mudou no servidor (confirmou, recusou ou outro operador já revisou). */
  onResolved: () => void;
  onClose: () => void;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const data: unknown = await response.json();
    return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function apiMessage(data: Record<string, unknown>, fallback: string): string {
  return typeof data.error === "string" && data.error ? data.error : fallback;
}

/** Estado e ações da revisão de uma intenção de pagamento. */
export function usePaymentReview({ intentId, onResolved, onClose }: Options) {
  const { showToast } = useToast();
  const [intent, setIntent] = React.useState<PaymentIntentReviewDTO | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [amountText, setAmountText] = React.useState("");
  const [mode, setMode] = React.useState<ReviewMode>("review");
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const requestRef = React.useRef(0);
  /** Trava síncrona contra clique duplo (o estado só muda no próximo render). */
  const submittingRef = React.useRef(false);

  const load = React.useCallback(async (id: string, silent: boolean) => {
    const request = ++requestRef.current;
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`/api/payment-intents/${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await readJson(response);
      if (request !== requestRef.current) return;
      if (!response.ok) {
        setLoadError(apiMessage(data, "Não foi possível carregar este pagamento."));
        return;
      }
      const dto = data as unknown as PaymentIntentReviewDTO;
      setIntent(dto);
      setAmountText(centsToReaisInput(dto.amountCents));
      setLoadError(null);
    } catch {
      if (request === requestRef.current) {
        setLoadError("Não foi possível carregar este pagamento. Verifique a conexão.");
      }
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // Ao fechar, o conteúdo fica como está até o fim da animação de saída
    if (!intentId) return;
    requestRef.current++;
    setIntent(null);
    setLoadError(null);
    setMode("review");
    setReason("");
    setFormError(null);
    setNotice(null);
    setAmountText("");
    void load(intentId, false);
  }, [intentId, load]);

  const reload = React.useCallback(() => {
    if (intentId) void load(intentId, false);
  }, [intentId, load]);

  const handleConflict = React.useCallback(
    async (message: string, id: string) => {
      setNotice(message);
      setMode("review");
      await load(id, true);
      onResolved();
    },
    [load, onResolved]
  );

  const confirm = React.useCallback(async () => {
    if (!intent || submittingRef.current) return;
    const cents = reaisInputToCents(amountText);
    if (cents === null || cents <= 0) {
      setFormError("Informe um valor maior que zero.");
      return;
    }
    if (cents > MAX_CONFIRM_CENTS) {
      setFormError(`O valor máximo é ${formatCurrency(MAX_CONFIRM_CENTS)}.`);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch(`/api/payment-intents/${encodeURIComponent(intent.id)}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: cents }),
      });
      const data = await readJson(response);
      if (response.ok) {
        showToast(`Pagamento de ${formatCurrency(cents)} confirmado na ficha de ${intent.customer.name}`, "success");
        onResolved();
        onClose();
      } else if (response.status === 409) {
        await handleConflict(apiMessage(data, "Este pagamento já foi revisado."), intent.id);
      } else {
        setFormError(apiMessage(data, "Não foi possível confirmar. Tente de novo."));
      }
    } catch {
      setFormError("Sem conexão com o servidor. Tente de novo.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [intent, amountText, showToast, onResolved, onClose, handleConflict]);

  const reject = React.useCallback(async () => {
    if (!intent || submittingRef.current) return;

    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    try {
      const trimmed = reason.trim();
      const response = await fetch(`/api/payment-intents/${encodeURIComponent(intent.id)}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trimmed ? { reason: trimmed } : {}),
      });
      const data = await readJson(response);
      if (response.ok) {
        showToast("Pagamento recusado", "info");
        onResolved();
        onClose();
      } else if (response.status === 409) {
        await handleConflict(apiMessage(data, "Este pagamento já foi revisado."), intent.id);
      } else {
        setFormError(apiMessage(data, "Não foi possível recusar. Tente de novo."));
      }
    } catch {
      setFormError("Sem conexão com o servidor. Tente de novo.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [intent, reason, showToast, onResolved, onClose, handleConflict]);

  return {
    intent,
    loading,
    loadError,
    amountText,
    setAmountText: (value: string) => {
      setAmountText(value);
      setFormError(null);
    },
    mode,
    setMode: (next: ReviewMode) => {
      setMode(next);
      setFormError(null);
    },
    reason,
    setReason,
    submitting,
    formError,
    notice,
    reload,
    confirm,
    reject,
  };
}
