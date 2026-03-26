"use client";

import { useEffect, useState } from "react";
import {
  Calculator,
  CalendarRange,
  FolderOpen,
  Loader2,
  Trash2,
} from "lucide-react";

import { useCustomerBudgets } from "@/app/admin/customers/[id]/hooks/useCustomerBudgets";
import type { SavedBudgetSummary } from "@/app/admin/customers/[id]/types";

import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { useToast } from "./Toast";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type SavedBudgetProduct = {
  id: string;
  name: string;
  priceCents: number;
  pricePerKgCents?: number;
  barcode?: string;
  imageUrl?: string;
  active: boolean;
  category?: {
    id: string;
    name: string;
  };
};

type SavedBudgetLoadItem = {
  productId: string;
  product: SavedBudgetProduct;
  quantity: number;
};

type SavedBudgetLoadDate = {
  date: string;
  items: SavedBudgetLoadItem[];
  discountCents: number;
  enabled: boolean;
};

export type SavedBudgetLoadData = {
  startDate: string;
  endDate: string;
  budgetData: SavedBudgetLoadDate[];
};

type SavedBudgetsPickerDialogProps = {
  customerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoaded: (budget: SavedBudgetLoadData) => void;
};

export function SavedBudgetsPickerDialog({
  customerId,
  open,
  onOpenChange,
  onLoaded,
}: SavedBudgetsPickerDialogProps) {
  const { showToast } = useToast();
  const { budgets, loading, loadBudgets, deleteBudget } =
    useCustomerBudgets(customerId);
  const [budgetToDelete, setBudgetToDelete] = useState<SavedBudgetSummary | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingBudgetId, setLoadingBudgetId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadBudgets();
    }
  }, [open, loadBudgets]);

  const handleLoadBudget = async (budgetId: string) => {
    setLoadingBudgetId(budgetId);
    try {
      const res = await fetch(`/api/customers/${customerId}/budgets/${budgetId}`);
      if (!res.ok) {
        throw new Error("Falha ao carregar orçamento");
      }

      const data = await res.json();
      onLoaded({
        startDate: data.data.startDate,
        endDate: data.data.endDate,
        budgetData: data.data.budgetData ?? [],
      });
      showToast("Orçamento carregado com sucesso", "success");
      onOpenChange(false);
    } catch {
      showToast("Erro ao carregar orçamento", "error");
    } finally {
      setLoadingBudgetId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!budgetToDelete) return;

    setIsDeleting(true);
    try {
      const ok = await deleteBudget(budgetToDelete.id);
      if (ok) {
        showToast("Orçamento excluído com sucesso", "success");
        setBudgetToDelete(null);
        return;
      }

      showToast("Erro ao excluir orçamento", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);

  const formatDate = (date: string) =>
    new Date(date + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden p-0 flex flex-col border-t-[3px] border-t-primary">
          <DialogHeader>
            <DialogTitle>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                style={{
                  background: "var(--modal-header-icon-bg)",
                  outline: "1px solid var(--modal-header-icon-ring)",
                }}
              >
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              Orçamentos Salvos
            </DialogTitle>
            <DialogDescription>
              Carregue um orçamento salvo ou remova itens antigos deste cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-20 rounded-2xl border border-slate-100 bg-slate-100/70 animate-pulse"
                  />
                ))}
              </div>
            ) : budgets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarRange className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-600">
                  Nenhum orçamento salvo
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Salve um orçamento gerado para reutilizá-lo depois sem sair
                  deste fluxo.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {budgets.map((budget) => {
                  const isLoadingBudget = loadingBudgetId === budget.id;

                  return (
                    <div
                      key={budget.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition-colors hover:bg-slate-100"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <div
                            className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
                            style={{
                              background: "var(--modal-header-icon-bg)",
                              outline: "1px solid var(--modal-header-icon-ring)",
                            }}
                          >
                            <Calculator className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {budget.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {formatDate(budget.startDate)} até{" "}
                              {formatDate(budget.endDate)}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              Salvo em {formatDate(budget.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-primary">
                            {formatCurrency(budget.totalCents)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleLoadBudget(budget.id)}
                            disabled={isLoadingBudget}
                          >
                            {isLoadingBudget ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <FolderOpen className="h-3.5 w-3.5 mr-1" />
                            )}
                            Carregar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => setBudgetToDelete(budget)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <p className="text-xs text-slate-400">
              {budgets.length} orçamento{budgets.length !== 1 ? "s" : ""} salvo
              {budgets.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!budgetToDelete}
        onOpenChange={(nextOpen) => !nextOpen && setBudgetToDelete(null)}
        title="Excluir Orçamento"
        description="Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita."
        onConfirm={handleConfirmDelete}
        confirmText="Excluir"
        cancelText="Cancelar"
        isLoading={isDeleting}
      />
    </>
  );
}
