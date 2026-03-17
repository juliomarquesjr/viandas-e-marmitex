"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Badge } from "@/app/components/ui/badge";
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
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
              <Receipt className="h-4 w-4 text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="truncate">
                {expense.description || "Despesa"}
              </p>
              <p className="text-xs font-normal text-slate-500 mt-0.5">
                {formatDate(expense.date)}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Valor</span>
            <span className="text-lg font-bold text-emerald-600">
              {formatCurrency(expense.amountCents)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Tipo</span>
            <Badge variant="outline" className="text-xs">{expense.type.name}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Fornecedor</span>
            <Badge className="text-xs bg-slate-100 text-slate-700 border-0 hover:bg-slate-200">
              {expense.supplierType.name}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Pagamento</span>
            {expense.paymentMethod ? (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                {expense.paymentMethod.name}
              </Badge>
            ) : (
              <span className="text-xs text-slate-400 italic">Não informado</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="gap-1.5"
          >
            <Edit className="h-3.5 w-3.5" />
            Editar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remover
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
