export interface ReportEmailData {
  reportType: string;
  subject: string;
  generatedAt: string;
  period?: {
    startDate: string;
    endDate: string;
  };
  summary?: {
    totalValue?: number;
    totalOrders?: number;
    totalCustomers?: number;
  };
  companyInfo?: {
    name: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
  };
  reportUrl?: string;
  reportId?: string;
}

export interface ClosingReportEmailData {
  customerName: string;
  customerEmail: string;
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalDebtCents: number;
    periodConsumptionCents: number;
    totalPaymentsCents: number;
  };
  reportUrl: string;
  generatedAt: string;
  companyInfo?: {
    name: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
  };
}

export class EmailTemplates {
  /**
   * Gera o template HTML para relatórios
   */
  static generateReportHtml(data: ReportEmailData): string {
    const { reportType, subject, generatedAt, period, summary, companyInfo } = data;
    
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
          }
          .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
          }
          .content {
            padding: 40px 30px;
          }
          .report-title {
            color: #1f2937;
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 20px 0;
          }
          .report-description {
            color: #6b7280;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 30px;
          }
          .info-card {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .info-card h3 {
            color: #0c4a6e;
            margin: 0 0 15px 0;
            font-size: 18px;
            font-weight: 600;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
          }
          .info-item {
            display: flex;
            flex-direction: column;
          }
          .info-label {
            color: #374151;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 5px;
          }
          .info-value {
            color: #1f2937;
            font-size: 16px;
            font-weight: 600;
          }
          .attachment-notice {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            text-align: center;
          }
          .attachment-notice h3 {
            color: #92400e;
            margin: 0 0 10px 0;
            font-size: 18px;
            font-weight: 600;
          }
          .attachment-notice p {
            color: #a16207;
            margin: 0;
            font-size: 14px;
          }
          .footer {
            background: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          .footer p {
            color: #6b7280;
            margin: 0;
            font-size: 14px;
          }
          .company-info {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
          }
          .company-info p {
            color: #9ca3af;
            font-size: 12px;
            margin: 5px 0;
          }
          .logo {
            max-width: 120px;
            height: auto;
            margin-bottom: 15px;
          }
          @media (max-width: 600px) {
            .container {
              margin: 10px;
              border-radius: 8px;
            }
            .header, .content, .footer {
              padding: 20px;
            }
            .info-grid {
              grid-template-columns: 1fr;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${companyInfo?.logoUrl ? `<img src="${companyInfo.logoUrl}" alt="${companyInfo.name}" class="logo">` : ''}
            <h1>📊 ${reportType}</h1>
            <p>${companyInfo?.name || 'Viandas e Marmitex'}</p>
          </div>
          
          <div class="content">
            <h2 class="report-title">${subject}</h2>
            <p class="report-description">
              Segue em anexo o relatório detalhado de ${reportType.toLowerCase()}. 
              Este documento contém informações completas e análises relevantes para o período especificado.
            </p>
            
            <div class="info-card">
              <h3>📅 Informações do Relatório</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Tipo de Relatório</span>
                  <span class="info-value">${reportType}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Gerado em</span>
                  <span class="info-value">${generatedAt}</span>
                </div>
                ${period ? `
                <div class="info-item">
                  <span class="info-label">Período</span>
                  <span class="info-value">${period.startDate} a ${period.endDate}</span>
                </div>
                ` : ''}
                ${summary?.totalValue ? `
                <div class="info-item">
                  <span class="info-label">Valor Total</span>
                  <span class="info-value">R$ ${summary.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                ` : ''}
                ${summary?.totalOrders ? `
                <div class="info-item">
                  <span class="info-label">Total de Pedidos</span>
                  <span class="info-value">${summary.totalOrders}</span>
                </div>
                ` : ''}
                ${summary?.totalCustomers ? `
                <div class="info-item">
                  <span class="info-label">Total de Clientes</span>
                  <span class="info-value">${summary.totalCustomers}</span>
                </div>
                ` : ''}
              </div>
            </div>
            
            <div class="attachment-notice">
              <h3>📊 Relatório Disponível</h3>
              <p>O relatório completo está disponível para visualização e download no sistema.</p>
              ${data.reportUrl ? `
              <div style="text-align: center; margin-top: 20px;">
                <a href="${data.reportUrl}" 
                   style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 0 10px;">
                  👁️ Visualizar Relatório
                </a>
                <a href="${data.reportUrl}?download=1" 
                   style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 0 10px;">
                  📥 Baixar PDF
                </a>
              </div>
              ` : ''}
            </div>
          </div>
          
          <div class="footer">
            <p>Este é um email automático do sistema ${companyInfo?.name || 'Viandas e Marmitex'}.</p>
            <p>Para dúvidas ou suporte, entre em contato conosco.</p>
            
            <div class="company-info">
              ${companyInfo?.address ? `<p>📍 ${companyInfo.address}</p>` : ''}
              ${companyInfo?.phone ? `<p>📞 ${companyInfo.phone}</p>` : ''}
              <p>© ${new Date().getFullYear()} ${companyInfo?.name || 'Viandas e Marmitex'}. Todos os direitos reservados.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Gera o template de texto simples para relatórios
   */
  static generateReportText(data: ReportEmailData): string {
    const { reportType, subject, generatedAt, period, summary, companyInfo } = data;
    
    let text = `
${reportType.toUpperCase()} - ${companyInfo?.name || 'Viandas e Marmitex'}
${'='.repeat(50)}

${subject}

Segue em anexo o relatório detalhado de ${reportType.toLowerCase()}. 
Este documento contém informações completas e análises relevantes para o período especificado.

INFORMAÇÕES DO RELATÓRIO:
${'-'.repeat(30)}
Tipo de Relatório: ${reportType}
Gerado em: ${generatedAt}
${period ? `Período: ${period.startDate} a ${period.endDate}` : ''}
${summary?.totalValue ? `Valor Total: R$ ${summary.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
${summary?.totalOrders ? `Total de Pedidos: ${summary.totalOrders}` : ''}
${summary?.totalCustomers ? `Total de Clientes: ${summary.totalCustomers}` : ''}

RELATÓRIO DISPONÍVEL:
${'-'.repeat(30)}
O relatório completo está disponível para visualização e download no sistema.
${data.reportUrl ? `
Link para visualizar: ${data.reportUrl}
Link para baixar PDF: ${data.reportUrl}?download=1
` : ''}

${'='.repeat(50)}
Este é um email automático do sistema ${companyInfo?.name || 'Viandas e Marmitex'}.
Para dúvidas ou suporte, entre em contato conosco.

${companyInfo?.address ? `Endereço: ${companyInfo.address}` : ''}
${companyInfo?.phone ? `Telefone: ${companyInfo.phone}` : ''}
© ${new Date().getFullYear()} ${companyInfo?.name || 'Viandas e Marmitex'}. Todos os direitos reservados.
    `;

    return text.trim();
  }

  /**
   * Gera template para relatório de cliente específico
   */
  static generateCustomerReportHtml(customerName: string, data: ReportEmailData): string {
    const modifiedData = {
      ...data,
      subject: `Relatório de Cliente - ${customerName}`,
      reportType: `Relatório de Cliente - ${customerName}`
    };
    
    return this.generateReportHtml(modifiedData);
  }

  /**
   * Gera template para relatório de vendas
   */
  static generateSalesReportHtml(data: ReportEmailData): string {
    const modifiedData = {
      ...data,
      subject: data.subject || 'Relatório de Vendas',
      reportType: 'Relatório de Vendas'
    };
    
    return this.generateReportHtml(modifiedData);
  }

  /**
   * Gera template para relatório de fechamento
   */
  static generateClosingReportHtml(data: ReportEmailData): string {
    const modifiedData = {
      ...data,
      subject: data.subject || 'Relatório de Fechamento',
      reportType: 'Relatório de Fechamento'
    };
    
    return this.generateReportHtml(modifiedData);
  }

  /**
   * Gera template específico para fechamento de cliente
   */
  static generateCustomerClosingReportHtml(data: ClosingReportEmailData): string {
    const { customerName, period, summary, reportUrl, generatedAt, companyInfo } = data;
    
    const formatCurrency = (cents: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(cents / 100);
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório de Fechamento - ${customerName}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 24px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .header p {
            margin: 8px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
          }
          .content {
            padding: 24px;
          }
          .customer-info {
            background: #f8fafc;
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 20px;
          }
          .customer-info h2 {
            margin: 0 0 8px 0;
            color: #374151;
            font-size: 18px;
          }
          .period-info {
            color: #6b7280;
            font-size: 14px;
          }
          .summary {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
          }
          .summary-item {
            background: #f3f4f6;
            border-radius: 6px;
            padding: 16px;
            text-align: center;
          }
          .summary-item h3 {
            margin: 0 0 8px 0;
            color: #374151;
            font-size: 14px;
            font-weight: 500;
          }
          .summary-item .value {
            font-size: 20px;
            font-weight: 700;
            color: #1f2937;
          }
          .debt-value {
            color: #dc2626;
          }
          .consumption-value {
            color: #059669;
          }
          .payment-value {
            color: #2563eb;
          }
          .cta-section {
            text-align: center;
            margin: 24px 0;
          }
          .cta-button {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            transition: background-color 0.2s;
          }
          .cta-button:hover {
            background: #059669;
          }
          .footer {
            background: #f8fafc;
            padding: 16px 24px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
          }
          .footer p {
            margin: 0;
            color: #6b7280;
            font-size: 12px;
          }
          @media (max-width: 600px) {
            .summary {
              grid-template-columns: 1fr;
            }
            .container {
              margin: 0;
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Relatório de Fechamento</h1>
            <p>${companyInfo?.name || 'Viandas e Marmitex'}</p>
          </div>
          
          <div class="content">
            <div class="customer-info">
              <h2>👤 ${customerName}</h2>
              <div class="period-info">
                📅 Período: ${formatDate(period.startDate)} a ${formatDate(period.endDate)}
              </div>
            </div>
            
            <div class="summary">
              <div class="summary-item">
                <h3>Saldo Devedor</h3>
                <div class="value debt-value">${formatCurrency(summary.totalDebtCents)}</div>
              </div>
              <div class="summary-item">
                <h3>Consumo no Período</h3>
                <div class="value consumption-value">${formatCurrency(summary.periodConsumptionCents)}</div>
              </div>
              ${summary.totalPaymentsCents > 0 ? `
              <div class="summary-item">
                <h3>Pagamentos</h3>
                <div class="value payment-value">${formatCurrency(summary.totalPaymentsCents)}</div>
              </div>
              ` : ''}
            </div>
            
            <div class="cta-section">
              <a href="${reportUrl}" class="cta-button">
                📋 Ver Relatório Completo
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>Gerado em ${new Date(generatedAt).toLocaleString('pt-BR')}</p>
            ${companyInfo?.address ? `<p>${companyInfo.address}</p>` : ''}
            ${companyInfo?.phone ? `<p>📞 ${companyInfo.phone}</p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Gera template de texto simples para fechamento de cliente
   */
  static generateCustomerClosingReportText(data: ClosingReportEmailData): string {
    const { customerName, period, summary, reportUrl, generatedAt, companyInfo } = data;
    
    const formatCurrency = (cents: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(cents / 100);
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };

    return `
RELATÓRIO DE FECHAMENTO - ${companyInfo?.name || 'Viandas e Marmitex'}

Cliente: ${customerName}
Período: ${formatDate(period.startDate)} a ${formatDate(period.endDate)}

RESUMO FINANCEIRO:
• Saldo Devedor: ${formatCurrency(summary.totalDebtCents)}
• Consumo no Período: ${formatCurrency(summary.periodConsumptionCents)}
${summary.totalPaymentsCents > 0 ? `• Pagamentos: ${formatCurrency(summary.totalPaymentsCents)}` : ''}

Para visualizar o relatório completo, acesse:
${reportUrl}

Gerado em: ${new Date(generatedAt).toLocaleString('pt-BR')}
${companyInfo?.address ? `\nEndereço: ${companyInfo.address}` : ''}
${companyInfo?.phone ? `\nTelefone: ${companyInfo.phone}` : ''}
    `.trim();
  }

  static generatePasswordResetHtml(rawCustomerName: string, resetUrl: string, expiresInMinutes: number): string {
    const customerName = rawCustomerName.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redefinição de senha</title>
      </head>
      <body style="margin:0;padding:24px;background:#fff7ed;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
        <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#f97316,#f59e0b);padding:24px;text-align:center;color:#ffffff;">
            <h1 style="margin:0;font-size:20px;">Redefinição de senha</h1>
          </div>
          <div style="padding:24px;line-height:1.6;">
            <p>Olá, ${customerName}!</p>
            <p>Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para escolher uma nova senha:</p>
            <p style="text-align:center;margin:28px 0;">
              <a href="${resetUrl}" style="background:#f97316;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:bold;display:inline-block;">Redefinir senha</a>
            </p>
            <p style="font-size:13px;color:#6b7280;">O link vale por ${expiresInMinutes} minutos e só pode ser usado uma vez. Se você não pediu a redefinição, ignore este email — sua senha continua a mesma.</p>
            <p style="font-size:12px;color:#9ca3af;word-break:break-all;">Se o botão não funcionar, copie este endereço no navegador:<br>${resetUrl}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static generatePasswordResetText(customerName: string, resetUrl: string, expiresInMinutes: number): string {
    return `Olá, ${customerName}!

Recebemos um pedido para redefinir a senha da sua conta. Acesse o link abaixo para escolher uma nova senha:

${resetUrl}

O link vale por ${expiresInMinutes} minutos e só pode ser usado uma vez. Se você não pediu a redefinição, ignore este email.`;
  }
}
