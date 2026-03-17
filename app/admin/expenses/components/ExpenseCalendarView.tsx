"use client";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader } from "@/app/components/ui/card";
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 capitalize">
            {formatMonthYear(currentMonth)}
          </h2>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onNavigateMonth("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onGoToToday}
              className="h-8 px-3"
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onNavigateMonth("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Dias da semana */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="py-2 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Grid do calendário */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (!day) {
              return (
                <div key={index} className="min-h-24 rounded-lg border border-slate-100 bg-slate-50/50" />
              );
            }

            const dayExpenses = getExpensesForDate(day);
            const isToday = day.toDateString() === today.toDateString();
            const totalAmount = dayExpenses.reduce((sum, e) => sum + e.amountCents, 0);

            return (
              <div
                key={day.toISOString()}
                className={`min-h-24 rounded-lg border p-2 flex flex-col transition-colors ${
                  isToday
                    ? "border-blue-200 bg-blue-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1 flex-shrink-0">
                  <span className={`text-xs font-semibold ${isToday ? "text-blue-600" : "text-slate-700"}`}>
                    {day.getDate()}
                  </span>
                  {totalAmount > 0 && (
                    <span className="text-xs font-medium text-emerald-600 leading-none">
                      {formatCurrency(totalAmount)}
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-0.5 overflow-y-auto max-h-28">
                  {dayExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded truncate cursor-pointer hover:bg-orange-200 transition-colors"
                      title={`${expense.supplierType.name} - ${formatCurrency(expense.amountCents)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onExpenseClick(expense);
                      }}
                    >
                      {expense.supplierType.name.length > 14
                        ? `${expense.supplierType.name.substring(0, 14)}…`
                        : expense.supplierType.name}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
