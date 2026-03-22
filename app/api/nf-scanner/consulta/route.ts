// API route para consulta de NF por chave de acesso SEFAZ

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { consultarSEFAZ } from '@/lib/nf-scanner/sefaz-client';
import { parseNFXML } from '@/lib/nf-scanner/xml-parser';
import { InvoiceData } from '@/lib/nf-scanner/types';

// Cache simples em memória compartilhado entre requisições
const cache = new Map<string, { data: InvoiceData; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora
const CACHE_VERSION = 'nf-v2';

function getCacheKey(chaveAcesso: string): string {
  return `${CACHE_VERSION}:${chaveAcesso}`;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chave = searchParams.get('chave');
    const url = searchParams.get('url');

    if (!chave) {
      return NextResponse.json(
        { error: 'Parâmetro "chave" é obrigatório' },
        { status: 400 }
      );
    }

    const { normalizeChaveAcesso, validateChaveAcesso } = await import(
      '@/lib/nf-scanner/utils'
    );

    const chaveNormalizada = normalizeChaveAcesso(chave);
    if (!validateChaveAcesso(chaveNormalizada)) {
      return NextResponse.json(
        { error: 'Chave de acesso inválida (deve ter 44 dígitos numéricos)' },
        { status: 400 }
      );
    }

    // Verificar cache
    const cached = cache.get(getCacheKey(chaveNormalizada));
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ data: cached.data });
    }

    // Se tiver URL original do QR code, tentar consultar diretamente primeiro (necessário para RS/SVRS)
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const directResponse = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Referer': 'https://www.sefaz.rs.gov.br/',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (directResponse.ok) {
          const text = await directResponse.text();
          if (!text.includes('902') && !text.includes('Parâmetros informados inválidos')) {
            const { extractXMLFromHTML } = await import('@/lib/nf-scanner/sefaz-client');
            const extractedXml = extractXMLFromHTML(text);
            if (extractedXml) {
              const invoiceData = parseNFXML(extractedXml);
              if (invoiceData) {
                invoiceData.urlConsulta = url;
                cache.set(getCacheKey(chaveNormalizada), { data: invoiceData, timestamp: Date.now() });
                return NextResponse.json({ data: invoiceData });
              }
            }
            // HTML sem XML extraível — tentar parser HTML do RS/SVRS
            if (url.includes('sefaz.rs.gov.br') || url.includes('svrs.rs.gov.br')) {
              const { parseRSHTML } = await import('@/lib/nf-scanner/html-parser');
              const invoiceData = parseRSHTML(text, chaveNormalizada);
              if (invoiceData) {
                invoiceData.urlConsulta = url;
                cache.set(getCacheKey(chaveNormalizada), { data: invoiceData, timestamp: Date.now() });
                return NextResponse.json({ data: invoiceData });
              }
            }
          }
        }
      } catch (urlError) {
        console.warn('Erro ao consultar via URL original, tentando via chave:', urlError);
        // Continua para o fluxo normal via chave
      }
    }

    // Consultar SEFAZ via chave
    const sefazResponse = await consultarSEFAZ(chaveNormalizada);

    if (!sefazResponse.success) {
      return NextResponse.json(
        { error: sefazResponse.error || 'Erro ao consultar SEFAZ' },
        { status: 502 }
      );
    }

    // Extrair XML
    let xml = sefazResponse.xml;
    if (!xml && sefazResponse.html) {
      const { extractXMLFromHTML } = await import('@/lib/nf-scanner/sefaz-client');
      xml = extractXMLFromHTML(sefazResponse.html) ?? undefined;
    }

    if (!xml) {
      return NextResponse.json(
        {
          error:
            'Não foi possível obter o XML da nota fiscal. A SEFAZ pode ter retornado apenas HTML.',
        },
        { status: 502 }
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
    cache.set(getCacheKey(chaveNormalizada), {
      data: invoiceData,
      timestamp: Date.now(),
    });

    return NextResponse.json({ data: invoiceData });
  } catch (error) {
    console.error('Erro ao consultar NF por chave:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar nota fiscal' },
      { status: 500 }
    );
  }
}
