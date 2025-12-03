// API route para processar QR code de notas fiscais

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { decodeQRCodeFromFile } from '@/lib/nf-scanner/qr-decoder';
import { consultarSEFAZ, extractXMLFromHTML } from '@/lib/nf-scanner/sefaz-client';
import { parseNFXML } from '@/lib/nf-scanner/xml-parser';
import { extractChaveAcesso } from '@/lib/nf-scanner/utils';
import { InvoiceData } from '@/lib/nf-scanner/types';

// Cache simples em memória (em produção, usar Redis ou similar)
const cache = new Map<string, { data: InvoiceData; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

export async function POST(request: Request) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;
    const qrData = formData.get('qrData') as string | null;

    // Se já tiver os dados do QR code (do frontend), usar diretamente
    if (qrData) {
      const chaveAcesso = extractChaveAcesso(qrData);
      if (!chaveAcesso) {
        return NextResponse.json(
          { error: 'QR code inválido: não foi possível extrair a chave de acesso' },
          { status: 400 }
        );
      }

      // Verificar cache
      const cached = cache.get(chaveAcesso);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json({ data: cached.data });
      }

      // Consultar SEFAZ
      const sefazResponse = await consultarSEFAZ(chaveAcesso);
      
      if (!sefazResponse.success) {
        return NextResponse.json(
          { error: sefazResponse.error || 'Erro ao consultar SEFAZ' },
          { status: 500 }
        );
      }

      // Extrair XML
      let xml = sefazResponse.xml;
      if (!xml && sefazResponse.html) {
        const extractedXml = extractXMLFromHTML(sefazResponse.html);
        xml = extractedXml || undefined;
      }

      if (!xml) {
        return NextResponse.json(
          { error: 'Não foi possível obter XML da nota fiscal. A SEFAZ pode ter retornado apenas HTML.' },
          { status: 500 }
        );
      }

      // Parsear XML
      const invoiceData = parseNFXML(xml);
      
      if (!invoiceData) {
        return NextResponse.json(
          { error: 'Erro ao parsear XML da nota fiscal' },
          { status: 500 }
        );
      }

      // Salvar no cache
      cache.set(chaveAcesso, { data: invoiceData, timestamp: Date.now() });

      return NextResponse.json({ data: invoiceData });
    }

    // Se tiver arquivo de imagem, decodificar QR code
    if (!file) {
      return NextResponse.json(
        { error: 'Nenhuma imagem ou dados de QR code fornecidos' },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Arquivo deve ser uma imagem' },
        { status: 400 }
      );
    }

    // Decodificar QR code
    const qrCodeData = await decodeQRCodeFromFile(file);
    
    if (!qrCodeData) {
      return NextResponse.json(
        { error: 'Não foi possível decodificar o QR code da imagem' },
        { status: 400 }
      );
    }

    // Extrair chave de acesso
    const chaveAcesso = qrCodeData.chaveAcesso || extractChaveAcesso(qrCodeData.rawData);
    
    if (!chaveAcesso) {
      return NextResponse.json(
        { error: 'QR code inválido: não foi possível extrair a chave de acesso' },
        { status: 400 }
      );
    }

    // Verificar cache
    const cached = cache.get(chaveAcesso);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ data: cached.data });
    }

    // Consultar SEFAZ
    const sefazResponse = await consultarSEFAZ(chaveAcesso);
    
    if (!sefazResponse.success) {
      return NextResponse.json(
        { error: sefazResponse.error || 'Erro ao consultar SEFAZ' },
        { status: 500 }
      );
    }

    // Extrair XML
    let xml = sefazResponse.xml;
    if (!xml && sefazResponse.html) {
      const extractedXml = extractXMLFromHTML(sefazResponse.html);
      xml = extractedXml || undefined;
    }

    if (!xml) {
      return NextResponse.json(
        { error: 'Não foi possível obter XML da nota fiscal. A SEFAZ pode ter retornado apenas HTML.' },
        { status: 500 }
      );
    }

    // Parsear XML
    const invoiceData = parseNFXML(xml);
    
    if (!invoiceData) {
      return NextResponse.json(
        { error: 'Erro ao parsear XML da nota fiscal' },
        { status: 500 }
      );
    }

    // Salvar no cache
    cache.set(chaveAcesso, { data: invoiceData, timestamp: Date.now() });

    return NextResponse.json({ data: invoiceData });
  } catch (error) {
    console.error('Erro ao processar QR code:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar QR code' },
      { status: 500 }
    );
  }
}

