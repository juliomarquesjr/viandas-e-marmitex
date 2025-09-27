import { authOptions } from '@/lib/auth';
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
      reportType, 
      reportData, 
      expiresIn = 24 // horas
    } = body;

    if (!reportType || !reportData) {
      return NextResponse.json({ 
        error: 'Parâmetros obrigatórios: reportType, reportData' 
      }, { status: 400 });
    }

    // Gerar ID único para o relatório
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresIn);

    // Salvar dados do relatório temporariamente (em produção, usar Redis ou banco)
    // Por enquanto, vamos usar uma abordagem simples com base64
    const reportDataEncoded = Buffer.from(JSON.stringify({
      reportType,
      reportData,
      generatedAt: new Date().toISOString(),
      generatedBy: session.user.id
    })).toString('base64');

    // Gerar URL do relatório
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const reportUrl = `${baseUrl}/reports/view/${reportId}?data=${reportDataEncoded}`;

    return NextResponse.json({ 
      success: true,
      reportId,
      reportUrl,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error: any) {
    console.error('Erro ao gerar URL do relatório:', error);
    
    return NextResponse.json({ 
      error: error.message || 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
