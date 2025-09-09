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

  // Create unified transaction list combining orders and payments (only in period)
  const createTransactionList = () => {
    const transactions: Array<{
      id: string;
      date: string;
      type: 'consumption' | 'payment';
      description: string;
      value: number;
      status: string;
    }> = [];

    // Add all orders from the period (this already includes both confirmed and pending orders)
    details.periodOrders.forEach(order => {
      const itemsDescription = order.items.map(item => 
        `${item.quantity}x ${item.product.name}`
      ).join(', ');
      
      transactions.push({
        id: order.id,
        date: order.createdAt,
        type: 'consumption',
        description: itemsDescription,
        value: order.totalCents,
        status: order.status
      });
    });

    // Add ficha payments that are in the period
    details.fichaPayments.forEach(payment => {
      const paymentDate = new Date(payment.createdAt);
      const startDateTime = new Date(period.startDateTime);
      const endDateTime = new Date(period.endDateTime);
      const isInPeriod = paymentDate >= startDateTime && paymentDate <= endDateTime;
      
      // Only add payments that are within the period
      if (isInPeriod) {
        transactions.push({
          id: payment.id,
          date: payment.createdAt,
          type: 'payment',
          description: 'Pagamento em Ficha',
          value: -payment.totalCents, // negative for payments
          status: payment.status
        });
      }
    });

    // Sort by date (most recent first)
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const allTransactions = createTransactionList();

  return (
    <div className="w-full">
      {/* Header - Compact and Beautiful */}
      <div className="text-center mb-4 border-b border-gray-200 pb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          RELATÓRIO DE FECHAMENTO
        </h1>
        <div className="text-base font-medium text-gray-600 mb-2">
          Viandas e Marmitex
        </div>
        <div className="flex justify-center items-center gap-4 text-xs text-gray-500">
          <span>Período: {formatDate(period.startDate)} a {formatDate(period.endDate)}</span>
          <span>•</span>
          <span>Gerado em: {formatDateTime(metadata.generatedAt)}</span>
        </div>
      </div>

      {/* Customer Data Table */}
      <div className="mb-6 avoid-break">
        <h2 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">
          Dados do Cliente
        </h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <tbody>
              <tr className="bg-gray-50">
                <td className="p-3 font-medium text-gray-700 w-1/4">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Nome:
                  </div>
                </td>
                <td className="p-3 text-gray-900">{customer.name}</td>
                <td className="p-3 font-medium text-gray-700 w-1/4">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Telefone:
                  </div>
                </td>
                <td className="p-3 text-gray-900">{customer.phone}</td>
              </tr>
              {(customer.email || customer.doc) && (
                <tr className="bg-white">
                  <td className="p-3 font-medium text-gray-700">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email:
                    </div>
                  </td>
                  <td className="p-3 text-gray-900">{customer.email || '-'}</td>
                  <td className="p-3 font-medium text-gray-700">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Documento:
                    </div>
                  </td>
                  <td className="p-3 text-gray-900">{customer.doc || '-'}</td>
                </tr>
              )}
              {customer.address && (
                <tr className="bg-gray-50">
                  <td className="p-3 font-medium text-gray-700">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Endereço:
                    </div>
                  </td>
                  <td className="p-3 text-gray-900" colSpan={3}>
                    {customer.address.street} {customer.address.number}
                    {customer.address.complement && `, ${customer.address.complement}`}
                    <br />
                    {customer.address.neighborhood}, {customer.address.city} - {customer.address.state}
                    <br />
                    CEP: {customer.address.zip}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Summary Table - Compact */}
      <div className="mb-4 avoid-break">
        <h2 className="text-lg font-semibold mb-2 text-gray-800 border-b pb-1">
          Resumo Financeiro
        </h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <tbody>
              <tr className="bg-red-50">
                <td className="p-2 font-medium text-gray-700 text-sm">Saldo Devedor (Geral):</td>
                <td className={`p-2 text-right text-lg font-bold ${
                  summary.debtBalanceCents > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatCurrency(summary.debtBalanceCents)}
                </td>
              </tr>
              <tr className="bg-yellow-50">
                <td className="p-2 font-medium text-gray-700 text-sm">Saldo do Período (Pendentes):</td>
                <td className="p-2 text-right text-lg font-bold text-orange-600">
                  {formatCurrency(summary.pendingInPeriodCents)}
                </td>
              </tr>
              <tr className="bg-blue-50">
                <td className="p-2 font-medium text-gray-700 text-sm">Total de Pagamentos:</td>
                <td className="p-2 text-right text-lg font-bold text-blue-600">
                  {formatCurrency(summary.totalPaymentsCents)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete Transaction History */}
      {allTransactions.length > 0 && (
        <div className="mb-6 avoid-break">
          <h2 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">
            Movimentação do Período (Pagamentos e Consumo)
          </h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-3 font-semibold">Data</th>
                  <th className="text-left p-3 font-semibold">Tipo</th>
                  <th className="text-left p-3 font-semibold">Descrição</th>
                  <th className="text-center p-3 font-semibold">Status</th>
                  <th className="text-right p-3 font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody>
                {allTransactions.map((transaction, index) => (
                  <tr key={transaction.id} className={`${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } ${transaction.type === 'payment' ? 'border-l-4 border-l-blue-500' : 
                      transaction.status === 'pending' ? 'border-l-4 border-l-yellow-500' :
                      'border-l-4 border-l-green-500'}`}>
                    <td className="p-3 text-sm">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="p-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        transaction.type === 'payment' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {transaction.type === 'payment' ? 'Pagamento' : 'Consumo'}
                      </span>
                    </td>
                    <td className="p-3 text-sm">
                      <div className="max-w-xs truncate" title={transaction.description}>
                        {transaction.description}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        transaction.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        transaction.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.status === 'confirmed' ? 'Confirmado' :
                         transaction.status === 'pending' ? 'Pendente' :
                         transaction.status === 'cancelled' ? 'Cancelado' :
                         transaction.status}
                      </span>
                    </td>
                    <td className={`p-3 text-sm text-right font-semibold ${
                      transaction.type === 'payment' 
                        ? 'text-blue-600' 
                        : transaction.status === 'pending' 
                          ? 'text-yellow-600' 
                          : 'text-green-600'
                    }`}>
                      {transaction.type === 'payment' ? '-' : '+'}{formatCurrency(Math.abs(transaction.value))}
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