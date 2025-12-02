/**
 * Geração e validação de tokens JWT temporários para autenticação facial
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const FACIAL_TOKEN_EXPIRY = 5 * 60; // 5 minutos

export interface FacialAuthTokenPayload {
  userId: string;
  email: string;
  role: string;
  nonce: string; // Prevenir replay attacks
  timestamp: number;
}

/**
 * Gera um token JWT temporário para autenticação facial
 */
export function generateFacialAuthToken(
  userId: string,
  email: string,
  role: string
): string {
  const nonce = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const payload: FacialAuthTokenPayload = {
    userId,
    email,
    role,
    nonce,
    timestamp: Date.now(),
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: FACIAL_TOKEN_EXPIRY,
  });
}

/**
 * Valida e decodifica um token JWT de autenticação facial
 */
export function verifyFacialAuthToken(token: string): FacialAuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as FacialAuthTokenPayload;
    
    // Verificar se o token não expirou (verificação adicional)
    const now = Date.now();
    const tokenAge = now - decoded.timestamp;
    const maxAge = FACIAL_TOKEN_EXPIRY * 1000; // Converter para ms
    
    if (tokenAge > maxAge) {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('Erro ao verificar token facial:', error);
    return null;
  }
}

/**
 * Gera um nonce único para prevenir replay attacks
 */
export function generateNonce(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}-${Math.random().toString(36).substring(7)}`;
}

