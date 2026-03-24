"use client";

import { Percent } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";

interface DiscountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtotal: number;
  discountType: "percent" | "amount";
  discountValue: number;
  discountInputValue: string;
  setDiscountType: (type: "percent" | "amount") => void;
  setDiscountValue: (v: number) => void;
  setDiscountInputValue: (v: string) => void;
  applyDiscount: () => void;
  removeDiscount: () => void;
}

export function DiscountModal({
  open,
  onOpenChange,
  subtotal,
  discountType,
  discountValue,
  discountInputValue,
  setDiscountType,
  setDiscountValue,
  setDiscountInputValue,
  applyDiscount,
  removeDiscount,
}: DiscountModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center"
              style={{ background: "var(--modal-header-icon-bg)" }}
            >
              <Percent className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Aplicar Desconto</DialogTitle>
              <DialogDescription>
                Defina um desconto por percentual (%) ou valor (R$).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4 px-6 py-5">
          <div className="flex gap-2">
            <Button
              variant={discountType === "amount" ? "default" : "outline"}
              onClick={() => {
                setDiscountType("amount");
                setDiscountValue(0);
                setDiscountInputValue("");
              }}
              className="flex-1"
            >
              Valor (R$)
            </Button>
            <Button
              variant={discountType === "percent" ? "default" : "outline"}
              onClick={() => {
                setDiscountType("percent");
                setDiscountValue(0);
                setDiscountInputValue("");
              }}
              className="flex-1"
            >
              Percentual (%)
            </Button>
          </div>

          <div className="grid gap-1.5">
            <Input
              type={discountType === "percent" ? "number" : "text"}
              inputMode={discountType === "percent" ? "numeric" : "decimal"}
              step={discountType === "percent" ? 1 : 0.01}
              min={0}
              max={discountType === "percent" ? 100 : undefined}
              value={
                discountType === "percent"
                  ? Number.isNaN(discountValue) ? 0 : discountValue
                  : discountInputValue
              }
              onChange={(e) => {
                if (discountType === "percent") {
                  setDiscountValue(parseFloat(e.target.value || "0"));
                } else {
                  const value = e.target.value.replace(/\D/g, "");
                  const numValue = parseInt(value || "0");
                  const realValue = numValue / 100;
                  const formattedValue = realValue
                    .toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                      minimumFractionDigits: 2,
                    })
                    .replace("R$\u00A0", "");
                  setDiscountInputValue(formattedValue);
                  setDiscountValue(realValue);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyDiscount();
                }
              }}
              placeholder={
                discountType === "percent" ? "Ex.: 10 (para 10%)" : "Ex.: 5,00"
              }
              className="h-11"
            />
            <span className="text-xs text-muted-foreground">
              {discountType === "percent"
                ? "0% a 100% sobre o subtotal."
                : `Até R$ ${subtotal.toFixed(2)}.`}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={removeDiscount}>
            Remover desconto
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={applyDiscount}>Aplicar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
