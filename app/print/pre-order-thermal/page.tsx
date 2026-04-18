"use client";

import { ThermalFooter } from '@/app/components/ThermalFooter';
import { ReportLoading } from '@/app/components/ReportLoading';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import html2canvas from 'html2canvas';

type PreOrderItem = {
  id: string;
  quantity: number;
  priceCents: number;
  weightKg?: number | null;
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

type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  doc?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
};

function PreOrderThermalContent() {
  const searchParams = useSearchParams();
  const preOrderId = searchParams.get('preOrderId');
  const printSessionId = searchParams.get('printSessionId');
  const autoPrint = searchParams.get('autoPrint') === '1';
  const captureMode = searchParams.get('captureMode') === 'true';

  const [preOrder, setPreOrder] = useState<PreOrder | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contactInfo, setContactInfo] = useState<{
    address: string;
    phones: { mobile: string; landline: string };
  } | null>(null);
  const [systemTitle, setSystemTitle] = useState<string>('COMIDA CASEIRA');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pixQrCodeUrl, setPixQrCodeUrl] = useState<string | null>(null);
  const [pixChave, setPixChave] = useState<string | null>(null);
  const [generatingQr, setGeneratingQr] = useState(false);

  const notifyPrintDialogOpening = () => {
    const payload = {
      type: 'desktop-print-dialog-opening',
      printSessionId: printSessionId || null,
    };

    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, window.location.origin);
      }
    } catch (error) {
      console.warn('Falha ao notificar parent da impressao:', error);
    }

    try {
      if (window.opener) {
        window.opener.postMessage(payload, window.location.origin);
      }
    } catch (error) {
      console.warn('Falha ao notificar opener da impressao:', error);
    }
  };

  const notifyPrintFinished = () => {
    const payload = {
      type: 'desktop-print-finished',
      printSessionId: printSessionId || null,
    };

    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, window.location.origin);
      }
    } catch (error) {
      console.warn('Falha ao notificar finalizacao da impressao no parent:', error);
    }

    try {
      if (window.opener) {
        window.opener.postMessage(payload, window.location.origin);
      }
    } catch (error) {
      console.warn('Falha ao notificar finalizacao da impressao no opener:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!preOrderId) {
        setError('ID do pré-pedido não fornecido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Carregar pré-pedido e informações de contato em paralelo
        const [preOrderResponse, configResponse] = await Promise.all([
          fetch(`/api/pre-orders?id=${preOrderId}`),
          fetch('/api/config/public')
        ]);

        if (!preOrderResponse.ok) {
          throw new Error('Falha ao carregar pré-pedido');
        }

        const data = await preOrderResponse.json();
        setPreOrder(data);

        // Buscar dados completos do cliente se houver customerId
        if (data.customer?.id) {
          try {
            const customerResponse = await fetch(`/api/customers/${data.customer.id}`);
            if (customerResponse.ok) {
              const customerData = await customerResponse.json();
              setCustomer(customerData);
            }
          } catch (err) {
            console.error('Erro ao carregar dados do cliente:', err);
          }
        }

        // Processar informações de contato e título do sistema
        if (configResponse.ok) {
          const configs = await configResponse.json();
          const contactConfigs = configs.filter((config: any) => config.category === 'contact');
          const brandingConfigs = configs.filter((config: any) => config.category === 'branding');
          const paymentConfigs = configs.filter((config: any) => config.category === 'payment');
          
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
          
          // Extrair chave PIX - priorizar payment_pix_key
          const pixChaveConfig = paymentConfigs.find((c: any) => c.key === 'payment_pix_key');
          if (pixChaveConfig?.value && pixChaveConfig.value.trim()) {
            setPixChave(pixChaveConfig.value.trim());
          } else if (mobile && mobile.trim()) {
            // Fallback para telefone móvel se não tiver chave PIX configurada
            setPixChave(mobile.replace(/\D/g, ''));
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [preOrderId]);

  // Gerar QR code PIX quando os dados necessários estiverem disponíveis
  useEffect(() => {
    const generatePixQr = async () => {
      // Gerar QR Code para pré-pedido se tiver valor e chave PIX
      if (preOrder && preOrder.totalCents > 0 && !pixQrCodeUrl && !loading && !generatingQr && pixChave) {
        setGeneratingQr(true);
        try {
          // Validar se temos uma chave PIX válida
          if (!pixChave || pixChave.length < 10) {
            setGeneratingQr(false);
            return;
          }
          
          // Buscar cidade diretamente das configurações
          let cidadePix = 'BR';
          try {
            const configResponse = await fetch('/api/config/public');
            if (configResponse.ok) {
              const configs = await configResponse.json();
              const contactConfigs = configs.filter((config: any) => config.category === 'contact');
              const cidadeConfig = contactConfigs.find((c: any) => c.key === 'contact_address_city');
              
              if (cidadeConfig?.value && cidadeConfig.value.trim()) {
                const cidadeRaw = cidadeConfig.value.trim();
                const cepRegex = /^\d{5}-?\d{3}$/;
                if (!cepRegex.test(cidadeRaw)) {
                  cidadePix = cidadeRaw.replace(/\s+/g, ' ').trim().substring(0, 15);
                }
              }
            }
          } catch (err) {
            console.warn('Erro ao buscar cidade das configurações, usando padrão BR:', err);
          }
          
          // Garantir que o nome tenha pelo menos 1 caractere e remover espaços extras
          const nomePix = (systemTitle && systemTitle.trim()) 
            ? systemTitle.trim().replace(/\s+/g, ' ').substring(0, 25) 
            : 'PIX';
          
          const qrResponse = await fetch('/api/pix/generate-qr', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chavePix: pixChave,
              valorCents: preOrder.totalCents,
              nomeBeneficiario: nomePix,
              cidade: cidadePix
            })
          });
          
          if (qrResponse.ok) {
            const qrData = await qrResponse.json();
            if (qrData.qrCodeUrl) {
              setPixQrCodeUrl(qrData.qrCodeUrl);
            } else {
              setPixQrCodeUrl('');
            }
          } else {
            setPixQrCodeUrl('');
          }
        } catch (err) {
          console.error('Erro ao gerar QR code PIX:', err);
          setPixQrCodeUrl('');
        } finally {
          setGeneratingQr(false);
        }
      }
    };
    
    const timer = setTimeout(() => {
      generatePixQr();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [preOrder, contactInfo, systemTitle, pixChave, pixQrCodeUrl, loading, generatingQr]);

  const runBitmapCapture = async () => {
    const el = document.querySelector('.preorder-thermal-receipt') as HTMLElement | null;
    if (!el) return;
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const payload = {
      type: 'thermal-bitmap-capture',
      printSessionId: printSessionId ?? null,
      imageData: Array.from(data),
      width: canvas.width,
      height: canvas.height,
    };
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, window.location.origin);
      }
    } catch (err) {
      console.warn('Falha ao enviar bitmap para o parent:', err);
    }
  };

  // Auto print when page loads (aguardar QR code se necessário)
  useEffect(() => {
    const startAction = (delayMs: number) => {
      setTimeout(() => {
        if (captureMode) {
          runBitmapCapture();
        } else {
          if (!autoPrint) notifyPrintDialogOpening();
          window.print();
        }
      }, delayMs);
    };

    if (preOrder && !loading && !error) {
      if (!pixChave) {
        startAction(500);
        return;
      }
      if (pixQrCodeUrl) {
        startAction(2000);
      } else if (!generatingQr && pixChave) {
        startAction(3000);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint, captureMode, preOrder, loading, error, pixQrCodeUrl, pixChave, generatingQr]);

  useEffect(() => {
    const handleAfterPrint = () => {
      notifyPrintFinished();
    };

    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

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

  const formatCustomerAddress = (address?: Customer['address']) => {
    if (!address) return null;
    
    const parts = [
      address.street && `${address.street}${address.number ? `, ${address.number}` : ''}`,
      address.complement,
      address.neighborhood,
      address.city && address.state && `${address.city}/${address.state}`,
      address.zip
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : null;
  };

  if (loading) {
    return (
      <ReportLoading 
        title="Gerando Pré-Pedido"
        subtitle="Processando dados..."
      />
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
    <div className={`thermal-receipt preorder-thermal-receipt${captureMode ? ' capture-mode' : ''}`}>
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
          PRÉ-PEDIDO
        </div>
        <div className="thermal-date">
          {formatDateTime(preOrder.createdAt)}
        </div>
        <div className="thermal-order-info">
          Pré-Pedido #{preOrder.id.slice(-8).toUpperCase()}
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
          {customer && formatCustomerAddress(customer.address) && (
            <div className="thermal-text">
              {formatCustomerAddress(customer.address)}
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
              <span>
                {item.weightKg && Number(item.weightKg) > 0 ? (
                  <>
                    {Number(item.weightKg).toFixed(3)} kg × {formatCurrency(item.priceCents / Number(item.weightKg))}/kg
                  </>
                ) : (
                  <>
                    {item.quantity}x {formatCurrency(item.priceCents)}
                  </>
                )}
              </span>
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
        
        <div className="thermal-row">
          <span>Total:</span>
          <span className="thermal-value">
            {formatCurrency(preOrder.totalCents)}
          </span>
        </div>
      </div>

      {/* Notes */}
      {preOrder.notes && (
        <div style={{marginBottom: '8px', paddingBottom: '6px'}}>
          <div className="thermal-section-title">
            OBSERVAÇÕES:
          </div>
          <div className="thermal-text">
            {preOrder.notes}
          </div>
        </div>
      )}

      {/* QR Code PIX */}
      {pixChave && (
        <div className="pix-qr-section">
          {generatingQr && !pixQrCodeUrl && (
            <div className="thermal-text" style={{fontSize: '14px', fontWeight: 'bold'}}>
              Gerando QR Code...
            </div>
          )}
          {pixQrCodeUrl ? (
            <>
              <img
                src={pixQrCodeUrl}
                alt="QR Code PIX"
                className="pix-qr-img"
                onError={(e) => {
                  console.error('Erro ao carregar imagem do QR code:', e);
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="pix-qr-info">
                <div className="thermal-text" style={{fontSize: '13px', fontWeight: 'bold'}}>
                  Valor: {formatCurrency(preOrder.totalCents)}
                </div>
              </div>
            </>
          ) : !generatingQr && (
            <div className="thermal-text" style={{fontSize: '13px', color: '#666'}}>
              Aguardando geração do QR code...
            </div>
          )}
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

        /* Escopo do pré-pedido para evitar herança de outras telas térmicas */
        .preorder-thermal-receipt {
          font-family: 'Consolas', 'Monaco', 'Lucida Console', 'Liberation Mono', 'DejaVu Sans Mono', 'Bitstream Vera Sans Mono', 'Courier New', monospace;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.3;
          max-width: 280px;
          margin: 0 auto;
          padding: 8px;
          background: white;
        }

        .preorder-thermal-receipt .thermal-header {
          text-align: center;
          margin-bottom: 8px;
          border-bottom: 2px solid #000;
          padding-bottom: 6px;
        }

        .preorder-thermal-receipt .thermal-logo {
          margin-bottom: 6px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .preorder-thermal-receipt .thermal-logo-img {
          max-width: 50px;
          max-height: 50px;
          width: auto;
          height: auto;
        }

        .preorder-thermal-receipt .thermal-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .preorder-thermal-receipt .thermal-subtitle,
        .preorder-thermal-receipt .thermal-section-title,
        .preorder-thermal-receipt .thermal-item-name {
          font-size: 13px;
        }

        .preorder-thermal-receipt .thermal-date,
        .preorder-thermal-receipt .thermal-order-info,
        .preorder-thermal-receipt .thermal-text,
        .preorder-thermal-receipt .thermal-contact-info,
        .preorder-thermal-receipt .thermal-separator {
          font-size: 12px;
        }

        .preorder-thermal-receipt .thermal-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 2px;
        }

        .preorder-thermal-receipt .thermal-section {
          margin-bottom: 8px;
          border-bottom: 2px solid #000;
          padding-bottom: 6px;
        }

        .preorder-thermal-receipt .thermal-item {
          margin-bottom: 4px;
          font-size: 13px;
          font-weight: 500;
        }

        .preorder-thermal-receipt .thermal-item-details {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 500;
        }

        .preorder-thermal-receipt .thermal-divider {
          border-bottom: 1px solid #333;
          margin: 4px 0;
        }

        .preorder-thermal-receipt .thermal-footer {
          text-align: center;
          font-size: 12px;
          font-weight: 500;
          color: #333;
          margin-top: 8px;
          padding-top: 6px;
          border-top: 3px solid #000;
        }

        .preorder-thermal-receipt .thermal-contact-section {
          margin: 8px 0;
          text-align: left;
        }

        .preorder-thermal-receipt .thermal-contact-title {
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 4px;
          color: #000 !important;
        }

        .preorder-thermal-receipt .thermal-contact-info {
          font-weight: 500;
          margin-bottom: 10px;
          color: #000 !important;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .preorder-thermal-receipt .thermal-icon {
          width: 14px;
          height: 14px;
        }

        .preorder-thermal-receipt .thermal-print-btn {
          text-align: center;
          margin-top: 16px;
        }

        .preorder-thermal-receipt .thermal-btn {
          font-size: 14px;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .capture-mode .no-print {
          display: none !important;
        }

        .pix-qr-section {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          width: 100%;
        }

        .pix-qr-img {
          width: 100px;
          height: 100px;
          flex-shrink: 0;
          border: 2px solid #000;
          padding: 3px;
          background-color: #fff;
          display: block;
        }

        .pix-qr-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          gap: 4px;
        }

        @media print {
          .preorder-thermal-receipt {
            max-width: none;
            width: 58mm;
            margin: 0;
            padding: 2mm;
          }

        }
      `}</style>
    </div>
  );
}

export default function PreOrderThermalPage() {
  return (
    <Suspense fallback={
      <ReportLoading 
        title="Carregando Pré-Pedido"
        subtitle="Aguarde um momento..."
      />
    }>
      <PreOrderThermalContent />
    </Suspense>
  );
}
