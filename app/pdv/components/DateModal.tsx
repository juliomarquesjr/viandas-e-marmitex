"use client";

import { Calendar } from "lucide-react";
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

interface DateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customSaleDate: string;
  setCustomSaleDate: (date: string) => void;
  getTodayDate: () => string;
  formatDisplayDate: (date: string) => string;
}

export function DateModal({
  open,
  onOpenChange,
  customSaleDate,
  setCustomSaleDate,
  getTodayDate,
  formatDisplayDate,
}: DateModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center"
              style={{ background: "var(--modal-header-icon-bg)" }}
            >
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Alterar Data da Venda</DialogTitle>
              <DialogDescription>
                Selecione a data em que a venda foi realizada.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Data da Venda</label>
            <Input
              type="date"
              value={customSaleDate || getTodayDate()}
              onChange={(e) => setCustomSaleDate(e.target.value)}
              max={getTodayDate()}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {customSaleDate
                ? `Data selecionada: ${formatDisplayDate(customSaleDate)}`
                : "Usando data de hoje"}
            </p>
          </div>
          {customSaleDate && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>Atenção:</strong> Esta venda será registrada com a data{" "}
                <strong>{formatDisplayDate(customSaleDate)}</strong>.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setCustomSaleDate("")} className="flex-1">
            Usar Hoje
          </Button>
          <Button onClick={() => onOpenChange(false)} className="flex-1">
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
