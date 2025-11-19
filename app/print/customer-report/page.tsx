"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ReportLoading } from '@/app/components/ReportLoading';

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
  subtotalCents: number;
  discountCents: number;
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

type MonthlySummary = {
  month: string;
  monthFormatted: string;
  initialBalanceCents: number;
  purchasesCents: number;
  paymentsCents: number;
  monthlyBalanceCents: number;
  finalBalanceCents: number;
  status: 'devedor' | 'credito' | 'zerado';
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
  monthlySummary?: MonthlySummary[];
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
  const showDebtBalance = searchParams.get('showDebtBalance') === 'true';
  const showPeriodBalance = searchParams.get('showPeriodBalance') === 'true';
  const showPaymentsTotal = searchParams.get('showPaymentsTotal') === 'true';

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
          `/api/customers/${customerId}/report?startDate=${startDate}&endDate=${endDate}`,
          {
            credentials: 'include'
          }
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
        title="Gerando Relatório de Fechamento"
        subtitle="Processando dados do cliente..."
      />
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
      {/* Header - Ultra Compact */}
      <div className="text-left mb-3 border-b border-gray-300 pb-2">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          RESUMO DO CLIENTE
        </h1>
        <div className="text-base text-gray-600 mb-2">
          Comida Caseira
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>Período: {formatDate(period.startDate)} a {formatDate(period.endDate)}</span>
          <span>•</span>
          <span>Gerado: {formatDateTime(metadata.generatedAt)}</span>
        </div>
      </div>

      {/* Customer Data - Compact */}
      <div className="mb-3 avoid-break">
        <h2 className="text-base font-semibold mb-2 text-gray-800 border-b pb-1">
          Dados do Cliente
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="border-b pb-2">
            <div className="font-medium text-gray-600 mb-1">Nome:</div>
            <div className="text-gray-900 ml-2">{customer.name}</div>
          </div>
          <div className="border-b pb-2">
            <div className="font-medium text-gray-600 mb-1">Telefone:</div>
            <div className="text-gray-900 ml-2">{customer.phone}</div>
          </div>
          {customer.email && (
            <div className="border-b pb-2">
              <div className="font-medium text-gray-600 mb-1">Email:</div>
              <div className="text-gray-900 ml-2">{customer.email}</div>
            </div>
          )}
          {customer.address && (
            <div className="border-b pb-2">
              <div className="font-medium text-gray-600 mb-1">Endereço:</div>
              <div className="text-gray-900 ml-2">
                {customer.address.street} {customer.address.number}
                {customer.address.complement && `, ${customer.address.complement}`}
                <br />
                {customer.address.neighborhood}, {customer.address.city} - {customer.address.state}
                <br />
                CEP: {customer.address.zip}
              </div>
            </div>
          )}
          {customer.doc && (
            <div className="border-b pb-2">
              <div className="font-medium text-gray-600 mb-1">Documento:</div>
              <div className="text-gray-900 ml-2">{customer.doc}</div>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Summary - Resumo Mensal */}
      {reportData.monthlySummary && reportData.monthlySummary.length > 0 && (
        <div className="mb-4 avoid-break">
          <h2 className="text-sm font-semibold mb-2 text-gray-800 border-b pb-1">
            Resumo Mensal
          </h2>
          <div className="border rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-right p-2 font-semibold">Saldo Anterior</th>
                  <th className="text-right p-2 font-semibold">Compras Período</th>
                  <th className="text-right p-2 font-semibold">Pagamento Período</th>
                  <th className="text-right p-2 font-bold text-base bg-yellow-100">Valor a Pagar</th>
                  <th className="text-center p-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.monthlySummary.map((month, index) => (
                  <tr key={month.month} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className={`p-2 text-right font-semibold ${
                      month.initialBalanceCents > 0 ? 'text-red-600' : 
                      month.initialBalanceCents < 0 ? 'text-green-600' : 
                      'text-gray-600'
                    }`}>
                      {month.initialBalanceCents >= 0 ? '+' : ''}{formatCurrency(month.initialBalanceCents)}
                    </td>
                    <td className="p-2 text-right">{formatCurrency(month.purchasesCents)}</td>
                    <td className="p-2 text-right">{formatCurrency(month.paymentsCents)}</td>
                    <td className={`p-2 text-right font-bold text-base border-2 ${
                      month.status === 'devedor' ? 'text-red-700 bg-red-50 border-red-300' : 
                      month.status === 'credito' ? 'text-green-700 bg-green-50 border-green-300' : 
                      'text-gray-700 bg-gray-50 border-gray-300'
                    }`}>
                      {formatCurrency(month.finalBalanceCents)}
                    </td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        month.status === 'devedor' ? 'bg-red-100 text-red-700' : 
                        month.status === 'credito' ? 'bg-green-100 text-green-700' : 
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {month.status === 'devedor' ? 'DEVEDOR' : 
                         month.status === 'credito' ? 'CRÉDITO' : 
                         'ZERADO'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Complete Transaction History - Compact */}
      {allTransactions.length > 0 && (
        <div className="mb-4 avoid-break">
          <h2 className="text-sm font-semibold mb-2 text-gray-800 border-b pb-1">
            Movimentação do Período
          </h2>
          <div className="border rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-1 font-semibold w-20">Data</th>
                  <th className="text-left p-1 font-semibold">Descrição</th>
                  <th className="text-left p-1 font-semibold w-32">Detalhes</th>
                  <th className="text-right p-1 font-semibold w-24">Valor</th>
                </tr>
              </thead>
              <tbody>
                {allTransactions.map((transaction, index) => (
                  <tr key={transaction.id} className={`${
                    transaction.type === 'payment' ? 'bg-green-50' :
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } ${transaction.type === 'payment' ? 'border-l-2 border-l-blue-400' : 
                      transaction.status === 'pending' ? 'border-l-2 border-l-yellow-400' :
                      'border-l-2 border-l-green-400'}`}>
                    <td className="p-1 text-xs">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="p-1 text-xs">
                      <div className="whitespace-normal">
                        {transaction.description}
                      </div>
                    </td>
                    <td className="p-1 text-xs">
                      <div className="whitespace-normal">
                        {transaction.type === 'consumption' && (() => {
                          const order = details.periodOrders.find(o => o.id === transaction.id);
                          if (order) {
                            if (order.discountCents > 0) {
                              return (
                                <div>
                                  <div>Subtotal: {formatCurrency(order.subtotalCents)}</div>
                                  <div>Desc: -{formatCurrency(order.discountCents)}</div>
                                </div>
                              );
                            }
                            return '-';
                          }
                          return '-';
                        })()}
                        {transaction.type === 'payment' && '-'}
                      </div>
                    </td>
                    <td className={`p-1 text-xs text-right font-semibold ${
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

      {/* Footer - Compact */}
      <div className="mt-3 pt-2 border-t border-gray-300 text-center text-xs text-gray-500">
        <div>Gerado em: {formatDateTime(metadata.generatedAt)}</div>
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
      <ReportLoading 
        title="Carregando Relatório"
        subtitle="Aguarde um momento..."
      />
    }>
      <CustomerReportContent />
    </Suspense>
  );
}