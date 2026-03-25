import { CardHighlighted } from "@/app/components/ui/card";
import {
  ExpensePaymentMethod,
  ExpenseType,
  ExpenseWithRelations,
} from "@/lib/types";
import { formatCurrency } from "../utils";
import { CreditCard, DollarSign, Receipt, Tag } from "lucide-react";

interface ExpenseStatsCardsProps {
  expenses: ExpenseWithRelations[];
  expenseTypes: ExpenseType[];
  paymentMethods: ExpensePaymentMethod[];
}

export function ExpenseStatsCards({
  expenses,
  expenseTypes,
  paymentMethods,
}: ExpenseStatsCardsProps) {
  const totalAmount = expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const activePaymentMethods = paymentMethods.filter((m) => m.active).length;

  const stats = [
    {
      label: "Total de despesas",
      value: expenses.length.toString(),
      sublabel: "registradas no período",
      icon: Receipt,
      highlightColor: "info" as const,
      iconBg: "bg-gradient-to-br from-blue-50 to-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "Valor total",
      value: formatCurrency(totalAmount),
      sublabel: "soma do período filtrado",
      icon: DollarSign,
      highlightColor: "success" as const,
      iconBg: "bg-gradient-to-br from-emerald-50 to-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      label: "Tipos de despesa",
      value: expenseTypes.length.toString(),
      sublabel: "categorias cadastradas",
      icon: Tag,
      highlightColor: "warning" as const,
      iconBg: "bg-gradient-to-br from-orange-50 to-orange-100",
      iconColor: "text-orange-600",
    },
    {
      label: "Formas de pagamento",
      value: activePaymentMethods.toString(),
      sublabel: "métodos ativos",
      icon: CreditCard,
      highlightColor: "primary" as const,
      iconBg: "bg-gradient-to-br from-violet-50 to-violet-100",
      iconColor: "text-violet-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <CardHighlighted key={stat.label} highlightColor={stat.highlightColor}>
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1.5 truncate">
                  {stat.value}
                </p>
                <p className="text-xs text-slate-400 mt-1 truncate">
                  {stat.sublabel}
                </p>
              </div>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.iconBg} flex-shrink-0 ml-4`}
              >
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        </CardHighlighted>
      ))}
    </div>
  );
}
