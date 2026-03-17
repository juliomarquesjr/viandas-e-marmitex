"use client";

import { BarChart3, Calendar, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

interface GenerateProfitReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (startDate: string, endDate: string) => void;
  isLoading?: boolean;
}

export function GenerateProfitReportDialog({
  isOpen,
  onClose,
  onGenerate,
  isLoading = false,
}: GenerateProfitReportDialogProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Inicializar com o mês atual
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      setStartDate(firstDay.toISOString().split("T")[0]);
      setEndDate(lastDay.toISOString().split("T")[0]);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    onGenerate(startDate, endDate);
  };

  // Atalhos para períodos comuns
  const setCurrentMonth = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(lastDay.toISOString().split("T")[0]);
  };

  const setLastMonth = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
    
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(lastDay.toISOString().split("T")[0]);
  };

  const setLast30Days = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setStartDate(thirtyDaysAgo.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900">
              <BarChart3 className="h-5 w-5 text-primary" />
              Gerar Relatório de Lucros
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md text-slate-400 hover:text-slate-500"
              onClick={onClose}
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Selecione o período para análise de receitas, despesas e lucros.
          </p>
        </DialogHeader>

        <form id="profit-report-form" onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Seção de Atalhos */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-medium text-slate-700">Períodos Predefinidos</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={setCurrentMonth}
                disabled={isLoading}
                className="w-full text-xs font-normal text-slate-600 hover:bg-slate-50"
              >
                Este Mês
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={setLastMonth}
                disabled={isLoading}
                className="w-full text-xs font-normal text-slate-600 hover:bg-slate-50"
              >
                Mês Passado
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={setLast30Days}
                disabled={isLoading}
                className="w-full text-xs font-normal text-slate-600 hover:bg-slate-50"
              >
                Últimos 30 Dias
              </Button>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Seção de Período Personalizado */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-700">Período Personalizado</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600">
                  Data Inicial <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-8 text-sm h-10"
                  />
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600">
                  Data Final <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pl-8 text-sm h-10"
                  />
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="text-slate-600"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-white min-w-[140px]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/20 border-t-white animate-spin rounded-full" />
                  Gerando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Gerar Relatório
                </div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
