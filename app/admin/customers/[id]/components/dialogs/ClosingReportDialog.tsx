"use client";

import { useEffect } from "react";
import { ExternalLink, Loader2, Printer, Search } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../../components/ui/dialog";
import { Input } from "../../../../../components/ui/input";
import { Switch } from "../../../../../components/ui/switch";
import { PDFGeneratorComponent } from "../../../../../components/PDFGenerator";
import { Customer } from "../../types";
import { ClosingReportConfig } from "../../hooks/useClosingReport";

interface ClosingReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  config: ClosingReportConfig;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setShowDebtBalance: (v: boolean) => void;
  setShowPeriodBalance: (v: boolean) => void;
  setShowPaymentsTotal: (v: boolean) => void;
  setDefaultDates: () => void;
  generateReport: (isThermal: boolean) => boolean;
  onSendEmailSuccess: () => void;
  isLoadingLastEntry: boolean;
  fetchLastEntryDate: () => void;
}

export function ClosingReportDialog({
  isOpen,
  onOpenChange,
  customer,
  config,
  setStartDate,
  setEndDate,
  setShowDebtBalance,
  setShowPeriodBalance,
  setShowPaymentsTotal,
  setDefaultDates,
  generateReport,
  onSendEmailSuccess,
  isLoadingLastEntry,
  fetchLastEntryDate,
}: ClosingReportDialogProps) {
  useEffect(() => {
    if (isOpen && !config.startDate && !config.endDate) {
      setDefaultDates();
    }
  }, [isOpen, config.startDate, config.endDate, setDefaultDates]);

  const canGenerate = !!config.startDate && !!config.endDate;

  const handleGenerate = (isThermal: boolean) => {
    const ok = generateReport(isThermal);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader>
          <DialogTitle>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{
                background: "var(--modal-header-icon-bg)",
                outline: "1px solid var(--modal-header-icon-ring)",
              }}
            >
              <Printer className="h-5 w-5 text-primary" />
            </div>
            Relatório de Fechamento
          </DialogTitle>
          <DialogDescription>
            Gere um relatório imprimível com o consumo e saldo do cliente por período
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Período */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
              Período
            </span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="startDate" className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Data Inicial <span className="text-red-400">*</span>
              </label>
              <Input
                id="startDate"
                type="date"
                value={config.startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={config.endDate || undefined}
                className="w-full"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLastEntryDate}
                disabled={isLoadingLastEntry}
                className="text-xs h-7 w-full"
              >
                {isLoadingLastEntry ? (
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                ) : (
                  <Search className="h-3 w-3 mr-1.5" />
                )}
                Buscar última entrada
              </Button>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="endDate" className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Data Final <span className="text-red-400">*</span>
              </label>
              <Input
                id="endDate"
                type="date"
                value={config.endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={config.startDate || undefined}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Atalho de período:</span>
            <Button variant="outline" size="sm" onClick={setDefaultDates} className="text-xs h-7">
              Últimos 30 dias
            </Button>
          </div>

          {/* Opções de Impressão */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
              Opções de Impressão
            </span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-200">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <label htmlFor="showDebtBalance" className="text-sm font-medium text-slate-700">
                  Saldo Devedor
                </label>
                <p className="text-xs text-slate-400">Exibe o saldo devedor total do cliente</p>
              </div>
              <Switch
                id="showDebtBalance"
                checked={config.showDebtBalance}
                onCheckedChange={setShowDebtBalance}
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <label htmlFor="showPeriodBalance" className="text-sm font-medium text-slate-700">
                  Saldo do Período
                </label>
                <p className="text-xs text-slate-400">Exibe o saldo pendente no período</p>
              </div>
              <Switch
                id="showPeriodBalance"
                checked={config.showPeriodBalance}
                onCheckedChange={setShowPeriodBalance}
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <label htmlFor="showPaymentsTotal" className="text-sm font-medium text-slate-700">
                  Total de Pagamentos
                </label>
                <p className="text-xs text-slate-400">Exibe o total de pagamentos no período</p>
              </div>
              <Switch
                id="showPaymentsTotal"
                checked={config.showPaymentsTotal}
                onCheckedChange={setShowPaymentsTotal}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-3">
          <div className="flex w-full items-center justify-between">
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              Abre em nova aba
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={!canGenerate}
                onClick={() => handleGenerate(true)}
                className="rounded-xl"
              >
                <Printer className="h-4 w-4 mr-2" />
                Térmica
              </Button>
              <Button
                disabled={!canGenerate}
                onClick={() => handleGenerate(false)}
                className="rounded-xl"
              >
                <Printer className="h-4 w-4 mr-2" />
                Completo
              </Button>
            </div>
          </div>

          {customer?.email ? (
            <div className="w-full">
              <PDFGeneratorComponent
                customerId={customer.id}
                startDate={config.startDate}
                endDate={config.endDate}
                customerName={customer.name}
                showSendButton={true}
                onSendEmail={onSendEmailSuccess}
              />
            </div>
          ) : (
            <div className="w-full py-2.5 flex items-center justify-center bg-slate-100 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-400 font-medium">Cliente sem email cadastrado</span>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
