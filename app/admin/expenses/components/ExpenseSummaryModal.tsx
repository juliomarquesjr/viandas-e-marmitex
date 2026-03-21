"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { InvoiceDataDisplay } from "@/app/components/InvoiceDataDisplay";
import { InvoiceData } from "@/lib/nf-scanner/types";
import { ExpenseWithRelations } from "@/lib/types";
import { formatCurrency, formatDate } from "../utils";
import {
  AlertCircle,
  CreditCard,
  Edit,
  FileText,
  Loader2,
  Receipt,
  Trash2,
} from "lucide-react";

interface ExpenseSummaryModalProps {
  open: boolean;
  expense: ExpenseWithRelations | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function maskChave(chave: string): string {
  if (chave.length < 10) return chave;
  return `${chave.substring(0, 20)}...${chave.slice(-4)}`;
}

export function ExpenseSummaryModal({
  open,
  expense,
  onClose,
  onEdit,
  onDelete,
}: ExpenseSummaryModalProps) {
  const [isLoadingNf, setIsLoadingNf] = useState(false);
  const [nfError, setNfError] = useState<string | null>(null);
  const [nfData, setNfData] = useState<InvoiceData | null>(null);
  const [isNfModalOpen, setIsNfModalOpen] = useState(false);

  if (!expense) return null;

  const hasNf = !!expense.nfChaveAcesso;

  const handleVerNf = async () => {
    if (!expense.nfChaveAcesso) return;
    setIsLoadingNf(true);
    setNfError(null);
    try {
      const res = await fetch(
        `/api/nf-scanner/consulta?chave=${encodeURIComponent(expense.nfChaveAcesso)}`
      );
      const json = await res.json();
      if (!res.ok || !json.data) {
        throw new Error(json.error || "Erro ao consultar nota fiscal");
      }
      setNfData(json.data);
      setIsNfModalOpen(true);
    } catch (err) {
      setNfError(
        err instanceof Error
          ? err.message
          : "Não foi possível consultar a nota fiscal. Tente novamente."
      );
    } finally {
      setIsLoadingNf(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-sm gap-0 p-0 overflow-hidden">
          {/* Header */}
          <div
            className="px-6 pt-6 pb-5 border-b"
            style={{
              background: "var(--modal-header-bg)",
              borderColor: "rgba(0,0,0,0.06)",
            }}
          >
            <div className="flex items-center gap-3 pr-8">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                style={{
                  background: "var(--modal-header-icon-bg)",
                  outline: "1px solid var(--modal-header-icon-ring)",
                }}
              >
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-base font-bold truncate leading-snug"
                  style={{ color: "var(--modal-header-text)" }}
                >
                  {expense.description || "Sem descrição"}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--modal-header-description)" }}
                >
                  Registrada em {formatDate(expense.date)}
                </p>
              </div>
            </div>

            {/* Valor + badge NF */}
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-emerald-600 tabular-nums">
                  {formatCurrency(expense.amountCents)}
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--modal-header-description)" }}
                >
                  total
                </span>
              </div>
              {hasNf && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2.5 py-1">
                  <FileText className="h-3 w-3" />
                  Via Nota Fiscal
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="bg-white divide-y divide-slate-100">
            {/* Tipo */}
            <div className="flex items-center justify-between px-6 py-3">
              <span className="text-sm text-slate-500">Tipo</span>
              <span className="inline-flex items-center text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1">
                {expense.type.name}
              </span>
            </div>

            {/* Fornecedor */}
            <div className="flex items-center justify-between px-6 py-3">
              <span className="text-sm text-slate-500">Fornecedor</span>
              <span className="inline-flex items-center text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2.5 py-1">
                {expense.supplierType.name}
              </span>
            </div>

            {/* Pagamento */}
            <div className="flex items-center justify-between px-6 py-3">
              <span className="text-sm text-slate-500">Pagamento</span>
              {expense.paymentMethod ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2.5 py-1">
                  <CreditCard className="h-3 w-3" />
                  {expense.paymentMethod.name}
                </span>
              ) : (
                <span className="text-xs text-slate-400 italic">Não informado</span>
              )}
            </div>

            {/* Nota Fiscal (condicional) */}
            {hasNf && (
              <div className="px-6 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Nota Fiscal</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleVerNf}
                    disabled={isLoadingNf}
                    className="gap-1.5 h-7 px-2.5 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                  >
                    {isLoadingNf ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <FileText className="h-3 w-3" />
                    )}
                    {isLoadingNf ? "Consultando..." : "Ver Nota Fiscal"}
                  </Button>
                </div>
                <p className="font-mono text-[11px] text-slate-400 break-all leading-relaxed">
                  {maskChave(expense.nfChaveAcesso!)}
                </p>
                {nfError && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700 leading-snug">{nfError}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="border-t-2 border-slate-200 bg-slate-100 px-6 py-4">
            <div />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
                <Edit className="h-3.5 w-3.5" />
                Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={onDelete} className="gap-1.5">
                <Trash2 className="h-3.5 w-3.5" />
                Remover
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal da NF em modo somente leitura */}
      {isNfModalOpen && nfData && (
        <InvoiceDataDisplay
          readOnly
          invoiceData={nfData}
          onClose={() => setIsNfModalOpen(false)}
        />
      )}
    </>
  );
}
