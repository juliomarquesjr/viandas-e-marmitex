import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * API pública para buscar configurações necessárias para recibos
 * Não requer autenticação pois é usada em páginas de impressão
 */
export async function GET(request: Request) {
  try {
    // Buscar apenas configurações de contato, branding e pagamento
    const configs = await prisma.systemConfig.findMany({
      where: {
        category: {
          in: ['contact', 'branding', 'payment']
        }
      },
      orderBy: [{ category: 'asc' }, { key: 'asc' }]
    });

    return NextResponse.json(configs);
  } catch (error: any) {
    console.error('Erro ao buscar configurações públicas:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}




