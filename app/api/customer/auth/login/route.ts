import { NextResponse } from 'next/server';

// Esta rota não é mais necessária pois usamos NextAuth diretamente
// Mantida para compatibilidade, mas redireciona para usar NextAuth
export async function POST(request: Request) {
  return NextResponse.json(
    { 
      error: 'Use NextAuth signIn with CustomerCredentials provider',
      message: 'Esta rota não deve ser chamada diretamente. Use signIn do next-auth/react'
    },
    { status: 400 }
  );
}

