"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Calendar, FileText, Printer, Truck, X } from "lucide-react";
import { useState } from "react";

interface TeleDeliverySummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeleDeliverySummaryModal({
  open,
  onOpenChange,
}: TeleDeliverySummaryModalProps) {
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [dateError, setDateError] = useState<string>("");

  const handleCurrentMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(lastDay.toISOString().split("T")[0]);
  };

  const handlePreviousMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(lastDay.toISOString().split("T")[0]);
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    // Validar se a data final é anterior à data inicial
    if (endDate && value > endDate) {
      setDateError("Data inicial deve ser menor ou igual à data final");
    } else {
      setDateError("");
    }
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    // Validar se a data final é anterior à data inicial
    if (startDate && value < startDate) {
      setDateError("Data final deve ser maior ou igual à data inicial");
    } else {
      setDateError("");
    }
  };

  const handlePrintThermal = () => {
    const url = `/print/tele-delivery-thermal?startDate=${startDate}&endDate=${endDate}`;
    window.open(url, "_blank");
    onOpenChange(false);
  };

  const handlePrintA4 = () => {
    const url = `/print/tele-delivery-a4?startDate=${startDate}&endDate=${endDate}`;
    window.open(url, "_blank");
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const formatDateForDisplay = (dateString: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [y, m, d] = dateString.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Truck className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Resumo de Tele Entrega
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-0.5">
                Selecione o período e o formato de impressão
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Presets */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCurrentMonth}
              className="flex-1 text-xs h-8 border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300"
            >
              Mês Atual
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePreviousMonth}
              className="flex-1 text-xs h-8 border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300"
            >
              Mês Anterior
            </Button>
          </div>

          {/* Seleção de Data */}
          <div className="space-y-2.5">
            <label
              htmlFor="startDate"
              className="text-sm font-medium text-gray-700 flex items-center gap-2"
            >
              <Calendar className="h-4 w-4 text-orange-600" />
              Período
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label
                  htmlFor="startDate"
                  className="text-xs text-gray-500 mb-1 block"
                >
                  Data Inicial
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all text-gray-900 font-medium"
                />
              </div>
              <div className="relative">
                <label
                  htmlFor="endDate"
                  className="text-xs text-gray-500 mb-1 block"
                >
                  Data Final
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white transition-all text-gray-900 font-medium"
                />
              </div>
            </div>
            {startDate && endDate && (
              <>
                <div className="text-xs text-gray-500 text-center">
                  {formatDateForDisplay(startDate)} a {formatDateForDisplay(endDate)}
                </div>
                {dateError && (
                  <div className="text-xs text-red-600 text-center mt-1">
                    {dateError}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Opções de Impressão */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 block">
              Formato de Impressão
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handlePrintThermal}
                disabled={!startDate || !endDate || !!dateError}
                className="group relative p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex flex-col items-start gap-2">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 group-hover:bg-orange-200 flex items-center justify-center transition-colors">
                    <Printer className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">
                      Térmica
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">58mm</div>
                  </div>
                </div>
              </button>

              <button
                onClick={handlePrintA4}
                disabled={!startDate || !endDate || !!dateError}
                className="group relative p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
