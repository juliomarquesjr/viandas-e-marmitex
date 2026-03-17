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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui";
import { QRScannerModal } from "@/app/components/QRScannerModal";
import { InvoiceDataDisplay } from "@/app/components/InvoiceDataDisplay";
import { InvoiceData } from "@/lib/nf-scanner/types";
import {
  ExpenseFormData,
  ExpensePaymentMethod,
  ExpenseType,
  ExpenseWithRelations,
  SupplierType,
} from "@/lib/types";
import {
  Calendar,
  CreditCard,
  DollarSign,
  Loader2,
  QrCode,
  Receipt,
} from "lucide-react";
import { useEffect, useState } from "react";
import { convertToCents, formatCurrencyInput } from "../utils";

interface ExpenseFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ExpenseFormData) => Promise<void>;
  expense?: ExpenseWithRelations;
  expenseTypes: ExpenseType[];
  supplierTypes: SupplierType[];
  paymentMethods: ExpensePaymentMethod[];
}

type FormErrors = Partial<Record<keyof ExpenseFormData, string>>;
type FormTouched = Partial<Record<keyof ExpenseFormData, boolean>>;

const emptyForm: ExpenseFormData = {
  typeId: "",
  supplierTypeId: "",
  paymentMethodId: "",
  amountCents: 0,
  description: "",
  date: new Date().toISOString().split("T")[0],
};

export function ExpenseFormDialog({
  open,
  onClose,
  onSave,
  expense,
  expenseTypes,
  supplierTypes,
  paymentMethods,
}: ExpenseFormDialogProps) {
  const [formData, setFormData] = useState<ExpenseFormData>(emptyForm);
  const [displayPrice, setDisplayPrice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isInvoiceDisplayOpen, setIsInvoiceDisplayOpen] = useState(false);
  const [scannedInvoiceData, setScannedInvoiceData] = useState<InvoiceData | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (expense) {
      setFormData({
        typeId: expense.typeId || "",
        supplierTypeId: expense.supplierTypeId || "",
        paymentMethodId: expense.paymentMethodId || "",
        amountCents: expense.amountCents || 0,
        description: expense.description || "",
        date:
          expense.date instanceof Date
            ? expense.date.toISOString().split("T")[0]
            : new Date(expense.date).toISOString().split("T")[0],
      });
      const formatted = (expense.amountCents / 100).toFixed(2);
      setDisplayPrice(`R$ ${formatted.replace(".", ",")}`);
    } else {
      setFormData(emptyForm);
      setDisplayPrice("");
    }
    setErrors({});
    setTouched({});
  }, [expense, open]);

  const validateField = (field: keyof FormErrors, value: any): string | undefined => {
    switch (field) {
      case "typeId": return !value ? "Tipo de despesa é obrigatório" : undefined;
      case "supplierTypeId": return !value ? "Tipo de fornecedor é obrigatório" : undefined;
      case "amountCents": return (!value || value <= 0) ? "Valor deve ser maior que zero" : undefined;
      case "date": return !value ? "Data é obrigatória" : undefined;
      case "paymentMethodId": return (!value || value === "none") ? "Forma de pagamento é obrigatória" : undefined;
      default: return undefined;
    }
  };

  const handleBlur = (field: keyof FormErrors) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors((e) => ({ ...e, [field]: validateField(field, formData[field]) }));
  };

  const validateForm = (): boolean => {
    const fields: Array<keyof FormErrors> = ["typeId", "supplierTypeId", "amountCents", "date", "paymentMethodId"];
    const newErrors: FormErrors = {};
    let valid = true;
    fields.forEach((field) => {
      const err = validateField(field, formData[field]);
      if (err) { newErrors[field] = err; valid = false; }
    });
    setErrors(newErrors);
    setTouched({ typeId: true, supplierTypeId: true, amountCents: true, description: true, date: true, paymentMethodId: true });
    return valid;
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = e.target.value ? formatCurrencyInput(e.target.value) : "";
    setDisplayPrice(formatted);
    setFormData((f) => ({ ...f, amountCents: formatted ? convertToCents(formatted) : 0 }));
    if (touched.amountCents) setErrors((er) => ({ ...er, amountCents: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast("Por favor, preencha todos os campos obrigatórios", "error");
      return;
    }
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQRCodeScanned = (invoiceData: InvoiceData) => {
    setScannedInvoiceData(invoiceData);
    setIsQRScannerOpen(false);
    setIsInvoiceDisplayOpen(true);
  };

  const handleUseInvoiceForExpense = () => {
    if (!scannedInvoiceData) return;
    const cents = scannedInvoiceData.totais.valorTotal;
    const formatted = (cents / 100).toFixed(2);
    setDisplayPrice(`R$ ${formatted.replace(".", ",")}`);
    setFormData((f) => ({ ...f, amountCents: cents, date: scannedInvoiceData.dataEmissao }));
    setIsInvoiceDisplayOpen(false);
    setScannedInvoiceData(null);
    showToast("Dados da nota fiscal preenchidos automaticamente!", "success");
  };

  const fieldClass = (field: keyof FormErrors) =>
    touched[field] && errors[field] ? "border-red-400 focus:ring-red-400/20" : "";

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
                <Receipt className="h-4 w-4 text-orange-600" />
              </div>
              {expense ? "Editar Despesa" : "Nova Despesa"}
            </DialogTitle>
            <DialogDescription>
              {expense
                ? "Atualize as informações da despesa"
                : "Preencha os dados para registrar uma nova despesa"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            {/* Section header with QR scanner */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-orange-500" />
                Informações da Despesa
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsQRScannerOpen(true)}
                className="text-xs h-7 px-2 gap-1.5 border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <QrCode className="h-3 w-3" />
                Escanear Nota
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tipo de Despesa */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">
                  Tipo de Despesa <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Select
                    key={`type-${expense?.id || "new"}-${formData.typeId}`}
                    value={formData.typeId || undefined}
                    onValueChange={(v) => {
                      setFormData((f) => ({ ...f, typeId: v }));
                      if (touched.typeId) setErrors((e) => ({ ...e, typeId: undefined }));
                    }}
                  >
                    <SelectTrigger className={`pl-9 ${fieldClass("typeId")}`}>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999] bg-white border border-slate-200 shadow-lg" position="popper" side="bottom" align="start">
                      {expenseTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
                {touched.typeId && errors.typeId && (
                  <p className="text-xs text-red-500">{errors.typeId}</p>
                )}
              </div>

              {/* Tipo de Fornecedor */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">
                  Tipo de Fornecedor <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Select
                    key={`supplier-${expense?.id || "new"}-${formData.supplierTypeId}`}
                    value={formData.supplierTypeId || undefined}
                    onValueChange={(v) => {
                      setFormData((f) => ({ ...f, supplierTypeId: v }));
                      if (touched.supplierTypeId) setErrors((e) => ({ ...e, supplierTypeId: undefined }));
                    }}
                  >
                    <SelectTrigger className={`pl-9 ${fieldClass("supplierTypeId")}`}>
                      <SelectValue placeholder="Selecione o fornecedor" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999] bg-white border border-slate-200 shadow-lg" position="popper" side="bottom" align="start">
                      {supplierTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
                {touched.supplierTypeId && errors.supplierTypeId && (
                  <p className="text-xs text-red-500">{errors.supplierTypeId}</p>
                )}
              </div>

              {/* Valor */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">
                  Valor <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    value={displayPrice}
                    onChange={handlePriceChange}
                    onBlur={() => handleBlur("amountCents")}
                    className={`pl-9 ${fieldClass("amountCents")}`}
                    placeholder="R$ 0,00"
                  />
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
                {touched.amountCents && errors.amountCents && (
                  <p className="text-xs text-red-500">{errors.amountCents}</p>
                )}
              </div>

              {/* Data */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700">
                  Data <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => {
                      setFormData((f) => ({ ...f, date: e.target.value }));
                      if (touched.date) setErrors((er) => ({ ...er, date: undefined }));
                    }}
                    onBlur={() => handleBlur("date")}
                    className={`pl-9 ${fieldClass("date")}`}
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
                {touched.date && errors.date && (
                  <p className="text-xs text-red-500">{errors.date}</p>
                )}
              </div>
            </div>

            {/* Forma de Pagamento */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">
                Forma de Pagamento <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Select
                  key={`payment-${expense?.id || "new"}-${formData.paymentMethodId}`}
                  value={formData.paymentMethodId || undefined}
                  onValueChange={(v) => {
                    setFormData((f) => ({ ...f, paymentMethodId: v }));
                    if (touched.paymentMethodId) setErrors((e) => ({ ...e, paymentMethodId: undefined }));
                  }}
                >
                  <SelectTrigger className={`pl-9 ${fieldClass("paymentMethodId")}`}>
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999] bg-white border border-slate-200 shadow-lg" position="popper" side="bottom" align="start">
                    {paymentMethods.filter((m) => m.active).map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              {touched.paymentMethodId && errors.paymentMethodId && (
                <p className="text-xs text-red-500">{errors.paymentMethodId}</p>
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">
                Descrição <span className="text-xs font-normal text-slate-400">(Opcional)</span>
              </Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descrição da despesa"
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {expense ? "Atualizando..." : "Cadastrando..."}
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4 mr-2" />
                    {expense ? "Atualizar Despesa" : "Cadastrar Despesa"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onQRCodeScanned={handleQRCodeScanned}
      />

      {isInvoiceDisplayOpen && scannedInvoiceData && (
        <InvoiceDataDisplay
          invoiceData={scannedInvoiceData}
          onUseForExpense={handleUseInvoiceForExpense}
          onClose={() => { setIsInvoiceDisplayOpen(false); setScannedInvoiceData(null); }}
          onScanAgain={() => { setIsInvoiceDisplayOpen(false); setScannedInvoiceData(null); setIsQRScannerOpen(true); }}
        />
      )}
    </>
  );
}
