"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Calendar, FileText, Printer } from "lucide-react";
import { useState } from "react";

interface DailySalesPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DailySalesPrintModal({
  open,
  onOpenChange,
}: DailySalesPrintModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const handlePrintThermal = () => {
    const url = `/print/daily-sales-thermal?date=${selectedDate}`;
    window.open(url, '_blank');
    onOpenChange(false);
  };

  const handlePrintA4 = () => {
    const url = `/print/daily-sales-a4?date=${selectedDate}`;
    window.open(url, '_blank');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Imprimir Vendas Diárias
          </DialogTitle>
          <DialogDescription>
            Selecione o dia para imprimir as vendas realizadas
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label
              htmlFor="date"
              className="text-sm font-medium flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Data
            </label>
            <input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={handlePrintThermal}
              className="w-full flex items-center justify-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimir Térmica
            </Button>
            <Button
              onClick={handlePrintA4}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Imprimir A4
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

