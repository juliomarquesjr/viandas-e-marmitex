"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Calendar, FileText, Printer, X } from "lucide-react";
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

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader className="relative pb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="absolute right-0 top-0 h-8 w-8 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-all"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3 pr-10">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Printer className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Imprimir Vendas Diárias
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-0.5">
                Selecione o dia e o formato de impressão
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 py-2">
          {/* Seleção de Data */}
          <div className="space-y-2.5">
            <label
              htmlFor="date"
              className="text-sm font-medium text-gray-700 flex items-center gap-2"
            >
              <Calendar className="h-4 w-4 text-blue-600" />
              Data da Venda
            </label>
            <div className="relative">
              <input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all text-gray-900 font-medium"
              />
            </div>
          </div>

          {/* Opções de Impressão */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 block">
              Formato de Impressão
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handlePrintThermal}
                className="group relative p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <div className="flex flex-col items-start gap-2">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                    <Printer className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">Térmica</div>
                    <div className="text-xs text-gray-500 mt-0.5">58mm</div>
                  </div>
                </div>
              </button>
              
              <button
                onClick={handlePrintA4}
                className="group relative p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <div className="flex flex-col items-start gap-2">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
                    <FileText className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">A4</div>
                    <div className="text-xs text-gray-500 mt-0.5">Completo</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 border-gray-300 hover:bg-gray-50"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

