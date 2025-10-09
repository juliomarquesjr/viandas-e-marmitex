"use client";

import { ThermalFooter } from '@/app/components/ThermalFooter';
import { useSystemConfig } from '@/app/hooks/useSystemConfig';
import { useEffect, useState } from 'react';

export default function ThermalFooterDemo() {
  const { getConfigValue } = useSystemConfig();
  const [systemTitle, setSystemTitle] = useState<string>('DEMONSTRAÇÃO DO RODAPÉ');

  useEffect(() => {
    const title = getConfigValue('branding_system_title', 'Demonstração do Rodapé');
    setSystemTitle(title.toUpperCase());
  }, [getConfigValue]);
  return (
    <div className="thermal-demo">
      <div className="thermal-header">
        <div className="thermal-title">
          {systemTitle}
        </div>
        <div className="thermal-subtitle">
          INFORMAÇÕES DE CONTATO
        </div>
      </div>

      <div className="thermal-section">
        <div className="thermal-section-title">
          EXEMPLO DE CONTEÚDO:
        </div>
        <div className="thermal-text">
          Este é um exemplo de como as informações de contato
        </div>
        <div className="thermal-text">
          aparecerão no rodapé das impressões térmicas.
        </div>
      </div>

      {/* Rodapé com informações de contato */}
      <ThermalFooter />

      {/* Print button for screen view */}
      <div className="no-print thermal-print-btn">
        <button
          onClick={() => window.print()}
          className="thermal-btn"
        >
          Imprimir Demonstração
        </button>
      </div>

      {/* Thermal receipt specific styles */}
      <style jsx global>{`
        /* Estilos base para impressão térmica */
        .thermal-demo {
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
        
        .thermal-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 2px;
        }
        
        .thermal-subtitle {
          font-size: 13px;
          margin-bottom: 2px;
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
        
        /* Seção de Contato */
        .thermal-contact-section {
          margin: 8px 0;
          text-align: center;
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
        
        /* Telefones lado a lado */
        .thermal-phones-row {
          display: flex;
          justify-content: space-around;
          margin-bottom: 2px;
        }
        
        .thermal-phones-row .thermal-contact-info {
          margin-bottom: 0;
          flex: 1;
          text-align: center;
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
          
          .thermal-demo {
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
