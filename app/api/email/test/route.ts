import { authOptions } from '@/lib/auth';
import { emailService } from '@/lib/email';
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
    const { testEmail } = body;

    if (!testEmail) {
      return NextResponse.json({ 
        error: 'Email de teste é obrigatório' 
      }, { status: 400 });
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      return NextResponse.json({ 
        error: 'Formato de email inválido' 
      }, { status: 400 });
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

    // Testar conexão SMTP
    const connectionTest = await emailService.testConnection();
    if (!connectionTest.success) {
      return NextResponse.json({ 
        error: connectionTest.error || 'Falha na conexão SMTP. Verifique as configurações do servidor.' 
      }, { status: 400 });
    }

    // Enviar email de teste
    await emailService.sendTestEmail(testEmail);

    return NextResponse.json({ 
      success: true,
      message: 'Email de teste enviado com sucesso!'
    });

  } catch (error: any) {
    console.error('Erro ao testar configurações de email:', error);
    
    return NextResponse.json({ 
      error: error.message || 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
