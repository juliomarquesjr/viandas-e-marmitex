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
  DollarSign,
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
}

export function ExpenseListView({
  monthsGrouped,
  currentMonthIndex,
  onMonthChange,
  onEdit,
  onDelete,
  onNewExpense,
}: ExpenseListViewProps) {
  if (monthsGrouped.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 mx-auto mb-4">
            <Receipt className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-base font-medium text-slate-900 mb-1">Nenhuma despesa encontrada</h3>
          <p className="text-sm text-slate-500 mb-4">
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

  const [monthKey, monthExpenses] = monthsGrouped[currentMonthIndex] ?? ["", []];
  const [year, month] = monthKey.split("-");
  const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amountCents, 0);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        {/* Cabeçalho do mês */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 capitalize">{monthName}</h3>
                <p className="text-sm text-slate-500">{monthExpenses.length} despesa{monthExpenses.length !== 1 ? "s" : ""} no período</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Total do mês</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(monthTotal)}</p>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Fornecedor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Pagamento</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 flex-shrink-0">
                        <Receipt className="h-4 w-4 text-orange-600" />
                      </div>
                      <span className="text-sm font-medium text-slate-900 truncate max-w-[180px]">
                        {expense.description || <span className="text-slate-400 italic">Sem descrição</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="text-xs">{expense.type.name}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 border-0">
                      {expense.supplierType.name}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {expense.paymentMethod ? (
                      <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit">
                        <CreditCard className="h-3 w-3" />
                        {expense.paymentMethod.name}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Não informado</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm font-semibold text-emerald-700">
                      <DollarSign className="h-3.5 w-3.5" />
                      {formatCurrency(expense.amountCents)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(expense.date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <ExpenseActionsMenu
                      onEdit={() => onEdit(expense)}
                      onDelete={() => onDelete(expense)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Paginação por mês */}
      {monthsGrouped.length > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMonthChange(currentMonthIndex - 1)}
            disabled={currentMonthIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Mês Anterior
          </Button>

          <span className="text-sm text-slate-500 capitalize">
            {monthName} ({currentMonthIndex + 1} de {monthsGrouped.length})
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onMonthChange(currentMonthIndex + 1)}
            disabled={currentMonthIndex >= monthsGrouped.length - 1}
          >
            Próximo Mês
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
