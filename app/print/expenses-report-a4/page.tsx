"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ExpenseWithRelations } from '@/lib/types';
import { ReportLoading } from '@/app/components/ReportLoading';

function ExpensesReportA4Content() {
  const searchParams = useSearchParams();
  const supplierTypeIds = searchParams.get('supplierTypeIds');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const [expenses, setExpenses] = useState<ExpenseWithRelations[]>([]);
  const [systemTitle, setSystemTitle] = useState<string>('COMIDA CASEIRA');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!supplierTypeIds || !startDate || !endDate) {
        setError('Parâmetros não fornecidos');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Buscar despesas para cada fornecedor
        const supplierIds = supplierTypeIds.split(',');
        const allExpenses: ExpenseWithRelations[] = [];

        // Buscar despesas para cada fornecedor selecionado
        for (const supplierId of supplierIds) {
          const params = new URLSearchParams({
            supplierTypeId: supplierId.trim(),
            startDate,
            endDate,
            limit: '10000', // Limite alto para pegar todas as despesas
          });

          const response = await fetch(`/api/expenses?${params.toString()}`);
          if (!response.ok) {
            throw new Error('Falha ao carregar despesas');
          }

          const data = await response.json();
          allExpenses.push(...data.expenses);
        }

        // Remover duplicatas (caso haja) e ordenar por data
        const uniqueExpenses = Array.from(
          new Map(allExpenses.map(exp => [exp.id, exp])).values()
        );
        
        uniqueExpenses.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA; // Mais recente primeiro
        });

        setExpenses(uniqueExpenses);

        // Buscar título do sistema
        const configResponse = await fetch('/api/config');
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
  }, [supplierTypeIds, startDate, endDate]);

  // Auto print when page loads
  useEffect(() => {
    if (expenses.length > 0 && !loading && !error) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [expenses, loading, error]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const formatDate = (dateString: string | Date) => {
    // Se for string no formato YYYY-MM-DD, parsear manualmente para evitar problemas de timezone
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('pt-BR', {
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

  // Agrupar despesas por fornecedor
  const groupBySupplier = (expensesList: ExpenseWithRelations[]) => {
    const grouped: { [key: string]: ExpenseWithRelations[] } = {};
    
    expensesList.forEach(expense => {
      const supplierName = expense.supplierType.name;
      if (!grouped[supplierName]) {
        grouped[supplierName] = [];
      }
      grouped[supplierName].push(expense);
    });

    // Ordenar fornecedores alfabeticamente
    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
  };

  if (loading) {
    return (
      <ReportLoading 
        title="Gerando Relatório de Despesas"
        subtitle="Processando dados financeiros..."
      />
    );
  }

  if (error || !expenses) {
    return (
      <div className="w-full">
        <div className="text-center py-8 text-red-600">
          <div className="text-lg mb-2">Erro ao carregar relatório</div>
          <div className="text-sm">{error || 'Dados não encontrados'}</div>
        </div>
      </div>
    );
  }

  const groupedExpenses = groupBySupplier(expenses);
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amountCents, 0);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-left mb-3 border-b border-gray-300 pb-2">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          RELATÓRIO DE DESPESAS
        </h1>
        <div className="text-base text-gray-600 mb-2">
          {systemTitle}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>Período: {formatDate(startDate!)} a {formatDate(endDate!)}</span>
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
          <div className="bg-red-50 p-3 rounded border border-red-200">
            <div className="text-xs text-gray-600 mb-1">Total de Despesas</div>
            <div className="text-lg font-bold text-red-700">
              {formatCurrency(totalAmount)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {expenses.length} despesa(s) registrada(s)
            </div>
          </div>
          
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <div className="text-xs text-gray-600 mb-1">Fornecedores</div>
            <div className="text-lg font-bold text-blue-700">
              {groupedExpenses.length}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Fornecedor(es) no período
            </div>
          </div>
        </div>
      </div>

      {/* Despesas Agrupadas por Fornecedor */}
      {groupedExpenses.map(([supplierName, supplierExpenses], index) => {
        const supplierTotal = supplierExpenses.reduce((sum, exp) => sum + exp.amountCents, 0);
        
        return (
          <div key={supplierName} className="mb-3 avoid-break">
            <h2 className="text-base font-semibold mb-2 text-gray-800 border-b pb-1">
              {supplierName}
            </h2>
            <div className="border border-gray-300 rounded">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left border-b border-gray-300">Data</th>
                    <th className="p-2 text-left border-b border-gray-300">Descrição</th>
                    <th className="p-2 text-left border-b border-gray-300">Tipo</th>
                    <th className="p-2 text-right border-b border-gray-300">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierExpenses.map((expense) => (
                    <tr key={expense.id} className="border-b border-gray-200">
                      <td className="p-2">{formatDate(expense.date)}</td>
                      <td className="p-2">{expense.description}</td>
                      <td className="p-2">{expense.type.name}</td>
                      <td className="p-2 text-right font-medium">
                        {formatCurrency(expense.amountCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={3} className="p-2 text-right">
                      TOTAL {supplierName.toUpperCase()}:
                    </td>
                    <td className="p-2 text-right text-lg">
                      {formatCurrency(supplierTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}

      {/* Total Geral */}
      <div className="mb-3 avoid-break">
        <div className="border-2 border-gray-800 rounded p-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-gray-900">TOTAL GERAL DO RELATÓRIO:</span>
            <span className="text-xl font-bold text-red-700">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-gray-300 text-center text-xs text-gray-500">
        <div>Gerado em: {formatDateTime(new Date().toISOString())}</div>
        <div className="mt-1">
          Período: {formatDate(startDate!)} a {formatDate(endDate!)}
        </div>
        <div className="mt-1">
          Total de {expenses.length} despesa(s) de {groupedExpenses.length} fornecedor(es)
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

export default function ExpensesReportA4Page() {
  return (
    <Suspense fallback={
      <ReportLoading 
        title="Carregando Relatório"
        subtitle="Aguarde um momento..."
      />
    }>
      <ExpensesReportA4Content />
    </Suspense>
  );
}

