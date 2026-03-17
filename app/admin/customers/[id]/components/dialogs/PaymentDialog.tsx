import { useState } from "react";
import { Banknote, CreditCard, QrCode, Wallet, X } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "../../../../../components/ui/dialog";
import { Input } from "../../../../../components/ui/input";

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

export function PaymentDialog({
  isOpen,
  onOpenChange,
  isProcessingPayment,
  onSubmit,
}: PaymentDialogProps) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [cashReceived, setCashReceived] = useState("");

  const resetState = () => {
    setPaymentAmount("");
    setSelectedPaymentMethod("");
    setPaymentDate("");
    setCashReceived("");
  };

  const handleClose = () => {
    if (!isProcessingPayment) {
      onOpenChange(false);
      resetState();
    }
  };

  const handleSubmit = async () => {
    const success = await onSubmit(
      paymentAmount,
      selectedPaymentMethod,
      paymentDate,
      cashReceived
    );
    if (success) {
      onOpenChange(false);
      resetState();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
        <DialogTitle className="sr-only">Adicionar Pagamento à Ficha</DialogTitle>

        {isProcessingPayment && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl">
            <div className="text-center">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
              <p className="mt-4 text-lg font-semibold text-orange-600">Processando pagamento...</p>
              <p className="text-sm text-gray-600 mt-1">Por favor, aguarde</p>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 relative">
          <div className="relative p-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-orange-600" />
                Adicionar Pagamento à Ficha
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Registre um pagamento para reduzir o saldo devedor do cliente
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={isProcessingPayment}
              className="h-10 w-10 rounded-full bg-white/60 hover:bg-white border border-gray-200 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Valor do Pagamento</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  disabled={isProcessingPayment}
                  onChange={(e) => { if (!isProcessingPayment) setPaymentAmount(e.target.value); }}
                  placeholder="0,00"
                  className="pl-10 text-lg h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Data do Pagamento</label>
              <div className="relative mt-1">
                <Input
                  type="date"
                  value={paymentDate}
                  disabled={isProcessingPayment}
                  onChange={(e) => { if (!isProcessingPayment) setPaymentDate(e.target.value); }}
                  max={new Date().toISOString().split("T")[0]}
                  className="text-lg h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500">Deixe a data em branco para usar a data atual</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Formas de Pagamento</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Dinheiro", value: "cash", icon: Banknote },
                  { label: "Cartão Débito", value: "debit", icon: CreditCard },
                  { label: "Cartão Crédito", value: "credit", icon: CreditCard },
                  { label: "PIX", value: "pix", icon: QrCode },
                ].map((method) => {
                  const Icon = method.icon;
                  return (
                    <Button
                      key={method.value}
                      variant={selectedPaymentMethod === method.value ? "default" : "outline"}
                      disabled={isProcessingPayment}
                      className="h-20 flex flex-col items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      onClick={() => { if (!isProcessingPayment) setSelectedPaymentMethod(method.value); }}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-sm font-medium">{method.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="transition-all duration-300 ease-in-out">
              {selectedPaymentMethod ? (
                <div className="bg-muted rounded-xl p-5 h-full flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="mb-3 p-3 bg-background rounded-full">
                    {(() => {
                      const method = [
                        { label: "Dinheiro", value: "cash", icon: Banknote },
                        { label: "Cartão Débito", value: "debit", icon: CreditCard },
                        { label: "Cartão Crédito", value: "credit", icon: CreditCard },
                        { label: "PIX", value: "pix", icon: QrCode },
                      ].find((m) => m.value === selectedPaymentMethod);
                      const Icon = method?.icon;
                      return Icon ? <Icon className="h-8 w-8 text-primary" /> : null;
                    })()}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Pagamento com {selectedPaymentMethod === "cash" ? "Dinheiro" : selectedPaymentMethod === "debit" ? "Cartão Débito" : selectedPaymentMethod === "credit" ? "Cartão Crédito" : "PIX"}
                  </h3>
                  <p className="text-muted-foreground">
                    O valor do pagamento é{" "}
                    <span className="font-bold">R$ {parseFloat(paymentAmount || "0").toFixed(2)}</span>.
                    Confirme os dados e clique em &quot;Registrar Pagamento&quot; para concluir.
                  </p>
                </div>
              ) : (
                <div className="bg-muted rounded-xl p-5 h-full flex items-center justify-center text-center animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-3">
                    <Wallet className="h-10 w-10 text-muted-foreground mx-auto" />
                    <h3 className="text-lg font-medium">Selecione uma forma de pagamento</h3>
                    <p className="text-sm text-muted-foreground">Escolha uma das opções ao lado para prosseguir com o pagamento.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 bg-gray-50/50">
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              disabled={isProcessingPayment}
              onClick={handleClose}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isProcessingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0 || !selectedPaymentMethod}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isProcessingPayment ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                  Processando...
                </span>
              ) : (
                "Registrar Pagamento"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
