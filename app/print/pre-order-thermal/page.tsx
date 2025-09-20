"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

type PreOrderItem = {
  id: string;
  quantity: number;
  priceCents: number;
  product: {
    id: string;
    name: string;
  };
};

type PreOrder = {
  id: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  notes: string | null;
  createdAt: string;
  items: PreOrderItem[];
  customer?: {
    id: string;
    name: string;
    phone?: string;
  };
};

function PreOrderThermalContent() {
  const searchParams = useSearchParams();
  const preOrderId = searchParams.get('preOrderId');

  const [preOrder, setPreOrder] = useState<PreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPreOrder = async () => {
      if (!preOrderId) {
        setError('ID do pré-pedido não fornecido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/pre-orders?id=${preOrderId}`);

        if (!response.ok) {
          throw new Error('Falha ao carregar pré-pedido');
        }

        const data = await response.json();
        setPreOrder(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    loadPreOrder();
  }, [preOrderId]);

  // Auto print when page loads
  useEffect(() => {
    if (preOrder && !loading && !error) {
      // Small delay to ensure content is rendered
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [preOrder, loading, error]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-sm mb-2">Carregando...</div>
        </div>
      </div>
    );
  }

  if (error || !preOrder) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <div className="text-sm mb-2">Erro ao carregar</div>
          <div className="text-xs">{error || 'Pré-pedido não encontrado'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="thermal-receipt">
      {/* Header */}
      <div className="thermal-header">
        <div className="thermal-title">
          COMIDA CASEIRA
        </div>
        <div className="thermal-subtitle">
          PRÉ-PEDIDO
        </div>
        <div className="thermal-date">
          {formatDateTime(preOrder.createdAt)}
        </div>
      </div>

      {/* Customer Info */}
      {preOrder.customer && (
        <div className="thermal-section">
          <div className="thermal-section-title">
            CLIENTE:
          </div>
          <div className="thermal-text">
            {preOrder.customer.name}
          </div>
          {preOrder.customer.phone && (
            <div className="thermal-text">
              Tel: {preOrder.customer.phone}
            </div>
          )}
        </div>
      )}

      {/* PreOrder Items */}
      <div className="thermal-section">
        <div className="thermal-section-title">
          ITENS:
        </div>
        
        {preOrder.items.map((item, index) => (
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
            
            {index < preOrder.items.length - 1 && (
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
            {formatCurrency(preOrder.subtotalCents)}
          </span>
        </div>
        
        {preOrder.discountCents > 0 && (
          <div className="thermal-row">
            <span>Desconto:</span>
            <span className="thermal-value">
              -{formatCurrency(preOrder.discountCents)}
            </span>
          </div>
        )}
        
        <div className="thermal-row thermal-total">
          <span>TOTAL:</span>
          <span className="thermal-value">
            {formatCurrency(preOrder.totalCents)}
          </span>
        </div>
      </div>

      {/* Notes */}
      {preOrder.notes && (
        <div className="thermal-section">
          <div className="thermal-section-title">
            OBSERVAÇÕES:
          </div>
          <div className="thermal-text">
            {preOrder.notes}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="thermal-footer">
        <div style={{fontWeight: '900', fontSize: '14px', color: '#333'}}>Pré-Pedido #{preOrder.id.slice(-8).toUpperCase()}</div>
        <div className="thermal-separator">
          ================================
        </div>
      </div>

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
          font-size: 16px;
          font-weight: bold;
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
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 2px;
        }
        
        .thermal-subtitle {
          font-size: 15px;
          margin-bottom: 2px;
        }
        
        .thermal-date {
          font-size: 14px;
        }
        
        /* Seções */
        .thermal-section {
          margin-bottom: 8px;
          border-bottom: 2px solid #000;
          padding-bottom: 6px;
        }
        
        .thermal-section-title {
          font-size: 15px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        
        .thermal-text {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 2px;
        }
        
        /* Linhas de dados */
        .thermal-row {
          display: flex;
          justify-content: space-between;
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 2px;
        }
        
        .thermal-total {
          font-size: 18px;
          font-weight: 900;
          border-top: 2px solid #000;
          padding-top: 4px;
          margin-top: 4px;
        }
        
        .thermal-value {
          font-weight: 900;
        }
        
        /* Itens do pedido */
        .thermal-item {
          margin-bottom: 4px;
          font-size: 15px;
          font-weight: bold;
        }
        
        .thermal-item-header {
          margin-bottom: 2px;
        }
        
        .thermal-item-name {
          font-size: 15px;
          font-weight: bold;
        }
        
        .thermal-item-details {
          display: flex;
          justify-content: space-between;
          font-size: 15px;
          font-weight: bold;
        }
        
        .thermal-item-total {
          font-weight: 900;
        }
        
        /* Separadores */
        .thermal-divider {
          border-bottom: 1px solid #333;
          margin: 4px 0;
        }
        
        /* Rodapé */
        .thermal-footer {
          text-align: center;
          font-size: 14px;
          font-weight: 900;
          color: #333;
          margin-top: 8px;
          padding-top: 6px;
          border-top: 3px solid #000;
        }
        
        .thermal-separator {
          margin: 8px 0;
          font-weight: 900;
          font-size: 14px;
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

export default function PreOrderThermalPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-sm mb-2">Carregando...</div>
        </div>
      </div>
    }>
      <PreOrderThermalContent />
    </Suspense>
  );
}