import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, PieChart, Pie, Cell } from "recharts";
import { ProfitReportData } from "../../../../lib/types";
import { ChartLoading } from "../../../components/ChartLoading";
import { Card, CardContent } from "../../../components/ui/card";
import { formatCurrency, formatDateShort, EXPENSE_COLORS } from "../utils";

interface ProfitChartsProps {
  reportData: ProfitReportData;
}

export function ProfitCharts({ reportData }: ProfitChartsProps) {
  const chartData = reportData.dailyChartData?.map((day) => ({
    date: formatDateShort(day.date),
    receita: day.total_revenue / 100,
    despesas: day.expenses / 100,
    lucro: day.profit / 100,
  })) || [];

  const expensePieData = reportData.expenses.details.map((expense) => ({
    name: expense.typeName,
    value: expense.amountCents / 100,
  })) || [];

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Evolução Diária</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Receitas, despesas e lucros ao longo do período
            </p>
          </div>
          {chartData.length > 0 ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={false}
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => `R$ ${value.toFixed(0)}`}
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value * 100)}
                    labelStyle={{ color: "#0f172a", fontWeight: 500 }}
                  />
                  <Legend />
                  <Bar dataKey="receita" fill="#22C55E" name="Receita" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="despesas" fill="#EF4444" name="Despesas" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="lucro" fill="#3B82F6" name="Lucro" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <ChartLoading message="Carregando dados do gráfico..." />
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Despesas por Tipo */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Despesas por Tipo</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Distribuição percentual das despesas
            </p>
          </div>
          {expensePieData.length > 0 ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expensePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value * 100)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-slate-500">
              Nenhuma despesa registrada
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
