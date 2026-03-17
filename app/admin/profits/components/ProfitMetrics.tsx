import { DollarSign, TrendingDown, TrendingUp, BarChart3, ShoppingCart, Target, Calendar } from "lucide-react";
import { ProfitReportData } from "../../../../lib/types";
import { Card, CardContent } from "../../../components/ui/card";
import { formatCurrency } from "../utils";

interface ProfitMetricsProps {
  reportData: ProfitReportData;
}

export function ProfitMetrics({ reportData }: ProfitMetricsProps) {
  return (
    <>
      {/* KPIs Principais */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Total Receitas */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Receitas</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(reportData.revenue.total)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Vendas: {formatCurrency(reportData.revenue.sales)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Despesas */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Despesas</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(reportData.expenses.total)}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {reportData.expenses.details.length} tipo(s) de despesa
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lucro Líquido */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Lucro Líquido</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(reportData.profit.total)}
                </p>
                <p className={`text-xs mt-1 ${reportData.profit.total >= 0 ? "text-blue-600" : "text-orange-600"}`}>
                  {reportData.profit.percentage.toFixed(2)}% da receita
                </p>
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${reportData.profit.total >= 0 ? "bg-blue-50" : "bg-orange-50"}`}>
                <TrendingUp className={`h-5 w-5 ${reportData.profit.total >= 0 ? "text-blue-600" : "text-orange-600"}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Margem de Lucro */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Margem de Lucro</p>
                <p className="text-2xl font-bold text-slate-900">
                  {reportData.profit.percentage.toFixed(2)}%
                </p>
                <p className={`text-xs mt-1 ${reportData.profit.percentage >= 0 ? "text-purple-600" : "text-slate-500"}`}>
                  {reportData.profit.percentage >= 0 ? "Margem positiva" : "Margem negativa"}
                </p>
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${reportData.profit.percentage >= 0 ? "bg-purple-50" : "bg-slate-100"}`}>
                <BarChart3 className={`h-5 w-5 ${reportData.profit.percentage >= 0 ? "text-purple-600" : "text-slate-500"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Adicionais */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total de Pedidos</p>
                <p className="text-2xl font-bold text-slate-900">
                  {reportData.metrics.totalOrders}
                </p>
                <p className="text-xs text-slate-500 mt-1">Pedidos confirmados</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <ShoppingCart className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Ticket Médio</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(reportData.metrics.averageTicket)}
                </p>
                <p className="text-xs text-slate-500 mt-1">Por pedido</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <Target className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Receita Média Diária</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(reportData.metrics.averageDailyRevenue)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {reportData.period.days} dias analisados
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Despesa Média Diária</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(reportData.metrics.averageDailyExpenses)}
                </p>
                <p className="text-xs text-slate-500 mt-1">Por dia</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-pink-50 flex items-center justify-center shrink-0">
                <TrendingDown className="h-5 w-5 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
