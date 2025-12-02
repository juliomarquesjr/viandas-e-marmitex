import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { arrayToDescriptor, isMatch } from '@/lib/facial-recognition';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { descriptor } = body;

    if (!descriptor || !Array.isArray(descriptor)) {
      return NextResponse.json(
        { error: 'Descriptor facial é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar todos usuários ativos com facialImageUrl e facialDescriptor
      const users = await prisma.user.findMany({
        where: {
          active: true,
          facialImageUrl: { not: null },
          facialDescriptor: { not: { equals: null } }
        },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        facialDescriptor: true
      }
    });

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum usuário com reconhecimento facial cadastrado' },
        { status: 404 }
      );
    }

    // Converter descriptor recebido para Float32Array
    const receivedDescriptor = arrayToDescriptor(descriptor);

    // Comparar com cada usuário
    let matchedUser = null;
    let bestMatch = null;
    let bestSimilarity = 0;

    for (const user of users) {
      if (!user.facialDescriptor || !Array.isArray(user.facialDescriptor)) {
        continue;
      }

      const userDescriptor = arrayToDescriptor(user.facialDescriptor as number[]);
      
      // Verificar match com threshold de 0.6
      if (isMatch(receivedDescriptor, userDescriptor, 0.6)) {
        // Calcular similaridade para encontrar o melhor match
        const similarity = 1 / (1 + Math.sqrt(
          Array.from(receivedDescriptor).reduce((sum, val, i) => {
            const diff = val - userDescriptor[i];
            return sum + diff * diff;
          }, 0)
        ));

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = user;
          matchedUser = user;
        }
      }
    }

    if (!matchedUser) {
      return NextResponse.json(
        { error: 'Rosto não reconhecido. Tente novamente ou use email/senha' },
        { status: 401 }
      );
    }

    // Retornar dados do usuário e token para criar sessão
    // O cliente usará esses dados para criar a sessão via NextAuth
    return NextResponse.json({
      success: true,
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role
      },
      similarity: bestSimilarity,
      // Retornar um token temporário que pode ser usado para criar sessão
      // Na prática, o cliente fará signIn com as credenciais do usuário
    });
  } catch (error) {
    console.error('Erro na autenticação facial:', error);
    return NextResponse.json(
      { error: 'Erro ao processar autenticação facial' },
      { status: 500 }
    );
  }
}

