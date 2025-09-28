import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PDFGenerationOptions {
  filename?: string;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  quality?: number;
  compress?: boolean;
  imageQuality?: number;
}

export class PDFGenerator {
  /**
   * Gera PDF a partir de HTML
   */
  static async generateFromHTML(
    htmlContent: string, 
    options: PDFGenerationOptions = {}
  ): Promise<Blob> {
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

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Converter canvas para imagem comprimida se necessário
      let imageData = canvas.toDataURL('image/jpeg', imageQuality);
      if (compress) {
        // Usar JPEG com qualidade reduzida para arquivos menores
        imageData = canvas.toDataURL('image/jpeg', 0.6);
      }

      // Adicionar imagem ao PDF
      pdf.addImage(imageData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Adicionar páginas se necessário
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imageData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Converter para Blob com compressão
      const pdfBlob = pdf.output('blob');
      
      console.log('PDF gerado com sucesso, tamanho:', pdfBlob.size);
      
      return pdfBlob;
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
    try {
      // Buscar dados do relatório
      const response = await fetch(`/api/customers/${customerId}/report?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar dados do relatório');
      }
      
      const reportData = await response.json();
      
      // Gerar HTML do relatório
      const htmlContent = this.generateReportHTML(reportData);
      
      // Gerar PDF com compressão otimizada para Vercel
      return await this.generateFromHTML(htmlContent, {
        filename: `relatorio-fechamento-${customerId}-${startDate}-${endDate}.pdf`,
        compress: true,
        imageQuality: 0.6,
        quality: 0.8,
        ...options
      });
    } catch (error) {
      console.error('Erro ao gerar PDF do relatório:', error);
      throw error;
    }
  }

  /**
   * Gera HTML do relatório para PDF
   */
  private static generateReportHTML(reportData: any): string {
    const { customer, period, summary, details, metadata } = reportData;

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

      // Ordenar por data (mais recente primeiro)
      return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const allTransactions = createTransactionList();

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório de Fechamento - ${customer.name}</title>
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
          <h1>Viandas e Marmitex</h1>
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
              <div class="value">${customer.name}</div>
            </div>
            <div class="customer-item">
              <div class="label">Telefone</div>
              <div class="value">${customer.phone}</div>
            </div>
            ${customer.email ? `
            <div class="customer-item">
              <div class="label">Email</div>
              <div class="value">${customer.email}</div>
            </div>
            ` : ''}
            ${customer.doc ? `
            <div class="customer-item">
              <div class="label">Documento</div>
              <div class="value">${customer.doc}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="summary">
          <h3>Resumo Financeiro</h3>
          <div class="summary-grid">
            <div class="summary-item debt">
              <div class="label">Saldo Devedor</div>
              <div class="value">${formatCurrency(summary.debtBalanceCents)}</div>
            </div>
            <div class="summary-item consumption">
              <div class="label">Consumo no Período</div>
              <div class="value">${formatCurrency(summary.periodConsumptionCents)}</div>
            </div>
            ${summary.totalPaymentsCents > 0 ? `
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

        <div class="footer">
          <p>Relatório gerado em ${formatDateTime(metadata.generatedAt)}</p>
          <p>Viandas e Marmitex</p>
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
