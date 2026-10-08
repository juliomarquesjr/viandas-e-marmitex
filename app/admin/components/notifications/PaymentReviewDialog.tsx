"use client";

import * as React from "react";
import { Banknote, Info, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { PaymentReviewForm } from "./PaymentReviewForm";
import { PaymentReviewResult } from "./PaymentReviewResult";
import { PaymentReviewSummary } from "./PaymentReviewSummary";
import { usePaymentReview } from "./usePaymentReview";

const FORM_ID = "payment-review-form";

interface PaymentReviewDialogProps {
  /** Id da intenção de pagamento; nulo mantém o diálogo fechado. */
  intentId: string | null;
  onClose: () => void;
  /** Chamado quando a intenção foi resolvida (por este operador ou por outro). */
  onResolved: () => void;
  onCloseAutoFocus?: (event: Event) => void;
}

export function PaymentReviewDialog({ intentId, onClose, onResolved, onCloseAutoFocus }: PaymentReviewDialogProps) {
  const review = usePaymentReview({ intentId, onResolved, onClose });
  const { intent, loading, loadError, mode, submitting } = review;
  const pending = intent?.status === "pending";

  const handleOpenChange = (open: boolean) => {
    if (!open && !submitting) onClose();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === "reject") void review.reject();
    else void review.confirm();
  };

  return (
    <Dialog open={intentId !== null} onOpenChange={handleOpenChange}>
      <DialogContent
        higherZIndex
        className="flex max-h-[90vh] max-w-md flex-col gap-0 border-t-[3px] border-t-primary bg-[color:var(--card)] p-0"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
              style={{
                background: "var(--modal-header-icon-bg)",
                outline: "1px solid var(--modal-header-icon-ring)",
              }}
            >
              <Banknote className="h-5 w-5 text-primary" />
            </div>
            {pending || loading ? "Revisar pagamento" : "Pagamento informado"}
          </DialogTitle>
          <DialogDescription>O cliente avisou que pagou a ficha por PIX.</DialogDescription>
        </DialogHeader>

        <form id={FORM_ID} onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
          {loading && (
            <div className="flex h-40 items-center justify-center text-[color:var(--muted-foreground)]">
              <Loader2 className="h-5 w-5 animate-spin" aria-label="Carregando" />
            </div>
          )}

          {!loading && loadError && (
            <p role="alert" className="py-6 text-center text-sm text-[color:var(--muted-foreground)]">
              {loadError}
            </p>
          )}

          {!loading && intent && (
            <>
              {review.notice && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-md px-3 py-2 text-sm font-medium"
                  style={{ background: "var(--state-pronto-bg)", color: "var(--state-pronto-fg)" }}
                >
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
                  {review.notice}
                </p>
              )}
              <PaymentReviewSummary intent={intent} />
              {pending ? (
                <PaymentReviewForm
                  intent={intent}
                  mode={mode}
                  amountText={review.amountText}
                  onAmountChange={review.setAmountText}
                  reason={review.reason}
                  onReasonChange={review.setReason}
                  disabled={submitting}
                  error={review.formError}
                />
              ) : (
                <PaymentReviewResult intent={intent} />
              )}
            </>
          )}
        </form>

        <DialogFooter>
          {loading ? (
            <span />
          ) : loadError ? (
            <>
              <Button type="button" variant="outline" onClick={onClose}>
                Fechar
              </Button>
              <Button type="button" onClick={review.reload}>
                Tentar de novo
              </Button>
            </>
          ) : pending && mode === "review" ? (
            <>
              <Button type="button" variant="outline" disabled={submitting} onClick={() => review.setMode("reject")}>
                Recusar
              </Button>
              <Button type="submit" form={FORM_ID} loading={submitting}>
                Confirmar recebimento
              </Button>
            </>
          ) : pending ? (
            <>
              <Button type="button" variant="outline" disabled={submitting} onClick={() => review.setMode("review")}>
                Voltar
              </Button>
              <Button type="submit" form={FORM_ID} variant="destructive" loading={submitting}>
                Confirmar recusa
              </Button>
            </>
          ) : (
            <>
              <span />
              <Button type="button" variant="outline" onClick={onClose}>
                Fechar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
