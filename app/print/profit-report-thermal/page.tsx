"use client";

import { ThermalFooter } from '@/app/components/ThermalFooter';
import { ReportLoading } from '@/app/components/ReportLoading';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { ProfitReportData } from '@/lib/types';

function ProfitReportThermalContent() {
  const searchParams = useSearchParams();
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const [reportData, setReportData] = useState<ProfitReportData | null>(null);
  const [contactInfo, setContactInfo] = useState<{
    address: string;
    phones: { mobile: string; landline: string };
  } | null>(null);
  const [systemTitle, setSystemTitle] = useState<string>('COMIDA CASEIRA');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!startDate || !endDate) {
        setError('Período não fornecido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const params = new URLSearchParams({
          startDate,
          endDate,
        });

        const [reportResponse, configResponse] = await Promise.all([
          fetch(`/api/reports/profits?${params.toString()}`),
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
          ].filter(Boolean);
          
          const address = addressParts.join(', ');
          
          const mobile = contactConfigs.find((c: any) => c.key === 'contact_phone_mobile')?.value || '';
          const landline = contactConfigs.find((c: any) => c.key === 'contact_phone_landline')?.value || '';
          
          setContactInfo({
            address,
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
  }, [startDate, endDate]);

  // Auto print when page loads
  useEffect(() => {
    if (reportData && !loading && !error) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [reportData, loading, error]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
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

  if (loading) {
    return (
      <ReportLoading 
        title="Gerando Relatório de Lucros"
        subtitle="Processando dados financeiros..."
      />
    );
  }

  if (error || !reportData) {
    return (
      <div className="thermal-report">
        <div className="thermal-header">
          <div className="thermal-title">Erro</div>
          <div className="thermal-subtitle">{error || 'Dados não encontrados'}</div>
        </div>
      </div>
    );
  }

  const { period, revenue, expenses, profit } = reportData;

  return (
    <div className="thermal-report">
      {/* Header */}
      <div className="thermal-header">
        <div className="thermal-title">{systemTitle}</div>
        <div className="thermal-subtitle">RELATÓRIO DE LUCROS</div>
        <div className="thermal-period">
          {formatDate(period.startDate)} a {formatDate(period.endDate)}
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="thermal-section">
        <div className="thermal-section-title">RESUMO GERAL</div>
        
        <div className="thermal-row">
          <span>Receitas:</span>
          <span className="thermal-value">{formatCurrency(revenue.total)}</span>
        </div>
        <div className="thermal-text" style={{ fontSize: '11px', marginLeft: '4px' }}>
          Vendas: {formatCurrency(revenue.sales)}
        </div>
        <div className="thermal-text" style={{ fontSize: '11px', marginLeft: '4px' }}>
          Fichas: {formatCurrency(revenue.fichaPayments)}
        </div>
        
        <div className="thermal-divider"></div>
        
        <div className="thermal-row">
          <span>Despesas:</span>
          <span className="thermal-value">{formatCurrency(expenses.total)}</span>
        </div>
        
        <div className="thermal-divider"></div>
        
        <div className="thermal-row" style={{ fontSize: '16px', fontWeight: '600', marginTop: '4px' }}>
          <span>LUCRO LÍQUIDO:</span>
          <span className="thermal-value">{formatCurrency(profit.total)}</span>
        </div>
        <div className="thermal-text" style={{ fontSize: '12px', textAlign: 'center', marginTop: '2px' }}>
          Margem: {profit.percentage.toFixed(2)}%
        </div>
      </div>

      {/* Despesas por Tipo */}
      {expenses.details.length > 0 && (
        <div className="thermal-section">
          <div className="thermal-section-title">DESPESAS POR TIPO</div>
          {expenses.details.map((expense) => (
            <div key={expense.typeId} style={{ marginBottom: '4px' }}>
              <div className="thermal-row">
                <span style={{ fontSize: '12px' }}>{expense.typeName}:</span>
                <span className="thermal-value" style={{ fontSize: '12px' }}>
                  {formatCurrency(expense.amountCents)}
                </span>
              </div>
              <div className="thermal-text" style={{ fontSize: '10px', marginLeft: '4px' }}>
                {expense.count} despesa(s)
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top 5 Dias */}
      {reportData.dailyBreakdown && reportData.dailyBreakdown.length > 0 && (
        <div className="thermal-section">
          <div className="thermal-section-title">TOP 5 DIAS</div>
          {reportData.dailyBreakdown.slice(0, 5).map((day: any, index: number) => {
            const dayTotal = Number(day.sales_revenue || 0) + Number(day.ficha_revenue || 0);
            return (
              <div key={index} style={{ marginBottom: '4px' }}>
                <div className="thermal-row">
                  <span style={{ fontSize: '11px' }}>{formatDate(day.date)}:</span>
                  <span className="thermal-value" style={{ fontSize: '12px' }}>
                    {formatCurrency(dayTotal)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <ThermalFooter contactInfo={contactInfo || undefined} />

      {/* Print button for screen view */}
      <div className="no-print thermal-print-btn">
        <button className="thermal-btn" onClick={() => window.print()}>
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
        
        .thermal-period {
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
        
        .thermal-value {
          font-weight: 500;
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

export default function ProfitReportThermalPage() {
  return (
    <Suspense fallback={
      <ReportLoading 
        title="Carregando Relatório"
        subtitle="Aguarde um momento..."
      />
    }>
      <ProfitReportThermalContent />
    </Suspense>
  );
}

