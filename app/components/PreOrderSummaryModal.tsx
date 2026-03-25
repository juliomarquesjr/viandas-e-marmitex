"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Badge } from "@/app/components/ui/badge";
import {
  Package,
  X,
} from "lucide-react";

type PreOrderItem = {
  id: string;
  quantity: number;
  priceCents: number;
  weightKg?: number | null;
  product: {
    id: string;
    name: string;
    pricePerKgCents?: number | null;
  };
};

type PreOrder = {
  id: string;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  paymentMethod?: string | null;
  createdAt: string;
  items: PreOrderItem[];
};

interface PreOrderSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preOrder: PreOrder | null;
}

export function PreOrderSummaryModal({
  open,
  onOpenChange,
  preOrder,
}: PreOrderSummaryModalProps) {
  if (!preOrder) return null;

  const formatCurrency = (cents: number | null) => {
    if (cents === null || cents === undefined) return "N/A";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="flex items-center justify-between mb-4">
          <DialogTitle className="text-lg font-semibold text-slate-900">
            Resumo do Pré-Pedido
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Itens */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-400" />
              Itens ({preOrder.items.length})
            </h3>
            <div className="space-y-1.5">
              {preOrder.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-600">
                    {item.quantity}x {item.product.name}
                  </span>
                  <span className="text-slate-900 font-medium">
                    {formatCurrency(item.priceCents * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totais */}
          <div className="border-t border-slate-200 pt-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span className="text-slate-900 font-medium">
                {formatCurrency(preOrder.subtotalCents)}
              </span>
            </div>
            {preOrder.discountCents > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Desconto</span>
                <span className="text-red-600 font-medium">
                  -{formatCurrency(preOrder.discountCents)}
                </span>
              </div>
            )}
            {preOrder.deliveryFeeCents > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Entrega</span>
                <span className="text-slate-900 font-medium">
                  {formatCurrency(preOrder.deliveryFeeCents)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-base font-semibold pt-2 border-t border-slate-200">
              <span className="text-slate-900">Total</span>
              <span className="text-slate-900">
                {formatCurrency(preOrder.totalCents)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
