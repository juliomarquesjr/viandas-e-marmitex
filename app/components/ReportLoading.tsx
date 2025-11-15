"use client";

import { BarChart3 } from "lucide-react";

interface ReportLoadingProps {
  title?: string;
  subtitle?: string;
}

export function ReportLoading({ 
  title = "Gerando Relatório",
  subtitle = "Processando dados..."
}: ReportLoadingProps) {
  return (
    <>
      {/* Container Principal */}
      <div className="report-loading-container">
        {/* Ícone Principal com Animação */}
        <div className="report-loading-icon-wrapper">
          <div className="report-loading-icon">
            <BarChart3 className="report-loading-icon-svg" />
          </div>
          <div className="report-loading-aura"></div>
          <div className="report-loading-indicator">
            <div className="report-loading-spinner"></div>
          </div>
        </div>
        
        {/* Textos */}
        <div className="report-loading-text">
          <h3 className="report-loading-title">{title}</h3>
          <p className="report-loading-subtitle">{subtitle}</p>
        </div>
        
        {/* Barras de Progresso Animadas */}
        <div className="report-loading-bars">
          {[40, 60, 80, 60, 70, 50].map((height, index) => (
            <div
              key={index}
              className="report-loading-bar"
              style={{
                height: `${height}%`,
                animationDelay: `${index * 0.1}s`
              }}
            ></div>
          ))}
        </div>
        
        {/* Pontos Animados */}
        <div className="report-loading-dots">
          {[0, 150, 300].map((delay, index) => (
            <div
              key={delay}
              className={`report-loading-dot report-loading-dot-${index}`}
              style={{ animationDelay: `${delay}ms` }}
            ></div>
          ))}
        </div>
      </div>

      {/* Estilos Globais */}
      <style jsx global>{`
        .report-loading-container {
          width: 100%;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 50%, #f3e8ff 100%);
          text-align: center;
        }
        
        .report-loading-icon-wrapper {
          position: relative;
          margin-bottom: 1.5rem;
        }
        
        .report-loading-icon {
          width: 80px;
          height: 80px;
          border-radius: 1rem;
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #a855f7 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .report-loading-icon-svg {
          width: 40px;
          height: 40px;
          color: white;
        }
        
        .report-loading-aura {
          position: absolute;
          inset: -8px;
          border-radius: 1rem;
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #a855f7 100%);
          opacity: 0.2;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          filter: blur(12px);
          z-index: -1;
        }
        
        .report-loading-indicator {
          position: absolute;
          top: 0;
          right: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .report-loading-spinner {
          width: 12px;
          height: 12px;
          border: 2px solid white;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .report-loading-text {
          margin-bottom: 1.5rem;
        }
        
        .report-loading-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 0.5rem;
        }
        
        .report-loading-subtitle {
          font-size: 0.875rem;
          color: #4b5563;
        }
        
        .report-loading-bars {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 0.5rem;
          height: 64px;
          margin-bottom: 1.5rem;
        }
        
        .report-loading-bar {
          width: 12px;
          background: linear-gradient(to top, #3b82f6 0%, #6366f1 50%, #a855f7 100%);
          border-radius: 0.25rem 0.25rem 0 0;
          animation: wave 1.5s ease-in-out infinite;
        }
        
        .report-loading-dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        
        .report-loading-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: bounce 1.4s ease-in-out infinite;
        }
        
        .report-loading-dot-0 {
          background-color: #3b82f6;
        }
        
        .report-loading-dot-1 {
          background-color: #6366f1;
        }
        
        .report-loading-dot-2 {
          background-color: #a855f7;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        
        @keyframes wave {
          0%, 100% {
            transform: scaleY(0.8);
            opacity: 0.7;
          }
          50% {
            transform: scaleY(1.2);
            opacity: 1;
          }
        }
        
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
        
        /* Estilos específicos para impressão térmica */
        @media print {
          .report-loading-container {
            background: white;
            min-height: auto;
            padding: 1rem;
          }
          
          .report-loading-icon {
            background: #000;
            box-shadow: none;
          }
          
          .report-loading-icon-svg {
            filter: brightness(0) invert(1);
          }
          
          .report-loading-aura {
            display: none;
          }
          
          .report-loading-indicator {
            background: #000;
          }
          
          .report-loading-title,
          .report-loading-subtitle {
            color: #000;
          }
          
          .report-loading-bar {
            background: #000;
          }
          
          .report-loading-dot-0,
          .report-loading-dot-1,
          .report-loading-dot-2 {
            background-color: #000;
          }
        }
      `}</style>
    </>
  );
}
