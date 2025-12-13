"use client";

import { ThermalFooter } from '@/app/components/ThermalFooter';
import { ReportLoading } from '@/app/components/ReportLoading';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

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
  cashReceivedCents?: number;
  changeCents?: number;
  items: OrderItem[];
  customer?: {
    id: string;
    name: string;
    phone?: string;
  };
};

function ThermalReceiptContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<Order | null>(null);
  const [contactInfo, setContactInfo] = useState<{
    address: string;
    phones: { mobile: string; landline: string };
  } | null>(null);
  const [systemTitle, setSystemTitle] = useState<string>('COMIDA CASEIRA');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!orderId) {
        setError('ID do pedido não fornecido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Carregar pedido e informações de contato em paralelo
        const [orderResponse, configResponse] = await Promise.all([
          fetch(`/api/orders/${orderId}`),
          fetch('/api/config/public')
        ]);

        if (!orderResponse.ok) {
          throw new Error('Falha ao carregar pedido');
        }

        const orderData = await orderResponse.json();
        console.log('Pedido carregado:', {
          id: orderData.id,
          paymentMethod: orderData.paymentMethod,
          totalCents: orderData.totalCents
        });
        setOrder(orderData);

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
          
          const formattedAddress = addressParts.length > 0 ? addressParts.join(', ') : '';
          
          // Extrair telefones
          const mobile = contactConfigs.find((c: any) => c.key === 'contact_phone_mobile')?.value || '';
          const landline = contactConfigs.find((c: any) => c.key === 'contact_phone_landline')?.value || '';
          
          // Sempre definir contactInfo, mesmo que vazio
          setContactInfo({
            address: formattedAddress,
            phones: { mobile, landline }
          });
          
        } else {
          // Se não conseguir carregar configurações, definir valores vazios
          setContactInfo({
            address: '',
            phones: { mobile: '', landline: '' }
          });
        }
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [orderId]);
  
  // Auto print when page loads
  useEffect(() => {
    if (order && !loading && !error) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [order, loading, error]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
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

  if (loading) {
    return (
      <ReportLoading 
        title="Gerando Recibo"
        subtitle="Processando dados do pedido..."
      />
    );
  }

  if (error || !order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <div className="text-sm mb-2">Erro ao carregar</div>
          <div className="text-xs">{error || 'Pedido não encontrado'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="thermal-receipt">
      {/* Header */}
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
          CUPOM NÃO FISCAL
        </div>
        <div className="thermal-date">
          {formatDateTime(order.createdAt)}
        </div>
        
        {/* Order Info */}
        <div className="thermal-order-info">
          Pedido #{order.id.slice(-8).toUpperCase()}
        </div>
      </div>

      {/* Customer Info */}
      {order.customer && (
        <div className="thermal-section">
          <div className="thermal-section-title">
            CLIENTE:
          </div>
          <div className="thermal-text">
            {order.customer.name}
          </div>
          {order.customer.phone && (
            <div className="thermal-text">
              Tel: {order.customer.phone}
            </div>
          )}
        </div>
      )}

      {/* Order Items */}
      <div className="thermal-section">
        <div className="thermal-section-title">
          ITENS:
        </div>
        
        {order.items.map((item, index) => (
          <div key={item.id} className="thermal-item">
            <div className="thermal-item-header">
              <span className="thermal-item-name">
                {item.product.name.length > 30 
                  ? `${item.product.name.substring(0, 27)}...` 
                  : item.product.name}
              </span>
            </div>
            
            <div className="thermal-item-details">
              <span>{item.quantity}x {formatCurrency(item.priceCents)}</span>
              <span className="thermal-item-total">
                {formatCurrency(item.quantity * item.priceCents)}
              </span>
            </div>
            
            {index < order.items.length - 1 && (
              <div className="thermal-divider"></div>
            )}
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="thermal-section">
        <div className="thermal-section-title">
          TOTAIS:
        </div>
        
        <div className="thermal-row">
          <span>Subtotal:</span>
          <span className="thermal-value">
            {formatCurrency(order.subtotalCents)}
          </span>
        </div>
        
        {order.discountCents > 0 && (
          <div className="thermal-row">
            <span>Desconto:</span>
            <span className="thermal-value">
              -{formatCurrency(order.discountCents)}
            </span>
          </div>
        )}
        
        <div className="thermal-row">
          <span>Total:</span>
          <span className="thermal-value">
            {formatCurrency(order.totalCents)}
          </span>
        </div>
      </div>

      {/* Payment Info */}
      <div style={{marginBottom: '8px', paddingBottom: '6px'}}>
        <div className="thermal-section-title">
          PAGAMENTO:
        </div>
        
        <div className="thermal-row">
          <span>Forma:</span>
          <span className="thermal-value">
            {getPaymentMethodLabel(order.paymentMethod)}
          </span>
        </div>
        
        {order.paymentMethod === 'cash' && order.cashReceivedCents && (
          <>
            <div className="thermal-row">
              <span>Recebido:</span>
              <span className="thermal-value">
                {formatCurrency(order.cashReceivedCents)}
              </span>
            </div>
            {order.changeCents && order.changeCents > 0 && (
              <div className="thermal-row">
                <span>Troco:</span>
                <span className="thermal-value">
                  {formatCurrency(order.changeCents)}
                </span>
              </div>
            )}
          </>
        )}
        
      </div>

      {/* Contact Footer */}
      <ThermalFooter contactInfo={contactInfo || undefined} />

      {/* Print button for screen view */}
      <div className="no-print thermal-print-btn">
        <button
          onClick={() => window.print()}
          className="thermal-btn"
        >
          Imprimir Recibo
        </button>
      </div>

      {/* Thermal receipt specific styles */}
      <style jsx global>{`
        /* Estilos base para impressão térmica */
        .thermal-receipt {
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
        
        .thermal-date {
          font-size: 12px;
        }
        
        .thermal-order-info {
          font-size: 12px;
          font-weight: 500;
          margin-bottom: 8px;
          color: #000 !important;
          text-align: center;
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
        
        .thermal-total {
          font-size: 16px;
          font-weight: 500;
          border-top: 2px solid #000;
          padding-top: 4px;
          margin-top: 4px;
        }
        
        .thermal-value {
          font-weight: 500;
        }
        
        /* Itens do pedido */
        .thermal-item {
          margin-bottom: 4px;
          font-size: 13px;
          font-weight: 500;
        }
        
        .thermal-item-header {
          margin-bottom: 2px;
        }
        
        .thermal-item-name {
          font-size: 13px;
          font-weight: 500;
        }
        
        .thermal-item-details {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 500;
        }
        
        .thermal-item-total {
          font-weight: 500;
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
          
          .thermal-receipt {
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

export default function ThermalReceiptPage() {
  return (
    <Suspense fallback={
      <ReportLoading 
        title="Carregando Recibo"
        subtitle="Aguarde um momento..."
      />
    }>
      <ThermalReceiptContent />
    </Suspense>
  );
}