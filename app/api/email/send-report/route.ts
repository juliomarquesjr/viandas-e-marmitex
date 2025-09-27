import { authOptions } from '@/lib/auth';
import { emailService } from '@/lib/email';
import { ReportEmailData } from '@/lib/email-templates';
import prisma from '@/lib/prisma';
import { SystemConfig } from '@/lib/types';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      to, 
      subject, 
      reportType, 
      reportData, 
      period,
      summary,
      companyInfo
    } = body;

    if (!to || !subject || !reportType) {
      return NextResponse.json({ 
        error: 'Parâmetros obrigatórios: to, subject, reportType' 
      }, { status: 400 });
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emails = Array.isArray(to) ? to : [to];
    for (const email of emails) {
      if (!emailRegex.test(email)) {
        return NextResponse.json({ 
          error: `Formato de email inválido: ${email}` 
        }, { status: 400 });
      }
    }

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

    // Gerar URL do relatório
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const reportUrl = `${baseUrl}/reports/view/${reportId}?data=${Buffer.from(JSON.stringify({
      reportType,
      reportData,
      generatedAt: new Date().toISOString(),
      generatedBy: session.user.id
    })).toString('base64')}`;

    // Preparar dados do email
    const emailReportData: ReportEmailData = {
      reportType,
      subject,
      generatedAt: new Date().toLocaleString('pt-BR'),
      period,
      summary,
      companyInfo,
      reportUrl,
      reportId
    };

    // Enviar email usando o serviço
    await emailService.sendReport(emailReportData, emails);

    return NextResponse.json({ 
      success: true,
      message: 'Relatório enviado por email com sucesso!'
    });

  } catch (error: any) {
    console.error('Erro ao enviar relatório por email:', error);
    
    return NextResponse.json({ 
      error: error.message || 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

