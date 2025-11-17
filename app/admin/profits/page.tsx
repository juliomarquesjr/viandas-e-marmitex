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
import { AnimatedCard } from "../../components/ui/animated-card";
import { Button } from "../../components/ui/button";
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
  // For date strings in YYYY-MM-DD format, parse directly to avoid timezone conversion
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number);
    // Create date in local timezone
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  // For datetime strings, use the date as is
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

  // Evitar hydration mismatch (datas) e inicializar somente no cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  // Gerar relatório
  const handleGenerateReport = async (startDate: string, endDate: string) => {
    if (!startDate || !endDate) {
      showToast("Por favor, selecione as datas inicial e final", "error");
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

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

  if (!mounted) {
    return null;
  }

  // Preparar dados para gráficos
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
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Gerenciamento de Lucros
          </h1>
          <p className="text-muted-foreground">
            Análise completa de receitas, despesas e lucros por período
          </p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90" 
          onClick={() => setIsDialogOpen(true)}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Gerar Relatório
        </Button>
      </div>

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
              className="border-slate-300 hover:bg-slate-50"
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
              className="border-slate-300 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir A4
            </Button>
          </div>

          {/* KPIs Principais */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Receitas */}
            <div className="group relative overflow-hidden border border-slate-200/40 bg-white/98 shadow-sm hover:shadow-md rounded-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50/80 to-emerald-50/40" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-400" />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-600">Total Receitas</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(reportData.revenue.total)}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <p className="text-xs text-green-600 font-medium">
                        Vendas: {formatCurrency(reportData.revenue.sales)}
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 shadow-md group-hover:scale-105 transition-all duration-300">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl opacity-10 group-hover:opacity-20 transition-opacity duration-300 blur-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Total Despesas */}
            <div className="group relative overflow-hidden border border-slate-200/40 bg-white/98 shadow-sm hover:shadow-md rounded-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-red-50/80 to-rose-50/40" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-rose-400" />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-600">Total Despesas</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(reportData.expenses.total)}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      <p className="text-xs text-red-600 font-medium">
                        {reportData.expenses.details.length} tipo(s) de despesa
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-400 to-rose-500 shadow-md group-hover:scale-105 transition-all duration-300">
                      <TrendingDown className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-400 to-rose-500 rounded-xl opacity-10 group-hover:opacity-20 transition-opacity duration-300 blur-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Lucro Líquido */}
            <div className="group relative overflow-hidden border border-slate-200/40 bg-white/98 shadow-sm hover:shadow-md rounded-2xl transition-all duration-300">
              <div className={`absolute inset-0 ${
                reportData.profit.total >= 0
                  ? "bg-gradient-to-br from-blue-50/80 to-cyan-50/40"
                  : "bg-gradient-to-br from-orange-50/80 to-amber-50/40"
              }`} />
              <div className={`absolute top-0 left-0 w-full h-1 ${
                reportData.profit.total >= 0
                  ? "bg-gradient-to-r from-blue-400 to-cyan-400"
                  : "bg-gradient-to-r from-orange-400 to-amber-400"
              }`} />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-600">Lucro Líquido</p>
                    <p className={`text-2xl font-bold text-slate-900`}>
                      {formatCurrency(reportData.profit.total)}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${
                        reportData.profit.total >= 0 ? "bg-blue-500" : "bg-orange-500"
                      }`} />
                      <p className={`text-xs font-medium ${
                        reportData.profit.total >= 0 ? "text-blue-600" : "text-orange-600"
                      }`}>
                        {reportData.profit.percentage.toFixed(2)}% da receita
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-md group-hover:scale-105 transition-all duration-300 ${
                      reportData.profit.total >= 0
                        ? "bg-gradient-to-br from-blue-400 to-cyan-500"
                        : "bg-gradient-to-br from-orange-400 to-amber-500"
                    }`}>
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <div className={`absolute -inset-1 rounded-xl opacity-10 group-hover:opacity-20 transition-opacity duration-300 blur-sm ${
                      reportData.profit.total >= 0
                        ? "bg-gradient-to-r from-blue-400 to-cyan-500"
                        : "bg-gradient-to-r from-orange-400 to-amber-500"
                    }`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Margem */}
            <div className="group relative overflow-hidden border border-slate-200/40 bg-white/98 shadow-sm hover:shadow-md rounded-2xl transition-all duration-300">
              <div className={`absolute inset-0 ${
                reportData.profit.percentage >= 0
                  ? "bg-gradient-to-br from-purple-50/80 to-violet-50/40"
                  : "bg-gradient-to-br from-gray-50/80 to-slate-50/40"
              }`} />
              <div className={`absolute top-0 left-0 w-full h-1 ${
                reportData.profit.percentage >= 0
                  ? "bg-gradient-to-r from-purple-400 to-violet-400"
                  : "bg-gradient-to-r from-gray-400 to-slate-400"
              }`} />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-600">Margem de Lucro</p>
                    <p className={`text-2xl font-bold text-slate-900`}>
                      {reportData.profit.percentage.toFixed(2)}%
                    </p>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${
                        reportData.profit.percentage >= 0 ? "bg-purple-500" : "bg-gray-500"
                      }`} />
                      <p className={`text-xs font-medium ${
                        reportData.profit.percentage >= 0 ? "text-purple-600" : "text-gray-600"
                      }`}>
                        {reportData.profit.percentage >= 0 ? "Margem positiva" : "Margem negativa"}
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-md group-hover:scale-105 transition-all duration-300 ${
                      reportData.profit.percentage >= 0
                        ? "bg-gradient-to-br from-purple-400 to-violet-500"
                        : "bg-gradient-to-br from-gray-400 to-slate-500"
                    }`}>
                      <BarChart3 className="h-6 w-6 text-white" />
                    </div>
                    <div className={`absolute -inset-1 rounded-xl opacity-10 group-hover:opacity-20 transition-opacity duration-300 blur-sm ${
                      reportData.profit.percentage >= 0
                        ? "bg-gradient-to-r from-purple-400 to-violet-500"
                        : "bg-gradient-to-r from-gray-400 to-slate-500"
                    }`} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Métricas Adicionais */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {/* Total de Pedidos */}
            <div className="group relative overflow-hidden border border-slate-200/40 bg-white/98 shadow-sm hover:shadow-md rounded-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 to-blue-50/40" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-blue-400" />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-600">Total de Pedidos</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {reportData.metrics.totalOrders}
                    </p>
                    <p className="text-xs text-slate-500">
                      Pedidos confirmados
                    </p>
                  </div>
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-blue-500 shadow-md group-hover:scale-105 transition-all duration-300">
                      <ShoppingCart className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Médio */}
            <div className="group relative overflow-hidden border border-slate-200/40 bg-white/98 shadow-sm hover:shadow-md rounded-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50/80 to-yellow-50/40" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-yellow-400" />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-600">Ticket Médio</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(reportData.metrics.averageTicket)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Por pedido
                    </p>
                  </div>
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 shadow-md group-hover:scale-105 transition-all duration-300">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Receita Média Diária */}
            <div className="group relative overflow-hidden border border-slate-200/40 bg-white/98 shadow-sm hover:shadow-md rounded-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-50/80 to-cyan-50/40" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-cyan-400" />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-600">Receita Média Diária</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(reportData.metrics.averageDailyRevenue)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {reportData.period.days} dias analisados
                    </p>
                  </div>
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 shadow-md group-hover:scale-105 transition-all duration-300">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Despesa Média Diária */}
            <div className="group relative overflow-hidden border border-slate-200/40 bg-white/98 shadow-sm hover:shadow-md rounded-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-50/80 to-rose-50/40" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 to-rose-400" />
              <div className="relative p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-600">Despesa Média Diária</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(reportData.metrics.averageDailyExpenses)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Por dia
                    </p>
                  </div>
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 shadow-md group-hover:scale-105 transition-all duration-300">
                      <TrendingDown className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico de Evolução Diária - Linha Completa */}
          <div className="bg-white/98 border border-slate-200/40 rounded-2xl p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800">Evolução Diária</h3>
              <p className="text-sm text-slate-600 mt-1">
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
                    <Bar 
                      dataKey="receita" 
                      fill="#22C55E" 
                      name="Receita"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar 
                      dataKey="despesas" 
                      fill="#EF4444" 
                      name="Despesas"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar 
                      dataKey="lucro" 
                      fill="#3B82F6" 
                      name="Lucro"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <ChartLoading message="Carregando dados do gráfico..." />
            )}
          </div>

          {/* Despesas por Tipo e Top 5 Dias Mais Lucrativos - Lado a Lado */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Gráfico de Despesas por Tipo */}
            <div className="bg-white/98 border border-slate-200/40 rounded-2xl p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800">Despesas por Tipo</h3>
                <p className="text-sm text-slate-600 mt-1">
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
            </div>

            {/* Top 5 Dias Mais Lucrativos */}
            {reportData.topDays && reportData.topDays.length > 0 && (
              <div className="bg-white/98 border border-slate-200/40 rounded-2xl p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-sm">
                    <Award className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Top 5 Dias Mais Lucrativos</h3>
                    <p className="text-sm text-slate-600 mt-1">
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
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white font-bold shadow-sm">
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
              </div>
            )}
          </div>

          {/* Receitas por Dia e Despesas por Tipo - Lado a Lado */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Receitas por Dia */}
            {reportData.dailyBreakdown && Array.isArray(reportData.dailyBreakdown) && reportData.dailyBreakdown.length > 0 && (
              <div className="bg-white/98 border border-slate-200/40 rounded-2xl p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-sm">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Receitas por Dia</h3>
                    <p className="text-sm text-slate-600 mt-1">
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
                            <div>
                              <p className="font-semibold text-slate-900 text-sm">
                                {formatDate(day.date)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-900">
                              {formatCurrency(totalDay)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Barra de progresso visual */}
                        <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full transition-all duration-300 group-hover:from-blue-500 group-hover:to-cyan-600"
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
              </div>
            )}

            {/* Despesas por Tipo */}
            {reportData.expenses.details.length > 0 && (
              <div className="bg-white/98 border border-slate-200/40 rounded-2xl p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-sm">
                    <TrendingDown className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Despesas por Tipo</h3>
                    <p className="text-sm text-slate-600 mt-1">
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
                              className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0"
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
                          <div className="text-right ml-3 flex-shrink-0">
                            <p className="text-lg font-bold text-slate-900">
                              {formatCurrency(expense.amountCents)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {percentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        
                        {/* Barra de progresso visual */}
                        <div className="w-full h-2 bg-red-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300 group-hover:opacity-90"
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
                
                {/* Resumo total */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-600">Total de Despesas:</p>
                    <p className="text-xl font-bold text-red-600">
                      {formatCurrency(reportData.expenses.total)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Período */}
          <div className="bg-white/98 border border-slate-200/40 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-sm">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Período analisado:</p>
                <p className="font-bold text-slate-900">
                  {formatDate(reportData.period.startDate)} até{" "}
                  {formatDate(reportData.period.endDate)} ({reportData.period.days} dias)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estado inicial */}
      {!reportData && !loading && (
        <AnimatedCard className="p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            Nenhum relatório gerado
          </h3>
          <p className="text-muted-foreground mb-4">
            Clique em "Gerar Relatório" para ver a análise completa de lucros
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Gerar Primeiro Relatório
          </Button>
        </AnimatedCard>
      )}

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
