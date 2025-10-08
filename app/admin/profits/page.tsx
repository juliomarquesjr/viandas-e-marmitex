"use client";

import {
    BarChart3,
    DollarSign,
    TrendingDown,
    TrendingUp
} from "lucide-react";
import { useEffect, useState } from "react";
import { ProfitReportData } from "../../../lib/types";
import { useToast } from "../../components/Toast";
import { AnimatedCard } from "../../components/ui/animated-card";
import { Button } from "../../components/ui/button";
import { GenerateProfitReportDialog } from "./components/GenerateProfitReportDialog";

// Função para formatar moeda
const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
};

// Função para formatar data
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("pt-BR");
};

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

   return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Gerenciamento de Lucros
          </h1>
          <p className="text-muted-foreground">
            Análise de receitas, despesas e lucros por período
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
          {/* Resumo Geral - KPI Cards */}
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
                    <p className={`text-2xl font-bold ${
                      reportData.profit.total >= 0
                        ? "text-slate-900"
                        : "text-slate-900"
                    }`}>
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

          {/* Detalhes das Despesas */}
          {reportData.expenses.details.length > 0 && (
            <div className="bg-white/98 border border-slate-200/40 rounded-2xl p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800">Despesas por Tipo</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Breakdown das despesas no período selecionado
                </p>
              </div>
              <div className="space-y-3">
                {reportData.expenses.details.map((expense, index) => (
                  <div
                    key={expense.typeId}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-slate-200/60 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-3 w-3 bg-gradient-to-br from-orange-400 to-red-500 rounded-full shadow-sm" />
                      <div>
                        <p className="font-semibold text-slate-900">{expense.typeName}</p>
                        <p className="text-sm text-slate-600">
                          {expense.count} despesa(s)
                        </p>
                      </div>
                    </div>
                    <div className="px-4 py-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <p className="text-lg font-bold text-slate-900">
                        {formatCurrency(expense.amountCents)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Breakdown Diário */}
          {reportData.dailyBreakdown && Array.isArray(reportData.dailyBreakdown) && reportData.dailyBreakdown.length > 0 && (
            <div className="bg-white/98 border border-slate-200/40 rounded-2xl p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800">Receitas por Dia</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Detalhamento das receitas no período
                </p>
              </div>
              <div className="space-y-3">
                {reportData.dailyBreakdown.slice(0, 10).map((day: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200/60 hover:shadow-md transition-all duration-200"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {formatDate(day.date)}
                      </p>
                      <p className="text-sm text-slate-600">
                        Vendas: {formatCurrency(Number(day.sales_revenue || 0))} | 
                        Fichas: {formatCurrency(Number(day.ficha_revenue || 0))}
                      </p>
                    </div>
                    <div className="px-4 py-2 bg-white rounded-lg border border-blue-200 shadow-sm">
                      <p className="text-lg font-bold text-slate-900">
                        {formatCurrency(Number(day.sales_revenue || 0) + Number(day.ficha_revenue || 0))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                  {formatDate(reportData.period.endDate)}
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
            Clique em "Gerar Relatório" para ver a análise de lucros
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
