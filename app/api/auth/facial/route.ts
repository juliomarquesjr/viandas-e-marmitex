import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { arrayToDescriptor, isMatch } from '@/lib/facial-recognition';
import { checkRateLimit, checkUserRateLimit, getClientIP } from '@/lib/rate-limit';
import { generateFacialAuthToken } from '@/lib/facial-auth-token';

// Threshold de similaridade mais rigoroso para maior segurança
const FACIAL_MATCH_THRESHOLD = 0.65; // Aumentado de 0.6 para 0.65

// Armazenamento de nonces usados (em produção, usar Redis)
const usedNonces = new Set<string>();
const NONCE_EXPIRY = 5 * 60 * 1000; // 5 minutos

// Limpar nonces expirados periodicamente
setInterval(() => {
  // Em produção, usar timestamp nos nonces para limpeza automática
  if (usedNonces.size > 10000) {
    usedNonces.clear(); // Limpar se ficar muito grande
  }
}, 10 * 60 * 1000); // A cada 10 minutos

export async function POST(request: Request) {
  const clientIP = getClientIP(request);
  const startTime = Date.now();

  try {
    // Rate limiting: 5 tentativas por 15 minutos
    const rateLimit = checkRateLimit(clientIP, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      console.warn(`[FACIAL_AUTH] Rate limit excedido para IP: ${clientIP}`);
      return NextResponse.json(
        { 
          error: 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
          }
        }
      );
    }

    const body = await request.json();
    const { descriptor, nonce, timestamp } = body;

    // Validação de entrada
    if (!descriptor || !Array.isArray(descriptor)) {
      console.warn(`[FACIAL_AUTH] Descriptor inválido - IP: ${clientIP}`);
      return NextResponse.json(
        { error: 'Descriptor facial é obrigatório' },
        { status: 400 }
      );
    }

    // Validação do tamanho do descriptor (face-api.js gera 128 elementos)
    const EXPECTED_DESCRIPTOR_SIZE = 128;
    if (descriptor.length !== EXPECTED_DESCRIPTOR_SIZE) {
      console.warn(`[FACIAL_AUTH] Descriptor com tamanho inválido - IP: ${clientIP}, Tamanho: ${descriptor.length}, Esperado: ${EXPECTED_DESCRIPTOR_SIZE}`);
      return NextResponse.json(
        { error: 'Descriptor facial inválido' },
        { status: 400 }
      );
    }

    // Validação de integridade: verificar se os valores estão no range esperado
    // Descriptors do face-api.js geralmente estão entre -1 e 1
    const invalidValues = descriptor.filter((val: number) => 
      typeof val !== 'number' || 
      isNaN(val) || 
      !isFinite(val) ||
      Math.abs(val) > 2 // Permitir um pouco de margem
    );

    if (invalidValues.length > 0) {
      console.warn(`[FACIAL_AUTH] Descriptor com valores inválidos - IP: ${clientIP}, Valores inválidos: ${invalidValues.length}`);
      return NextResponse.json(
        { error: 'Descriptor facial contém valores inválidos' },
        { status: 400 }
      );
    }

    // Proteção contra replay: verificar nonce e timestamp
    if (!nonce || !timestamp) {
      console.warn(`[FACIAL_AUTH] Requisição sem nonce/timestamp - IP: ${clientIP}`);
      return NextResponse.json(
        { error: 'Nonce e timestamp são obrigatórios para segurança' },
        { status: 400 }
      );
    }

    // Verificar se nonce já foi usado (replay attack)
    if (usedNonces.has(nonce)) {
      console.warn(`[FACIAL_AUTH] Tentativa de replay detectada - IP: ${clientIP}, Nonce: ${nonce}`);
      return NextResponse.json(
        { error: 'Requisição inválida ou já processada' },
        { status: 400 }
      );
    }

    // Verificar timestamp (não aceitar requisições muito antigas ou futuras)
    const now = Date.now();
    const requestAge = Math.abs(now - timestamp);
    const MAX_AGE = 2 * 60 * 1000; // 2 minutos

    if (requestAge > MAX_AGE) {
      console.warn(`[FACIAL_AUTH] Timestamp inválido - IP: ${clientIP}, Age: ${requestAge}ms`);
      return NextResponse.json(
        { error: 'Requisição expirada. Tente novamente.' },
        { status: 400 }
      );
    }

    // Marcar nonce como usado
    usedNonces.add(nonce);

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
      
      // Verificar match com threshold mais rigoroso (0.65)
      if (isMatch(receivedDescriptor, userDescriptor, FACIAL_MATCH_THRESHOLD)) {
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
      const duration = Date.now() - startTime;
      console.log(`[FACIAL_AUTH] Falha - IP: ${clientIP}, Duração: ${duration}ms, Tentativas restantes (IP): ${rateLimit.remaining}`);
      
      return NextResponse.json(
        { 
          error: 'Rosto não reconhecido. Tente novamente ou use email/senha',
          retryAfter: rateLimit.resetAt
        },
        { 
          status: 401,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
          }
        }
      );
    }

    // Rate limiting por usuário (após identificar o usuário)
    // Limite mais restritivo: 3 tentativas por 15 minutos por usuário
    const userRateLimit = checkUserRateLimit(matchedUser.email, 3, 15 * 60 * 1000);
    if (!userRateLimit.allowed) {
      const duration = Date.now() - startTime;
      console.warn(`[FACIAL_AUTH] Rate limit por usuário excedido - Email: ${matchedUser.email}, IP: ${clientIP}, Duração: ${duration}ms`);
      
      return NextResponse.json(
        { 
          error: 'Muitas tentativas para esta conta. Aguarde 15 minutos antes de tentar novamente.',
          retryAfter: Math.ceil((userRateLimit.resetAt - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((userRateLimit.resetAt - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(userRateLimit.resetAt).toISOString(),
            'X-RateLimit-Scope': 'user',
          }
        }
      );
    }

    // Gerar token JWT temporário para autenticação segura
    const authToken = generateFacialAuthToken(
      matchedUser.id,
      matchedUser.email,
      matchedUser.role
    );

    const duration = Date.now() - startTime;
    console.log(`[FACIAL_AUTH] Sucesso - Usuário: ${matchedUser.email}, IP: ${clientIP}, Similaridade: ${bestSimilarity.toFixed(3)}, Duração: ${duration}ms, Tentativas restantes (IP): ${rateLimit.remaining}, (Usuário): ${userRateLimit.remaining}`);

    // Retornar token JWT em vez de dados do usuário diretamente
    return NextResponse.json({
      success: true,
      token: authToken, // Token JWT temporário (5 minutos)
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role
      },
      similarity: bestSimilarity,
    }, {
      headers: {
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
        'X-UserRateLimit-Limit': '3',
        'X-UserRateLimit-Remaining': userRateLimit.remaining.toString(),
        'X-UserRateLimit-Reset': new Date(userRateLimit.resetAt).toISOString(),
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[FACIAL_AUTH] Erro - IP: ${clientIP}, Duração: ${duration}ms`, error);
    
    return NextResponse.json(
      { error: 'Erro ao processar autenticação facial' },
      { status: 500 }
    );
  }
}

