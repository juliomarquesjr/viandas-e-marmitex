"use client";

import {
  AlertCircle,
  ClipboardList,
  CreditCard,
  QrCode,
  Wallet,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import type { Customer } from "../types";
import { PaymentCashDetail } from "./PaymentCashDetail";
import { PaymentMethodList } from "./PaymentMethodList";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  selectedPayment: string | null;
  setSelectedPayment: (method: string) => void;
  cashReceived: string;
  setCashReceived: (v: string) => void;
  change: number;
  setChange: (v: number) => void;
  isFinalizing: boolean;
  cartLength: number;
  selectedCustomer: Customer | null;
  onFinalize: () => void;
  onClose: () => void;
}

export function PaymentModal({
  open,
  onOpenChange,
  total,
  selectedPayment,
  setSelectedPayment,
  cashReceived,
  setCashReceived,
  change,
  setChange,
  isFinalizing,
  cartLength,
  selectedCustomer,
  onFinalize,
  onClose,
}: PaymentModalProps) {
  const isDisabled =
    isFinalizing ||
    !selectedPayment ||
    cartLength === 0 ||
    (selectedPayment === "Ficha do Cliente" && !selectedCustomer) ||
    (selectedPayment === "Dinheiro" &&
      (!cashReceived || parseFloat(cashReceived) < total));

  function handleMethodSelect(method: string) {
    setSelectedPayment(method);
    if (method !== "Dinheiro") {
      setCashReceived("");
      setChange(0);
    }
  }

  function renderDetail() {
    if (selectedPayment === "Dinheiro") {
      return (
        <PaymentCashDetail
          total={total}
          cashReceived={cashReceived}
          change={change}
          setCashReceived={setCashReceived}
          setChange={setChange}
        />
      );
    }

    if (selectedPayment === "Ficha do Cliente") {
      return (
        <div className="bg-blue-50 rounded-xl p-5 border border-blue-200 animate-in fade-in slide-in-from-right-4 duration-300">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-blue-900">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            Ficha do Cliente
          </h3>
          <div className="text-sm text-blue-800">
            {selectedCustomer ? (
              <div className="space-y-2">
                <p>
                  Esta venda será lançada na ficha de{" "}
                  <span className="font-bold">{selectedCustomer.name}</span>.
                </p>
                {selectedCustomer.phone && (
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <p className="font-medium">Telefone: {selectedCustomer.phone}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>
                  Nenhum cliente selecionado. Selecione um cliente para usar este método.
                </span>
              </p>
            )}
          </div>
        </div>
      );
    }

    if (selectedPayment) {
      const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
        "Cartão Débito": CreditCard,
        "Cartão Crédito": CreditCard,
        PIX: QrCode,
      };
      const Icon = iconMap[selectedPayment];
      return (
        <div className="bg-slate-50 rounded-xl p-5 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-right-4 duration-300 min-h-[180px]">
          {Icon && (
            <div className="mb-3 p-3 bg-white rounded-full shadow-sm">
              <Icon className="h-8 w-8 text-primary" />
            </div>
          )}
          <h3 className="text-sm font-semibold mb-1 text-slate-900">
            Pagamento com {selectedPayment}
          </h3>
          <p className="text-sm text-muted-foreground">
            Total:{" "}
            <span className="font-bold text-slate-900">R$ {total.toFixed(2)}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Clique em &ldquo;Confirmar&rdquo; para concluir a venda.
          </p>
        </div>
      );
    }

    return (
      <div className="bg-slate-50 rounded-xl p-5 flex flex-col items-center justify-center text-center min-h-[180px]">
        <Wallet className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-500">
          Selecione uma forma de pagamento
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Escolha uma opção ao lado para prosseguir.
        </p>
      </div>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--modal-header-icon-bg)" }}
            >
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Finalizar Venda</DialogTitle>
              <DialogDescription>
                {selectedCustomer
                  ? `Pagamento para ${selectedCustomer.name}`
                  : "Selecione a forma de pagamento"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Forma de Pagamento
            </p>
            <PaymentMethodList
              selectedPayment={selectedPayment}
              onSelect={handleMethodSelect}
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Detalhes
            </p>
            {renderDetail()}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="success"
            size="lg"
            className="flex-1"
            disabled={isDisabled}
            onClick={onFinalize}
          >
            {isFinalizing ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Finalizando...
              </>
            ) : (
              <>
                <Wallet className="h-5 w-5" />
                Confirmar Pagamento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
