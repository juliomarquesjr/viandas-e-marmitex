"use client";

import { BarChart3, Printer, Calendar, BarChart } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "../../components/Toast";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { PageHeader } from "../components/layout";
import { GenerateProfitReportDialog } from "./components/GenerateProfitReportDialog";

// Custom Hooks e Subcomponentes
import { useProfitData } from "./hooks/useProfitData";
import { ProfitMetrics } from "./components/ProfitMetrics";
import { ProfitCharts } from "./components/ProfitCharts";
import { ProfitLists } from "./components/ProfitLists";
import { ProfitEmptyState } from "./components/ProfitEmptyState";
import { formatDate } from "./utils";

export default function ProfitsPage() {
  const [mounted, setMounted] = useState(false);
  const { showToast } = useToast();
  
  const { 
    reportData, 
    loading, 
    isDialogOpen, 
    setIsDialogOpen, 
    fetchReport 
  } = useProfitData({ showToast });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

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
            {/* Ações / Botões de Impressão */}
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

            {/* Componente 1: Métricas / KPIs */}
            <ProfitMetrics reportData={reportData} />

            {/* Componente 2: Gráficos Visuais */}
            <ProfitCharts reportData={reportData} />

            {/* Componente 3: Listas Detalhadas e Top 5 */}
            <ProfitLists reportData={reportData} />

            {/* Informação do Período */}
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

        {/* Estado inicial / Sem Relatório */}
        {!reportData && !loading && (
          <ProfitEmptyState onOpenDialog={() => setIsDialogOpen(true)} />
        )}
      </div>

      {/* Diálogo de Geração de Relatório */}
      <GenerateProfitReportDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onGenerate={fetchReport}
        isLoading={loading}
      />
    </div>
  );
}
