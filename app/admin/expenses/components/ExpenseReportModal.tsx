"use client";

import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { SupplierType } from "@/lib/types";
import { Calendar, FileText } from "lucide-react";
import { useEffect, useState } from "react";

interface ExpenseReportModalProps {
  open: boolean;
  onClose: () => void;
  supplierTypes: SupplierType[];
}

export function ExpenseReportModal({ open, onClose, supplierTypes }: ExpenseReportModalProps) {
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [errors, setErrors] = useState<{ suppliers?: string; startDate?: string; endDate?: string }>({});
  const { showToast } = useToast();

  useEffect(() => {
    if (open) {
      setSelectedSupplierIds([]);
      setStartDate("");
      setEndDate("");
      setErrors({});
    }
  }, [open]);

  const handleToggleSupplier = (id: string) => {
    setSelectedSupplierIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
    if (errors.suppliers) setErrors((e) => ({ ...e, suppliers: undefined }));
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    if (selectedSupplierIds.length === 0) newErrors.suppliers = "Selecione pelo menos um fornecedor";
    if (!startDate) newErrors.startDate = "Data inicial é obrigatória";
    if (!endDate) newErrors.endDate = "Data final é obrigatória";
    if (startDate && endDate && new Date(startDate) > new Date(endDate))
      newErrors.endDate = "Data final deve ser maior ou igual à data inicial";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerateReport = () => {
    if (!validateForm()) {
      showToast("Por favor, preencha todos os campos obrigatórios", "error");
      return;
    }
    const params = new URLSearchParams({
      supplierTypeIds: selectedSupplierIds.join(","),
      startDate,
      endDate,
    });
    window.open(`/print/expenses-report-a4?${params.toString()}`, "_blank");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
              <FileText className="h-4 w-4 text-orange-600" />
            </div>
            Gerar Relatório de Despesas
          </DialogTitle>
          <DialogDescription>
            Selecione os fornecedores e o período para gerar o relatório
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Fornecedores */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              Fornecedores <span className="text-red-500">*</span>
            </Label>
            <div className="border border-slate-200 rounded-lg p-3 max-h-56 overflow-y-auto">
              {supplierTypes.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Nenhum fornecedor cadastrado</p>
              ) : (
                <div className="space-y-1">
                  {supplierTypes.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSupplierIds.includes(s.id)}
                        onChange={() => handleToggleSupplier(s.id)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                      />
                      <span className="text-sm text-slate-700">{s.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {errors.suppliers && <p className="text-xs text-red-500">{errors.suppliers}</p>}
          </div>

          {/* Período */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">
                Data Inicial <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (errors.startDate) setErrors((er) => ({ ...er, startDate: undefined }));
                  }}
                  className={`pl-9 ${errors.startDate ? "border-red-400" : ""}`}
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
              {errors.startDate && <p className="text-xs text-red-500">{errors.startDate}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">
                Data Final <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (errors.endDate) setErrors((er) => ({ ...er, endDate: undefined }));
                  }}
                  className={`pl-9 ${errors.endDate ? "border-red-400" : ""}`}
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
              {errors.endDate && <p className="text-xs text-red-500">{errors.endDate}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleGenerateReport}>
              <FileText className="h-4 w-4 mr-2" />
              Gerar Relatório
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
