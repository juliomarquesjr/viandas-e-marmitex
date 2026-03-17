import { useEffect } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "../../../../../components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "../../../../../components/ui/dialog";
import { Input } from "../../../../../components/ui/input";
import { Switch } from "../../../../../components/ui/switch";
import { PDFGeneratorComponent } from "../../../../../components/PDFGenerator";
import { Customer } from "../../types";

interface ClosingReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  reportStartDate: string;
  reportEndDate: string;
  setReportStartDate: (date: string) => void;
  setReportEndDate: (date: string) => void;
  showDebtBalance: boolean;
  setShowDebtBalance: (show: boolean) => void;
  showPeriodBalance: boolean;
  setShowPeriodBalance: (show: boolean) => void;
  showPaymentsTotal: boolean;
  setShowPaymentsTotal: (show: boolean) => void;
  setDefaultDates: (confirm?: boolean) => void;
  generateReport: () => void;
  generateThermalReport: () => void;
  onSendEmailSuccess: () => void;
}

export function ClosingReportDialog({
  isOpen,
  onOpenChange,
  customer,
  reportStartDate,
  reportEndDate,
  setReportStartDate,
  setReportEndDate,
  showDebtBalance,
  setShowDebtBalance,
  showPeriodBalance,
  setShowPeriodBalance,
  showPaymentsTotal,
  setShowPaymentsTotal,
  setDefaultDates,
  generateReport,
  generateThermalReport,
  onSendEmailSuccess,
}: ClosingReportDialogProps) {

  // Set default dates when dialog opens (only if both dates are empty)
  useEffect(() => {
    if (isOpen && !reportStartDate && !reportEndDate) {
      setDefaultDates();
    }
  }, [isOpen, reportStartDate, reportEndDate, setDefaultDates]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden p-0 flex flex-col">
        <DialogTitle className="sr-only">Relatório de Fechamento</DialogTitle>

        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Printer className="h-5 w-5 text-orange-600" />
                Relatório de Fechamento
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Gere um relatório imprimível com o consumo e saldo do cliente por período
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-10 w-10 rounded-full bg-white/60 hover:bg-white border border-gray-200"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <label htmlFor="startDate" className="text-sm font-medium">Data Inicial</label>
              <Input 
                id="startDate" 
                type="date" 
                value={reportStartDate} 
                onChange={(e) => setReportStartDate(e.target.value)} 
                max={reportEndDate || undefined} 
                className="w-full" 
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="endDate" className="text-sm font-medium">Data Final</label>
              <Input 
                id="endDate" 
                type="date" 
                value={reportEndDate} 
                onChange={(e) => setReportEndDate(e.target.value)} 
                min={reportStartDate || undefined} 
                className="w-full" 
              />
            </div>

            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-800">Opções de Impressão</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label htmlFor="showDebtBalance" className="text-sm font-medium text-gray-700">Mostrar Saldo Devedor</label>
                    <p className="text-xs text-gray-500">Exibe o saldo devedor total do cliente</p>
                  </div>
                  <Switch 
                    id="showDebtBalance" 
                    checked={showDebtBalance} 
                    onCheckedChange={setShowDebtBalance} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label htmlFor="showPeriodBalance" className="text-sm font-medium text-gray-700">Mostrar Saldo do Período</label>
                    <p className="text-xs text-gray-500">Exibe o saldo pendente no período selecionado</p>
                  </div>
                  <Switch 
                    id="showPeriodBalance" 
                    checked={showPeriodBalance} 
                    onCheckedChange={setShowPeriodBalance} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label htmlFor="showPaymentsTotal" className="text-sm font-medium text-gray-700">Mostrar Total de Pagamentos</label>
                    <p className="text-xs text-gray-500">Exibe o total de pagamentos realizados no período</p>
                  </div>
                  <Switch 
                    id="showPaymentsTotal" 
                    checked={showPaymentsTotal} 
                    onCheckedChange={setShowPaymentsTotal} 
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Período pré-definido:</span>
              <Button variant="outline" size="sm" onClick={() => setDefaultDates()} className="text-xs">
                Últimos 30 dias
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 bg-gray-50/50">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={generateThermalReport} 
                disabled={!reportStartDate || !reportEndDate} 
                variant="outline" 
                className="rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300 disabled:opacity-50"
              >
                <Printer className="h-4 w-4 mr-2" />Térmica
              </Button>
              <Button 
                onClick={generateReport} 
                disabled={!reportStartDate || !reportEndDate} 
                className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Printer className="h-4 w-4 mr-2" />Completo
              </Button>
            </div>
            {customer?.email ? (
              <PDFGeneratorComponent
                customerId={customer.id}
                startDate={reportStartDate || ""}
                endDate={reportEndDate || ""}
                customerName={customer.name}
                showSendButton={true}
                onSendEmail={onSendEmailSuccess}
              />
            ) : (
              <div className="w-full py-3 flex items-center justify-center bg-gray-100 rounded-xl border border-gray-200">
                <span className="text-sm text-gray-500 font-medium">📧 Cliente sem email cadastrado</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
