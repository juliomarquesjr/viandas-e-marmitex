"use client";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { ExpenseWithRelations } from "@/lib/types";
import { formatCurrency, formatDate } from "../utils";
import { ExpenseActionsMenu } from "./ExpenseActionsMenu";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Plus,
  Receipt,
} from "lucide-react";

interface ExpenseListViewProps {
  monthsGrouped: [string, ExpenseWithRelations[]][];
  currentMonthIndex: number;
  onMonthChange: (i: number) => void;
  onEdit: (expense: ExpenseWithRelations) => void;
  onDelete: (expense: ExpenseWithRelations) => void;
  onNewExpense: () => void;
  onExpenseClick?: (expense: ExpenseWithRelations) => void;
}

export function ExpenseListView({
  monthsGrouped,
  currentMonthIndex,
  onMonthChange,
  onEdit,
  onDelete,
  onNewExpense,
  onExpenseClick,
}: ExpenseListViewProps) {
  if (monthsGrouped.length === 0) {
    return (
      <Card>
        <CardContent className="p-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mx-auto mb-4">
            <Receipt className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1.5">
            Nenhuma despesa encontrada
          </h3>
          <p className="text-sm text-slate-500 mb-5">
            Comece registrando sua primeira despesa
          </p>
          <Button size="sm" onClick={onNewExpense}>
            <Plus className="h-4 w-4 mr-2" />
            Registrar Primeira Despesa
          </Button>
        </CardContent>
      </Card>
    );
  }

  const [monthKey, monthExpenses] =
    monthsGrouped[currentMonthIndex] ?? ["", []];
  const [year, month] = monthKey.split("-");
  const monthName = new Date(
    parseInt(year),
    parseInt(month) - 1,
    1
  ).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amountCents, 0);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        {/* Cabeçalho do mês */}
        <div className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-orange-100">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 capitalize">
                  {monthName}
                </h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  {monthExpenses.length} despesa
                  {monthExpenses.length !== 1 ? "s" : ""} no período
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Total do mês
              </p>
              <p className="text-xl font-bold text-emerald-600 mt-0.5">
                {formatCurrency(monthTotal)}
              </p>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Fornecedor
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Pagamento
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {monthExpenses.map((expense) => (
                <tr
                  key={expense.id}
                  className={`hover:bg-slate-50/80 transition-colors duration-100 group ${onExpenseClick ? "cursor-pointer" : ""}`}
                  onClick={() => onExpenseClick?.(expense)}
                >
                  {/* Descrição */}
                  <td className="px-5 py-3.5">
                    {expense.description ? (
                      <span className="text-sm font-medium text-slate-800 truncate max-w-[200px] block">
                        {expense.description}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400 italic">
                        Sem descrição
                      </span>
                    )}
                  </td>

                  {/* Tipo */}
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100 rounded-full px-2.5 py-1">
                      {expense.type.name}
                    </span>
                  </td>

                  {/* Fornecedor */}
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-1">
                      {expense.supplierType.name}
                    </span>
                  </td>

                  {/* Forma de pagamento */}
                  <td className="px-5 py-3.5">
                    {expense.paymentMethod ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 rounded-full px-2.5 py-1">
                        <CreditCard className="h-3 w-3" />
                        {expense.paymentMethod.name}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  {/* Valor */}
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center text-xs font-bold bg-emerald-50 text-emerald-700 rounded-full px-3 py-1 tabular-nums">
                      {formatCurrency(expense.amountCents)}
                    </span>
                  </td>

                  {/* Data */}
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-slate-500 tabular-nums whitespace-nowrap">
                      {formatDate(expense.date)}
                    </span>
                  </td>

                  {/* Ações */}
                  <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-100">
                      <ExpenseActionsMenu
                        onEdit={() => onEdit(expense)}
                        onDelete={() => onDelete(expense)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Navegação por meses */}
      {monthsGrouped.length > 1 && (
        <div className="flex items-center justify-between px-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMonthChange(currentMonthIndex - 1)}
            disabled={currentMonthIndex === 0}
            className="gap-1.5 text-slate-500 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Mês anterior
          </Button>

          {/* Pills de navegação */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-full p-1">
            {monthsGrouped.map(([key], i) => {
              const [y, m] = key.split("-");
              const label = new Date(
                parseInt(y),
                parseInt(m) - 1,
                1
              ).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
              return (
                <button
                  key={key}
                  onClick={() => onMonthChange(i)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 capitalize ${
                    i === currentMonthIndex
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <span className="sm:hidden text-sm text-slate-400 capitalize">
            {currentMonthIndex + 1} / {monthsGrouped.length}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMonthChange(currentMonthIndex + 1)}
            disabled={currentMonthIndex >= monthsGrouped.length - 1}
            className="gap-1.5 text-slate-500 hover:text-slate-900"
          >
            Próximo mês
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
