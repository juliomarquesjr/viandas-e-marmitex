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

function CustomerReportThermalContent() {
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
          <div className="text-sm mb-2">Carregando...</div>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <div className="text-sm mb-2">Erro ao carregar</div>
          <div className="text-xs">{error || 'Dados não encontrados'}</div>
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

    // Add all orders from the period
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
      
      if (isInPeriod) {
        transactions.push({
          id: payment.id,
          date: payment.createdAt,
          type: 'payment',
          description: 'Pagamento Ficha',
          value: -payment.totalCents,
          status: payment.status
        });
      }
    });

    // Sort by date (most recent first)
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const allTransactions = createTransactionList();

  return (
    <div className="thermal-report">
      {/* Header - Thermal Style */}
      <div className="thermal-header">
        <div className="thermal-title">
          COMIDA CASEIRA
        </div>
        <div className="thermal-subtitle">
          RESUMO DE CLIENTE
        </div>
        <div className="thermal-period">
          {formatDate(period.startDate)} a {formatDate(period.endDate)}
        </div>
      </div>

      {/* Customer Data - Compact */}
      <div className="thermal-section">
        <div className="thermal-section-title">
          CLIENTE:
        </div>
        <div className="thermal-text">
          {customer.name}
        </div>
        <div className="thermal-text">
          Tel: {customer.phone}
        </div>
        {customer.doc && (
          <div className="thermal-text">
            Doc: {customer.doc}
          </div>
        )}
      </div>

      {/* Financial Summary - Compact */}
      <div className="thermal-section">
        <div className="thermal-section-title">
          RESUMO FINANCEIRO:
        </div>
        
        <div className="thermal-row">
          <span>Saldo Devedor:</span>
          <span className="thermal-value">
            {formatCurrency(summary.debtBalanceCents)}
          </span>
        </div>
        
        <div className="thermal-row">
          <span>Pend. Período:</span>
          <span className="thermal-value">
            {formatCurrency(summary.pendingInPeriodCents)}
          </span>
        </div>
        
        <div className="thermal-row">
          <span>Tot. Pagamentos:</span>
          <span className="thermal-value">
            {formatCurrency(summary.totalPaymentsCents)}
          </span>
        </div>
      </div>

      {/* Transaction History - Compact */}
      {allTransactions.length > 0 && (
        <div className="thermal-section">
          <div className="thermal-section-title">
            MOVIMENTAÇÃO:
          </div>
          
          {allTransactions.map((transaction, index) => (
            <div key={transaction.id} className="thermal-transaction">
              <div className="thermal-row">
                <span className="thermal-date">{formatDate(transaction.date)}</span>
                <span className="thermal-transaction-value">
                  {transaction.type === 'payment' ? '-' : '+'}{formatCurrency(Math.abs(transaction.value))}
                </span>
              </div>
              
              {/* Removed transaction type line to simplify thermal print */}
              
              <div className="thermal-description">
                {transaction.description.length > 40 
                  ? `${transaction.description.substring(0, 37)}...` 
                  : transaction.description}
                
                {/* Show discount info for consumption transactions */}
                {transaction.type === 'consumption' && (() => {
                  const order = details.periodOrders.find(o => o.id === transaction.id);
                  if (order && order.discountCents > 0) {
                    return (
                      <div style={{fontSize: '9px', color: '#666', marginTop: '2px', fontWeight: 'bold'}}>
                        Desc: -{formatCurrency(order.discountCents)}
                        <br />
                        Subtot: {formatCurrency(order.subtotalCents)}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              
              {index < allTransactions.length - 1 && (
                <div className="thermal-divider"></div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="thermal-footer">
        <div style={{fontWeight: '900', fontSize: '12px', color: '#000'}}>Gerado em:</div>
        <div style={{fontWeight: '900', fontSize: '12px', color: '#000'}}>{formatDateTime(metadata.generatedAt)}</div>
      </div>

      {/* Print button for screen view */}
      <div className="no-print thermal-print-btn">
        <button
          onClick={() => window.print()}
          className="thermal-btn"
        >
          Imprimir Térmica
        </button>
      </div>

      {/* Thermal printer specific styles */}
      <style jsx global>{`
        .thermal-report {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          font-weight: bold;
          line-height: 1.4;
          max-width: 280px;
          margin: 0 auto;
          padding: 8px;
          background: white;
        }
        
        .thermal-header {
          text-align: center;
          margin-bottom: 8px;
          border-bottom: 1px dashed #333;
          padding-bottom: 6px;
        }
        
        .thermal-title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 2px;
        }
        
        .thermal-subtitle {
          font-size: 13px;
          margin-bottom: 2px;
        }
        
        .thermal-period {
          font-size: 12px;
        }
        
        .thermal-section {
          margin-bottom: 8px;
          border-bottom: 1px dashed #333;
          padding-bottom: 6px;
        }
        
        .thermal-section-title {
          font-size: 13px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        
        .thermal-text {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 2px;
        }
        
        .thermal-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 2px;
        }
        
        .thermal-value {
          font-weight: 900;
        }
        
        .thermal-transaction {
          margin-bottom: 6px;
          font-size: 11px;
          font-weight: bold;
        }
        
        .thermal-date {
          font-size: 11px;
          font-weight: bold;
        }
        
        .thermal-transaction-value {
          font-weight: 900;
          font-size: 12px;
        }
        
        .thermal-transaction-type {
          font-size: 8px;
          color: #666;
          margin-bottom: 2px;
        }
        
        .thermal-description {
          font-size: 10px;
          font-weight: bold;
          word-wrap: break-word;
        }
        
        .thermal-divider {
          border-bottom: 1px dotted #ccc;
          margin: 4px 0;
        }
        
        .thermal-footer {
          text-align: center;
          font-size: 12px;
          font-weight: 900;
          color: #333;
          margin-top: 8px;
          padding-top: 6px;
        }
        
        .thermal-separator {
          margin: 8px 0;
          font-weight: 900;
          font-size: 12px;
          color: #000;
        }
        
        .thermal-print-btn {
          text-align: center;
          margin-top: 16px;
        }
        
        .thermal-btn {
          background-color: #2563eb;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          font-size: 12px;
          cursor: pointer;
          font-family: system-ui, -apple-system, sans-serif;
        }
        
        .thermal-btn:hover {
          background-color: #1d4ed8;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          
          .no-print {
            display: none !important;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .thermal-report {
            max-width: none;
            width: 58mm;
            margin: 0;
            padding: 2mm;
          }
          
          @page {
            size: 58mm auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default function CustomerReportThermalPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-sm mb-2">Carregando...</div>
        </div>
      </div>
    }>
      <CustomerReportThermalContent />
    </Suspense>
  );
}