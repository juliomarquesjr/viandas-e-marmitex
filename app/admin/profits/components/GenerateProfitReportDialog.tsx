"use client";

import { BarChart3, Calendar, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

interface GenerateProfitReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (startDate: string, endDate: string) => void;
  isLoading?: boolean;
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

export function GenerateProfitReportDialog({
  isOpen,
  onClose,
  onGenerate,
  isLoading = false,
}: GenerateProfitReportDialogProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<"current" | "last" | "30days" | "custom">("current");

  // Inicializar com o mês atual
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      setStartDate(firstDay.toISOString().split("T")[0]);
      setEndDate(lastDay.toISOString().split("T")[0]);
      setSelectedPeriod("current");
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
    setSelectedPeriod("current");
  };

  const setLastMonth = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);

    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(lastDay.toISOString().split("T")[0]);
    setSelectedPeriod("last");
  };

  const setLast30Days = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setStartDate(thirtyDaysAgo.toISOString().split("T")[0]);
    setEndDate(today.toISOString().split("T")[0]);
    setSelectedPeriod("30days");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{
                background: "var(--modal-header-icon-bg)",
                outline: "1px solid var(--modal-header-icon-ring)",
              }}
            >
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            Gerar Relatório de Lucros
          </DialogTitle>
          <DialogDescription>
            Selecione o período para análise de receitas, despesas e lucros.
          </DialogDescription>
        </DialogHeader>

        <form id="profit-report-form" onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            {/* ── Períodos Predefinidos ── */}
            <SectionDivider label="Períodos Predefinidos" />

            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={selectedPeriod === "current" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setCurrentMonth();
                }}
                disabled={isLoading}
                className={`w-full text-xs font-normal ${
                  selectedPeriod === "current" 
                    ? "text-white" 
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Este Mês
              </Button>
              <Button
                type="button"
                variant={selectedPeriod === "last" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setLastMonth();
                }}
                disabled={isLoading}
                className={`w-full text-xs font-normal ${
                  selectedPeriod === "last" 
                    ? "text-white" 
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Mês Passado
              </Button>
              <Button
                type="button"
                variant={selectedPeriod === "30days" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setLast30Days();
                }}
                disabled={isLoading}
                className={`w-full text-xs font-normal ${
                  selectedPeriod === "30days" 
                    ? "text-white" 
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Últimos 30 Dias
              </Button>
            </div>

            {/* ── Período Personalizado ── */}
            <SectionDivider label="Período Personalizado" />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Data Inicial <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setSelectedPeriod("custom");
                    }}
                    required
                    disabled={isLoading}
                    className="pl-9"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Data Final <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setSelectedPeriod("custom");
                    }}
                    required
                    disabled={isLoading}
                    className="pl-9"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <p className="text-xs text-slate-400">
              <span className="text-red-400">*</span> campos obrigatórios
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="profit-report-form"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Gerar Relatório
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
