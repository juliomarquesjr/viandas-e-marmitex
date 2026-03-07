"use client";

import { ReportLoading } from '@/app/components/ReportLoading';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

interface TeleDeliverySale {
  id: string;
  date: string;
  quantity: number;
  priceCents: number;
  totalCents: number;
}

interface TeleDeliveryByDay {
  date: string;
  quantity: number;
  totalCents: number;
}

interface TeleDeliveryData {
  summary: {
    totalSales: number;
    totalAmountCents: number;
    averageAmountCents: number;
    totalDays: number;
  };
  salesByDay: TeleDeliveryByDay[];
  period: {
    startDate: string;
    endDate: string;
  };
}

function TeleDeliveryA4Content() {
  const searchParams = useSearchParams();
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  const [data, setData] = useState<TeleDeliveryData | null>(null);
  const [systemTitle, setSystemTitle] = useState<string>('Viandas e Marmitex');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!startDateParam || !endDateParam) {
        setError('Parâmetros de data não fornecidos');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const [teleDeliveryResponse, configResponse] = await Promise.all([
          fetch(`/api/tele-delivery-summary?startDate=${startDateParam}&endDate=${endDateParam}`),
          fetch('/api/config')
        ]);

        if (!teleDeliveryResponse.ok) {
          throw new Error('Falha ao carregar dados de tele entrega');
        }

        const teleDeliveryData = await teleDeliveryResponse.json();
        setData(teleDeliveryData);

        // Processar título do sistema
        if (configResponse.ok) {
          const configs = await configResponse.json();
          const brandingConfigs = configs.filter((config: any) => config.category === 'branding');
          
          const systemTitleConfig = brandingConfigs.find((c: any) => c.key === 'branding_system_title');
          if (systemTitleConfig?.value) {
            setSystemTitle(systemTitleConfig.value);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [startDateParam, endDateParam]);

  // Auto print when page loads
  useEffect(() => {
    if (data && !loading && !error) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [data, loading, error]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <ReportLoading title="Carregando dados de tele entrega..." subtitle="Processando..." />;
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Erro</h2>
          <p className="text-red-600">{error || 'Dados não encontrados'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="print-container">
      {/* Cabeçalho do relatório */}
      <div className="border-b-2 border-gray-800 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {systemTitle}
          </h1>
          <h2 className="text-lg font-semibold text-gray-700 mt-2">
            RELATÓRIO DE TELE ENTREGA
          </h2>
          <div className="mt-4 text-sm text-gray-600">
            <p>Período: {formatDate(data.period.startDate)} a {formatDate(data.period.endDate)}</p>
          </div>
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="p-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Resumo Geral
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total de Vendas</p>
            <p className="text-xl font-bold text-blue-600">
              {data.summary.totalSales}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total de Dias</p>
            <p className="text-xl font-bold text-purple-600">
              {data.summary.totalDays}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Valor Total</p>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(data.summary.totalAmountCents)}
            </p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Valor Médio</p>
            <p className="text-xl font-bold text-orange-600">
              {formatCurrency(data.summary.averageAmountCents)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabela de Vendas por Dia */}
      {data.salesByDay.length > 0 && (
        <div className="p-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Detalhamento por Dia
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-800">
                  <th className="text-left py-3 font-medium text-gray-700">Data</th>
                  <th className="text-right py-3 font-medium text-gray-700">Qtd</th>
                  <th className="text-right py-3 font-medium text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.salesByDay.map((day) => (
                  <tr key={day.date} className="border-b border-gray-200">
                    <td className="py-3 text-gray-600">
                      {formatDate(day.date)}
                    </td>
                    <td className="py-3 text-gray-600 text-right">
                      {day.quantity}
                    </td>
                    <td className="py-3 text-gray-600 text-right font-semibold">
                      {formatCurrency(day.totalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-800 bg-gray-50">
                  <td className="py-3 font-semibold text-gray-800">
                    TOTAL
                  </td>
                  <td className="py-3 text-right font-semibold text-gray-800">
                    {data.summary.totalSales}
                  </td>
                  <td className="py-3 text-right font-bold text-gray-900 text-lg">
                    {formatCurrency(data.summary.totalAmountCents)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Rodapé */}
      <div className="p-6 border-t border-gray-200">
        <div className="text-center text-sm text-gray-600">
          <p>Relatório gerado em {new Date().toLocaleString('pt-BR')}</p>
          <p className="mt-1">Total de dias com vendas: {data.salesByDay.length}</p>
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

      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }

          .no-print {
            display: none !important;
          }

          .print-container {
            box-shadow: none !important;
            max-width: none !important;
            margin: 0 !important;
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

export default function TeleDeliveryA4Page() {
  return (
    <Suspense fallback={<ReportLoading title="Carregando..." subtitle="Processando..." />}>
      <TeleDeliveryA4Content />
    </Suspense>
  );
}
