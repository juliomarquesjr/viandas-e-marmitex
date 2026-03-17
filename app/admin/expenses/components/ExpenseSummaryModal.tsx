"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { ExpenseWithRelations } from "@/lib/types";
import { formatCurrency, formatDate } from "../utils";
import { CreditCard, Edit, Receipt, Trash2 } from "lucide-react";

interface ExpenseSummaryModalProps {
  open: boolean;
  expense: ExpenseWithRelations | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ExpenseSummaryModal({
  open,
  expense,
  onClose,
  onEdit,
  onDelete,
}: ExpenseSummaryModalProps) {
  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        {/* Header personalizado com valor em destaque */}
        <div
          className="px-6 pt-6 pb-5 border-b border-white/10"
          style={{ background: "var(--modal-header-bg)" }}
        >
          <div className="flex items-center gap-3 pr-8">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
            >
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold truncate leading-snug" style={{ color: "var(--modal-header-text)" }}>
                {expense.description || "Despesa sem descrição"}
              </p>
              <p className="text-sm mt-0.5" style={{ color: "var(--modal-header-description)" }}>
                Registrada em {formatDate(expense.date)}
              </p>
            </div>
          </div>

          {/* Valor em destaque */}
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 tabular-nums">
              {formatCurrency(expense.amountCents)}
            </span>
            <span className="text-sm" style={{ color: "var(--modal-header-description)" }}>
              total da despesa
            </span>
          </div>
        </div>

        {/* Body com detalhes */}
        <div className="px-6 py-1 bg-white divide-y divide-slate-100">
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-slate-500">Tipo</span>
            <span className="inline-flex items-center text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-1">
              {expense.type.name}
            </span>
          </div>

          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-slate-500">Fornecedor</span>
            <span className="inline-flex items-center text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 rounded-full px-2.5 py-1">
              {expense.supplierType.name}
            </span>
          </div>

          <div className="flex items-center justify-between py-3">
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
        </div>

        <DialogFooter>
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
  );
}
