import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { amountDueCents } from './closing-report';
import { fetchPublicConfigs, readPixSettings, requestPixCharge, type PixCharge, type PixSettings } from './pix-qr';

export interface PDFGenerationOptions {
  filename?: string;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  quality?: number;
  compress?: boolean;
  imageQuality?: number;
  /** O que o resumo do fechamento mostra (mesmas opções da impressão). Tudo ligado por padrão. */
  show?: { debt?: boolean; period?: boolean; payments?: boolean };
}

export class PDFGenerator {
  /**
   * Gera PDF a partir de HTML
   */
  static async generateFromHTML(
    htmlContent: string, 
    options: PDFGenerationOptions = {}
  ): Promise<Blob> {
    return (await this.renderHTML(htmlContent, options)).blob;
  }

  /**
   * Gera o PDF e também as imagens das páginas (para a prévia na tela mostrar exatamente o que vai no arquivo).
   * Cada página leva só a sua fatia da imagem, então o arquivo cresce com o conteúdo, não com o número de páginas.
   */
  static async renderHTML(
    htmlContent: string, 
    options: PDFGenerationOptions = {}
  ): Promise<{ blob: Blob; pages: string[] }> {
    const {
      filename = 'relatorio.pdf',
      format = 'a4',
      orientation = 'portrait',
      quality = 0.98,
      compress = true,
      imageQuality = 0.7
    } = options;

    // Verificar se estamos no browser
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('PDF generation only works in browser environment');
    }

    // Criar elemento temporário com o HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '210mm'; // A4 width
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    tempDiv.style.fontSize = '12px';
    tempDiv.style.lineHeight = '1.4';
    tempDiv.style.color = '#333';
    tempDiv.style.padding = '20px';
    
    document.body.appendChild(tempDiv);

    try {
      console.log('Elemento temporário criado, dimensões:', {
        scrollWidth: tempDiv.scrollWidth,
        scrollHeight: tempDiv.scrollHeight,
        offsetWidth: tempDiv.offsetWidth,
        offsetHeight: tempDiv.offsetHeight
      });

      // Aguardar um pouco para o CSS ser aplicado
      await new Promise(resolve => setTimeout(resolve, 100));

      // Converter HTML para canvas com configurações otimizadas para Vercel
      const canvas = await html2canvas(tempDiv, {
        scale: compress ? 1.2 : 1.5, // Reduzir escala para arquivos menores
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: tempDiv.scrollWidth || 800,
        height: tempDiv.scrollHeight || 1200,
        logging: false,
        imageTimeout: 15000,
        removeContainer: true
      });

      console.log('Canvas gerado, dimensões:', {
        width: canvas.width,
        height: canvas.height
      });

      // Criar PDF
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format
      });

      const imgWidth = 210; // largura da A4 em mm
      const pageHeightMm = 297; // altura da A4 em mm
      const pageHeightPx = Math.floor((canvas.width * pageHeightMm) / imgWidth);
      const pageCount = Math.max(1, Math.ceil(canvas.height / pageHeightPx));
      const jpegQuality = compress ? Math.min(imageQuality, 0.7) : imageQuality;
      const pages: string[] = [];

      for (let i = 0; i < pageCount; i++) {
        const sliceHeight = Math.min(pageHeightPx, canvas.height - i * pageHeightPx);
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = sliceHeight;
        const ctx = slice.getContext('2d');
        if (!ctx) throw new Error('Não foi possível montar a página do PDF.');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, i * pageHeightPx, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        const data = slice.toDataURL('image/jpeg', jpegQuality);
        if (i > 0) pdf.addPage();
        pdf.addImage(data, 'JPEG', 0, 0, imgWidth, (sliceHeight * imgWidth) / canvas.width);
        pages.push(data);
      }

      // Converter para Blob com compressão
      const pdfBlob = pdf.output('blob');
      
      console.log('PDF gerado com sucesso, tamanho:', pdfBlob.size);
      
      return { blob: pdfBlob, pages };
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      throw new Error(`Erro ao gerar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      // Remover elemento temporário
      if (document.body.contains(tempDiv)) {
        document.body.removeChild(tempDiv);
      }
    }
  }

  /**
   * Gera PDF a partir de URL de relatório
   */
  static async generateFromReportURL(
    reportUrl: string,
    options: PDFGenerationOptions = {}
  ): Promise<Blob> {
    try {
      // Buscar HTML do relatório
      const response = await fetch(reportUrl);
      if (!response.ok) {
        throw new Error('Erro ao carregar relatório');
      }
      
      const htmlContent = await response.text();
      
      // Gerar PDF
      return await this.generateFromHTML(htmlContent, options);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      throw error;
    }
  }

  /**
   * Gera PDF de relatório de fechamento de cliente
   */
  static async generateCustomerClosingReport(
    customerId: string,
    startDate: string,
    endDate: string,
    options: PDFGenerationOptions = {}
  ): Promise<Blob> {
    return (await this.generateCustomerClosingReportWithPreview(customerId, startDate, endDate, options)).blob;
  }

  /**
   * O mesmo PDF, junto das imagens das páginas (prévia) e do valor que o fechamento cobra.
   * Quando há valor a pagar e a chave PIX está configurada, o PDF leva o QR do PIX desse valor
   * (o mesmo valor do QR impresso no papel).
   */
  static async generateCustomerClosingReportWithPreview(
    customerId: string,
    startDate: string,
    endDate: string,
    options: PDFGenerationOptions = {}
  ): Promise<{ blob: Blob; pages: string[]; amountDueCents: number; hasPix: boolean }> {
    try {
      // Buscar dados do relatório
      const response = await fetch(`/api/customers/${customerId}/report?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar dados do relatório');
      }
      
      const reportData = await response.json();

      // Nome da loja e PIX (as mesmas configurações públicas que as páginas de impressão usam)
      const configs = await fetchPublicConfigs().catch(() => []);
      const storeName = configs.find((c) => c.key === 'branding_system_title')?.value?.trim() || 'Sabores de Casa';
      const due = amountDueCents(reportData);
      let pix: { settings: PixSettings; charge: PixCharge } | null = null;
      if (due > 0) {
        const settings = readPixSettings(configs);
        const charge = settings ? await requestPixCharge(due, settings) : null;
        if (settings && charge) pix = { settings, charge };
      }
      
      // Gerar HTML do relatório
      const { show, ...renderOptions } = options;
      const htmlContent = this.generateReportHTML(reportData, { storeName, amountDueCents: due, pix, show });
      
      // Gerar PDF com compressão otimizada para Vercel
      const { blob, pages } = await this.renderHTML(htmlContent, {
        filename: `relatorio-fechamento-${customerId}-${startDate}-${endDate}.pdf`,
        compress: true,
        imageQuality: 0.6,
        quality: 0.8,
        ...renderOptions
      });
      return { blob, pages, amountDueCents: due, hasPix: pix !== null };
    } catch (error) {
      console.error('Erro ao gerar PDF do relatório:', error);
      throw error;
    }
  }

  /**
   * Gera HTML do relatório para PDF
   */
  private static generateReportHTML(
    reportData: any,
    extras: { storeName?: string; amountDueCents?: number; pix?: { settings: PixSettings; charge: PixCharge } | null; show?: PDFGenerationOptions['show'] } = {}
  ): string {
    const { customer, period, summary, details, metadata } = reportData;
    const storeName = extras.storeName || 'Sabores de Casa';
    const amountDue = extras.amountDueCents ?? 0;
    const pix = extras.pix ?? null;
    const showDebt = extras.show?.debt !== false;
    const showPeriod = extras.show?.period !== false;
    const showPayments = extras.show?.payments !== false;
    const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

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
      details.periodOrders.forEach((order: any) => {
        const itemsDescription = order.items.map((item: any) => 
          `${item.quantity}x ${esc(item.product?.name)}`
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
      details.fichaPayments.forEach((payment: any) => {
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

      // Ordenar por data (mais antigo primeiro)
      return transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    const allTransactions = createTransactionList();

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório de Fechamento - ${esc(customer.name)}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: white;
            padding: 20px;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          
          .header h1 {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .header h2 {
            font-size: 18px;
            font-weight: 600;
            color: #666;
            margin-bottom: 10px;
          }
          
          .header .period {
            font-size: 14px;
            color: #888;
          }
          
          .customer-info {
            margin-bottom: 25px;
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
          }
          
          .customer-info h3 {
            font-size: 16px;
            margin-bottom: 10px;
            color: #333;
          }
          
          .customer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          
          .customer-item {
            margin-bottom: 5px;
          }
          
          .customer-item .label {
            font-size: 11px;
            color: #666;
            font-weight: 500;
          }
          
          .customer-item .value {
            font-size: 12px;
            font-weight: 600;
          }
          
          .summary {
            margin-bottom: 25px;
          }
          
          .summary h3 {
            font-size: 16px;
            margin-bottom: 15px;
            color: #333;
          }
          
          .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
          }
          
          .summary-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
            border-left: 4px solid #ddd;
          }
          
          .summary-item.debt {
            border-left-color: #dc2626;
          }
          
          .summary-item.consumption {
            border-left-color: #059669;
          }
          
          .summary-item.payment {
            border-left-color: #2563eb;
          }
          
          .summary-item .label {
            font-size: 11px;
            color: #666;
            margin-bottom: 5px;
          }
          
          .summary-item .value {
            font-size: 16px;
            font-weight: bold;
          }
          
          .transactions {
            margin-bottom: 25px;
          }
          
          .transactions h3 {
            font-size: 16px;
            margin-bottom: 15px;
            color: #333;
          }
          
          .transactions-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          
          .transactions-table th {
            background: #f8f9fa;
            padding: 8px;
            text-align: left;
            font-weight: 600;
            border: 1px solid #ddd;
          }
          
          .transactions-table td {
            padding: 8px;
            border: 1px solid #ddd;
          }
          
          .transactions-table .date {
            width: 80px;
          }
          
          .transactions-table .description {
            width: auto;
          }
          
          .transactions-table .value {
            width: 100px;
            text-align: right;
          }
          
          .value-positive {
            color: #dc2626;
            font-weight: 600;
          }
          
          .value-negative {
            color: #059669;
            font-weight: 600;
          }
          
          .summary-item.due {
            border-color: #fca5a5;
            background: #fef2f2;
          }

          .pix-box {
            display: flex;
            align-items: center;
            gap: 20px;
            margin-top: 24px;
            padding: 16px;
            border: 1px solid #ddd;
            border-radius: 8px;
            page-break-inside: avoid;
          }

          .pix-box img {
            flex: none;
            width: 132px;
            height: 132px;
          }

          .pix-text h3 {
            font-size: 15px;
            margin-bottom: 4px;
          }

          .pix-amount {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 6px;
          }

          .pix-code {
            margin-top: 8px;
            font-family: 'Courier New', monospace;
            font-size: 8px;
            line-height: 1.3;
            word-break: break-all;
            color: #555;
          }

          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 11px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${esc(storeName)}</h1>
          <h2>RELATÓRIO DE FECHAMENTO</h2>
          <div class="period">
            Período: ${formatDate(period.startDate)} a ${formatDate(period.endDate)} | 
            Gerado em: ${formatDateTime(metadata.generatedAt)}
          </div>
        </div>

        <div class="customer-info">
          <h3>Dados do Cliente</h3>
          <div class="customer-grid">
            <div class="customer-item">
              <div class="label">Nome</div>
              <div class="value">${esc(customer.name)}</div>
            </div>
            <div class="customer-item">
              <div class="label">Telefone</div>
              <div class="value">${esc(customer.phone)}</div>
            </div>
            ${customer.email ? `
            <div class="customer-item">
              <div class="label">Email</div>
              <div class="value">${esc(customer.email)}</div>
            </div>
            ` : ''}
            ${customer.doc ? `
            <div class="customer-item">
              <div class="label">Documento</div>
              <div class="value">${esc(customer.doc)}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="summary">
          <h3>Resumo Financeiro</h3>
          <div class="summary-grid">
            ${showDebt ? `
            <div class="summary-item debt">
              <div class="label">Saldo Devedor</div>
              <div class="value">${formatCurrency(summary.debtBalanceCents)}</div>
            </div>
            ` : ''}
            ${showPeriod ? `
            <div class="summary-item consumption">
              <div class="label">Consumo no Período</div>
              <div class="value">${formatCurrency(summary.periodConsumptionCents)}</div>
            </div>
            ` : ''}
            ${amountDue > 0 ? `
            <div class="summary-item due">
              <div class="label">Valor a Pagar</div>
              <div class="value">${formatCurrency(amountDue)}</div>
            </div>
            ` : ''}
            ${showPayments && summary.totalPaymentsCents > 0 ? `
            <div class="summary-item payment">
              <div class="label">Pagamentos</div>
              <div class="value">${formatCurrency(summary.totalPaymentsCents)}</div>
            </div>
            ` : ''}
          </div>
        </div>

        ${allTransactions.length > 0 ? `
        <div class="transactions">
          <h3>Histórico de Transações</h3>
          <table class="transactions-table">
            <thead>
              <tr>
                <th class="date">Data</th>
                <th class="description">Descrição</th>
                <th class="value">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${allTransactions.map(transaction => `
                <tr>
                  <td>${formatDate(transaction.date)}</td>
                  <td>${transaction.description}</td>
                  <td class="${transaction.type === 'payment' ? 'value-negative' : 'value-positive'}">
                    ${transaction.type === 'payment' ? '-' : '+'}${formatCurrency(Math.abs(transaction.value))}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${pix ? `
        <div class="pix-box">
          <img src="${esc(pix.charge.qrCodeUrl)}" width="132" height="132" alt="QR code do PIX" />
          <div class="pix-text">
            <h3>Pague por PIX</h3>
            <p class="pix-amount">${formatCurrency(amountDue)}</p>
            <p>Abra o app do seu banco, escolha PIX e leia o QR code${pix.charge.payload ? ' ou use o PIX copia e cola abaixo' : ''}.</p>
            ${pix.charge.payload ? `<p class="pix-code">${esc(pix.charge.payload)}</p>` : ''}
          </div>
        </div>
        ` : ''}

        <div class="footer">
          <p>Relatório gerado em ${formatDateTime(metadata.generatedAt)}</p>
          <p>${esc(storeName)}</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Converte Blob para Buffer (para uso em APIs)
   */
  static async blobToBuffer(blob: Blob): Promise<Buffer> {
    const arrayBuffer = await blob.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Converte Blob para base64 (para uso em emails)
   */
  static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remover o prefixo "data:application/pdf;base64,"
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Verifica se o PDF é muito grande para Vercel (limite ~4.5MB)
   */
  static isPDFTooLarge(pdfBlob: Blob): boolean {
    // Vercel tem limite de ~4.5MB para payload de função
    // Base64 aumenta o tamanho em ~33%, então 3.4MB é o limite seguro
    return pdfBlob.size > 3.4 * 1024 * 1024; // 3.4MB
  }

  /**
   * Gera PDF com compressão agressiva se necessário
   */
  static async generateCompressedPDF(
    htmlContent: string, 
    options: PDFGenerationOptions = {}
  ): Promise<Blob> {
    const compressedOptions = {
      ...options,
      compress: true,
      imageQuality: 0.5,
      quality: 0.7,
      format: 'a4' as const,
      orientation: 'portrait' as const
    };

    let pdfBlob = await this.generateFromHTML(htmlContent, compressedOptions);
    
    // Se ainda for muito grande, tentar com qualidade ainda menor
    if (this.isPDFTooLarge(pdfBlob)) {
      console.log('PDF ainda muito grande, aplicando compressão agressiva...');
      const aggressiveOptions = {
        ...compressedOptions,
        imageQuality: 0.3,
        quality: 0.5
      };
      
      pdfBlob = await this.generateFromHTML(htmlContent, aggressiveOptions);
      
      if (this.isPDFTooLarge(pdfBlob)) {
        console.warn('PDF ainda muito grande mesmo com compressão agressiva:', pdfBlob.size);
        throw new Error('PDF muito grande para envio. Tente um período menor ou contate o suporte.');
      }
    }

    return pdfBlob;
  }
}
