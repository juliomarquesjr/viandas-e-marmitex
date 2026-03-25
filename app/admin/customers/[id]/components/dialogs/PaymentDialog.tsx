"use client";

import { useState } from "react";
import { Banknote, CreditCard, DollarSign, Loader2, QrCode, Wallet } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../../components/ui/dialog";

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isProcessingPayment: boolean;
  onSubmit: (
    amount: string,
    method: string,
    date: string,
    cashReceived: string
  ) => Promise<boolean>;
}

const PAYMENT_METHODS = [
  { label: "Dinheiro", value: "cash", icon: Banknote },
  { label: "Cartão Débito", value: "debit", icon: CreditCard },
  { label: "Cartão Crédito", value: "credit", icon: CreditCard },
  { label: "PIX", value: "pix", icon: QrCode },
] as const;

export function PaymentDialog({
  isOpen,
  onOpenChange,
  isProcessingPayment,
  onSubmit,
}: PaymentDialogProps) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [paymentDate, setPaymentDate] = useState("");

  const resetState = () => {
    setPaymentAmount("");
    setSelectedPaymentMethod("");
    setPaymentDate("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!isProcessingPayment) {
      if (!open) resetState();
      onOpenChange(open);
    }
  };

  const handleSubmit = async () => {
    const success = await onSubmit(paymentAmount, selectedPaymentMethod, paymentDate, "");
    if (success) {
      onOpenChange(false);
      resetState();
    }
  };

  const selectedMethod = PAYMENT_METHODS.find((m) => m.value === selectedPaymentMethod);
  const isValid = !!paymentAmount && parseFloat(paymentAmount) > 0 && !!selectedPaymentMethod;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader>
          <DialogTitle>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{
                background: "var(--modal-header-icon-bg)",
                outline: "1px solid var(--modal-header-icon-ring)",
              }}
            >
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            Adicionar Pagamento à Ficha
          </DialogTitle>
          <DialogDescription>
            Registre um pagamento para reduzir o saldo devedor do cliente
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Valor & Data */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
              Valor &amp; Data
            </span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Valor do Pagamento <span className="text-red-400">*</span>
              </label>
              <div className={`flex items-center border rounded-xl overflow-hidden transition-all ${
                !paymentAmount || parseFloat(paymentAmount) <= 0
                  ? "border-slate-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15"
                  : "border-emerald-300 ring-2 ring-emerald-300/20"
              }`}>
                <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-50 border-r border-slate-200 flex-shrink-0">
                  <DollarSign className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-500">R$</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  disabled={isProcessingPayment}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0,00"
                  className="flex-1 px-3 py-3 text-xl font-bold text-slate-900 bg-white outline-none placeholder:text-slate-300 placeholder:font-normal placeholder:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Data do Pagamento
              </label>
              <input
                type="date"
                value={paymentDate}
                disabled={isProcessingPayment}
                onChange={(e) => setPaymentDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full h-[52px] px-3 border border-slate-200 rounded-xl text-base text-slate-900 bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              />
              <p className="text-xs text-slate-400">Deixe em branco para usar a data atual</p>
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
              Forma de Pagamento <span className="text-red-400">*</span>
            </span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedPaymentMethod === method.value;
                return (
                  <button
                    key={method.value}
                    type="button"
                    disabled={isProcessingPayment}
                    onClick={() => setSelectedPaymentMethod(method.value)}
                    className={`h-20 flex flex-col items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                      isSelected
                        ? "border-primary bg-primary text-white shadow-md shadow-primary/25"
                        : "border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{method.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="bg-slate-50 rounded-xl p-5 h-full flex flex-col items-center justify-center text-center border border-slate-100">
              {selectedMethod ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 space-y-2">
                  <div
                    className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{
                      background: "var(--modal-header-icon-bg)",
                      outline: "1px solid var(--modal-header-icon-ring)",
                    }}
                  >
                    <selectedMethod.icon className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-base font-semibold text-slate-800">
                    {selectedMethod.label}
                  </p>
                  {paymentAmount && parseFloat(paymentAmount) > 0 && (
                    <p className="text-sm text-slate-500">
                      Valor:{" "}
                      <span className="font-bold text-emerald-600">
                        R$ {parseFloat(paymentAmount).toFixed(2).replace(".", ",")}
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-slate-400">
                  <Wallet className="h-10 w-10 mx-auto" />
                  <p className="text-sm font-medium">Selecione uma forma de pagamento</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <p className="text-xs text-slate-400">
            <span className="text-red-400">*</span> campos obrigatórios
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={isProcessingPayment}
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isProcessingPayment || !isValid}
            >
              {isProcessingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                "Registrar Pagamento"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
