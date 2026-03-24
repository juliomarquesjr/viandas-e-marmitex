import { Clock, Receipt, Wallet } from "lucide-react";
import { Card, CardContent } from "../../../../components/ui/card";
import { cn } from "@/lib/utils";

interface CustomerMetricsProps {
  stats: {
    balanceAmount: number;
  };
  filteredStats: {
    pendingAmount: number;
    totalOrders: number;
  };
  orderFilter: string;
}

export function CustomerMetrics({ stats, filteredStats, orderFilter }: CustomerMetricsProps) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const getFilterLabel = (filter: string) => {
    if (filter === "current-month") return "Mês Atual";
    if (filter === "previous-month") return "Mês Anterior";
    return "Período Filtrado";
  };

  return (
    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Compras Pendentes */}
      <Card className="border-amber-200 bg-amber-50/60">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Compras Pendentes</p>
            <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </div>
          {orderFilter !== "all" && (
            <p className="text-[10px] text-amber-600/80 font-medium mb-1">
              {getFilterLabel(orderFilter)}
            </p>
          )}
          <p className="text-2xl font-bold text-amber-900">{formatCurrency(filteredStats.pendingAmount)}</p>
        </CardContent>
      </Card>

      {/* Total de Pedidos */}
      <Card className="border-purple-200 bg-purple-50/60">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Total de Pedidos</p>
            <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-purple-600" />
            </div>
          </div>
          {orderFilter !== "all" && (
            <p className="text-[10px] text-purple-600/80 font-medium mb-1">
              {getFilterLabel(orderFilter)}
            </p>
          )}
          <p className="text-2xl font-bold text-purple-900">{filteredStats.totalOrders}</p>
        </CardContent>
      </Card>

      {/* Saldo */}
      <Card className={cn(
        "border",
        stats.balanceAmount > 0
          ? "border-red-200 bg-red-50/60"
          : "border-emerald-200 bg-emerald-50/60"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className={cn(
              "text-xs font-semibold uppercase tracking-wide",
              stats.balanceAmount > 0 ? "text-red-700" : "text-emerald-700"
            )}>
              {stats.balanceAmount > 0 ? "Saldo Devedor" : "Crédito"}
            </p>
            <div className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center",
              stats.balanceAmount > 0 ? "bg-red-100" : "bg-emerald-100"
            )}>
              <Wallet className={cn("h-4 w-4", stats.balanceAmount > 0 ? "text-red-600" : "text-emerald-600")} />
            </div>
          </div>
          <p className="text-[10px] font-medium mb-1 text-slate-500">Histórico completo</p>
          <p className={cn(
            "text-2xl font-bold",
            stats.balanceAmount > 0 ? "text-red-900" : "text-emerald-900"
          )}>
            {formatCurrency(Math.abs(stats.balanceAmount))}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
