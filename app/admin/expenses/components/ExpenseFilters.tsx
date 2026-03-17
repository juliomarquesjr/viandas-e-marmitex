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
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Select
            value={filters.typeId}
            onValueChange={(v) => setFilters({ ...filters, typeId: v })}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Tipo de despesa" />
            </SelectTrigger>
            <SelectContent className="z-[9999] bg-white border border-slate-200 shadow-lg" position="popper" side="bottom" align="start">
              <SelectItem value="all">Todos os tipos</SelectItem>
              {expenseTypes.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.supplierTypeId}
            onValueChange={(v) => setFilters({ ...filters, supplierTypeId: v })}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Tipo de fornecedor" />
            </SelectTrigger>
            <SelectContent className="z-[9999] bg-white border border-slate-200 shadow-lg" position="popper" side="bottom" align="start">
              <SelectItem value="all">Todos os fornecedores</SelectItem>
              {supplierTypes.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.paymentMethodId}
            onValueChange={(v) => setFilters({ ...filters, paymentMethodId: v })}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Forma de pagamento" />
            </SelectTrigger>
            <SelectContent className="z-[9999] bg-white border border-slate-200 shadow-lg" position="popper" side="bottom" align="start">
              <SelectItem value="all">Todas as formas</SelectItem>
              {paymentMethods.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="h-10"
          />

          <Input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="h-10"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={onApply} size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Aplicar
            </Button>
            {hasActiveFilters && (
              <Button onClick={onClear} variant="outline" size="sm">
                <X className="h-4 w-4 mr-1.5" />
                Limpar
              </Button>
            )}
          </div>
          <p className="text-sm text-slate-500">
            {totalCount} despesa{totalCount !== 1 ? "s" : ""} encontrada{totalCount !== 1 ? "s" : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
