"use client";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui";
import {
  ExpensePaymentMethod,
  ExpenseType,
  SupplierType,
} from "@/lib/types";
import { Filter, X } from "lucide-react";

interface Filters {
  typeId: string;
  supplierTypeId: string;
  paymentMethodId: string;
  startDate: string;
  endDate: string;
}

interface ExpenseFiltersProps {
  filters: Filters;
  setFilters: (f: Filters) => void;
  expenseTypes: ExpenseType[];
  supplierTypes: SupplierType[];
  paymentMethods: ExpensePaymentMethod[];
  totalCount: number;
  onApply: () => void;
  onClear: () => void;
}

export function ExpenseFilters({
  filters,
  setFilters,
  expenseTypes,
  supplierTypes,
  paymentMethods,
  totalCount,
  onApply,
  onClear,
}: ExpenseFiltersProps) {
  const hasActiveFilters =
    filters.typeId !== "all" ||
    filters.supplierTypeId !== "all" ||
    filters.paymentMethodId !== "all" ||
    !!filters.startDate ||
    !!filters.endDate;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Tipo de despesa</label>
            <Select
              value={filters.typeId}
              onValueChange={(v) => setFilters({ ...filters, typeId: v })}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent className="z-[9999] bg-white border border-slate-200 shadow-lg" position="popper" side="bottom" align="start">
                <SelectItem value="all">Todos os tipos</SelectItem>
                {expenseTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Fornecedor</label>
            <Select
              value={filters.supplierTypeId}
              onValueChange={(v) => setFilters({ ...filters, supplierTypeId: v })}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Todos os fornecedores" />
              </SelectTrigger>
              <SelectContent className="z-[9999] bg-white border border-slate-200 shadow-lg" position="popper" side="bottom" align="start">
                <SelectItem value="all">Todos os fornecedores</SelectItem>
                {supplierTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Forma de pagamento</label>
            <Select
              value={filters.paymentMethodId}
              onValueChange={(v) => setFilters({ ...filters, paymentMethodId: v })}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Todas as formas" />
              </SelectTrigger>
              <SelectContent className="z-[9999] bg-white border border-slate-200 shadow-lg" position="popper" side="bottom" align="start">
                <SelectItem value="all">Todas as formas</SelectItem>
                {paymentMethods.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Data inicial</label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Data final</label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="h-10"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Button onClick={onApply} size="sm" className="gap-2">
              <Filter className="h-3.5 w-3.5" />
              Aplicar filtros
            </Button>
            {hasActiveFilters && (
              <Button onClick={onClear} variant="ghost" size="sm" className="gap-1.5 text-slate-500 hover:text-slate-900">
                <X className="h-3.5 w-3.5" />
                Limpar
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center text-xs font-semibold bg-slate-100 text-slate-600 rounded-full px-2.5 py-1 tabular-nums">
              {totalCount}
            </span>
            <span className="text-sm text-slate-400">
              despesa{totalCount !== 1 ? "s" : ""} encontrada{totalCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
