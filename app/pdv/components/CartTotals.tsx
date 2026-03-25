"use client";

import { CreditCard, Percent } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Kbd } from "../../components/ui/kbd";
import type { DiscountState } from "../types";

interface CartTotalsProps {
  subtotal: number;
  discountAmount: number;
  discount: DiscountState;
  total: number;
  cartLength: number;
  onPaymentOpen: () => void;
  onDiscountOpen: () => void;
}

export function CartTotals({
  subtotal,
  discountAmount,
  discount,
  total,
  cartLength,
  onPaymentOpen,
  onDiscountOpen,
}: CartTotalsProps) {
  return (
    <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-3 sm:px-4 py-3 space-y-2.5 min-w-0">
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>Subtotal</span>
        <span>R$ {subtotal.toFixed(2)}</span>
      </div>

      {discountAmount > 0 && discount && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600">Desconto</span>
            <Badge variant="success" size="sm">
              {discount.type === "percent"
                ? `${Math.max(0, Math.min(100, discount.value)).toFixed(0)}%`
                : `R$ ${discountAmount.toFixed(2)}`}
            </Badge>
          </div>
          <span className="text-emerald-600 font-medium">
            − R$ {discountAmount.toFixed(2)}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-slate-200">
        <span className="text-sm font-semibold text-slate-700">Total</span>
        <span className="text-xl font-bold text-primary">R$ {total.toFixed(2)}</span>
      </div>

      <div className="flex flex-wrap gap-2 pt-1 min-w-0">
        <Button
          variant="outline"
          size="lg"
          className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 hover:border-amber-400"
          onClick={onDiscountOpen}
          disabled={cartLength === 0}
        >
          <Percent className="h-4 w-4" />
          Desconto
          <Kbd className="ml-auto text-amber-700 border-amber-300 bg-amber-50">F4</Kbd>
        </Button>
        <Button
          variant="success"
          size="lg"
          className="min-w-0 flex-1 basis-[calc(50%-0.25rem)]"
          onClick={onPaymentOpen}
          disabled={cartLength === 0}
        >
          <CreditCard className="h-4 w-4" />
          Pagamento
          <Kbd className="ml-auto text-emerald-100 border-emerald-500 bg-emerald-700">F2</Kbd>
        </Button>
      </div>
    </div>
  );
}
