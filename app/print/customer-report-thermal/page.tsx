"use client";

import { ThermalFooter } from '@/app/components/ThermalFooter';
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
  const [contactInfo, setContactInfo] = useState<{
    address: string;
    phones: { mobile: string; landline: string };
  } | null>(null);
  const [systemTitle, setSystemTitle] = useState<string>('COMIDA CASEIRA');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!customerId || !startDate || !endDate) {
        setError('Parâmetros obrigatórios em falta');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Carregar relatório e informações de contato em paralelo
        const [reportResponse, configResponse] = await Promise.all([
          fetch(`/api/customers/${customerId}/report?startDate=${startDate}&endDate=${endDate}`),
          fetch('/api/config')
        ]);

        if (!reportResponse.ok) {
          throw new Error('Falha ao carregar relatório');
        }

        const data = await reportResponse.json();
        setReportData(data);

        // Processar informações de contato e título do sistema
        if (configResponse.ok) {
          const configs = await configResponse.json();
          const contactConfigs = configs.filter((config: any) => config.category === 'contact');
          const brandingConfigs = configs.filter((config: any) => config.category === 'branding');
          
          // Extrair título do sistema
          const systemTitleConfig = brandingConfigs.find((c: any) => c.key === 'branding_system_title');
          if (systemTitleConfig?.value) {
            setSystemTitle(systemTitleConfig.value.toUpperCase());
          }
          
          // Construir endereço
          const addressParts = [
            contactConfigs.find((c: any) => c.key === 'contact_address_street')?.value,
            contactConfigs.find((c: any) => c.key === 'contact_address_number')?.value,
            contactConfigs.find((c: any) => c.key === 'contact_address_neighborhood')?.value,
            contactConfigs.find((c: any) => c.key === 'contact_address_city')?.value,
            contactConfigs.find((c: any) => c.key === 'contact_address_state')?.value,
            contactConfigs.find((c: any) => c.key === 'contact_address_zipcode')?.value,
            contactConfigs.find((c: any) => c.key === 'contact_address_complement')?.value
          ].filter(part => part && part.trim());
          
          const formattedAddress = addressParts.join(', ');
          
          // Extrair telefones
          const mobile = contactConfigs.find((c: any) => c.key === 'contact_phone_mobile')?.value || '';
          const landline = contactConfigs.find((c: any) => c.key === 'contact_phone_landline')?.value || '';
          
          setContactInfo({
            address: formattedAddress,
            phones: { mobile, landline }
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    loadData();
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
        {/* Logo */}
        <div className="thermal-logo">
          <img 
            src="/img/logo_print.png" 
            alt="Logo Comida Caseira" 
            className="thermal-logo-img"
          />
        </div>
        
        <div className="thermal-title">
          {systemTitle}
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
          <span>Saldo Período:</span>
          <span className="thermal-value">
            {formatCurrency(summary.pendingInPeriodCents)}
          </span>
        </div>
        
        {/* Mostrar Tot. Pagamentos apenas se houver pagamentos realizados no período */}
        {(() => {
          // Verificar se há pagamentos no período
          const paymentsInPeriod = details.fichaPayments.filter(payment => {
            const paymentDate = new Date(payment.createdAt);
            const startDateTime = new Date(period.startDateTime);
            const endDateTime = new Date(period.endDateTime);
            return paymentDate >= startDateTime && paymentDate <= endDateTime;
          });
          
          // Só exibe se houver pagamentos no período
          if (paymentsInPeriod.length > 0) {
            return (
              <div className="thermal-row">
                <span>Pagamentos:</span>
                <span className="thermal-value">
                  {formatCurrency(summary.totalPaymentsCents)}
                </span>
              </div>
            );
          }
          return null;
        })()}
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
                      <div style={{fontSize: '12px', color: '#000', marginTop: '2px', fontWeight: '500'}}>
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
        <div style={{fontWeight: '500', fontSize: '12px', color: '#000'}}>Gerado em:</div>
        <div style={{fontWeight: '500', fontSize: '12px', color: '#000'}}>{formatDateTime(metadata.generatedAt)}</div>
      </div>

      {/* Contact Footer */}
      <ThermalFooter contactInfo={contactInfo || undefined} />

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
        /* Estilos base para impressão térmica */
        .thermal-report {
          font-family: 'Consolas', 'Monaco', 'Lucida Console', 'Liberation Mono', 'DejaVu Sans Mono', 'Bitstream Vera Sans Mono', 'Courier New', monospace;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.3;
          max-width: 280px;
          margin: 0 auto;
          padding: 8px;
          background: white;
        }
        
        /* Cabeçalho */
        .thermal-header {
          text-align: center;
          margin-bottom: 8px;
          border-bottom: 2px solid #000;
          padding-bottom: 6px;
        }
        
        /* Logo */
        .thermal-logo {
          margin-bottom: 6px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .thermal-logo-img {
          max-width: 50px;
          max-height: 50px;
          width: auto;
          height: auto;
          filter: brightness(0) contrast(100%);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .thermal-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 2px;
        }
        
        .thermal-subtitle {
          font-size: 13px;
          margin-bottom: 2px;
        }
        
        .thermal-period {
          font-size: 12px;
        }
        
        /* Seções */
        .thermal-section {
          margin-bottom: 8px;
          border-bottom: 2px solid #000;
          padding-bottom: 6px;
        }
        
        .thermal-section-title {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .thermal-text {
          font-size: 12px;
          font-weight: 500;
          margin-bottom: 2px;
        }
        
        /* Linhas de dados */
        .thermal-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 2px;
        }
        
        .thermal-value {
          font-weight: 500;
        }
        
        /* Transações (relatórios) */
        .thermal-transaction {
          margin-bottom: 6px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .thermal-date {
          font-size: 12px;
          font-weight: 500;
        }
        
        .thermal-transaction-value {
          font-weight: 500;
          font-size: 14px;
        }
        
        .thermal-transaction-type {
          font-size: 11px;
          color: #666;
          margin-bottom: 2px;
        }
        
        .thermal-description {
          font-size: 12px;
          font-weight: 500;
          word-wrap: break-word;
        }
        
        /* Separadores */
        .thermal-divider {
          border-bottom: 1px solid #333;
          margin: 4px 0;
        }
        
        /* Rodapé */
        .thermal-footer {
          text-align: center;
          font-size: 12px;
          font-weight: 500;
          color: #333;
          margin-top: 8px;
          padding-top: 6px;
          border-top: 3px solid #000;
        }
        
        /* Seção de Contato */
        .thermal-contact-section {
          margin: 8px 0;
          text-align: left;
        }
        
        .thermal-contact-title {
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 4px;
          color: #000 !important;
        }
        
        .thermal-contact-info {
          font-size: 12px;
          font-weight: 500;
          margin-bottom: 10px;
          color: #000 !important;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .thermal-icon {
          width: 14px;
          height: 14px;
          filter: brightness(0) contrast(100%);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .thermal-separator {
          margin: 8px 0;
          font-weight: 500;
          font-size: 12px;
          color: #000;
        }
        
        /* Botões (apenas para tela) */
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
          font-size: 14px;
          cursor: pointer;
          font-family: system-ui, -apple-system, sans-serif;
        }
        
        .thermal-btn:hover {
          background-color: #1d4ed8;
        }
        
        /* Estilos específicos para impressão */
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