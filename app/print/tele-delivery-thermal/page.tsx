"use client";

import { ThermalFooter } from '@/app/components/ThermalFooter';
import { ReportLoading } from '@/app/components/ReportLoading';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

interface TeleDeliverySale {
  id: string;
  date: string;
  quantity: number;
  priceCents: number;
  totalCents: number;
}

interface TeleDeliveryByDay {
  date: string;
  quantity: number;
  totalCents: number;
}

interface TeleDeliveryData {
  summary: {
    totalSales: number;
    totalAmountCents: number;
    averageAmountCents: number;
    totalDays: number;
  };
  salesByDay: TeleDeliveryByDay[];
  period: {
    startDate: string;
    endDate: string;
  };
}

function TeleDeliveryThermalContent() {
  const searchParams = useSearchParams();
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  const [data, setData] = useState<TeleDeliveryData | null>(null);
  const [contactInfo, setContactInfo] = useState<{
    address: string;
    phones: { mobile: string; landline: string };
  } | null>(null);
  const [systemTitle, setSystemTitle] = useState<string>('COMIDA CASEIRA');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!startDateParam || !endDateParam) {
        setError('Parâmetros de data não fornecidos');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const [teleDeliveryResponse, configResponse] = await Promise.all([
          fetch(`/api/tele-delivery-summary?startDate=${startDateParam}&endDate=${endDateParam}`),
          fetch('/api/config')
        ]);

        if (!teleDeliveryResponse.ok) {
          throw new Error('Falha ao carregar dados de tele entrega');
        }

        const teleDeliveryData = await teleDeliveryResponse.json();
        setData(teleDeliveryData);

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
  }, [startDateParam, endDateParam]);

  // Auto print when page loads
  useEffect(() => {
    if (data && !loading && !error) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [data, loading, error]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    // YYYY-MM-DD deve ser interpretado como data local (evita 1 dia a menos por UTC)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [y, m, d] = dateString.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <ReportLoading title="Carregando dados de tele entrega..." subtitle="Processando..." />;
  }

  if (error || !data) {
    return (
      <div className="thermal-report">
        <div className="thermal-header">
          <div className="thermal-title">Erro</div>
          <div className="thermal-subtitle">{error || 'Dados não encontrados'}</div>
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
          RESUMO DE TELE ENTREGA
        </div>
        <div className="thermal-date">
          {formatDate(data.period.startDate)} a {formatDate(data.period.endDate)}
        </div>
      </div>

      {/* Resumo */}
      <div className="thermal-section">
        <div className="thermal-section-title">
          RESUMO:
        </div>
        <div className="thermal-row">
          <span>Total de Entregas:</span>
          <span className="thermal-value">
            {data.summary.totalSales}
          </span>
        </div>
        <div className="thermal-row">
          <span>Total de Dias:</span>
          <span className="thermal-value">
            {data.summary.totalDays}
          </span>
        </div>
      </div>

      {/* Vendas por Dia */}
      {data.salesByDay.length > 0 && (
        <div className="thermal-section">
          <div className="thermal-section-title">
            VENDAS POR DIA:
          </div>
          {data.salesByDay.map((day, index) => (
            <div key={day.date} className="thermal-transaction">
              <div className="thermal-row">
                <span>{formatDate(day.date)}:</span>
                <span className="thermal-transaction-value">
                  {day.quantity} x {formatCurrency(day.totalCents / day.quantity)}
                </span>
              </div>
              <div className="thermal-row">
                <span>Total:</span>
                <span className="thermal-transaction-value">
                  {formatCurrency(day.totalCents)}
                </span>
              </div>
              {index < data.salesByDay.length - 1 && (
                <div className="thermal-divider"></div>
              )}
            </div>
          ))}
        </div>
      )}

      {data.salesByDay.length > 0 && (
        <div className="thermal-section">
          <div className="thermal-section-title">
            TOTAIS:
          </div>
          <div className="thermal-row">
            <span>Total de Entregas:</span>
            <span className="thermal-value">
              {data.summary.totalSales}
            </span>
          </div>
          <div className="thermal-total-box">
            <div className="thermal-row thermal-total">
              <span>VALOR TOTAL:</span>
              <span className="thermal-value">
                {formatCurrency(data.summary.totalAmountCents)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="thermal-footer">
        <div style={{fontWeight: '500', fontSize: '12px', color: '#000'}}>Gerado em:</div>
        <div style={{fontSize: '11px', color: '#000'}}>
          {new Date().toLocaleString('pt-BR')}
        </div>
      </div>

      {/* Thermal Footer Component */}
      {contactInfo && (
        <ThermalFooter 
          contactInfo={contactInfo}
        />
      )}

      {/* Print button for screen view */}
      <div className="no-print thermal-print-btn">
        <button
          onClick={() => window.print()}
          className="thermal-btn"
        >
          Imprimir Relatório
        </button>
      </div>

      <style jsx global>{`
        /* Estilos base para impressão térmica */
        .thermal-report {
          font-family: 'Consolas', 'Monaco', 'Lucida Console', 'Liberation Mono', 'DejaVu Sans Mono', 'Bitstream Vera Sans Mono', 'Courier New', monospace;
          max-width: 58mm;
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
        }

        /* Logo */
        .thermal-logo {
          margin-bottom: 6px;
        }

        .thermal-logo-img {
          max-width: 50px;
          height: auto;
          display: block;
          margin: 0 auto;
          filter: brightness(0) contrast(100%);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .thermal-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .thermal-subtitle {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .thermal-date {
          font-size: 12px;
          margin-bottom: 2px;
        }

        /* Seções */
        .thermal-section {
          margin-bottom: 8px;
        }

        .thermal-section-title {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .thermal-text {
          font-size: 12px;
          margin-bottom: 2px;
        }

        /* Linhas de dados */
        .thermal-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
          font-size: 12px;
        }

        .thermal-total-box {
          border: 2px solid #000;
          padding: 4px;
          margin-top: 4px;
          margin-bottom: 4px;
        }

        .thermal-total-box .thermal-row {
          margin-bottom: 0;
        }

        .thermal-total {
          font-size: 16px;
          font-weight: 700;
          margin: 0;
        }

        .thermal-value {
          font-weight: 500;
        }

        /* Transações (relatórios) */
        .thermal-transaction {
          margin-bottom: 6px;
        }

        .thermal-transaction-type {
          font-size: 11px;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .thermal-transaction-value {
          font-weight: 500;
        }

        .thermal-description {
          font-size: 12px;
          margin-bottom: 2px;
        }

        /* Separadores */
        .thermal-divider {
          border-bottom: 1px solid #000;
          margin: 4px 0;
        }

        /* Rodapé */
        .thermal-footer {
          text-align: center;
          margin-top: 8px;
          padding-top: 4px;
        }

        /* Seção de Contato */
        .thermal-contact-section {
          margin: 8px 0;
        }

        .thermal-contact-title {
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .thermal-contact-info {
          font-size: 12px;
          margin-bottom: 2px;
        }

        .thermal-icon {
          width: 14px;
          height: 14px;
          vertical-align: middle;
          margin-right: 4px;
          filter: brightness(0) contrast(100%);
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .thermal-separator {
          margin: 8px 0;
          border-top: 1px solid #000;
        }

        /* Botões (apenas para tela) */
        .thermal-print-btn {
          text-align: center;
          margin-top: 16px;
        }

        .thermal-btn {
          background-color: #2563eb;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
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
            box-shadow: none;
          }

          .thermal-report * {
            color: #000 !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function TeleDeliveryThermalPage() {
  return (
    <Suspense fallback={<ReportLoading title="Carregando..." subtitle="Processando..." />}>
      <TeleDeliveryThermalContent />
    </Suspense>
  );
}
