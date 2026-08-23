"use client";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { cn } from "@/lib/utils";
import { AlertTriangle, Banknote, CreditCard, FileText, QrCode, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { describeItem, formatCurrency, weightOf, type PreOrder } from "../lib/preOrderView";

export type PaymentMethod = "cash" | "debit" | "credit" | "pix" | "ficha_payment";

const METHODS: Array<{ value: PaymentMethod; label: string; icon: typeof Banknote; needsCustomer?: boolean }> = [
  { value: "pix", label: "Pix", icon: QrCode },
  { value: "cash", label: "Dinheiro", icon: Banknote },
  { value: "debit", label: "Débito", icon: CreditCard },
  { value: "credit", label: "Crédito", icon: CreditCard },
  { value: "ficha_payment", label: "Ficha", icon: User, needsCustomer: true },
];

/** Tempo entre escolher a forma de pagamento e o botão de confirmar habilitar. */
const ARM_DELAY_MS = 600;

interface ReceivePanelProps {
  preOrder: PreOrder;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: (input: {
    paymentMethod: PaymentMethod;
    cashReceived?: number;
    change?: number;
  }) => void;
}

/**
 * Receber é a ação irreversível da tela: cria a venda, baixa o estoque e
 * encerra o pré-pedido. Por isso acontece aqui dentro do painel, com os itens
 * relidos em corpo grande e a consequência escrita antes do clique.
 */
export function ReceivePanel({ preOrder, submitting, onCancel, onConfirm }: ReceivePanelProps) {
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [cashInput, setCashInput] = useState("");
  const [armed, setArmed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const methods = METHODS.filter((item) => !item.needsCustomer || preOrder.customerId);
  const unitCount = preOrder.items.length;

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Trava anti-toque-duplo: escolher a forma de pagamento não pode confirmar.
  useEffect(() => {
    if (!method) {
      setArmed(false);
      return;
    }
    setArmed(false);
    const timer = window.setTimeout(() => setArmed(true), ARM_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [method]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel, submitting]);

  const cashReceived = useMemo(() => {
    const parsed = Number.parseFloat(cashInput.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }, [cashInput]);

  const totalReais = preOrder.totalCents / 100;
  const change = Math.max(0, cashReceived - totalReais);
  const cashShort = method === "cash" && cashReceived > 0 && cashReceived < totalReais;
  const canConfirm = Boolean(method) && armed && !submitting && !cashShort;

  return (
    <section
      aria-label="Receber pré-pedido"
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto border-t border-[color:var(--border)] bg-[color:var(--card)] px-5 py-5"
    >
      <div className="flex items-baseline gap-3">
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="text-base font-bold text-[color:var(--foreground)] focus:outline-none"
        >
          Confira antes de fechar
        </h3>
        <span className="ml-auto text-xs text-[color:var(--muted-foreground)]">Passo 1 de 2 · itens e total</span>
      </div>

      {/* Releitura em corpo grande: é a última chance de ver o que está sendo vendido. */}
      <div className="overflow-hidden rounded-xl border border-[color:var(--border)]">
        <ul>
          {preOrder.items.map((item) => (
            <li
              key={item.id}
              className="flex justify-between gap-3 border-b border-[color:var(--border)] px-4 py-2.5 text-lg"
            >
              <span className="font-medium text-[color:var(--foreground)]">{describeItem(item)}</span>
              <span className="font-mono font-bold tabular-nums text-[color:var(--foreground)]">
                {formatCurrency(item.priceCents * (weightOf(item) !== null ? 1 : item.quantity))}
              </span>
            </li>
          ))}
        </ul>
        {preOrder.discountCents > 0 && (
          <p className="flex justify-between px-4 py-2 text-sm text-[color:var(--muted-foreground)]">
            <span>Desconto</span>
            <span className="tabular-nums">-{formatCurrency(preOrder.discountCents)}</span>
          </p>
        )}
        <p className="flex justify-between bg-[color:var(--muted)] px-4 py-3 text-[22px] font-bold tracking-tight text-[color:var(--foreground)]">
          <span>Total</span>
          <span className="font-mono tabular-nums">{formatCurrency(preOrder.totalCents)}</span>
        </p>
      </div>

      <div className="flex items-baseline gap-3">
        <h3 className="text-base font-bold text-[color:var(--foreground)]">Como o cliente pagou?</h3>
        <span className="ml-auto text-xs text-[color:var(--muted-foreground)]">Passo 2 de 2</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {methods.map(({ value, label, icon: Icon }) => {
          const active = method === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setMethod(value)}
              aria-pressed={active}
              className={cn(
                "flex h-[70px] flex-col items-center justify-center gap-1.5 rounded-xl border text-[12.5px] font-semibold transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2",
                active
                  ? "border-[color:var(--primary)] bg-[color:var(--primary-lighter)] text-[color:var(--primary)] shadow-[0_16px_32px_-18px_rgba(37,99,235,0.55)]"
                  : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--muted-foreground)] hover:border-[color:var(--border-dark)]",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      {method === "cash" && (
        <div className="flex flex-wrap items-end gap-4 rounded-xl border border-[color:var(--border)] px-4 py-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
              Valor recebido
            </span>
            <Input
              inputMode="decimal"
              value={cashInput}
              onChange={(event) => setCashInput(event.target.value)}
              placeholder="0,00"
              className="h-11 w-40 text-lg tabular-nums"
            />
          </label>
          <p className="pb-2 text-sm">
            <span className="text-[color:var(--muted-foreground)]">Troco: </span>
            <span className="font-mono text-lg font-bold tabular-nums text-[color:var(--foreground)]">
              {formatCurrency(Math.round(change * 100))}
            </span>
          </p>
          {cashShort && (
            <p className="pb-2 text-sm font-semibold" style={{ color: "var(--state-cobrar)" }}>
              Valor recebido menor que o total.
            </p>
          )}
        </div>
      )}

      <p
        className="flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[12.5px] leading-relaxed"
        style={{
          background: "var(--state-pronto-bg)",
          borderColor: "var(--state-pronto)",
          color: "var(--state-pronto-fg)",
        }}
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
        <span>
          Ao confirmar: cria a venda com o pagamento escolhido, baixa{" "}
          <strong className="font-bold">
            {unitCount} item{unitCount !== 1 ? "s" : ""}
          </strong>{" "}
          do estoque e encerra este pré-pedido.{" "}
          <strong className="font-bold">Não há como desfazer pela tela.</strong>
        </span>
      </p>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          size="lg"
          disabled={!canConfirm}
          loading={submitting}
          onClick={() => {
            if (!method) return;
            onConfirm({
              paymentMethod: method,
              cashReceived: method === "cash" ? cashReceived : undefined,
              change: method === "cash" ? change : undefined,
            });
          }}
          leftIcon={<FileText className="h-4 w-4" />}
          style={{ background: "var(--state-cobrar-solid)", color: "var(--state-cobrar-on)" }}
        >
          Confirmar recebimento de{" "}
          <span className="font-mono font-bold tabular-nums">{formatCurrency(preOrder.totalCents)}</span>
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <span className="ml-auto text-[11.5px] text-[color:var(--muted-foreground)]">Esc cancela</span>
      </div>
    </section>
  );
}
