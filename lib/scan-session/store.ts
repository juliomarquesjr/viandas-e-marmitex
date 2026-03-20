/**
 * Store em memória para sessões de scan mobile
 * 
 * Em produção, considere usar Redis para ambientes com múltiplas instâncias
 */

import { InvoiceData } from '@/lib/nf-scanner/types';
import {
  ScanSession,
  ScanType,
  SESSION_DURATION_MS,
} from './types';

// Armazenamento em memória
const sessions = new Map<string, ScanSession>();

/**
 * Gera um UUID v4 usando crypto nativo
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Cria uma nova sessão de scan
 */
export function createSession(type: ScanType = 'qrcode'): ScanSession {
  // Limpar sessões expiradas antes de criar nova
  cleanExpiredSessions();
  
  // Criar nova sessão
  const id = generateUUID();
  const now = new Date();
  const session: ScanSession = {
    id,
    type,
    status: 'waiting',
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
  };
  
  sessions.set(id, session);
  
  console.log(`[ScanSession] Sessão criada: ${id}, expira em ${SESSION_DURATION_MS / 1000}s`);
  
  return session;
}

/**
 * Obtém uma sessão pelo ID
 */
export function getSession(id: string): ScanSession | null {
  const session = sessions.get(id);
  
  if (!session) {
    return null;
  }
  
  // Verificar se expirou
  if (new Date() > session.expiresAt && session.status === 'waiting') {
    session.status = 'expired';
    console.log(`[ScanSession] Sessão expirada: ${id}`);
  }
  
  return session;
}

/**
 * Obtém a sessão que está aguardando scan (se houver)
 */
export function getWaitingSession(): ScanSession | null {
  // Limpar sessões expiradas
  cleanExpiredSessions();
  
  // Encontrar primeira sessão aguardando
  for (const session of sessions.values()) {
    if (session.status === 'waiting') {
      return session;
    }
  }
  
  return null;
}

/**
 * Submete o resultado de um scan para uma sessão
 */
export async function submitScanResult(
  id: string,
  qrData: string,
  processQRCode: (qrData: string) => Promise<InvoiceData>
): Promise<InvoiceData> {
  const session = getSession(id);
  
  if (!session) {
    throw new Error('Sessão não encontrada');
  }
  
  if (session.status === 'expired') {
    throw new Error('Sessão expirada');
  }
  
  if (session.status === 'completed') {
    throw new Error('Sessão já foi completada');
  }
  
  console.log(`[ScanSession] Processando QR Code para sessão: ${id}`);
  
  // Processar QR Code usando a função fornecida
  const invoiceData = await processQRCode(qrData);
  
  // Atualizar sessão com resultado
  session.status = 'completed';
  session.result = invoiceData;
  
  console.log(`[ScanSession] Sessão completada: ${id}`);
  
  return invoiceData;
}

/**
 * Marca uma sessão como completada com dados já processados
 */
export function completeSession(id: string, invoiceData: InvoiceData): void {
  const session = getSession(id);
  
  if (!session) {
    throw new Error('Sessão não encontrada');
  }
  
  session.status = 'completed';
  session.result = invoiceData;
  
  console.log(`[ScanSession] Sessão marcada como completada: ${id}`);
}

/**
 * Remove uma sessão
 */
export function deleteSession(id: string): boolean {
  const deleted = sessions.delete(id);
  if (deleted) {
    console.log(`[ScanSession] Sessão removida: ${id}`);
  }
  return deleted;
}

/**
 * Limpa todas as sessões expiradas
 */
export function cleanExpiredSessions(): number {
  const now = new Date();
  let cleaned = 0;
  
  for (const [id, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(id);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[ScanSession] Limpas ${cleaned} sessões expiradas`);
  }
  
  return cleaned;
}

/**
 * Obtém o número de sessões ativas (para debug)
 */
export function getActiveSessionCount(): number {
  cleanExpiredSessions();
  return sessions.size;
}

/**
 * Obtém o tempo restante de uma sessão em segundos
 */
export function getTimeRemaining(session: ScanSession): number {
  const now = new Date();
  const remaining = session.expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.floor(remaining / 1000));
}
