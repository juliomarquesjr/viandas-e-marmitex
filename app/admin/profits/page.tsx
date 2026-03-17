"use client";

import {
    BarChart3,
    DollarSign,
    TrendingDown,
    TrendingUp,
    Printer,
    ShoppingCart,
    Calendar,
    Target,
    Award
} from "lucide-react";
import { useEffect, useState } from "react";
import { ProfitReportData } from "../../../lib/types";
import { useToast } from "../../components/Toast";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { PageHeader } from "../components/layout";
import { GenerateProfitReportDialog } from "./components/GenerateProfitReportDialog";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { ChartLoading } from "../../components/ChartLoading";

// Função para formatar moeda
const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
};

// Função para formatar data
const formatDate = (dateString: string) => {
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Função para formatar data curta (apenas dia/mês)
const formatDateShort = (dateString: string) => {
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  }
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  });
};

// Cores para gráfico de pizza
const EXPENSE_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899'
];

export default function ProfitsPage() {
  const [reportData, setReportData] = useState<ProfitReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGenerateReport = async (startDate: string, endDate: string) => {
    if (!startDate || !endDate) {
      showToast("Por favor, selecione as datas inicial e final", "error");
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`/api/reports/profits?${params}`);
      if (!response.ok) throw new Error("Failed to generate report");
      const data = await response.json();
      setReportData(data);
      setIsDialogOpen(false);
      showToast("Relatório gerado com sucesso!", "success");
    } catch (error) {
      console.error("Error generating report:", error);
      showToast("Erro ao gerar relatório", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const chartData = reportData?.dailyChartData?.map((day) => ({
    date: formatDateShort(day.date),
    receita: day.total_revenue / 100,
    despesas: day.expenses / 100,
    lucro: day.profit / 100,
  })) || [];

  const expensePieData = reportData?.expenses.details.map((expense) => ({
    name: expense.typeName,
    value: expense.amountCents / 100,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <PageHeader
        title="Lucros"
        description="Análise completa de receitas, despesas e lucros por período"
        icon={BarChart3}
        actions={
          <Button onClick={() => setIsDialogOpen(true)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Gerar Relatório
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Relatório */}
        {reportData && (
          <div className="space-y-6">
            {/* Botões de Impressão */}
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  const url = `/print/profit-report-thermal?startDate=${reportData.period.startDate}&endDate=${reportData.period.endDate}`;
                  window.open(url, '_blank');
                }}
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir Térmica
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const url = `/print/profit-report-a4?startDate=${reportData.period.startDate}&endDate=${reportData.period.endDate}`;
                  window.open(url, '_blank');
                }}
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir A4
              </Button>
            </div>

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

            {/* Gráfico de Evolução Diária */}
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

            {/* Despesas por Tipo (Pizza) e Top 5 Dias */}
            <div className="grid gap-6 lg:grid-cols-2">
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

              {/* Top 5 Dias Mais Lucrativos */}
              {reportData.topDays && reportData.topDays.length > 0 && (
                <Card>
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

            {/* Receitas por Dia e Despesas por Tipo - Lado a Lado */}
            <div className="grid gap-6 lg:grid-cols-2">
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
                        <h3 className="text-lg font-semibold text-slate-900">Despesas por Tipo</h3>
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

            {/* Período */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Período analisado:</p>
                    <p className="font-semibold text-slate-900">
                      {formatDate(reportData.period.startDate)} até{" "}
                      {formatDate(reportData.period.endDate)} ({reportData.period.days} dias)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Estado inicial */}
        {!reportData && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Nenhum relatório gerado
              </h3>
              <p className="text-slate-500 mb-4">
                Clique em "Gerar Relatório" para ver a análise completa de lucros
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Gerar Primeiro Relatório
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Diálogo de Geração de Relatório */}
      <GenerateProfitReportDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onGenerate={handleGenerateReport}
        isLoading={loading}
      />
    </div>
  );
}
