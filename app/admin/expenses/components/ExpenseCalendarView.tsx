"use client";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { ExpenseWithRelations } from "@/lib/types";
import { formatCurrency } from "../utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface ExpenseCalendarViewProps {
  currentMonth: Date;
  expenses: ExpenseWithRelations[];
  onNavigateMonth: (direction: "prev" | "next") => void;
  onGoToToday: () => void;
  getDaysInMonth: (date: Date) => (Date | null)[];
  getExpensesForDate: (date: Date) => ExpenseWithRelations[];
  formatMonthYear: (date: Date) => string;
  onExpenseClick: (expense: ExpenseWithRelations) => void;
}

export function ExpenseCalendarView({
  currentMonth,
  onNavigateMonth,
  onGoToToday,
  getDaysInMonth,
  getExpensesForDate,
  formatMonthYear,
  onExpenseClick,
}: ExpenseCalendarViewProps) {
  const days = getDaysInMonth(currentMonth);
  const today = new Date();

  return (
    <Card className="overflow-hidden">
      {/* Header do calendário */}
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 capitalize">
            {formatMonthYear(currentMonth)}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-slate-100"
              onClick={() => onNavigateMonth("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onGoToToday}
              className="h-8 px-4 text-xs font-medium"
            >
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-slate-100"
              onClick={() => onNavigateMonth("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Dias da semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              className="py-2.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-widest"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid do calendário */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (!day) {
              return (
                <div
                  key={index}
                  className="min-h-28 rounded-xl bg-slate-50/40"
                />
              );
            }

            const dayExpenses = getExpensesForDate(day);
            const isToday = day.toDateString() === today.toDateString();
            const totalAmount = dayExpenses.reduce(
              (sum, e) => sum + e.amountCents,
              0
            );
            const hasExpenses = dayExpenses.length > 0;

            return (
              <div
                key={day.toISOString()}
                className={`min-h-28 rounded-xl border p-2 flex flex-col transition-all duration-150 ${
                  isToday
                    ? "border-blue-200 bg-blue-50/60 shadow-sm"
                    : hasExpenses
                    ? "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                    : "border-slate-100 bg-white hover:bg-slate-50/50"
                }`}
              >
                {/* Número do dia + total */}
                <div className="flex items-start justify-between mb-1.5 flex-shrink-0">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                      isToday
                        ? "bg-blue-600 text-white"
                        : "text-slate-600"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {totalAmount > 0 && (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-full px-1.5 py-0.5 leading-none">
                      {formatCurrency(totalAmount)}
                    </span>
                  )}
                </div>

                {/* Chips de despesa */}
                <div className="flex-1 space-y-0.5 overflow-hidden">
                  {dayExpenses.slice(0, 3).map((expense) => (
                    <button
                      key={expense.id}
                      className="w-full text-left text-xs bg-orange-50 text-orange-700 border border-orange-100 px-2 py-1 rounded-lg truncate cursor-pointer hover:bg-orange-100 hover:border-orange-200 transition-colors duration-100 font-medium"
                      title={`${expense.supplierType.name} — ${formatCurrency(expense.amountCents)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onExpenseClick(expense);
                      }}
                    >
                      {expense.supplierType.name.length > 13
                        ? `${expense.supplierType.name.substring(0, 13)}…`
                        : expense.supplierType.name}
                    </button>
                  ))}
                  {dayExpenses.length > 3 && (
                    <button
                      className="w-full text-left text-xs text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors duration-100 font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        onExpenseClick(dayExpenses[3]);
                      }}
                    >
                      +{dayExpenses.length - 3} mais
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
