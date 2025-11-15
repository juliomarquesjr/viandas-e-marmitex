"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ProfitReportData } from '@/lib/types';
import { ReportLoading } from '@/app/components/ReportLoading';

function ProfitReportA4Content() {
  const searchParams = useSearchParams();
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const [reportData, setReportData] = useState<ProfitReportData | null>(null);
  const [systemTitle, setSystemTitle] = useState<string>('COMIDA CASEIRA');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!startDate || !endDate) {
        setError('Período não fornecido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const params = new URLSearchParams({
          startDate,
          endDate,
        });

        const [reportResponse, configResponse] = await Promise.all([
          fetch(`/api/reports/profits?${params.toString()}`),
          fetch('/api/config')
        ]);

        if (!reportResponse.ok) {
          throw new Error('Falha ao carregar relatório');
        }

        const data = await reportResponse.json();
        setReportData(data);

        // Processar título do sistema
        if (configResponse.ok) {
          const configs = await configResponse.json();
          const brandingConfigs = configs.filter((config: any) => config.category === 'branding');
          
          const systemTitleConfig = brandingConfigs.find((c: any) => c.key === 'branding_system_title');
          if (systemTitleConfig?.value) {
            setSystemTitle(systemTitleConfig.value.toUpperCase());
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [startDate, endDate]);

  // Auto print when page loads
  useEffect(() => {
    if (reportData && !loading && !error) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [reportData, loading, error]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <ReportLoading 
        title="Gerando Relatório de Lucros"
        subtitle="Processando dados financeiros..."
      />
    );
  }

  if (error || !reportData) {
    return (
      <div className="w-full">
        <div className="text-center py-8 text-red-600">
          <div className="text-lg mb-2">Erro ao carregar relatório</div>
          <div className="text-sm">{error || 'Dados não encontrados'}</div>
        </div>
      </div>
    );
  }

  const { period, revenue, expenses, profit, dailyBreakdown } = reportData;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-left mb-3 border-b border-gray-300 pb-2">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          RELATÓRIO DE LUCROS
        </h1>
        <div className="text-base text-gray-600 mb-2">
          {systemTitle}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>Período: {formatDate(period.startDate)} a {formatDate(period.endDate)}</span>
          <span>•</span>
          <span>Gerado em: {formatDateTime(new Date().toISOString())}</span>
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="mb-3 avoid-break">
        <h2 className="text-base font-semibold mb-2 text-gray-800 border-b pb-1">
          Resumo Geral
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-green-50 p-3 rounded border border-green-200">
            <div className="text-xs text-gray-600 mb-1">Total de Receitas</div>
            <div className="text-lg font-bold text-green-700">
              {formatCurrency(revenue.total)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Vendas: {formatCurrency(revenue.sales)}
            </div>
            <div className="text-xs text-gray-600">
              Fichas: {formatCurrency(revenue.fichaPayments)}
            </div>
          </div>
          
          <div className="bg-red-50 p-3 rounded border border-red-200">
            <div className="text-xs text-gray-600 mb-1">Total de Despesas</div>
            <div className="text-lg font-bold text-red-700">
              {formatCurrency(expenses.total)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {expenses.details.length} tipo(s) de despesa
            </div>
          </div>
          
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <div className="text-xs text-gray-600 mb-1">Lucro Líquido</div>
            <div className="text-lg font-bold text-blue-700">
              {formatCurrency(profit.total)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {profit.percentage >= 0 ? 'Margem positiva' : 'Margem negativa'}
            </div>
          </div>
          
          <div className="bg-purple-50 p-3 rounded border border-purple-200">
            <div className="text-xs text-gray-600 mb-1">Margem de Lucro</div>
            <div className="text-lg font-bold text-purple-700">
              {profit.percentage.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {profit.percentage >= 0 ? 'Lucrativo' : 'Prejuízo'}
            </div>
          </div>
        </div>
      </div>

      {/* Despesas por Tipo */}
      {expenses.details.length > 0 && (
        <div className="mb-3 avoid-break">
          <h2 className="text-base font-semibold mb-2 text-gray-800 border-b pb-1">
            Despesas por Tipo
          </h2>
          <div className="border border-gray-300 rounded">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left border-b border-gray-300">Tipo de Despesa</th>
                  <th className="p-2 text-center border-b border-gray-300">Quantidade</th>
                  <th className="p-2 text-right border-b border-gray-300">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {expenses.details.map((expense) => (
                  <tr key={expense.typeId} className="border-b border-gray-200">
                    <td className="p-2">{expense.typeName}</td>
                    <td className="p-2 text-center">{expense.count}</td>
                    <td className="p-2 text-right font-medium">
                      {formatCurrency(expense.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={2} className="p-2 text-right">
                    TOTAL:
                  </td>
                  <td className="p-2 text-right text-lg">
                    {formatCurrency(expenses.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Breakdown Diário */}
      {dailyBreakdown && dailyBreakdown.length > 0 && (
        <div className="mb-3 avoid-break">
          <h2 className="text-base font-semibold mb-2 text-gray-800 border-b pb-1">
            Receitas por Dia
          </h2>
          <div className="border border-gray-300 rounded">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left border-b border-gray-300">Data</th>
                  <th className="p-2 text-right border-b border-gray-300">Vendas</th>
                  <th className="p-2 text-right border-b border-gray-300">Fichas</th>
                  <th className="p-2 text-right border-b border-gray-300">Total</th>
                </tr>
              </thead>
              <tbody>
                {dailyBreakdown.map((day: any, index: number) => {
                  const sales = Number(day.sales_revenue || 0);
                  const fichas = Number(day.ficha_revenue || 0);
                  const total = sales + fichas;
                  return (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="p-2">{formatDate(day.date)}</td>
                      <td className="p-2 text-right">{formatCurrency(sales)}</td>
                      <td className="p-2 text-right">{formatCurrency(fichas)}</td>
                      <td className="p-2 text-right font-medium">{formatCurrency(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={3} className="p-2 text-right">
                    TOTAL GERAL:
                  </td>
                  <td className="p-2 text-right text-lg">
                    {formatCurrency(revenue.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Análise */}
      <div className="mb-3 avoid-break">
        <h2 className="text-base font-semibold mb-2 text-gray-800 border-b pb-1">
          Análise do Período
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 bg-gray-50 rounded border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Média Diária de Receitas</div>
            <div className="text-base font-semibold text-gray-900">
              {formatCurrency(revenue.total / (dailyBreakdown?.length || 1))}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Média Diária de Despesas</div>
            <div className="text-base font-semibold text-gray-900">
              {formatCurrency(expenses.total / (dailyBreakdown?.length || 1))}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Média Diária de Lucro</div>
            <div className="text-base font-semibold text-gray-900">
              {formatCurrency(profit.total / (dailyBreakdown?.length || 1))}
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded border border-gray-200">
            <div className="text-xs text-gray-600 mb-1">Dias com Movimentação</div>
            <div className="text-base font-semibold text-gray-900">
              {dailyBreakdown?.length || 0} dia(s)
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-gray-300 text-center text-xs text-gray-500">
        <div>Gerado em: {formatDateTime(new Date().toISOString())}</div>
        <div className="mt-1">
          Período: {formatDate(period.startDate)} a {formatDate(period.endDate)}
        </div>
      </div>

      {/* Print button for screen view */}
      <div className="no-print mt-6 text-center">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Imprimir Relatório
        </button>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 20px;
          }
          
          .no-print {
            display: none !important;
          }
          
          .avoid-break {
            page-break-inside: avoid;
          }
          
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}

export default function ProfitReportA4Page() {
  return (
    <Suspense fallback={
      <ReportLoading 
        title="Carregando Relatório"
        subtitle="Aguarde um momento..."
      />
    }>
      <ProfitReportA4Content />
    </Suspense>
  );
}

