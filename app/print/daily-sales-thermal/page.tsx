"use client";

import { ThermalFooter } from '@/app/components/ThermalFooter';
import { ReportLoading } from '@/app/components/ReportLoading';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

type OrderItem = {
  id: string;
  quantity: number;
  priceCents: number;
  weightKg?: number | null;
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
  deliveryFeeCents: number;
  totalCents: number;
  paymentMethod: string | null;
  createdAt: string;
  cashReceivedCents?: number;
  changeCents?: number;
  items: OrderItem[];
  customer?: {
    id: string;
    name: string;
    phone?: string;
  } | null;
};

function DailySalesThermalContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date');

  const [orders, setOrders] = useState<Order[]>([]);
  const [contactInfo, setContactInfo] = useState<{
    address: string;
    phones: { mobile: string; landline: string };
  } | null>(null);
  const [systemTitle, setSystemTitle] = useState<string>('COMIDA CASEIRA');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!dateParam) {
        setError('Data não fornecida');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Buscar vendas do dia
        const params = new URLSearchParams({
          startDate: dateParam,
          endDate: dateParam,
          size: '1000',
          page: '1'
        });

        const [ordersResponse, configResponse] = await Promise.all([
          fetch(`/api/orders?${params.toString()}`),
          fetch('/api/config')
        ]);

        if (!ordersResponse.ok) {
          throw new Error('Falha ao carregar vendas');
        }

        const ordersData = await ordersResponse.json();
        setOrders(ordersData.data || []);

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
  }, [dateParam]);

  // Auto print when page loads
  useEffect(() => {
    if (orders.length > 0 && !loading && !error) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [orders, loading, error]);

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
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentMethodLabel = (method: string | null) => {
    const methodMap: { [key: string]: string } = {
      'cash': 'Dinheiro',
      'credit': 'Cartão Crédito',
      'debit': 'Cartão Débito',
      'pix': 'PIX',
      'invoice': 'Ficha do Cliente'
    };
    return method ? methodMap[method] || method : 'Não informado';
  };

  // Calcular totais
  const totalSales = orders.reduce((sum, order) => sum + order.totalCents, 0);
  const totalOrdersCount = orders.length;

  if (loading) {
    return (
      <ReportLoading 
        title="Gerando Relatório de Vendas"
        subtitle="Processando dados do dia..."
      />
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <div className="text-sm mb-2">Erro ao carregar</div>
          <div className="text-xs">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="thermal-report">
      {/* Header */}
      <div className="thermal-header">
        {/* Logo */}
        <div className="thermal-logo">
          <img 
            src="/img/logo_print.png" 
            alt="Logo" 
            className="thermal-logo-img"
          />
        </div>
        
        <div className="thermal-title">
          {systemTitle}
        </div>
        <div className="thermal-subtitle">
          RELATÓRIO DE VENDAS DIÁRIAS
        </div>
        <div className="thermal-date">
          {dateParam ? formatDate(dateParam) : ''}
        </div>
      </div>

      {/* Resumo */}
      <div className="thermal-section">
        <div className="thermal-section-title">
          RESUMO:
        </div>
        <div className="thermal-row">
          <span>Total de Vendas:</span>
          <span className="thermal-value">
            {totalOrdersCount}
          </span>
        </div>
        <div className="thermal-row">
          <span>Total Recebido:</span>
          <span className="thermal-value">
            {formatCurrency(totalSales)}
          </span>
        </div>
      </div>

      {/* Vendas */}
      <div className="thermal-section">
        <div className="thermal-section-title">
          VENDAS:
        </div>
        
        {orders.length === 0 ? (
          <div className="thermal-text" style={{ textAlign: 'center', marginTop: '8px' }}>
            Nenhuma venda encontrada
          </div>
        ) : (
          orders.map((order, orderIndex) => (
            <div key={order.id} className="thermal-transaction">
              <div className="thermal-transaction-type">
                VENDA #{order.id.slice(-6).toUpperCase()}
              </div>
              
              {order.customer && (
                <div className="thermal-customer-name">
                  Cliente: {order.customer.name}
                </div>
              )}
              
              <div className="thermal-description">
                {order.items.map(item => 
                  item.weightKg && Number(item.weightKg) > 0
                    ? `${Number(item.weightKg).toFixed(3)} kg × ${item.product.name.substring(0, 15)}${item.product.name.length > 15 ? '...' : ''}`
                    : `${item.quantity}x ${item.product.name.substring(0, 20)}${item.product.name.length > 20 ? '...' : ''}`
                ).join(', ')}
              </div>
              
              <div className="thermal-description">
                Pagamento: {getPaymentMethodLabel(order.paymentMethod)}
              </div>
              
              <div className="thermal-row">
                <span>Total:</span>
                <span className="thermal-transaction-value">
                  {formatCurrency(order.totalCents)}
                </span>
              </div>
              
              {orderIndex < orders.length - 1 && (
                <div className="thermal-divider"></div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Totais Finais */}
      {orders.length > 0 && (
        <div className="thermal-section">
          <div className="thermal-section-title">
            TOTAIS:
          </div>
          <div className="thermal-row">
            <span>Total de Vendas:</span>
            <span className="thermal-value">
              {totalOrdersCount}
            </span>
          </div>
          <div className="thermal-row thermal-total">
            <span>Total Recebido:</span>
            <span className="thermal-value">
              {formatCurrency(totalSales)}
            </span>
          </div>
        </div>
      )}

      {/* Contact Footer */}
      <ThermalFooter contactInfo={contactInfo || undefined} />

      {/* Print button for screen view */}
      <div className="no-print thermal-print-btn">
        <button
          onClick={() => window.print()}
          className="thermal-btn"
        >
          Imprimir Relatório
        </button>
      </div>

      {/* Thermal report specific styles */}
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
          color: #000;
        }
        
        /* Forçar cor preta para todos os textos (exceto botões) */
        .thermal-report *:not(.thermal-btn):not(.thermal-btn *) {
          color: #000 !important;
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
          color: #000;
        }
        
        .thermal-subtitle {
          font-size: 13px;
          margin-bottom: 2px;
          color: #000;
        }
        
        .thermal-date {
          font-size: 12px;
          color: #000;
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
          color: #000;
        }
        
        .thermal-text {
          font-size: 12px;
          font-weight: 500;
          margin-bottom: 2px;
          color: #000;
        }
        
        /* Linhas de dados */
        .thermal-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 2px;
          color: #000;
        }
        
        .thermal-total {
          font-size: 16px;
          font-weight: 500;
          border-top: 2px solid #000;
          padding-top: 4px;
          margin-top: 4px;
          color: #000;
        }
        
        .thermal-value {
          font-weight: 500;
          color: #000;
        }
        
        /* Transações (relatórios) */
        .thermal-transaction {
          margin-bottom: 6px;
          font-size: 12px;
          font-weight: 500;
          color: #000;
        }
        
        .thermal-transaction-type {
          font-size: 11px;
          color: #000;
          margin-bottom: 2px;
          font-weight: 600;
        }
        
        .thermal-transaction-value {
          font-weight: 500;
          font-size: 14px;
          color: #000;
        }
        
        .thermal-description {
          font-size: 12px;
          font-weight: 500;
          word-wrap: break-word;
          margin-bottom: 2px;
          color: #000;
        }
        
        /* Nome do cliente com ênfase */
        .thermal-customer-name {
          font-size: 13px;
          font-weight: 700;
          word-wrap: break-word;
          margin-bottom: 4px;
          margin-top: 2px;
          color: #000;
        }
        
        /* Separadores */
        .thermal-divider {
          border-bottom: 1px solid #000;
          margin: 4px 0;
        }
        
        /* Rodapé */
        .thermal-footer {
          text-align: center;
          font-size: 12px;
          font-weight: 500;
          color: #000;
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
            print-color-adjust: exact !important;
          }
          
          .thermal-report {
            max-width: none;
            width: 58mm;
            margin: 0;
            padding: 2mm;
            color: #000 !important;
          }
          
          .thermal-report * {
            color: #000 !important;
            border-color: #000 !important;
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

export default function DailySalesThermalPage() {
  return (
    <Suspense fallback={
      <ReportLoading 
        title="Carregando Relatório"
        subtitle="Aguarde um momento..."
      />
    }>
      <DailySalesThermalContent />
    </Suspense>
  );
}

