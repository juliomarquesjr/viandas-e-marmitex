import { Award, Calendar, TrendingDown } from "lucide-react";
import { ProfitReportData } from "../../../../lib/types";
import { Card, CardContent } from "../../../components/ui/card";
import { formatCurrency, formatDate, formatDateShort, EXPENSE_COLORS } from "../utils";

interface ProfitListsProps {
  reportData: ProfitReportData;
}

export function ProfitLists({ reportData }: ProfitListsProps) {
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Despesas por Tipo (Gráfico de pizza foi para ProfitCharts, aqui em tela anterior ficava na mesma linha do Top 5 dias, na refatoração vamos manter o Top 5 Dias isolado ou junto) */}
        
        {/* Top 5 Dias Mais Lucrativos */}
        {reportData.topDays && reportData.topDays.length > 0 && (
          <Card className="h-full">
            <CardContent className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Award className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Top 5 Dias Mais Lucrativos</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Os dias com maior lucro líquido no período
                  </p>
                </div>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {reportData.topDays.map((day, index) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-200/60 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {formatDate(day.date)}
                        </p>
                        <p className="text-sm text-slate-600">
                          Receita: {formatCurrency(day.total_revenue)} | 
                          Despesas: {formatCurrency(day.expenses)}
                        </p>
                      </div>
                    </div>
                    <div className="px-4 py-2 bg-white rounded-lg border border-yellow-200 shadow-sm">
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(day.profit)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        {/* Receitas por Dia */}
        {reportData.dailyBreakdown && Array.isArray(reportData.dailyBreakdown) && reportData.dailyBreakdown.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Receitas por Dia</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {reportData.dailyBreakdown.length} dias com movimentação
                  </p>
                </div>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {reportData.dailyBreakdown.map((day: any, index: number) => {
                  const totalDay = Number(day.sales_revenue || 0) + Number(day.ficha_revenue || 0);
                  const maxRevenue = Math.max(...reportData.dailyBreakdown.map((d: any) => 
                    Number(d.sales_revenue || 0) + Number(d.ficha_revenue || 0)
                  ));
                  const percentage = maxRevenue > 0 ? (totalDay / maxRevenue) * 100 : 0;
                  
                  return (
                    <div
                      key={index}
                      className="group relative p-4 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 rounded-xl border border-blue-200/60 hover:shadow-md hover:border-blue-300 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                            {formatDateShort(day.date)}
                          </div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {formatDate(day.date)}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-slate-900">
                          {formatCurrency(totalDay)}
                        </p>
                      </div>
                      <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          Vendas: {formatCurrency(Number(day.sales_revenue || 0))}
                        </span>
                        {Number(day.ficha_revenue || 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-purple-500" />
                            Fichas: {formatCurrency(Number(day.ficha_revenue || 0))}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Despesas por Tipo (lista) */}
        {reportData.expenses.details.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Lista de Despesas por Tipo</h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {reportData.expenses.details.length} tipo(s) de despesa registrado(s)
                  </p>
                </div>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {reportData.expenses.details.map((expense, index) => {
                  const percentage = reportData.expenses.total > 0 
                    ? (expense.amountCents / reportData.expenses.total) * 100 
                    : 0;
                  
                  return (
                    <div
                      key={expense.typeId}
                      className="group relative p-4 bg-gradient-to-r from-red-50/50 to-rose-50/50 rounded-xl border border-red-200/60 hover:shadow-md hover:border-red-300 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div 
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0"
                            style={{ backgroundColor: EXPENSE_COLORS[index % EXPENSE_COLORS.length] }}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate">
                              {expense.typeName}
                            </p>
                            <p className="text-xs text-slate-600">
                              {expense.count} despesa(s)
                            </p>
                          </div>
                        </div>
                        <div className="text-right ml-3 shrink-0">
                          <p className="text-lg font-bold text-slate-900">
                            {formatCurrency(expense.amountCents)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-red-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: EXPENSE_COLORS[index % EXPENSE_COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-600">Total de Despesas:</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(reportData.expenses.total)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
