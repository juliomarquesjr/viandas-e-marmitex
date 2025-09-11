"use client";

import { Printer } from "lucide-react";
import { Button } from "./ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
    window.open(receiptUrl, '_blank');
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-700">
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            </div>
            Venda Finalizada!
          </DialogTitle>
          <DialogDescription>
            Sua venda foi processada com sucesso. Deseja imprimir o recibo térmico para o cliente?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <Printer className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-green-800">
                Recibo Térmico
              </div>
              <div className="text-xs text-green-600">
                Formato otimizado para impressoras térmicas (58mm)
              </div>
            </div>
          </div>
          
          {orderId && (
            <div className="text-xs text-muted-foreground text-center">
              Pedido: #{orderId.slice(-8).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            Não Imprimir
          </Button>
          <Button
            onClick={handlePrintReceipt}
            className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
            disabled={!orderId}
          >
            <Printer className="h-4 w-4" />
            Imprimir Recibo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}