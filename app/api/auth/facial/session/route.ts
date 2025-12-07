import { NextResponse } from 'next/server';
import { verifyFacialAuthToken } from '@/lib/facial-auth-token';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação facial é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar e decodificar token JWT
    const payload = verifyFacialAuthToken(token);
    
    if (!payload) {
      console.warn('[FACIAL_SESSION] Token inválido ou expirado');
      return NextResponse.json(
        { error: 'Token inválido ou expirado. Faça login novamente.' },
        { status: 401 }
      );
    }

    // Retornar dados do usuário do token
    // O cliente fará signIn usando o email e token como senha especial
    return NextResponse.json({
      success: true,
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      },
    });
  } catch (error) {
    console.error('[FACIAL_SESSION] Erro ao criar sessão:', error);
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}

