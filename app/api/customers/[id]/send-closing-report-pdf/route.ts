import { authOptions } from '@/lib/auth';
import { emailService } from '@/lib/email';
import { ClosingReportEmailData } from '@/lib/email-templates';
import prisma from '@/lib/prisma';
import { SystemConfig } from '@/lib/types';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

// Funções de formatação
const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
};

const formatDate = (dateString: string) => {
  // For date strings in YYYY-MM-DD format, parse directly to avoid timezone conversion
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number);
    // Create date in local timezone
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  // For datetime strings, use the date as is
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const resolvedParams = await params;
    const customerId = resolvedParams.id;

    // Obter dados do body da requisição
    const body = await request.json();
    const { pdfBase64 } = body;

    console.log('Recebendo dados para envio de PDF:', {
      customerId,
      startDate,
      endDate,
      pdfBase64Length: pdfBase64?.length || 0
    });

    // Validar parâmetros obrigatórios
    if (!customerId || !startDate || !endDate || !pdfBase64) {
      return NextResponse.json({
        error: 'Customer ID, start date, end date and PDF data are required'
      }, { status: 400 });
    }

    // Buscar dados do cliente
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true
      }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Verificar se cliente tem email cadastrado
    if (!customer.email) {
      return NextResponse.json({
        error: 'Cliente não possui email cadastrado'
      }, { status: 400 });
    }

    // Buscar dados do relatório
    const reportResponse = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/customers/${customerId}/report?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: {
          'Cookie': request.headers.get('cookie') || ''
        }
      }
    );

    if (!reportResponse.ok) {
      return NextResponse.json({
        error: 'Erro ao gerar dados do relatório'
      }, { status: 500 });
    }

    const reportData = await reportResponse.json();

    // Carregar configurações de email
    const configs = await prisma.systemConfig.findMany({
      where: { category: 'email' }
    });

    if (configs.length === 0) {
      return NextResponse.json({
        error: 'Configurações de email não encontradas'
      }, { status: 404 });
    }

    // Configurar serviço de email
    await emailService.configure(configs as SystemConfig[]);

    // Verificar se o serviço está habilitado
    if (!emailService.isConfigured()) {
      return NextResponse.json({
        error: 'Serviço de email não está habilitado'
      }, { status: 400 });
    }

    // Carregar informações da empresa
    const companyConfigs = await prisma.systemConfig.findMany({
      where: { category: 'branding' }
    });

    const companyInfo = {
      name: companyConfigs.find(c => c.key === 'branding_system_title')?.value || 'Viandas e Marmitex',
      logoUrl: companyConfigs.find(c => c.key === 'branding_logo_url')?.value || undefined,
      address: companyConfigs.find(c => c.key === 'contact_address_street')?.value || undefined,
      phone: companyConfigs.find(c => c.key === 'contact_phone_mobile')?.value || undefined
    };

    // Gerar URL única para o relatório
    const reportId = `closing_${customerId}_${Date.now()}`;
    const reportUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reports/view/${reportId}?data=${encodeURIComponent(JSON.stringify({
      customerId,
      startDate,
      endDate,
      type: 'closing'
    }))}`;

    // Preparar dados do email
    const emailData: ClosingReportEmailData = {
      customerName: customer.name,
      customerEmail: customer.email,
      period: {
        startDate,
        endDate
      },
      summary: {
        totalDebtCents: reportData.summary.debtBalanceCents,
        periodConsumptionCents: reportData.summary.periodConsumptionCents,
        totalPaymentsCents: reportData.summary.totalPaymentsCents
      },
      reportUrl,
      generatedAt: new Date().toISOString(),
      companyInfo
    };

    // Converter base64 para Buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    console.log('PDF buffer criado, tamanho:', pdfBuffer.length);

    // Nome do arquivo PDF
    const filename = `relatorio-fechamento-${customer.name.replace(/\s+/g, '-').toLowerCase()}-${startDate}-${endDate}.pdf`;
    console.log('Nome do arquivo:', filename);

    console.log('Enviando email com PDF anexado...');
    
    // Enviar email com PDF anexado
    await emailService.sendEmail({
      to: customer.email,
      subject: `📊 Relatório de Fechamento - ${customer.name} (${formatDate(startDate)} a ${formatDate(endDate)})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Relatório de Fechamento</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700;">📊 Relatório de Fechamento</h1>
              <p style="margin: 8px 0 0 0; font-size: 18px; opacity: 0.9;">${customer.name}</p>
              <div style="margin-top: 15px; padding: 8px 16px; background: rgba(255,255,255,0.2); border-radius: 20px; display: inline-block;">
                <span style="font-size: 14px;">${formatDate(startDate)} a ${formatDate(endDate)}</span>
              </div>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 40px 30px;">
              
              <!-- Greeting -->
              <div style="margin-bottom: 30px;">
                <p style="font-size: 18px; color: #374151; margin: 0 0 10px 0;">
                  Olá <strong style="color: #111827;">${customer.name}</strong>,
                </p>
                <p style="font-size: 16px; color: #6b7280; margin: 0; line-height: 1.5;">
                  Segue seu relatório de fechamento do período. Você pode visualizá-lo online ou baixar o arquivo PDF em anexo.
                </p>
              </div>
              
              <!-- Financial Summary -->
              <div style="background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border: 1px solid #bbf7d0; border-radius: 12px; padding: 25px; margin: 25px 0;">
                <h3 style="margin: 0 0 20px 0; color: #065f46; font-size: 20px; display: flex; align-items: center;">
                  💰 Resumo Financeiro
                </h3>
                <div style="display: grid; gap: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #d1fae5;">
                    <span style="color: #374151; font-size: 16px;">Saldo Devedor:</span>
                    <span style="font-weight: 700; color: #dc2626; font-size: 18px;">${formatCurrency(reportData.summary.debtBalanceCents)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #d1fae5;">
                    <span style="color: #374151; font-size: 16px;">Saldo do Período:</span>
                    <span style="font-weight: 700; color: #dc2626; font-size: 18px;">${formatCurrency(reportData.summary.pendingInPeriodCents)}</span>
                  </div>
                  ${reportData.summary.totalPaymentsCents > 0 ? `
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
                    <span style="color: #374151; font-size: 16px;">Pagamentos Realizados:</span>
                    <span style="font-weight: 700; color: #059669; font-size: 18px;">${formatCurrency(reportData.summary.totalPaymentsCents)}</span>
                  </div>
                  ` : ''}
                </div>
              </div>
              
              <!-- Action Buttons -->
              <div style="margin: 35px 0; text-align: center;">
                <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                  <a href="${emailData.reportUrl}" 
                     style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3); transition: all 0.2s;">
                    🌐 Visualizar Online
                  </a>
                  <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 15px 25px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);">
                    📎 PDF em Anexo
                  </div>
                </div>
              </div>
              
              <!-- Features Info -->
              <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h4 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">📋 Opções de Visualização:</h4>
                <div style="display: grid; gap: 10px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #3b82f6; font-size: 18px;">🌐</span>
                    <span style="color: #6b7280; font-size: 14px;"><strong>Visualização Online:</strong> Clique no botão acima para abrir o relatório no seu navegador</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #10b981; font-size: 18px;">📎</span>
                    <span style="color: #6b7280; font-size: 14px;"><strong>Arquivo PDF:</strong> Baixe o arquivo em anexo para salvar ou imprimir</span>
                  </div>
                </div>
              </div>
              
              <!-- Transaction Summary -->
              <div style="background: #fefce8; border: 1px solid #fde047; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h4 style="margin: 0 0 15px 0; color: #713f12; font-size: 16px;">📊 Resumo do Período:</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; color: #713f12;">
                  <div>• ${reportData.metadata.totalPeriodOrders} pedidos realizados</div>
                  <div>• ${reportData.details.fichaPayments.length} pagamentos</div>
                  <div>• ${reportData.details.pendingOrders.all.length} pedidos pendentes</div>
                  <div>• Período: ${reportData.metadata.generatedAt ? new Date(reportData.metadata.generatedAt).toLocaleDateString('pt-BR') : 'N/A'}</div>
                </div>
              </div>
              
              <!-- Footer Info -->
              <div style="border-top: 2px solid #e5e7eb; padding-top: 25px; margin-top: 30px;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <p style="font-size: 14px; color: #6b7280; margin: 0;">
                    <strong>📅 Gerado em:</strong> ${formatDateTime(emailData.generatedAt)}
                  </p>
                </div>
                
                ${emailData.companyInfo ? `
                <div style="background: #f3f4f6; border-radius: 8px; padding: 15px; text-align: center;">
                  <p style="margin: 0; font-size: 14px; color: #6b7280;">
                    <strong>${emailData.companyInfo.name}</strong><br>
                    ${emailData.companyInfo.address || ''}<br>
                    ${emailData.companyInfo.phone || ''}
                  </p>
                </div>
                ` : ''}
                
                <div style="text-align: center; margin-top: 20px;">
                  <p style="font-size: 13px; color: #9ca3af; margin: 0;">
                    Em caso de dúvidas sobre este relatório, entre em contato conosco.
                  </p>
                </div>
              </div>
              
            </div>
            
          </div>
        </body>
        </html>
      `,
      text: `
📊 Relatório de Fechamento - ${customer.name}

Olá ${customer.name}!

Segue seu relatório de fechamento do período de ${formatDate(startDate)} a ${formatDate(endDate)}.

💰 RESUMO FINANCEIRO:
- Saldo Devedor: ${formatCurrency(reportData.summary.debtBalanceCents)}
- Saldo do Período: ${formatCurrency(reportData.summary.pendingInPeriodCents)}
${reportData.summary.totalPaymentsCents > 0 ? `- Pagamentos Realizados: ${formatCurrency(reportData.summary.totalPaymentsCents)}` : ''}

📋 OPÇÕES DE VISUALIZAÇÃO:
🌐 Visualização Online: ${emailData.reportUrl}
📎 Arquivo PDF: Baixe o arquivo em anexo para salvar ou imprimir

📊 RESUMO DO PERÍODO:
- ${reportData.metadata.totalPeriodOrders} pedidos realizados
- ${reportData.details.fichaPayments.length} pagamentos
- ${reportData.details.pendingOrders.all.length} pedidos pendentes

📅 Gerado em: ${formatDateTime(emailData.generatedAt)}

${emailData.companyInfo ? `${emailData.companyInfo.name}\n${emailData.companyInfo.address || ''}\n${emailData.companyInfo.phone || ''}` : ''}

Em caso de dúvidas sobre este relatório, entre em contato conosco.
      `,
      replyTo: emailService.getConfig()?.replyTo,
      attachments: [{
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
        encoding: 'base64'
      }]
    });

    console.log('Email enviado com sucesso!');

    return NextResponse.json({
      success: true,
      message: `Relatório com PDF anexado enviado para ${customer.email}`,
      reportUrl
    });

  } catch (error) {
    console.error('Erro ao enviar relatório de fechamento com PDF:', error);
    return NextResponse.json({
      error: `Erro interno do servidor: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    }, { status: 500 });
  }
}
