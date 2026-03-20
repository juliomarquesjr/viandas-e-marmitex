/**
 * API de Sessão de Scan Mobile
 * 
 * POST - Iniciar sessão ou submeter resultado
 * GET - Verificar status da sessão ou verificar se há sessão aguardando
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createSession,
  getSession,
  getWaitingSession,
  completeSession,
  getTimeRemaining,
} from '@/lib/scan-session/store';
import { consultarSEFAZ, extractXMLFromHTML } from '@/lib/nf-scanner/sefaz-client';
import { parseNFXML } from '@/lib/nf-scanner/xml-parser';
import { extractChaveAcesso, normalizeChaveAcesso, validateChaveAcesso } from '@/lib/nf-scanner/utils';
import { InvoiceData } from '@/lib/nf-scanner/types';
import type {
  StartSessionRequest,
  SubmitScanRequest,
  CreateSessionResponse,
  SessionStatusResponse,
  WaitingSessionResponse,
} from '@/lib/scan-session/types';

// Cache simples em memória para notas fiscais
const invoiceCache = new Map<string, { data: InvoiceData; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

/**
 * Processa o QR Code e retorna os dados da nota fiscal
 */
async function processQRCode(qrData: string): Promise<InvoiceData> {
  console.log('[ScanSession API] Processando QR Code:', qrData.substring(0, 100));
  
  // Extrair chave de acesso
  let chaveAcesso = extractChaveAcesso(qrData);
  
  if (!chaveAcesso) {
    throw new Error('QR code inválido: não foi possível extrair a chave de acesso');
  }
  
  // Normalizar chave
  chaveAcesso = normalizeChaveAcesso(chaveAcesso);
  
  if (!validateChaveAcesso(chaveAcesso)) {
    throw new Error('Chave de acesso inválida');
  }
  
  console.log('[ScanSession API] Chave de acesso:', chaveAcesso);
  
  // Verificar cache
  const cached = invoiceCache.get(chaveAcesso);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[ScanSession API] Retornando do cache');
    return cached.data;
  }
  
  // Consultar SEFAZ
  let xmlString: string | null = null;
  
  if (qrData.startsWith('http://') || qrData.startsWith('https://')) {
    // Consultar diretamente pela URL
    console.log('[ScanSession API] Consultando URL diretamente...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const response = await fetch(qrData, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Erro ao consultar URL: ${response.status}`);
      }
      
      const html = await response.text();
      xmlString = extractXMLFromHTML(html);
      
    } catch (error) {
      clearTimeout(timeoutId);
      // Tentar via SEFAZ como fallback
      console.log('[ScanSession API] Falha na URL direta, tentando SEFAZ...');
    }
  }
  
  // Se não conseguiu extrair XML da URL, tentar via SEFAZ
  if (!xmlString) {
    console.log('[ScanSession API] Consultando via SEFAZ...');
    const sefazResponse = await consultarSEFAZ(chaveAcesso);
    
    if (!sefazResponse.success) {
      throw new Error(sefazResponse.error || 'Erro ao consultar SEFAZ');
    }
    
    if (sefazResponse.xml) {
      xmlString = sefazResponse.xml;
    } else if (sefazResponse.html) {
      xmlString = extractXMLFromHTML(sefazResponse.html);
    }
  }
  
  if (!xmlString) {
    throw new Error('Não foi possível obter o XML da nota fiscal');
  }
  
  // Parse do XML
  const invoiceData = parseNFXML(xmlString);
  
  if (!invoiceData) {
    throw new Error('Erro ao processar XML da nota fiscal');
  }
  
  // Salvar no cache
  invoiceCache.set(chaveAcesso, {
    data: invoiceData,
    timestamp: Date.now(),
  });
  
  console.log('[ScanSession API] Nota fiscal processada com sucesso');
  
  return invoiceData;
}

/**
 * POST /api/scan-session
 * 
 * action=start - Inicia uma nova sessão de scan
 * action=submit - Submete o resultado do scan
 */
export async function POST(request: Request) {
  try {
    // Verificar autenticação para iniciar sessão
    const session = await getServerSession(authOptions);
    
    const body = await request.json();
    const { action } = body;
    
    if (action === 'start') {
      // Iniciar nova sessão
      if (!session) {
        return NextResponse.json(
          { error: 'Não autorizado' },
          { status: 401 }
        );
      }
      
      const { type = 'qrcode' } = body as StartSessionRequest;
      
      const newSession = createSession(type);
      
      // Construir URL de scan
      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = request.headers.get('x-forwarded-proto') || 'https';
      const scanUrl = `${protocol}://${host}/scan`;
      
      const response: CreateSessionResponse = {
        success: true,
        sessionId: newSession.id,
        expiresIn: getTimeRemaining(newSession),
        scanUrl,
      };
      
      return NextResponse.json(response);
    }
    
    if (action === 'submit') {
      // Submeter resultado do scan
      const { sessionId, qrData } = body as SubmitScanRequest;
      
      if (!sessionId || !qrData) {
        return NextResponse.json(
          { error: 'sessionId e qrData são obrigatórios' },
          { status: 400 }
        );
      }
      
      const existingSession = getSession(sessionId);
      
      if (!existingSession) {
        return NextResponse.json(
          { error: 'Sessão não encontrada' },
          { status: 404 }
        );
      }
      
      if (existingSession.status === 'expired') {
        return NextResponse.json(
          { error: 'Sessão expirada' },
          { status: 410 }
        );
      }
      
      if (existingSession.status === 'completed') {
        return NextResponse.json(
          { error: 'Sessão já foi completada' },
          { status: 400 }
        );
      }
      
      try {
        // Processar QR Code
        const invoiceData = await processQRCode(qrData);
        
        // Marcar sessão como completada
        completeSession(sessionId, invoiceData);
        
        return NextResponse.json({
          success: true,
          message: 'QR Code processado com sucesso',
          invoiceData,
        });
        
      } catch (error) {
        console.error('[ScanSession API] Erro ao processar QR:', error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Erro ao processar QR Code' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Ação inválida. Use "start" ou "submit"' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('[ScanSession API] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scan-session
 * 
 * ?sessionId=xxx - Verifica status de uma sessão (para polling do modal)
 * ?checkWaiting=true - Verifica se há sessão aguardando (para página mobile)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const checkWaiting = searchParams.get('checkWaiting');
    
    // Verificar se há sessão aguardando (para página mobile)
    if (checkWaiting === 'true') {
      const waitingSession = getWaitingSession();
      
      if (waitingSession) {
        const response: WaitingSessionResponse = {
          hasWaitingSession: true,
          sessionId: waitingSession.id,
          expiresIn: getTimeRemaining(waitingSession),
        };
        return NextResponse.json(response);
      }
      
      const response: WaitingSessionResponse = {
        hasWaitingSession: false,
      };
      return NextResponse.json(response);
    }
    
    // Verificar status de uma sessão específica (para polling do modal)
    if (sessionId) {
      const session = getSession(sessionId);
      
      if (!session) {
        return NextResponse.json(
          { error: 'Sessão não encontrada' },
          { status: 404 }
        );
      }
      
      const response: SessionStatusResponse = {
        status: session.status,
        expiresIn: getTimeRemaining(session),
        result: session.result ? {
          invoiceData: session.result,
        } : undefined,
      };
      
      return NextResponse.json(response);
    }
    
    return NextResponse.json(
      { error: 'Parâmetro sessionId ou checkWaiting é obrigatório' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('[ScanSession API] Erro no GET:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
