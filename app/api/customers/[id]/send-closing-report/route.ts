import { authOptions } from '@/lib/auth';
import { emailService } from '@/lib/email';
import { ClosingReportEmailData } from '@/lib/email-templates';
import prisma from '@/lib/prisma';
import { SystemConfig } from '@/lib/types';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

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

    // Validar parâmetros obrigatórios
    if (!customerId || !startDate || !endDate) {
      return NextResponse.json({
        error: 'Customer ID, start date and end date are required'
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

    // Enviar email
    await emailService.sendCustomerClosingReport(emailData);

    return NextResponse.json({
      success: true,
      message: `Relatório enviado para ${customer.email}`,
      reportUrl
    });

  } catch (error) {
    console.error('Erro ao enviar relatório de fechamento:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}
