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
      {/* Header - Ultra Compact */}
      <div className="text-center mb-2 border-b border-gray-300 pb-1">
        <h1 className="text-lg font-bold text-gray-900 mb-0">
          RELATÓRIO DE FECHAMENTO
        </h1>
        <div className="text-sm text-gray-600 mb-1">
          Comida Caseira
        </div>
        <div className="flex justify-center items-center gap-3 text-xs text-gray-500">
          <span>Período: {formatDate(period.startDate)} a {formatDate(period.endDate)}</span>
          <span>•</span>
          <span>Gerado: {formatDateTime(metadata.generatedAt)}</span>
        </div>
      </div>

      {/* Customer Data - Compact */}
      <div className="mb-3 avoid-break">
        <h2 className="text-sm font-semibold mb-1 text-gray-800 border-b pb-1">
          Dados do Cliente
        </h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between border-b pb-1">
            <span className="font-medium text-gray-600">Nome:</span>
            <span className="text-gray-900">{customer.name}</span>
          </div>
          <div className="flex justify-between border-b pb-1">
            <span className="font-medium text-gray-600">Telefone:</span>
            <span className="text-gray-900">{customer.phone}</span>
          </div>
          {(customer.email || customer.doc) && (
            <>
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium text-gray-600">Email:</span>
                <span className="text-gray-900">{customer.email || '-'}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="font-medium text-gray-600">Documento:</span>
                <span className="text-gray-900">{customer.doc || '-'}</span>
              </div>
            </>
          )}
          {customer.address && (
            <div className="col-span-2 border-b pb-1">
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Endereço:</span>
                <span className="text-gray-900 text-right">
                  {customer.address.street} {customer.address.number}
                  {customer.address.complement && `, ${customer.address.complement}`}
                  <br />
                  {customer.address.neighborhood}, {customer.address.city} - {customer.address.state}
                  <br />
                  CEP: {customer.address.zip}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Financial Summary - Ultra Compact */}
      <div className="mb-3 avoid-break">
        <h2 className="text-sm font-semibold mb-1 text-gray-800 border-b pb-1">
          Resumo Financeiro
        </h2>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center border rounded p-1">
            <div className="font-medium text-gray-600">Saldo Devedor</div>
            <div className={`text-sm font-bold ${
              summary.debtBalanceCents > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {formatCurrency(summary.debtBalanceCents)}
            </div>
          </div>
          <div className="text-center border rounded p-1">
            <div className="font-medium text-gray-600">Pendentes</div>
            <div className="text-sm font-bold text-orange-600">
              {formatCurrency(summary.pendingInPeriodCents)}
            </div>
          </div>
          <div className="text-center border rounded p-1">
            <div className="font-medium text-gray-600">Pagamentos</div>
            <div className="text-sm font-bold text-blue-600">
              {formatCurrency(summary.totalPaymentsCents)}
            </div>
          </div>
        </div>
      </div>

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