"use client";

import { DialogOverlay, DialogPortal } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Delete,
  Loader2,
  Printer,
  QrCode,
  Send,
  Share2,
  User,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PAYMENT_METHODS,
  QUICK_CASH,
  describeChange,
  isCashMethod,
  keypadCents,
  keypadPop,
  keypadPush,
  methodLabel,
  settle,
  type Payment,
  type PaymentMethod,
} from "../lib/payment";
import { formatCurrency, formatWhen, initialsOf, type PreOrder } from "../lib/preOrderView";
import type { CustomerSummary } from "../lib/orderDraft";
import {
  buildPixMessage,
  readPixSettings,
  waPhone,
  type PixSettings,
} from "../lib/pixShare";
import { generateWhatsAppLink } from "@/lib/whatsapp";
import { openExternalUrl } from "@/lib/runtime/capabilities";

/** Tempo entre escolher a forma de pagamento e o botão de receber habilitar. */
const ARM_DELAY_MS = 500;

const ICONS: Record<PaymentMethod, LucideIcon> = {
  pix: QrCode,
  cash: Banknote,
  debit: CreditCard,
  credit: CreditCard,
  invoice: User,
};

/** O pedido que entra em seguida na fila de cobrança. */
export type NextInQueue = {
  id: string;
  name: string;
  totalCents: number;
};

type Result = {
  orderId: string;
  method: PaymentMethod;
  totalCents: number;
  changeCents: number;
};

interface ReceiveTerminalProps {
  preOrder: PreOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  /** Devolve o id da venda criada, ou null quando nada foi gravado. */
  onConfirm: (payment: Payment) => Promise<string | null>;
  next: NextInQueue | null;
  onNext: () => void;
  onPrintReceipt: (orderId: string) => void;
}

/**
 * O Terminal de recebimento.
 *
 * Uma folha lateral de altura inteira, comandada por teclado numérico. Escolher
 * a forma já fecha a conta — cartão, pix e ficha passam o valor exato. Só o
 * dinheiro pede o valor entregue, e é para ele que o teclado existe: o troco
 * aparece contado em cédulas, do jeito que sai da gaveta.
 *
 * Receber é irreversível: cria a venda, baixa o estoque e apaga o pré-pedido.
 * Por isso o botão só habilita meio segundo depois da escolha, e a consequência
 * fica escrita acima dele.
 *
 * Depois de receber, a folha vira recibo e oferece o próximo pedido a cobrar —
 * no fim do expediente a fila fecha em série, sem passar de volta pela lista.
 */
export function ReceiveTerminal({
  preOrder,
  open,
  onOpenChange,
  submitting,
  onConfirm,
  next,
  onNext,
  onPrintReceipt,
}: ReceiveTerminalProps) {
  const total = preOrder?.totalCents ?? 0;

  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [buffer, setBuffer] = useState("");
  /** O valor sugerido ao escolher dinheiro: o primeiro dígito o substitui. */
  const [prefilled, setPrefilled] = useState(false);
  const [armed, setArmed] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);

  const [pixSettings, setPixSettings] = useState<PixSettings | null>(null);
  const [pix, setPix] = useState<{ payload: string; qrCodeUrl: string } | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [copied, setCopied] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  /** O QR já pedido, por chave+valor+pedido. Evita repetir e evita corrida. */
  const pixRequest = useRef<string | null>(null);

  const typed = keypadCents(buffer);
  const settlement = useMemo(() => settle(method, typed, total), [method, typed, total]);
  const cash = method !== null && isCashMethod(method);
  const change = settlement.changeCents;

  const methods = useMemo(
    () => PAYMENT_METHODS.filter((meta) => !meta.needsCustomer || preOrder?.customerId),
    [preOrder?.customerId],
  );

  // ---------------------------------------------------------------------------
  // Ciclo de vida
  // ---------------------------------------------------------------------------

  // Trocar de pedido com a folha aberta (o "próximo a cobrar") recomeça tudo:
  // valor digitado de um pedido não pode sobrar no outro.
  useEffect(() => {
    if (!open) return;
    setMethod(null);
    setBuffer("");
    setPrefilled(false);
    setArmed(false);
    setResult(null);
    setPix(null);
    setPixError(null);
    setCopied(false);
    pixRequest.current = null;
    setPhone(preOrder?.customer?.phone ?? "");
  }, [open, preOrder?.id, preOrder?.customer?.phone]);

  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open, preOrder?.id]);

  /** O saldo da ficha, para dizer o tamanho da dívida antes de aumentá-la. */
  useEffect(() => {
    const customerId = preOrder?.customerId;
    if (!open || !customerId) {
      setSummary(null);
      return;
    }

    let active = true;
    (async () => {
      try {
        const response = await fetch(`/api/customers/${customerId}/summary`);
        if (!response.ok) return;
        const body = await response.json();
        if (active) setSummary(body.data ?? null);
      } catch {
        // Sem o resumo a tela segue: ele informa, não decide.
      }
    })();

    return () => {
      active = false;
    };
  }, [open, preOrder?.customerId]);

  /** A chave PIX do estabelecimento, uma vez por abertura da folha. */
  useEffect(() => {
    if (!open || pixSettings) return;

    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/config/public");
        if (!response.ok) return;
        const configs = await response.json();
        if (active) setPixSettings(readPixSettings(configs ?? []));
      } catch {
        // Sem chave o painel do PIX avisa e o recebimento continua possível.
      }
    })();

    return () => {
      active = false;
    };
  }, [open, pixSettings]);

  /**
   * O QR nasce quando o PIX é escolhido — é um QR com valor fixo, então vale
   * para este pedido e só para ele.
   *
   * Quem manda no ciclo é `pixRequest`, não uma limpeza de efeito: com o modo
   * estrito o efeito roda duas vezes, e cancelar pelo `cleanup` descartaria a
   * resposta da própria requisição — o QR ficava girando para sempre.
   */
  useEffect(() => {
    if (method !== "pix" || !pixSettings || total <= 0) return;

    const key = `${preOrder?.id ?? ""}|${pixSettings.key}|${total}`;
    if (pixRequest.current === key) return;
    pixRequest.current = key;

    setPixLoading(true);
    setPixError(null);

    (async () => {
      try {
        const response = await fetch("/api/pix/generate-qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chavePix: pixSettings.key,
            valorCents: total,
            nomeBeneficiario: pixSettings.merchantName,
            cidade: pixSettings.city,
          }),
        });
        if (!response.ok) throw new Error("Não foi possível gerar o QR code.");
        const body = await response.json();
        if (pixRequest.current === key) setPix({ payload: body.payload, qrCodeUrl: body.qrCodeUrl });
      } catch (error) {
        if (pixRequest.current === key) {
          setPixError(error instanceof Error ? error.message : "Falha ao gerar o QR code.");
        }
      } finally {
        if (pixRequest.current === key) setPixLoading(false);
      }
    })();
  }, [method, pixSettings, preOrder?.id, total]);

  // Trava anti-toque-duplo: escolher a forma de pagamento não pode receber.
  useEffect(() => {
    if (!method) {
      setArmed(false);
      return;
    }
    setArmed(false);
    const timer = window.setTimeout(() => setArmed(true), ARM_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [method]);

  // ---------------------------------------------------------------------------
  // Ações
  // ---------------------------------------------------------------------------

  const pick = useCallback(
    (value: PaymentMethod) => {
      setMethod(value);
      if (!isCashMethod(value)) {
        setBuffer("");
        setPrefilled(false);
        return;
      }
      // Dinheiro abre com o valor exato: o caso comum é o cliente entregar
      // certo, e quem entregou uma nota maior digita por cima.
      setBuffer(String(total));
      setPrefilled(true);
    },
    [total],
  );

  const pushDigit = useCallback(
    (key: string) => {
      setBuffer((current) => keypadPush(prefilled ? "" : current, key));
      setPrefilled(false);
    },
    [prefilled],
  );

  const popDigit = useCallback(() => {
    setPrefilled(false);
    setBuffer((current) => keypadPop(current));
  }, []);

  /** Cédula na mão: soma ao que já foi contado, como a gaveta enche. */
  const addNote = useCallback(
    (valueCents: number) => {
      setBuffer((current) => {
        const base = prefilled ? 0 : keypadCents(current);
        return String(base + valueCents);
      });
      setPrefilled(false);
    },
    [prefilled],
  );

  const copyPayload = useCallback(async () => {
    if (!pix) return;

    const legacy = () => {
      // `navigator.clipboard` exige contexto seguro e janela em foco. Quando
      // recusa, o campo temporário ainda copia — inclusive no app de desktop.
      const field = document.createElement("textarea");
      field.value = pix.payload;
      field.setAttribute("readonly", "");
      field.style.cssText = "position:fixed;top:-9999px;opacity:0;";
      document.body.appendChild(field);
      field.select();
      const done = document.execCommand("copy");
      field.remove();
      return done;
    };

    let done = false;
    try {
      await navigator.clipboard.writeText(pix.payload);
      done = true;
    } catch {
      try {
        done = legacy();
      } catch {
        done = false;
      }
    }

    if (!done) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [pix]);

  const sendWhatsApp = useCallback(() => {
    if (!preOrder || !pix || !pixSettings) return;
    const message = buildPixMessage(preOrder, pix.payload, pixSettings);
    // Sem número, o WhatsApp abre a lista de contatos e quem escolhe é o operador.
    void openExternalUrl(generateWhatsAppLink(waPhone(phone) || undefined, message));
  }, [phone, pix, pixSettings, preOrder]);

  /**
   * A imagem do QR só viaja onde o aparelho oferece compartilhamento de
   * arquivo — no celular, tipicamente. Onde não houver, o texto com o copia e
   * cola dá conta sozinho.
   */
  const shareQrImage = useCallback(async () => {
    if (!pix || !preOrder) return;
    try {
      const blob = await (await fetch(pix.qrCodeUrl)).blob();
      const file = new File([blob], `pix-${preOrder.id.slice(-6)}.png`, { type: blob.type });
      const share = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (!share.canShare?.({ files: [file] })) return;
      await navigator.share({
        files: [file],
        title: `Pagamento ${formatCurrency(total)}`,
        text: `PIX de ${formatCurrency(total)}`,
      });
    } catch {
      // Compartilhamento cancelado ou indisponível: nada a fazer.
    }
  }, [pix, preOrder, total]);

  const canConfirm = settlement.ok && armed && !submitting;

  const confirm = useCallback(async () => {
    if (!settlement.ok || !settlement.payment || submitting) return;
    const orderId = await onConfirm(settlement.payment);
    if (!orderId) return;
    setResult({
      orderId,
      method: settlement.payment.method,
      totalCents: total,
      changeCents: settlement.changeCents,
    });
  }, [onConfirm, settlement, submitting, total]);

  // Teclado físico: quem fecha no desktop digita mais rápido do que clica.
  useEffect(() => {
    if (!open || result) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (event.key === "Enter") {
        event.preventDefault();
        if (canConfirm) void confirm();
        return;
      }
      if (!cash) return;

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        pushDigit(event.key);
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        popDigit();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canConfirm, cash, confirm, open, popDigit, pushDigit, result]);

  if (!preOrder) return null;

  const missing = cash ? settlement.remainingCents : 0;

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(value) => {
        if (!value && submitting) return;
        onOpenChange(value);
      }}
    >
      <DialogPortal>
        {/* Acima do assistente (z-90) e do aviso de impressão (z-100). */}
        <DialogOverlay className="z-[109]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => submitting && event.preventDefault()}
          onInteractOutside={(event) => submitting && event.preventDefault()}
          className={cn(
            "fixed inset-y-0 right-0 z-[110] flex w-full max-w-[420px] flex-col",
            "border-l border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)]",
            "shadow-[-24px_0_60px_-30px_rgba(2,6,23,0.6)]",
            "duration-200 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Receber {preOrder.customer?.name ?? "venda avulsa"}
          </DialogPrimitive.Title>

          <Head
            preOrder={preOrder}
            total={total}
            missing={missing}
            hint={
              result
                ? `pago em ${methodLabel(result.method)}`
                : !method
                  ? `total ${formatCurrency(total)}`
                  : cash
                    ? `dinheiro · recebido ${formatCurrency(typed)}`
                    : method === "invoice"
                      ? "lançado na ficha"
                      : `${methodLabel(method)} · valor exato`
            }
            done={result !== null}
            headingRef={headingRef}
            onClose={() => onOpenChange(false)}
            disabled={submitting}
          />

          {result ? (
            <Receipt
              result={result}
              next={next}
              onPrint={() => onPrintReceipt(result.orderId)}
              onNext={onNext}
              onClose={() => onOpenChange(false)}
            />
          ) : (
            <>
              <div className="scroll-slim flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-3.5">
                <div className="grid grid-cols-5 gap-1.5">
                  {methods.map((meta) => {
                    const Icon = ICONS[meta.value];
                    const active = method === meta.value;

                    return (
                      <button
                        key={meta.value}
                        type="button"
                        onClick={() => pick(meta.value)}
                        disabled={submitting}
                        aria-pressed={active}
                        title={`Receber em ${meta.label}`}
                        className={cn(
                          "flex h-[54px] flex-col items-center justify-center gap-1 rounded-xl border text-[10.5px] font-semibold transition-all",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]",
                          "disabled:cursor-not-allowed disabled:opacity-40",
                          active
                            ? "border-primary bg-[color:var(--primary-lighter)] text-primary shadow-[0_14px_28px_-18px_rgba(37,99,235,0.7)]"
                            : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--muted-foreground-strong)] hover:border-[color:var(--border-dark)]",
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>

                {cash ? (
                  <CashPad
                    typed={typed}
                    missing={missing}
                    disabled={submitting}
                    onDigit={pushDigit}
                    onPop={popDigit}
                    onNote={addNote}
                    onExact={() => {
                      setBuffer(String(total));
                      setPrefilled(true);
                    }}
                  />
                ) : method === "pix" ? (
                  <PixPanel
                    total={total}
                    settings={pixSettings}
                    pix={pix}
                    loading={pixLoading}
                    error={pixError}
                    phone={phone}
                    onPhoneChange={setPhone}
                    copied={copied}
                    onCopy={copyPayload}
                    onSend={sendWhatsApp}
                    onShareImage={shareQrImage}
                    customerName={preOrder.customer?.name ?? null}
                  />
                ) : method === "debit" || method === "credit" ? (
                  <CardPanel method={method} total={total} />
                ) : method === "invoice" ? (
                  <InvoicePanel
                    total={total}
                    summary={summary}
                    customerName={preOrder.customer?.name ?? null}
                  />
                ) : (
                  <p className="rounded-xl border border-dashed border-[color:var(--border-dark)] px-3.5 py-4 text-center text-[12.5px] text-[color:var(--muted-foreground)]">
                    Escolha como o cliente pagou. Dinheiro abre o teclado para contar o troco.
                  </p>
                )}

                {change > 0 && (
                  <div
                    className="rounded-xl border-2 border-dashed px-3.5 py-3"
                    style={{
                      background: "var(--state-pronto-bg)",
                      borderColor: "var(--state-pronto)",
                      color: "var(--state-pronto-fg)",
                    }}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-[0.11em]">Troco</span>
                    <span className="block font-mono text-[27px] font-bold leading-tight tracking-[-0.03em] tabular-nums">
                      {formatCurrency(change)}
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px]">{describeChange(change)}</span>
                  </div>
                )}

              </div>

              <div className="flex flex-col gap-2 border-t border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3">
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!canConfirm}
                  loading={submitting}
                  onClick={confirm}
                  leftIcon={<Wallet className="h-4 w-4" />}
                  style={{ background: "var(--state-cobrar-solid)", color: "var(--state-cobrar-on)" }}
                >
                  {method === "invoice" ? "Lançar na ficha" : "Receber"}{" "}
                  <span className="font-mono font-bold tabular-nums">{formatCurrency(total)}</span>
                </Button>
                <p className="flex items-center justify-between text-[11px] text-[color:var(--muted-foreground)]">
                  <span>
                    {!method
                      ? "Escolha a forma de pagamento."
                      : missing > 0
                        ? `Faltam ${formatCurrency(missing)} para fechar a conta.`
                        : "Enter recebe · Esc fecha"}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    disabled={submitting}
                    className="font-semibold underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Cancelar
                  </button>
                </p>
              </div>
            </>
          )}

          {!result && next && (
            <p className="flex items-center gap-2 whitespace-nowrap border-t border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-2.5 text-[11.5px] text-[color:var(--muted-foreground-strong)]">
              <span>Próximo a cobrar:</span>
              <span className="min-w-0 flex-1 truncate font-bold text-[color:var(--foreground)]">
                {next.name}
              </span>
              <span
                className="flex-none rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold tabular-nums"
                style={{ background: "var(--state-cobrar-bg)", color: "var(--state-cobrar-fg)" }}
              >
                {formatCurrency(next.totalCents)}
              </span>
            </p>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}

// =============================================================================
// CABEÇALHO
// =============================================================================

function Head({
  preOrder,
  total,
  missing,
  hint,
  done,
  headingRef,
  onClose,
  disabled,
}: {
  preOrder: PreOrder;
  total: number;
  missing: number;
  hint: string;
  done: boolean;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onClose: () => void;
  disabled: boolean;
}) {
  // A cor conta a etapa: rosa enquanto há o que cobrar, verde-azulado quando o
  // pedido vira dinheiro. São os mesmos tokens da trilha do dia.
  const token = done ? "faturado" : "cobrar";
  const label = done ? "Recebido" : missing > 0 ? "Falta receber" : "A receber";
  const value = missing > 0 ? missing : total;

  return (
    <header
      className="border-b px-4 py-3.5"
      style={{ background: `var(--state-${token}-bg)`, borderColor: `var(--state-${token})` }}
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-xl text-[12px] font-bold"
          style={{ background: `var(--state-${token}-solid)`, color: `var(--state-${token}-on)` }}
        >
          {preOrder.customer ? initialsOf(preOrder.customer.name) : "—"}
        </span>
        <div className="min-w-0 flex-1">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="truncate text-[15px] font-bold leading-tight focus:outline-none"
            style={{ color: `var(--state-${token}-fg)` }}
          >
            {preOrder.customer?.name ?? "Venda avulsa"}
          </h2>
          <p className="truncate font-mono text-[11px]" style={{ color: `var(--state-${token}-fg)` }}>
            #{preOrder.id.slice(-4).toUpperCase()} · {preOrder.items.length} item
            {preOrder.items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={disabled}
          aria-label="Fechar terminal"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-lg transition-colors hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ color: `var(--state-${token}-fg)` }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-2.5">
        <span
          className="block text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ color: `var(--state-${token}-fg)` }}
        >
          {label}
        </span>
        <span
          className="block font-mono text-[38px] font-bold leading-[1.05] tracking-[-0.04em] tabular-nums"
          style={{ color: `var(--state-${token})` }}
        >
          {formatCurrency(value)}
        </span>
        <span
          className="mt-0.5 block font-mono text-[11px] tabular-nums"
          style={{ color: `var(--state-${token}-fg)` }}
        >
          {missing > 0 ? `total ${formatCurrency(total)}` : hint}
        </span>
      </p>
    </header>
  );
}

// =============================================================================
// DINHEIRO
// =============================================================================

function CashPad({
  typed,
  missing,
  disabled,
  onDigit,
  onPop,
  onNote,
  onExact,
}: {
  typed: number;
  missing: number;
  disabled: boolean;
  onDigit: (key: string) => void;
  onPop: () => void;
  onNote: (valueCents: number) => void;
  onExact: () => void;
}) {
  return (
    <>
      <p className="flex items-baseline justify-between gap-2 rounded-xl border border-[color:var(--border-dark)] bg-[color:var(--muted)] px-3.5 py-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[color:var(--muted-foreground)]">
          Recebido
        </span>
        <span
          className={cn(
            "font-mono text-[26px] font-bold leading-none tracking-[-0.03em] tabular-nums",
            typed > 0 ? "text-[color:var(--foreground)]" : "text-[color:var(--border-dark)]",
            missing > 0 && typed > 0 && "text-[color:var(--state-cobrar)]",
          )}
        >
          {formatCurrency(typed)}
        </span>
      </p>

      <div className="grid grid-cols-4 gap-1.5">
        {QUICK_CASH.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onNote(value)}
            disabled={disabled}
            title={`Somar uma nota de ${formatCurrency(value)}`}
            className={cn(
              "h-10 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]",
              "font-mono text-[12.5px] font-semibold tabular-nums transition-colors",
              "hover:border-[color:var(--border-dark)] hover:bg-[color:var(--muted)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            +{formatCurrency(value)}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onExact}
        disabled={disabled}
        className={cn(
          "h-10 rounded-lg border border-[color:var(--primary-light)] bg-[color:var(--primary-lighter)]",
          "text-[12.5px] font-semibold text-primary transition-colors hover:bg-[color:var(--primary-light)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]",
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        Valor exato
      </button>

      <div className="grid grid-cols-3 gap-1.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((key) => (
          <Key key={key} label={key} disabled={disabled} onClick={() => onDigit(key)} />
        ))}
        <Key
          label={<Delete className="h-5 w-5" aria-hidden="true" />}
          ariaLabel="Apagar último dígito"
          disabled={disabled}
          onClick={onPop}
        />
        <Key label="0" disabled={disabled} onClick={() => onDigit("0")} />
        <Key label="00" disabled={disabled} onClick={() => onDigit("00")} />
      </div>
    </>
  );
}

function Key({
  label,
  ariaLabel,
  disabled,
  onClick,
}: {
  label: React.ReactNode;
  ariaLabel?: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "flex h-[50px] items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]",
        "font-mono text-[19px] font-medium tabular-nums transition-colors",
        "hover:bg-[color:var(--muted)] active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]",
        "disabled:cursor-not-allowed disabled:opacity-40",
      )}
    >
      {label}
    </button>
  );
}

// =============================================================================
// PIX
// =============================================================================

/**
 * O QR na tela é para quem está no balcão; o "copia e cola" é para quem está
 * longe. O envio pelo WhatsApp leva o pedido e o código — o número vem
 * preenchido com o do cliente e pode ser trocado, ou apagado para escolher o
 * contato na hora.
 */
function PixPanel({
  total,
  settings,
  pix,
  loading,
  error,
  phone,
  onPhoneChange,
  copied,
  onCopy,
  onSend,
  onShareImage,
  customerName,
}: {
  total: number;
  settings: PixSettings | null;
  pix: { payload: string; qrCodeUrl: string } | null;
  loading: boolean;
  error: string | null;
  phone: string;
  onPhoneChange: (value: string) => void;
  copied: boolean;
  onCopy: () => void;
  onSend: () => void;
  onShareImage: () => void;
  customerName: string | null;
}) {
  const [canShareFiles, setCanShareFiles] = useState(false);

  useEffect(() => {
    const share = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    // `canShare` sem arquivo não prova nada: o teste precisa ser com um arquivo.
    const probe = new File([new Blob([""], { type: "image/png" })], "probe.png", {
      type: "image/png",
    });
    setCanShareFiles(Boolean(share.canShare?.({ files: [probe] })));
  }, []);

  if (!settings) {
    return (
      <p
        className="rounded-xl border px-3.5 py-3 text-[12.5px] leading-snug"
        style={{
          background: "var(--state-cobrar-bg)",
          borderColor: "var(--state-cobrar)",
          color: "var(--state-cobrar-fg)",
        }}
      >
        Nenhuma chave PIX configurada. Cadastre em <strong className="font-bold">Configurações ›
        Pagamento</strong> para gerar o QR code — o recebimento em PIX continua podendo ser
        confirmado à mão.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col items-center rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-3">
        {loading && (
          <span className="flex h-[180px] w-[180px] items-center justify-center rounded-lg bg-[color:var(--muted)] text-[color:var(--muted-foreground)]">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          </span>
        )}

        {!loading && error && (
          <span className="flex h-[180px] w-[180px] items-center justify-center rounded-lg bg-[color:var(--muted)] px-4 text-center text-[12px] text-[color:var(--muted-foreground)]">
            {error}
          </span>
        )}

        {!loading && !error && pix && (
          <>
            {/* Fundo branco fixo: QR em superfície escura não é lido pela câmera. */}
            <span className="rounded-lg bg-white p-2">
              <img
                src={pix.qrCodeUrl}
                alt={`QR code PIX de ${formatCurrency(total)}`}
                width={200}
                height={200}
                className="block h-[200px] w-[200px]"
              />
            </span>
            <span className="mt-2 text-center text-[11.5px] leading-snug text-[color:var(--muted-foreground)]">
              Aponte a câmera do banco para pagar <strong className="font-bold">{formatCurrency(total)}</strong>
              <br />
              Chave: <span className="font-mono">{settings.key}</span>
            </span>
          </>
        )}
      </div>

      {pix && (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onCopy}
            className={cn(
              "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-[12.5px] font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]",
              copied
                ? "border-[color:var(--state-faturado)] text-[color:var(--state-faturado-fg)] [background:var(--state-faturado-bg)]"
                : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--muted-foreground-strong)] hover:border-[color:var(--border-dark)]",
            )}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Código copiado" : "Copiar código"}
          </button>
          {canShareFiles && (
            <button
              type="button"
              onClick={onShareImage}
              title="Compartilhar a imagem do QR code"
              aria-label="Compartilhar a imagem do QR code"
              className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--muted-foreground-strong)] transition-colors hover:border-[color:var(--border-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2.5">
        <label className="block">
          <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[color:var(--muted-foreground)]">
            Enviar para
          </span>
          <input
            value={phone}
            onChange={(event) => onPhoneChange(event.target.value)}
            inputMode="tel"
            placeholder="Escolher contato no WhatsApp"
            aria-label="Número de WhatsApp do destinatário"
            className="mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-2.5 py-1.5 font-mono text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-[color:var(--primary-lighter)]"
          />
        </label>
        <button
          type="button"
          onClick={onSend}
          disabled={!pix}
          className={cn(
            "mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg text-[13px] font-semibold text-white transition-all",
            "bg-[#25D366] hover:brightness-105",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          Enviar pelo WhatsApp
        </button>
        <p className="mt-1.5 text-[11px] leading-snug text-[color:var(--muted-foreground)]">
          {phone.trim()
            ? `Vai o pedido, o valor e o código para colar no banco${customerName ? ` — para ${customerName.split(" ")[0]}` : ""}.`
            : "Em branco, o WhatsApp abre a lista de contatos para você escolher."}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// CARTÃO
// =============================================================================

const MACHINES = [
  { name: "Mercado Pago", detail: "Point / Point Smart" },
  { name: "PagSeguro", detail: "Moderninha / Minizinha" },
];

/**
 * Cartão não é cobrado por aqui: quem cobra é a maquininha. O painel serve para
 * o operador digitar o valor certo e só voltar quando a operadora aprovar.
 */
function CardPanel({ method, total }: { method: PaymentMethod; total: number }) {
  const label = method === "debit" ? "Débito" : "Crédito";

  return (
    <div className="flex flex-col gap-2.5">
      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3.5 py-3 text-center">
        <span className="block text-[10px] font-bold uppercase tracking-[0.11em] text-[color:var(--muted-foreground)]">
          Passe na maquininha
        </span>
        <span className="mt-0.5 block font-mono text-[30px] font-bold leading-tight tracking-[-0.035em] tabular-nums">
          {formatCurrency(total)}
        </span>
        <span className="block text-[12px] font-semibold text-[color:var(--muted-foreground-strong)]">
          {label} · valor exato
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {MACHINES.map((machine) => (
          <div
            key={machine.name}
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2.5"
          >
            <span className="block text-[12.5px] font-bold leading-tight">{machine.name}</span>
            <span className="mt-0.5 block text-[11px] text-[color:var(--muted-foreground)]">
              {machine.detail}
            </span>
          </div>
        ))}
      </div>

      <ol className="overflow-hidden rounded-xl border border-[color:var(--border)]">
        {[
          `Escolha ${label.toLowerCase()} na maquininha do Mercado Pago ou do PagSeguro.`,
          `Digite ${formatCurrency(total)} e passe o cartão.`,
          "Só confirme aqui depois que a operadora aprovar.",
        ].map((step, index) => (
          <li
            key={step}
            className="flex items-start gap-2.5 border-b border-[color:var(--border)] px-3 py-2 text-[12px] leading-snug last:border-b-0"
          >
            <span
              aria-hidden="true"
              className="flex h-4 w-4 flex-none items-center justify-center rounded-full text-[10px] font-bold"
              style={{ background: "var(--primary-light)", color: "var(--primary)" }}
            >
              {index + 1}
            </span>
            <span className="text-[color:var(--muted-foreground-strong)]">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// =============================================================================
// FICHA
// =============================================================================

/**
 * Lançar na ficha é aumentar uma dívida. O painel mostra de quanto ela é hoje,
 * de quanto passa a ser, e quem é o cliente por trás do número.
 */
function InvoicePanel({
  total,
  summary,
  customerName,
}: {
  total: number;
  summary: CustomerSummary | null;
  customerName: string | null;
}) {
  const debt = summary?.debtBalanceCents ?? null;

  return (
    <div className="flex flex-col gap-2.5">
      <div
        className="rounded-xl border px-3.5 py-3"
        style={{
          background: "var(--state-cobrar-bg)",
          borderColor: "var(--state-cobrar)",
          color: "var(--state-cobrar-fg)",
        }}
      >
        <span className="block text-[10px] font-bold uppercase tracking-[0.11em]">
          Ficha {customerName ? `de ${customerName.split(" ")[0]}` : "do cliente"}
        </span>

        {debt === null ? (
          <span className="mt-1 block text-[12.5px] leading-snug">
            A venda fica pendente na ficha até ser paga.
          </span>
        ) : (
          <>
            <span className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-[17px] font-bold tabular-nums opacity-70">
                {formatCurrency(debt)}
              </span>
              <ArrowRight className="h-4 w-4 flex-none" aria-hidden="true" />
              <span className="font-mono text-[27px] font-bold leading-none tracking-[-0.03em] tabular-nums">
                {formatCurrency(debt + total)}
              </span>
            </span>
            <span className="mt-1 block text-[11.5px]">
              Este pedido acrescenta {formatCurrency(total)} ao que já está em aberto.
            </span>
          </>
        )}
      </div>

      {summary && (
        <dl className="overflow-hidden rounded-xl border border-[color:var(--border)] text-[12px]">
          <div className="flex justify-between gap-3 border-b border-[color:var(--border)] px-3 py-2">
            <dt className="text-[color:var(--muted-foreground)]">Pedidos do cliente</dt>
            <dd className="font-mono font-semibold tabular-nums">{summary.orderCount}</dd>
          </div>
          <div className="flex justify-between gap-3 px-3 py-2">
            <dt className="text-[color:var(--muted-foreground)]">Último pedido</dt>
            <dd className="font-mono font-semibold">
              {summary.lastOrderAt ? formatWhen(summary.lastOrderAt) : "—"}
            </dd>
          </div>
        </dl>
      )}

      <ol className="overflow-hidden rounded-xl border border-[color:var(--border)]">
        {[
          "A venda nasce pendente e entra no que o cliente deve.",
          "O acerto é lançado depois, em Clientes › ficha do cliente.",
          "Nada entra no caixa de hoje por este pedido.",
        ].map((step, index) => (
          <li
            key={step}
            className="flex items-start gap-2.5 border-b border-[color:var(--border)] px-3 py-2 text-[12px] leading-snug last:border-b-0"
          >
            <span
              aria-hidden="true"
              className="flex h-4 w-4 flex-none items-center justify-center rounded-full text-[10px] font-bold"
              style={{ background: "var(--state-cobrar-bg)", color: "var(--state-cobrar-fg)" }}
            >
              {index + 1}
            </span>
            <span className="text-[color:var(--muted-foreground-strong)]">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// =============================================================================
// RECIBO
// =============================================================================

function Receipt({
  result,
  next,
  onPrint,
  onNext,
  onClose,
}: {
  result: Result;
  next: NextInQueue | null;
  onPrint: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  return (
    <div className="scroll-slim flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "var(--state-faturado-bg)", color: "var(--state-faturado-fg)" }}
        >
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <p className="mt-3 text-[18px] font-bold tracking-tight">Pedido encerrado</p>
        <p className="mt-1 text-[13px] text-[color:var(--muted-foreground)]">
          {formatCurrency(result.totalCents)} em {methodLabel(result.method)} · venda criada ·
          estoque baixado
        </p>

        {result.changeCents > 0 && (
          <div
            className="mt-5 w-full max-w-[300px] rounded-xl border-2 border-dashed px-3.5 py-3"
            style={{
              background: "var(--state-pronto-bg)",
              borderColor: "var(--state-pronto)",
              color: "var(--state-pronto-fg)",
            }}
          >
            <span className="block text-[10px] font-bold uppercase tracking-[0.11em]">Troco</span>
            <span className="block font-mono text-[30px] font-bold leading-tight tracking-[-0.035em] tabular-nums">
              {formatCurrency(result.changeCents)}
            </span>
            <span className="mt-1 block font-mono text-[11px]">
              {describeChange(result.changeCents)}
            </span>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <Button variant="outline" className="w-full" onClick={onPrint} leftIcon={<Printer className="h-4 w-4" />}>
          Imprimir recibo
        </Button>
        {next && (
          <Button
            size="lg"
            className="w-full"
            onClick={onNext}
            leftIcon={<ArrowRight className="h-4 w-4" />}
            style={{ background: "var(--state-cobrar-solid)", color: "var(--state-cobrar-on)" }}
          >
            <span className="min-w-0 truncate">Próximo · {next.name}</span>
          </Button>
        )}
        <Button variant="ghost" className="w-full" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
}
