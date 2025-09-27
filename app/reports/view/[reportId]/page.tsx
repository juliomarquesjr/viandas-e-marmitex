"use client";

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
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

function ReportViewerContent() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get('reportId');
  const dataParam = searchParams.get('data');

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<{
    name: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReportData = async () => {
      if (!dataParam) {
        setError('Dados do relatório não encontrados');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Decodificar dados da URL
        const decodedData = JSON.parse(decodeURIComponent(dataParam));
        const { customerId, startDate, endDate, type } = decodedData;

        if (type !== 'closing') {
          setError('Tipo de relatório não suportado');
          setLoading(false);
          return;
        }

        // Carregar dados do relatório
        const [reportResponse, configResponse] = await Promise.all([
          fetch(`/api/customers/${customerId}/report?startDate=${startDate}&endDate=${endDate}`),
          fetch('/api/config')
        ]);

        if (!reportResponse.ok) {
          throw new Error('Falha ao carregar relatório');
        }

        const data = await reportResponse.json();
        setReportData(data);

        // Processar informações da empresa
        if (configResponse.ok) {
          const configs = await configResponse.json();
          const brandingConfigs = configs.filter((config: any) => config.category === 'branding');
          const contactConfigs = configs.filter((config: any) => config.category === 'contact');
          
          const companyName = brandingConfigs.find((c: any) => c.key === 'branding_system_title')?.value || 'Viandas e Marmitex';
          const logoUrl = brandingConfigs.find((c: any) => c.key === 'branding_logo_url')?.value;
          
          // Construir endereço
          const addressParts = [
            contactConfigs.find((c: any) => c.key === 'contact_address_street')?.value,
            contactConfigs.find((c: any) => c.key === 'contact_address_number')?.value,
            contactConfigs.find((c: any) => c.key === 'contact_address_neighborhood')?.value,
            contactConfigs.find((c: any) => c.key === 'contact_address_city')?.value,
            contactConfigs.find((c: any) => c.key === 'contact_address_state')?.value,
            contactConfigs.find((c: any) => c.key === 'contact_address_zipcode')?.value
          ].filter(part => part && part.trim());
          
          const address = addressParts.join(', ');
          const phone = contactConfigs.find((c: any) => c.key === 'contact_phone_mobile')?.value || '';
          
          setCompanyInfo({
            name: companyName,
            logoUrl,
            address: address || undefined,
            phone: phone || undefined
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [dataParam]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg mb-2">Carregando relatório...</div>
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
          <Link href="/admin/customers" className="mt-4 inline-block">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Clientes
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const { customer, period, summary, details, metadata } = reportData;

  // Criar lista unificada de transações
  const createTransactionList = () => {
    const transactions: Array<{
      id: string;
      date: string;
      type: 'consumption' | 'payment';
      description: string;
      value: number;
      status: string;
    }> = [];

    // Adicionar pedidos do período
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

    // Adicionar pagamentos ficha do período
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

    // Ordenar por data (mais recente primeiro)
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const allTransactions = createTransactionList();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Conteúdo do relatório */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm print:shadow-none">
          {/* Cabeçalho do relatório */}
          <div className="border-b border-gray-200 p-6 print:border-b-2 print:border-gray-800">
            <div className="text-center">
              {companyInfo?.logoUrl && (
                <img 
                  src={companyInfo.logoUrl} 
                  alt="Logo" 
                  className="h-16 w-auto mx-auto mb-4 print:h-12"
                />
              )}
              <h1 className="text-2xl font-bold text-gray-900 print:text-xl">
                {companyInfo?.name || 'Viandas e Marmitex'}
              </h1>
              <h2 className="text-lg font-semibold text-gray-700 mt-2 print:text-base">
                RELATÓRIO DE FECHAMENTO
              </h2>
              <div className="mt-4 text-sm text-gray-600 print:text-xs">
                <p>Período: {formatDate(period.startDate)} a {formatDate(period.endDate)}</p>
                <p>Gerado em: {formatDateTime(metadata.generatedAt)}</p>
              </div>
            </div>
          </div>

          {/* Dados do cliente */}
          <div className="p-6 print:p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 print:text-base">
              Dados do Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
              <div>
                <p className="text-sm text-gray-600">Nome</p>
                <p className="font-medium">{customer.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Telefone</p>
                <p className="font-medium">{customer.phone}</p>
              </div>
              {customer.email && (
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{customer.email}</p>
                </div>
              )}
              {customer.doc && (
                <div>
                  <p className="text-sm text-gray-600">Documento</p>
                  <p className="font-medium">{customer.doc}</p>
                </div>
              )}
            </div>
          </div>

          {/* Resumo financeiro */}
          <div className="p-6 print:p-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 print:text-base">
              Resumo Financeiro
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
              <div className="bg-red-50 p-4 rounded-lg print:bg-gray-100">
                <p className="text-sm text-gray-600">Saldo Devedor</p>
                <p className="text-xl font-bold text-red-600 print:text-lg">
                  {formatCurrency(summary.debtBalanceCents)}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg print:bg-gray-100">
                <p className="text-sm text-gray-600">Consumo no Período</p>
                <p className="text-xl font-bold text-green-600 print:text-lg">
                  {formatCurrency(summary.periodConsumptionCents)}
                </p>
              </div>
              {summary.totalPaymentsCents > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg print:bg-gray-100">
                  <p className="text-sm text-gray-600">Pagamentos</p>
                  <p className="text-xl font-bold text-blue-600 print:text-lg">
                    {formatCurrency(summary.totalPaymentsCents)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Histórico de transações */}
          {allTransactions.length > 0 && (
            <div className="p-6 print:p-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 print:text-base">
                Histórico de Transações
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm print:text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 print:border-gray-800">
                      <th className="text-left py-2 font-medium text-gray-600">Data</th>
                      <th className="text-left py-2 font-medium text-gray-600">Descrição</th>
                      <th className="text-right py-2 font-medium text-gray-600">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-gray-100 print:border-gray-300">
                        <td className="py-2 text-gray-600">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="py-2">
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            {transaction.type === 'consumption' && (() => {
                              const order = details.periodOrders.find(o => o.id === transaction.id);
                              if (order && order.discountCents > 0) {
                                return (
                                  <p className="text-xs text-gray-500">
                                    Desc: -{formatCurrency(order.discountCents)} | 
                                    Subtot: {formatCurrency(order.subtotalCents)}
                                  </p>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </td>
                        <td className="py-2 text-right">
                          <span className={`font-medium ${
                            transaction.type === 'payment' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'payment' ? '-' : '+'}{formatCurrency(Math.abs(transaction.value))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rodapé */}
          <div className="p-6 print:p-4 border-t border-gray-200 print:border-t-2 print:border-gray-800">
            <div className="text-center text-sm text-gray-600 print:text-xs">
              <p>Relatório gerado em {formatDateTime(metadata.generatedAt)}</p>
              {companyInfo?.address && <p>{companyInfo.address}</p>}
              {companyInfo?.phone && <p>📞 {companyInfo.phone}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Estilos para impressão */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            font-size: 12px;
            line-height: 1.4;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:border-b-2 {
            border-bottom-width: 2px !important;
          }
          
          .print\\:border-gray-800 {
            border-color: #1f2937 !important;
          }
          
          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
          
          .print\\:text-xl {
            font-size: 1.25rem !important;
          }
          
          .print\\:text-lg {
            font-size: 1.125rem !important;
          }
          
          .print\\:text-base {
            font-size: 1rem !important;
          }
          
          .print\\:text-xs {
            font-size: 0.75rem !important;
          }
          
          .print\\:p-4 {
            padding: 1rem !important;
          }
          
          .print\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          
          .print\\:grid-cols-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
          
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          
          @page {
            margin: 0.5in;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
}

export default function ReportViewerPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg mb-2">Carregando relatório...</div>
        </div>
      </div>
    }>
      <ReportViewerContent />
    </Suspense>
  );
}