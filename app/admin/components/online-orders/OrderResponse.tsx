"use client";

import { Check, Clock, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { useToast } from "@/app/components/Toast";
import { cn } from "@/lib/utils";
import { formatCurrency } from "../notifications/format";

/**
 * Aceitar e Recusar um pedido que o cliente fez pela área dele (POST /api/pre-orders/[id]/respond).
 * É o MESMO componente na home, no sino e na Mesa de Pedido, para o fluxo e os textos serem iguais.
 */

/** Previsões que o admin pode prometer ao aceitar (iguais às do servidor: ORDERING.ACCEPT_MINUTES). */
const ACCEPT_MINUTES = [15, 30, 45, 60] as const;
const REJECT_REASONS = ["Sem estoque", "Fechado agora", "Não conseguimos atender", "Outro motivo"] as const;

export type RespondResult = { ok: true } | { ok: false; error: string; code?: string };

/** Chama a API. Nunca lança: devolve { ok, error } com a mensagem pronta para mostrar. */
export async function respondToOrder(
  orderId: string,
  body: { action: "accept"; minutes?: number | null } | { action: "reject"; reason?: string }
): Promise<RespondResult> {
  try {
    const response = await fetch(`/api/pre-orders/${encodeURIComponent(orderId)}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) return { ok: true };
    const data = await response.json().catch(() => null);
    return { ok: false, error: data?.error ?? "Não foi possível responder o pedido.", code: data?.code };
  } catch {
    return { ok: false, error: "Sem conexão. Tente de novo." };
  }
}

interface ButtonsProps {
  orderId: string;
  customerName?: string | null;
  /** Ficou sem resposta além do prazo: só dá para recusar. */
  expired?: boolean;
  /** O que o cliente pediu ("2 × Marmita M, 1 × Suco"), mostrado dentro dos diálogos para decidir sem sair dali. */
  summary?: string | null;
  /** Valor do pedido, em centavos, mostrado nos diálogos. */
  totalCents?: number | null;
  /** Depois de aceitar ou recusar com sucesso (ou se o pedido já tinha sido respondido). */
  onResponded?: (action: "accept" | "reject") => void;
  className?: string;
  size?: "sm" | "default";
}

/** [Recusar] [Aceitar]: Aceitar pergunta a previsão; Recusar pergunta o motivo. */
export function OrderResponseButtons({
  orderId,
  customerName,
  expired,
  summary,
  totalCents,
  onResponded,
  className,
  size = "sm",
}: ButtonsProps) {
  const { showToast } = useToast();
  const [dialog, setDialog] = React.useState<"accept" | "reject" | null>(null);
  const who = customerName?.trim() || "o cliente";

  // Se o pedido sai da tela com um diálogo aberto e não fomos nós que respondemos (outra pessoa
  // respondeu), o diálogo some junto: avisa, para o operador não achar que o clique foi perdido
  const openRef = React.useRef<"accept" | "reject" | null>(null);
  const whoRef = React.useRef(customerName?.trim() || null);
  const toastRef = React.useRef(showToast);
  React.useEffect(() => {
    openRef.current = dialog;
    whoRef.current = customerName?.trim() || null;
    toastRef.current = showToast;
  });
  React.useEffect(
    () => () => {
      if (openRef.current === null) return;
      const name = whoRef.current;
      toastRef.current(
        name ? `O pedido de ${name} já foi respondido por outra pessoa.` : "Este pedido já foi respondido por outra pessoa.",
        "info"
      );
    },
    []
  );
  const closeDialog = () => {
    openRef.current = null;
    setDialog(null);
  };

  return (
    <>
      <div className={cn("flex items-center gap-2", className)}>
        <Button type="button" variant="outline" size={size} className="min-h-[44px]" onClick={() => setDialog("reject")} aria-label={`Recusar pedido de ${who}`}>
          <X className="h-4 w-4" aria-hidden />
          Recusar
        </Button>
        {!expired && (
          <Button type="button" size={size} className="min-h-[44px]" onClick={() => setDialog("accept")} aria-label={`Aceitar pedido de ${who}`}>
            <Check className="h-4 w-4" aria-hidden />
            Aceitar
          </Button>
        )}
      </div>

      <AcceptOrderDialog
        open={dialog === "accept"}
        orderId={orderId}
        who={who}
        summary={summary}
        totalCents={totalCents}
        onClose={closeDialog}
        onDone={() => {
          closeDialog();
          onResponded?.("accept");
        }}
        onAlreadyAnswered={() => {
          closeDialog();
          onResponded?.("accept");
        }}
      />
      <RejectOrderDialog
        open={dialog === "reject"}
        orderId={orderId}
        who={who}
        expired={expired}
        summary={summary}
        totalCents={totalCents}
        onClose={closeDialog}
        onDone={() => {
          closeDialog();
          onResponded?.("reject");
        }}
        onAlreadyAnswered={() => {
          closeDialog();
          onResponded?.("reject");
        }}
      />
    </>
  );
}

interface DialogProps {
  open: boolean;
  orderId: string;
  who: string;
  expired?: boolean;
  summary?: string | null;
  totalCents?: number | null;
  onClose: () => void;
  onDone: () => void;
  /** O pedido já tinha sido respondido (outro operador ou o cliente cancelou): só atualiza a tela. */
  onAlreadyAnswered: () => void;
}

/** Diálogos ficam acima do botão flutuante do assistente (z-90) e do painel dele (z-100). */
const DIALOG_OVERLAY_Z = "z-[110]";
const DIALOG_CONTENT_Z = "z-[111]";
const DIALOG_FOOTER = "gap-2 border-[color:var(--border)] bg-[color:var(--muted)]";
const CHIP_BASE =
  "inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

/** Quem pediu, quanto e o quê: o dono decide sem fechar o diálogo para conferir. */
function OrderRecap({ who, summary, totalCents }: { who: string; summary?: string | null; totalCents?: number | null }) {
  const hasValue = typeof totalCents === "number";
  if (!summary && !hasValue) return null;
  return (
    <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2.5 text-sm">
      <p className="font-semibold text-[color:var(--foreground)]">
        {who}
        {hasValue && <span className="tabular-nums"> · {formatCurrency(totalCents)}</span>}
      </p>
      {summary && <p className="mt-0.5 text-[color:var(--muted-foreground)]">{summary}</p>}
    </div>
  );
}

export function AcceptOrderDialog({ open, orderId, who, summary, totalCents, onClose, onDone, onAlreadyAnswered }: DialogProps) {
  const { showToast } = useToast();
  const [minutes, setMinutes] = React.useState<number | null>(30);
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    setBusy(true);
    const result = await respondToOrder(orderId, { action: "accept", minutes });
    setBusy(false);
    if (result.ok) {
      showToast(`Pedido de ${who} aceito.`, "success", "Pedido aceito");
      onDone();
    } else if (result.code === "ALREADY_ANSWERED") {
      showToast(result.error, "info");
      onAlreadyAnswered();
    } else {
      showToast(result.error, "error", "Não aceitou");
      if (result.code === "EXPIRED") onAlreadyAnswered();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent className={`max-w-sm bg-[color:var(--card)] ${DIALOG_CONTENT_Z}`} overlayClassName={DIALOG_OVERLAY_Z}>
        <DialogHeader>
          <DialogTitle>Aceitar o pedido de {who}</DialogTitle>
          <DialogDescription>Em quanto tempo fica pronto? O cliente vê a previsão na área dele.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 py-5 text-[color:var(--foreground)]">
        <OrderRecap who={who} summary={summary} totalCents={totalCents} />
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Previsão de preparo">
          {ACCEPT_MINUTES.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={minutes === value}
              onClick={() => setMinutes(value)}
              className={cn(
                CHIP_BASE,
                minutes === value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-[color:var(--border)] bg-[color:var(--card)] hover:bg-[color:var(--muted)]"
              )}
            >
              <Clock className="h-4 w-4" aria-hidden />
              {value} min
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={minutes === null}
            onClick={() => setMinutes(null)}
            className={cn(
              CHIP_BASE,
              minutes === null ? "border-primary bg-primary text-primary-foreground" : "border-[color:var(--border)] bg-[color:var(--card)] hover:bg-[color:var(--muted)]"
            )}
          >
            Sem previsão
          </button>
        </div>
        </div>
        <DialogFooter className={DIALOG_FOOTER}>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Voltar
          </Button>
          <Button type="button" onClick={submit} disabled={busy}>
            {busy ? "Aceitando…" : "Aceitar pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RejectOrderDialog({ open, orderId, who, expired, summary, totalCents, onClose, onDone, onAlreadyAnswered }: DialogProps) {
  const { showToast } = useToast();
  const [chip, setChip] = React.useState<string | null>(null);
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setChip(expired ? "Expirou: não conseguimos atender a tempo" : null);
      setText("");
    }
  }, [open, expired]);

  const reason = chip && chip !== "Outro motivo" ? (text.trim() ? `${chip}: ${text.trim()}` : chip) : text.trim();

  const submit = async () => {
    setBusy(true);
    const result = await respondToOrder(orderId, { action: "reject", reason });
    setBusy(false);
    if (result.ok) {
      showToast(`Pedido de ${who} recusado. O cliente foi avisado.`, "success", "Pedido recusado");
      onDone();
    } else if (result.code === "ALREADY_ANSWERED") {
      showToast(result.error, "info");
      onAlreadyAnswered();
    } else {
      showToast(result.error, "error", "Não recusou");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent className={`max-w-sm bg-[color:var(--card)] ${DIALOG_CONTENT_Z}`} overlayClassName={DIALOG_OVERLAY_Z}>
        <DialogHeader>
          <DialogTitle>Recusar o pedido de {who}</DialogTitle>
          <DialogDescription>O cliente vê o motivo na área dele. Escolha um ou escreva.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 py-5 text-[color:var(--foreground)]">
        <OrderRecap who={who} summary={summary} totalCents={totalCents} />
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Motivo da recusa">
          {REJECT_REASONS.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={chip === value}
              onClick={() => setChip(chip === value ? null : value)}
              className={cn(
                CHIP_BASE,
                chip === value ? "border-primary bg-primary text-primary-foreground" : "border-[color:var(--border)] bg-[color:var(--card)] hover:bg-[color:var(--muted)]"
              )}
            >
              {value}
            </button>
          ))}
        </div>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, 200))}
          placeholder="Escreva um recado (opcional)"
          rows={3}
          aria-label="Recado para o cliente"
        />
        </div>
        <DialogFooter className={DIALOG_FOOTER}>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Voltar
          </Button>
          <Button type="button" variant="destructive" onClick={submit} disabled={busy}>
            {busy ? "Recusando…" : "Recusar pedido"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
