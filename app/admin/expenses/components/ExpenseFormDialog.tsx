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
import { formatValueToCents } from "@/lib/nf-scanner/utils";
import {
  ExpenseFormData,
  ExpensePaymentMethod,
  ExpenseType,
  ExpenseWithRelations,
  SupplierType,
} from "@/lib/types";
import {
  AlertTriangle,
  Calendar,
  CreditCard,
  DollarSign,
  Loader2,
  QrCode,
  Receipt,
  Tag,
  Truck,
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
  nfChaveAcesso: "",
};

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
  const [nfDuplicateWarning, setNfDuplicateWarning] = useState(false);
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
    setNfDuplicateWarning(false);
  }, [expense, open]);

  const validateField = (field: keyof FormErrors, value: any): string | undefined => {
    switch (field) {
      case "typeId": return !value ? "Obrigatório" : undefined;
      case "supplierTypeId": return !value ? "Obrigatório" : undefined;
      case "amountCents": return (!value || value <= 0) ? "Informe um valor maior que zero" : undefined;
      case "date": return !value ? "Obrigatório" : undefined;
      case "paymentMethodId": return (!value || value === "none") ? "Obrigatório" : undefined;
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

  const handleUseInvoiceForExpense = async () => {
    if (!scannedInvoiceData) return;
    // A NF mantém valores em reais; a despesa persiste `amountCents`.
    const amountToApply = scannedInvoiceData.totais.valorTotal;
    const amountCents = formatValueToCents(amountToApply);
    const formatted = (amountCents / 100).toFixed(2);
    setDisplayPrice(`R$ ${formatted.replace(".", ",")}`);
    const chave = scannedInvoiceData.chaveAcesso;
    setFormData((f) => ({
      ...f,
      amountCents,
      date: scannedInvoiceData.dataEmissao,
      nfChaveAcesso: chave,
    }));
    setIsInvoiceDisplayOpen(false);
    setScannedInvoiceData(null);
    showToast("Dados da nota fiscal preenchidos automaticamente!", "success");

    // Verificar se essa chave já foi usada em outra despesa
    try {
      const res = await fetch(`/api/expenses?nfChaveAcesso=${encodeURIComponent(chave)}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        const existing = data.expenses?.filter((e: { id?: string }) =>
          !expense || e.id !== expense.id
        );
        if (existing && existing.length > 0) {
          setNfDuplicateWarning(true);
        }
      }
    } catch {
      // falha silenciosa — não impede o fluxo
    }
  };

  const err = (field: keyof FormErrors) =>
    touched[field] && errors[field] ? "border-red-400 focus:ring-red-400/20" : "";

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
              >
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              {expense ? "Editar Despesa" : "Nova Despesa"}
            </DialogTitle>
            <DialogDescription>
              {expense
                ? "Atualize as informações da despesa abaixo"
                : "Preencha os dados para registrar uma nova despesa"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

              {/* ── Valor & Data ── */}
              <SectionDivider label="Valor & Data" />

              {/* Campo Valor — destaque visual */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Valor <span className="text-red-400">*</span>
                </Label>
                <div className={`flex items-center border rounded-xl overflow-hidden transition-all ${
                  touched.amountCents && errors.amountCents
                    ? "border-red-400 ring-2 ring-red-400/15"
                    : "border-slate-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15"
                }`}>
                  <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-50 border-r border-slate-200 flex-shrink-0">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-500">R$</span>
                  </div>
                  <input
                    value={displayPrice.replace(/^R\$\s?/, "")}
                    onChange={(e) => {
                      const raw = "R$ " + e.target.value;
                      const formatted = e.target.value ? formatCurrencyInput(raw) : "";
                      setDisplayPrice(formatted);
                      setFormData((f) => ({ ...f, amountCents: formatted ? convertToCents(formatted) : 0 }));
                      if (touched.amountCents) setErrors((er) => ({ ...er, amountCents: undefined }));
                    }}
                    onBlur={() => handleBlur("amountCents")}
                    className="flex-1 px-3 py-3 text-xl font-bold text-slate-900 bg-white outline-none placeholder:text-slate-300 placeholder:font-normal placeholder:text-base"
                    placeholder="0,00"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsQRScannerOpen(true)}
                    className="mx-2 text-xs h-7 px-2 gap-1.5 text-slate-400 hover:text-primary flex-shrink-0"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Nota fiscal</span>
                  </Button>
                </div>
                {touched.amountCents && errors.amountCents && (
                  <p className="text-xs text-red-500">{errors.amountCents}</p>
                )}
              </div>

              {/* Data */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Data <span className="text-red-400">*</span>
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
                    className={`pl-9 ${err("date")}`}
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
                {touched.date && errors.date && (
                  <p className="text-xs text-red-500">{errors.date}</p>
                )}
              </div>

              {/* ── Classificação ── */}
              <SectionDivider label="Classificação" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tipo de Despesa */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Tipo <span className="text-red-400">*</span>
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
                      <SelectTrigger className={`pl-9 ${err("typeId")}`}>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-white border border-slate-200 shadow-lg" position="popper" side="bottom" align="start">
                        {expenseTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  {touched.typeId && errors.typeId && (
                    <p className="text-xs text-red-500">{errors.typeId}</p>
                  )}
                </div>

                {/* Fornecedor */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Fornecedor <span className="text-red-400">*</span>
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
                      <SelectTrigger className={`pl-9 ${err("supplierTypeId")}`}>
                        <SelectValue placeholder="Selecione o fornecedor" />
                      </SelectTrigger>
                      <SelectContent className="z-[9999] bg-white border border-slate-200 shadow-lg" position="popper" side="bottom" align="start">
                        {supplierTypes.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                  {touched.supplierTypeId && errors.supplierTypeId && (
                    <p className="text-xs text-red-500">{errors.supplierTypeId}</p>
                  )}
                </div>
              </div>

              {/* ── Pagamento & Observações ── */}
              <SectionDivider label="Pagamento & Observações" />

              {/* Forma de Pagamento */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Forma de Pagamento <span className="text-red-400">*</span>
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
                    <SelectTrigger className={`pl-9 ${err("paymentMethodId")}`}>
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
                <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Descrição <span className="text-slate-300 font-normal normal-case tracking-normal">— opcional</span>
                </Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Adicione uma observação sobre essa despesa"
                />
              </div>
            </div>

            {nfDuplicateWarning && (
              <div className="mx-6 mb-2 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800 leading-snug">
                  Esta nota fiscal já foi utilizada em outra despesa. Você pode salvar mesmo assim se necessário.
                </p>
              </div>
            )}

            <DialogFooter>
              <p className="text-xs text-slate-400">
                <span className="text-red-400">*</span> campos obrigatórios
              </p>
              <div className="flex items-center gap-2">
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
                      {expense ? "Atualizar" : "Cadastrar Despesa"}
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
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
