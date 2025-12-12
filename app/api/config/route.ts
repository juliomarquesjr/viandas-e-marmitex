import { authOptions } from '@/lib/auth';
import { invalidateConfigCache } from '@/lib/config';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

// GET - Buscar todas as configurações ou uma específica
export async function GET(request: Request) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const category = searchParams.get('category');

    if (key) {
      // Buscar configuração específica
      const config = await prisma.systemConfig.findUnique({
        where: { key }
      });
      
      if (!config) {
        return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 });
      }
      
      return NextResponse.json(config);
    }

    if (category) {
      // Buscar configurações por categoria
      const configs = await prisma.systemConfig.findMany({
        where: { category },
        orderBy: { key: 'asc' }
      });
      
      return NextResponse.json(configs);
    }

    // Buscar todas as configurações
    const configs = await prisma.systemConfig.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }]
    });

    return NextResponse.json(configs);
  } catch (error: any) {
    console.error('Erro ao buscar configurações:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}

// POST - Criar ou atualizar configuração
export async function POST(request: Request) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { key, value, type = 'text', category = 'general' } = body;

    if (!key) {
      return NextResponse.json({ error: 'Chave é obrigatória' }, { status: 400 });
    }

    // Validar tipos permitidos
    const allowedTypes = ['text', 'json', 'image'];
    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ 
        error: `Tipo inválido. Use: ${allowedTypes.join(', ')}` 
      }, { status: 400 });
    }

    // Validar categorias permitidas
    const allowedCategories = ['general', 'contact', 'branding', 'email', 'payment'];
    if (!allowedCategories.includes(category)) {
      return NextResponse.json({ 
        error: `Categoria inválida. Use: ${allowedCategories.join(', ')}` 
      }, { status: 400 });
    }

    // Upsert: criar ou atualizar
    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: { 
        value: value || null,
        type,
        category,
        updatedAt: new Date()
      },
      create: {
        key,
        value: value || null,
        type,
        category
      }
    });

    // Invalidar cache após atualização
    invalidateConfigCache();

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Erro ao salvar configuração:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}

// PUT - Atualizar múltiplas configurações
export async function PUT(request: Request) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { configs } = body;

    if (!Array.isArray(configs)) {
      return NextResponse.json({ error: 'Configurações devem ser um array' }, { status: 400 });
    }

    const results = [];

    for (const configData of configs) {
      const { key, value, type = 'text', category = 'general' } = configData;

      if (!key) {
        continue; // Pular configurações sem chave
      }

      try {
        const config = await prisma.systemConfig.upsert({
          where: { key },
          update: { 
            value: value || null,
            type,
            category,
            updatedAt: new Date()
          },
          create: {
            key,
            value: value || null,
            type,
            category
          }
        });

        results.push(config);
      } catch (error) {
        console.error(`Erro ao salvar configuração ${key}:`, error);
      }
    }

    // Invalidar cache após atualização
    invalidateConfigCache();

    return NextResponse.json({ 
      message: `${results.length} configurações atualizadas`,
      configs: results
    });
  } catch (error: any) {
    console.error('Erro ao atualizar configurações:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}

// DELETE - Remover configuração
export async function DELETE(request: Request) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Chave é obrigatória' }, { status: 400 });
    }

    const config = await prisma.systemConfig.delete({
      where: { key }
    });

    // Invalidar cache após remoção
    invalidateConfigCache();

    return NextResponse.json({ 
      message: 'Configuração removida com sucesso',
      config
    });
  } catch (error: any) {
    console.error('Erro ao remover configuração:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}
