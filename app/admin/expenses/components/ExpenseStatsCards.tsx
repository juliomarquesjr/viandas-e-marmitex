import { Card, CardContent } from "@/app/components/ui/card";
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
      icon: Receipt,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Valor total",
      value: formatCurrency(totalAmount),
      icon: DollarSign,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Tipos de despesa",
      value: expenseTypes.length.toString(),
      icon: Tag,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
    },
    {
      label: "Formas de pagamento",
      value: activePaymentMethods.toString(),
      icon: CreditCard,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs text-slate-500 truncate">{stat.label}</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5 truncate">{stat.value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.iconBg} flex-shrink-0 ml-3`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
