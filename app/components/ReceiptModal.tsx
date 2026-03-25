"use client";

import { Check, Printer } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
}

export function ReceiptModal({ open, onOpenChange, orderId }: ReceiptModalProps) {
  const handlePrintReceipt = () => {
    if (!orderId) return;

    const receiptUrl = `/print/receipt-thermal?orderId=${orderId}`;
    window.open(receiptUrl, "_blank");
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,calc(100dvh-2rem))] w-[min(100%,28rem)] max-w-[min(28rem,calc(100vw-2rem))] flex-col gap-0 overflow-y-auto p-0 sm:w-full">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-5 w-5 text-emerald-600" strokeWidth={2.5} aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-1 pr-2">
              <DialogTitle>Venda finalizada</DialogTitle>
              <DialogDescription>
                Sua venda foi processada com sucesso. Deseja imprimir o recibo térmico para o
                cliente?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <Printer className="h-5 w-5 flex-shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-emerald-900">Recibo térmico</div>
              <div className="text-xs text-emerald-700">
                Formato otimizado para impressoras térmicas (58&nbsp;mm)
              </div>
            </div>
          </div>

          {orderId && (
            <p className="text-center text-xs text-muted-foreground">
              Pedido: #{orderId.slice(-8).toUpperCase()}
            </p>
          )}
        </div>

        <DialogFooter className="flex-col justify-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <Button variant="outline" className="min-h-11 w-full flex-1 sm:min-h-10" onClick={handleClose}>
            Não imprimir
          </Button>
          <Button
            className="min-h-11 w-full flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 sm:min-h-10"
            onClick={handlePrintReceipt}
            disabled={!orderId}
          >
            <Printer className="h-4 w-4" />
            Imprimir recibo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
