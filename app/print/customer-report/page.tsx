"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  doc?: string;
  barcode?: string;
  address?: any;
  active: boolean;
  createdAt: string;
};

type OrderItem = {
  id: string;
  quantity: number;
  priceCents: number;
  product: {
    id: string;
    name: string;
  };
};

type Order = {
  id: string;
  status: string;
  totalCents: number;
  paymentMethod: string | null;
  createdAt: string;
  items: OrderItem[];
};

type FichaPayment = {
  id: string;
  totalCents: number;
  createdAt: string;
  status: string;
};

type ReportData = {
  customer: Customer;
  period: {
    startDate: string;
    endDate: string;
    startDateTime: string;
    endDateTime: string;
  };
  summary: {
    periodConsumptionCents: number;
    debtBalanceCents: number;
    pendingAmountCents: number;
    totalPaymentsCents: number;
    pendingInPeriodCents: number;
    pendingOutsidePeriodCents: number;
  };
  details: {
    periodOrders: Order[];
    pendingOrders: {
      inPeriod: Order[];
      outsidePeriod: Order[];
      all: Order[];
    };
    fichaPayments: FichaPayment[];
  };
  metadata: {
    generatedAt: string;
    totalPeriodOrders: number;
    totalPendingOrders: number;
    totalFichaPayments: number;
  };
};

function CustomerReportContent() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customerId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      if (!customerId || !startDate || !endDate) {
        setError('Parâmetros obrigatórios em falta');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          `/api/customers/${customerId}/report?startDate=${startDate}&endDate=${endDate}`
        );

        if (!response.ok) {
          throw new Error('Falha ao carregar relatório');
        }

        const data = await response.json();
        setReportData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [customerId, startDate, endDate]);

  // Auto print when page loads
  useEffect(() => {
    if (reportData && !loading && !error) {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [reportData, loading, error]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg mb-2">Carregando relatório...</div>
          <div className="text-sm text-gray-500">Aguarde um momento</div>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <div className="text-lg mb-2">Erro ao carregar relatório</div>
          <div className="text-sm">{error || 'Dados não encontrados'}</div>
        </div>
      </div>
    );
  }

  const { customer, period, summary, details, metadata } = reportData;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-6 border-b-2 border-gray-300 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          RELATÓRIO DE FECHAMENTO
        </h1>
        <div className="text-lg font-semibold text-gray-700">
          Viandas e Marmitex
        </div>
        <div className="text-sm text-gray-500 mt-2">
          Gerado em: {formatDateTime(metadata.generatedAt)}
        </div>
      </div>

      {/* Customer Information */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg avoid-break">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">
          Informações do Cliente
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-medium text-gray-700">Nome:</div>
            <div className="text-gray-900">{customer.name}</div>
          </div>
          <div>
            <div className="font-medium text-gray-700">Telefone:</div>
            <div className="text-gray-900">{customer.phone}</div>
          </div>
          {customer.email && (
            <div>
              <div className="font-medium text-gray-700">Email:</div>
              <div className="text-gray-900">{customer.email}</div>
            </div>
          )}
          {customer.doc && (
            <div>
              <div className="font-medium text-gray-700">Documento:</div>
              <div className="text-gray-900">{customer.doc}</div>
            </div>
          )}
          {customer.barcode && (
            <div>
              <div className="font-medium text-gray-700">Código de Barras:</div>
              <div className="text-gray-900">{customer.barcode}</div>
            </div>
          )}
        </div>
      </div>

      {/* Period Information */}
      <div className="mb-6 bg-blue-50 p-4 rounded-lg avoid-break">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">
          Período do Relatório
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-medium text-gray-700">Data Inicial:</div>
            <div className="text-gray-900">{formatDate(period.startDate)}</div>
          </div>
          <div>
            <div className="font-medium text-gray-700">Data Final:</div>
            <div className="text-gray-900">{formatDate(period.endDate)}</div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6 avoid-break">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">
          Resumo Financeiro
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg border">
            <div className="font-medium text-gray-700 mb-1">
              Consumo no Período
            </div>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(summary.periodConsumptionCents)}
            </div>
            <div className="text-sm text-gray-500">
              {metadata.totalPeriodOrders} {metadata.totalPeriodOrders === 1 ? 'pedido' : 'pedidos'}
            </div>
          </div>
          
          <div className={`p-4 rounded-lg border ${
            summary.debtBalanceCents > 0 ? 'bg-red-50' : 'bg-green-50'
          }`}>
            <div className="font-medium text-gray-700 mb-1">
              Saldo Devedor
            </div>
            <div className={`text-xl font-bold ${
              summary.debtBalanceCents > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {formatCurrency(summary.debtBalanceCents)}
            </div>
            <div className="text-sm text-gray-500">
              {summary.debtBalanceCents > 0 ? 'Em débito' : 'Sem pendências'}
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg border">
            <div className="font-medium text-gray-700 mb-1">
              Lançamentos Pendentes
            </div>
            <div className="text-xl font-bold text-gray-800">
              {formatCurrency(summary.pendingAmountCents)}
            </div>
            <div className="text-sm text-gray-500">
              {metadata.totalPendingOrders} {metadata.totalPendingOrders === 1 ? 'pedido' : 'pedidos'} pendente{metadata.totalPendingOrders !== 1 ? 's' : ''}
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg border">
            <div className="font-medium text-gray-700 mb-1">
              Total de Pagamentos
            </div>
            <div className="text-xl font-bold text-blue-600">
              {formatCurrency(summary.totalPaymentsCents)}
            </div>
            <div className="text-sm text-gray-500">
              {metadata.totalFichaPayments} {metadata.totalFichaPayments === 1 ? 'pagamento' : 'pagamentos'}
            </div>
          </div>
        </div>
      </div>

      {/* Period Orders */}
      {details.periodOrders.length > 0 && (
        <div className="mb-6 avoid-break">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            Pedidos do Período
          </h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Itens</th>
                  <th className="text-right p-3">Valor</th>
                </tr>
              </thead>
              <tbody>
                {details.periodOrders.map((order, index) => (
                  <tr key={order.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-3 text-sm">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="p-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status === 'confirmed' ? 'Confirmado' :
                         order.status === 'pending' ? 'Pendente' :
                         order.status === 'cancelled' ? 'Cancelado' :
                         order.status}
                      </span>
                    </td>
                    <td className="p-3 text-sm">
                      <div className="space-y-1">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between">
                            <span>{item.quantity}x {item.product.name}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-sm text-right font-medium">
                      {formatCurrency(order.totalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Orders */}
      {details.pendingOrders.all.length > 0 && (
        <div className="mb-6 avoid-break">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            Pedidos Pendentes
          </h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-yellow-100">
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Itens</th>
                  <th className="text-right p-3">Valor</th>
                  <th className="text-center p-3">Período</th>
                </tr>
              </thead>
              <tbody>
                {details.pendingOrders.all.map((order, index) => {
                  const orderDate = new Date(order.createdAt);
                  const isInPeriod = details.pendingOrders.inPeriod.some(o => o.id === order.id);
                  
                  return (
                    <tr key={order.id} className={index % 2 === 0 ? 'bg-white' : 'bg-yellow-50'}>
                      <td className="p-3 text-sm">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="p-3 text-sm">
                        <div className="space-y-1">
                          {order.items.map((item) => (
                            <div key={item.id}>
                              {item.quantity}x {item.product.name}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-right font-medium">
                        {formatCurrency(order.totalCents)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          isInPeriod ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {isInPeriod ? 'No Período' : 'Anterior'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ficha Payments */}
      {details.fichaPayments.length > 0 && (
        <div className="mb-6 avoid-break">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">
            Histórico de Pagamentos
          </h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-100">
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Valor</th>
                </tr>
              </thead>
              <tbody>
                {details.fichaPayments.map((payment, index) => (
                  <tr key={payment.id} className={index % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                    <td className="p-3 text-sm">
                      {formatDateTime(payment.createdAt)}
                    </td>
                    <td className="p-3 text-sm">
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                        Confirmado
                      </span>
                    </td>
                    <td className="p-3 text-sm text-right font-medium text-blue-600">
                      {formatCurrency(payment.totalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-500">
        <div>Sistema Viandas e Marmitex</div>
        <div>Relatório gerado automaticamente em {formatDateTime(metadata.generatedAt)}</div>
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
    </div>
  );
}

export default function CustomerReportPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg mb-2">Carregando relatório...</div>
          <div className="text-sm text-gray-500">Aguarde um momento</div>
        </div>
      </div>
    }>
      <CustomerReportContent />
    </Suspense>
  );
}