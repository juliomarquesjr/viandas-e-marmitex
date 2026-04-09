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
import { ExpensePaymentMethod, SupplierType } from "@/lib/types";
import { Calendar, CalendarCheck, Check, ExternalLink, FileText, Truck, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

interface ExpenseReportModalProps {
  open: boolean;
  onClose: () => void;
  supplierTypes: SupplierType[];
  paymentMethods: ExpensePaymentMethod[];
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

/** YYYY-MM-DD no fuso local (alinhado ao input type="date") */
function formatLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getRollingDaysRange(daysInclusive: number): { start: string; end: string } {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (daysInclusive - 1));
  return { start: formatLocalYMD(start), end: formatLocalYMD(end) };
}

function getPreviousCalendarMonthRange(): { start: string; end: string } {
  const now = new Date();
  const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastPrev = new Date(firstThisMonth.getTime() - 1);
  const firstPrev = new Date(lastPrev.getFullYear(), lastPrev.getMonth(), 1);
  return { start: formatLocalYMD(firstPrev), end: formatLocalYMD(lastPrev) };
}

type DatePresetId = "roll-7" | "roll-15" | "roll-30" | "prev-month";

const DATE_PRESETS_ROLLING: { id: DatePresetId; label: string; days: number }[] = [
  { id: "roll-7", label: "Últimos 7 dias", days: 7 },
  { id: "roll-15", label: "Últimos 15 dias", days: 15 },
  { id: "roll-30", label: "Últimos 30 dias", days: 30 },
];

export function ExpenseReportModal({
  open,
  onClose,
  supplierTypes,
  paymentMethods,
}: ExpenseReportModalProps) {
  const activePaymentMethods = paymentMethods.filter((m) => m.active);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [selectedPaymentMethodIds, setSelectedPaymentMethodIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeDatePreset, setActiveDatePreset] = useState<DatePresetId | null>(null);
  const [errors, setErrors] = useState<{
    suppliers?: string;
    paymentMethods?: string;
    startDate?: string;
    endDate?: string;
  }>({});
  const { showToast } = useToast();

  useEffect(() => {
    if (!open) return;
    setSelectedSupplierIds([]);
    setStartDate("");
    setEndDate("");
    setActiveDatePreset(null);
    setErrors({});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setSelectedPaymentMethodIds(
      paymentMethods.filter((m) => m.active).map((m) => m.id)
    );
  }, [open, paymentMethods]);

  const allSuppliersSelected =
    supplierTypes.length > 0 && selectedSupplierIds.length === supplierTypes.length;
  const allPaymentMethodsSelected =
    activePaymentMethods.length > 0 &&
    selectedPaymentMethodIds.length === activePaymentMethods.length;

  const handleToggleSupplier = (id: string) => {
    setSelectedSupplierIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
    if (errors.suppliers) setErrors((e) => ({ ...e, suppliers: undefined }));
  };

  const handleToggleAllSuppliers = () => {
    setSelectedSupplierIds(allSuppliersSelected ? [] : supplierTypes.map((s) => s.id));
    if (errors.suppliers) setErrors((e) => ({ ...e, suppliers: undefined }));
  };

  const handleTogglePaymentMethod = (id: string) => {
    setSelectedPaymentMethodIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
    if (errors.paymentMethods) setErrors((e) => ({ ...e, paymentMethods: undefined }));
  };

  const handleToggleAllPaymentMethods = () => {
    setSelectedPaymentMethodIds(
      allPaymentMethodsSelected ? [] : activePaymentMethods.map((m) => m.id)
    );
    if (errors.paymentMethods) setErrors((e) => ({ ...e, paymentMethods: undefined }));
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    if (selectedSupplierIds.length === 0) newErrors.suppliers = "Selecione pelo menos um fornecedor";
    if (activePaymentMethods.length === 0)
      newErrors.paymentMethods = "Cadastre ao menos uma forma de pagamento ativa";
    else if (selectedPaymentMethodIds.length === 0)
      newErrors.paymentMethods = "Selecione pelo menos uma forma de pagamento";
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
      paymentMethodIds: selectedPaymentMethodIds.join(","),
    });
    window.open(`/print/expenses-report-a4?${params.toString()}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
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
            Selecione fornecedores, formas de pagamento e o período para gerar o relatório em PDF
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          <SectionDivider label="Fornecedores e formas de pagamento" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            {/* Fornecedores */}
            <div className="space-y-2 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Fornecedores <span className="text-red-400">*</span>
                </Label>
                {supplierTypes.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleAllSuppliers}
                    className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors shrink-0"
                  >
                    {allSuppliersSelected ? "Limpar" : "Todos"}
                  </button>
                )}
              </div>

              {supplierTypes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-5 border border-dashed border-slate-200 rounded-lg">
                  <Truck className="h-6 w-6 text-slate-300 mb-1.5" />
                  <p className="text-xs text-slate-400 text-center px-2">Nenhum fornecedor</p>
                </div>
              ) : (
                <div
                  className={`border rounded-lg overflow-hidden max-h-48 overflow-y-auto ${
                    errors.suppliers ? "border-red-300" : "border-slate-200"
                  }`}
                >
                  <div className="divide-y divide-slate-50">
                    {supplierTypes.map((s) => {
                      const isSelected = selectedSupplierIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors select-none ${
                            isSelected ? "bg-primary/5" : "hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded border flex-shrink-0 transition-all ${
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSupplier(s.id)}
                            className="sr-only"
                          />
                          <span
                            className={`text-sm flex-1 truncate ${isSelected ? "font-medium text-slate-900" : "text-slate-600"}`}
                          >
                            {s.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {errors.suppliers ? (
                <p className="text-xs text-red-500">{errors.suppliers}</p>
              ) : selectedSupplierIds.length > 0 ? (
                <p className="text-[11px] text-slate-400">
                  {selectedSupplierIds.length}/{supplierTypes.length} selecionado
                  {selectedSupplierIds.length !== 1 ? "s" : ""}
                </p>
              ) : null}
            </div>

            {/* Formas de pagamento */}
            <div className="space-y-2 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Pagamento <span className="text-red-400">*</span>
                </Label>
                {activePaymentMethods.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleAllPaymentMethods}
                    className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors shrink-0"
                  >
                    {allPaymentMethodsSelected ? "Limpar" : "Todos"}
                  </button>
                )}
              </div>

              {activePaymentMethods.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-5 border border-dashed border-slate-200 rounded-lg">
                  <Wallet className="h-6 w-6 text-slate-300 mb-1.5" />
                  <p className="text-xs text-slate-400 text-center px-2">Nenhuma forma ativa</p>
                </div>
              ) : (
                <div
                  className={`border rounded-lg overflow-hidden max-h-48 overflow-y-auto ${
                    errors.paymentMethods ? "border-red-300" : "border-slate-200"
                  }`}
                >
                  <div className="divide-y divide-slate-50">
                    {activePaymentMethods.map((m) => {
                      const isSelected = selectedPaymentMethodIds.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors select-none ${
                            isSelected ? "bg-primary/5" : "hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded border flex-shrink-0 transition-all ${
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleTogglePaymentMethod(m.id)}
                            className="sr-only"
                          />
                          <span
                            className={`text-sm flex-1 truncate ${isSelected ? "font-medium text-slate-900" : "text-slate-600"}`}
                          >
                            {m.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {errors.paymentMethods ? (
                <p className="text-xs text-red-500">{errors.paymentMethods}</p>
              ) : selectedPaymentMethodIds.length > 0 && activePaymentMethods.length > 0 ? (
                <p className="text-[11px] text-slate-400">
                  {selectedPaymentMethodIds.length}/{activePaymentMethods.length} selecionada
                  {selectedPaymentMethodIds.length !== 1 ? "s" : ""}
                </p>
              ) : null}
            </div>
          </div>

          {/* ── Período ── */}
          <SectionDivider label="Período" />

          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Atalhos
            </Label>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS_ROLLING.map(({ id, label, days }) => {
                const isActive = activeDatePreset === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      const { start, end } = getRollingDaysRange(days);
                      setStartDate(start);
                      setEndDate(end);
                      setActiveDatePreset(id);
                      setErrors((er) => ({ ...er, startDate: undefined, endDate: undefined }));
                    }}
                    className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
              <button
                type="button"
                aria-pressed={activeDatePreset === "prev-month"}
                onClick={() => {
                  const { start, end } = getPreviousCalendarMonthRange();
                  setStartDate(start);
                  setEndDate(end);
                  setActiveDatePreset("prev-month");
                  setErrors((er) => ({ ...er, startDate: undefined, endDate: undefined }));
                }}
                className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                  activeDatePreset === "prev-month"
                    ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                Mês passado
              </button>
            </div>
          </div>

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
                    setActiveDatePreset(null);
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
                    setActiveDatePreset(null);
                    if (errors.endDate) setErrors((er) => ({ ...er, endDate: undefined }));
                  }}
                  className={`pl-9 pr-10 ${errors.endDate ? "border-red-400 focus:ring-red-400/20" : ""}`}
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <button
                  type="button"
                  title="Usar data de hoje"
                  aria-label="Preencher data final com a data de hoje"
                  onClick={() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    setEndDate(formatLocalYMD(today));
                    setActiveDatePreset(null);
                    if (errors.endDate) setErrors((er) => ({ ...er, endDate: undefined }));
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-primary hover:bg-slate-100/80 transition-colors"
                >
                  <CalendarCheck className="h-4 w-4" strokeWidth={1.75} />
                </button>
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
