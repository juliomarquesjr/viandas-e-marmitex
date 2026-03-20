"use client";

import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { SupplierType } from "@/lib/types";
import { Calendar, Check, ExternalLink, FileText, Truck } from "lucide-react";
import { useEffect, useState } from "react";

interface ExpenseReportModalProps {
  open: boolean;
  onClose: () => void;
  supplierTypes: SupplierType[];
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

  const allSelected = supplierTypes.length > 0 && selectedSupplierIds.length === supplierTypes.length;

  const handleToggleSupplier = (id: string) => {
    setSelectedSupplierIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
    if (errors.suppliers) setErrors((e) => ({ ...e, suppliers: undefined }));
  };

  const handleToggleAll = () => {
    setSelectedSupplierIds(allSelected ? [] : supplierTypes.map((s) => s.id));
    if (errors.suppliers) setErrors((e) => ({ ...e, suppliers: undefined }));
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    if (selectedSupplierIds.length === 0) newErrors.suppliers = "Selecione pelo menos um fornecedor";
    if (!startDate) newErrors.startDate = "Obrigatório";
    if (!endDate) newErrors.endDate = "Obrigatório";
    if (startDate && endDate && new Date(startDate) > new Date(endDate))
      newErrors.endDate = "Data final deve ser posterior à inicial";
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
            >
              <FileText className="h-5 w-5 text-primary" />
            </div>
            Gerar Relatório de Despesas
          </DialogTitle>
          <DialogDescription>
            Selecione os fornecedores e o período para gerar o relatório em PDF
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* ── Fornecedores ── */}
          <SectionDivider label="Fornecedores" />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Selecionar fornecedores <span className="text-red-400">*</span>
              </Label>
              {supplierTypes.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleAll}
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {allSelected ? "Limpar seleção" : "Selecionar todos"}
                </button>
              )}
            </div>

            {supplierTypes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 border border-dashed border-slate-200 rounded-xl">
                <Truck className="h-7 w-7 text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">Nenhum fornecedor cadastrado</p>
              </div>
            ) : (
              <div className={`border rounded-xl overflow-hidden max-h-52 overflow-y-auto ${
                errors.suppliers ? "border-red-300" : "border-slate-200"
              }`}>
                <div className="divide-y divide-slate-50">
                  {supplierTypes.map((s) => {
                    const isSelected = selectedSupplierIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors select-none ${
                          isSelected ? "bg-primary/5" : "hover:bg-slate-50"
                        }`}
                      >
                        {/* Checkbox customizado */}
                        <div className={`flex h-4 w-4 items-center justify-center rounded border flex-shrink-0 transition-all ${
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-slate-300 bg-white"
                        }`}>
                          {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSupplier(s.id)}
                          className="sr-only"
                        />
                        <span className={`text-sm flex-1 ${isSelected ? "font-medium text-slate-900" : "text-slate-600"}`}>
                          {s.name}
                        </span>
                        {isSelected && (
                          <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5 flex-shrink-0">
                            ✓
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {errors.suppliers ? (
              <p className="text-xs text-red-500">{errors.suppliers}</p>
            ) : selectedSupplierIds.length > 0 ? (
              <p className="text-xs text-slate-400">
                {selectedSupplierIds.length} de {supplierTypes.length} fornecedor{supplierTypes.length !== 1 ? "es" : ""} selecionado{selectedSupplierIds.length !== 1 ? "s" : ""}
              </p>
            ) : null}
          </div>

          {/* ── Período ── */}
          <SectionDivider label="Período" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Data inicial <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (errors.startDate) setErrors((er) => ({ ...er, startDate: undefined }));
                  }}
                  className={`pl-9 ${errors.startDate ? "border-red-400 focus:ring-red-400/20" : ""}`}
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
              {errors.startDate && <p className="text-xs text-red-500">{errors.startDate}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Data final <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (errors.endDate) setErrors((er) => ({ ...er, endDate: undefined }));
                  }}
                  className={`pl-9 ${errors.endDate ? "border-red-400 focus:ring-red-400/20" : ""}`}
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
              {errors.endDate && <p className="text-xs text-red-500">{errors.endDate}</p>}
            </div>
          </div>

        </div>

        <DialogFooter>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
            O relatório será aberto em uma nova aba
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleGenerateReport}>
              <FileText className="h-4 w-4 mr-2" />
              Gerar Relatório de Despesas
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
