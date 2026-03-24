"use client";

import { AlertCircle } from "lucide-react";
import { CardHighlighted } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

interface PaymentCashDetailProps {
  total: number;
  cashReceived: string;
  change: number;
  setCashReceived: (v: string) => void;
  setChange: (v: number) => void;
}

export function PaymentCashDetail({
  total,
  cashReceived,
  change,
  setCashReceived,
  setChange,
}: PaymentCashDetailProps) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <CardHighlighted highlightColor="primary" className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total da Compra</span>
          <span className="text-xl font-bold text-slate-900">R$ {total.toFixed(2)}</span>
        </div>
      </CardHighlighted>

      <div className="space-y-1.5">
        <label htmlFor="cashReceived" className="text-sm font-medium">
          Valor Recebido
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
            R$
          </span>
          <Input
            id="cashReceived"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={cashReceived}
            onChange={(e) => {
              const value = e.target.value;
              setCashReceived(value);
              if (value && !isNaN(parseFloat(value))) {
                setChange(Math.max(0, parseFloat(value) - total));
              } else {
                setChange(0);
              }
            }}
            placeholder="0,00"
            className="pl-10 text-lg h-12"
            autoFocus
          />
        </div>
      </div>

      <CardHighlighted highlightColor="success" className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-emerald-700">Troco</span>
          <span className="text-xl font-bold text-emerald-900">R$ {change.toFixed(2)}</span>
        </div>
      </CardHighlighted>

      {cashReceived &&
        parseFloat(cashReceived) > 0 &&
        parseFloat(cashReceived) < total && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>O valor recebido é menor que o total da compra.</span>
            </div>
          </div>
        )}
    </div>
  );
}
