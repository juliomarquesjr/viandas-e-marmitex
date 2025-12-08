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
      // Log para debug (remover em produção se necessário)
      console.log('QR Data recebido:', qrData.substring(0, 100) + (qrData.length > 100 ? '...' : ''));
      
      let chaveAcesso = extractChaveAcesso(qrData);
      if (!chaveAcesso) {
        console.error('Não foi possível extrair chave de acesso. QR Data:', qrData);
        return NextResponse.json(
          { 
            error: 'QR code inválido: não foi possível extrair a chave de acesso. Verifique se é um QR code de nota fiscal válido.',
            debug: process.env.NODE_ENV === 'development' ? { qrDataLength: qrData.length, qrDataPreview: qrData.substring(0, 200) } : undefined
          },
          { status: 400 }
        );
      }
      
      // Garantir que a chave está normalizada (apenas 44 dígitos)
      const { normalizeChaveAcesso, validateChaveAcesso } = await import('@/lib/nf-scanner/utils');
      chaveAcesso = normalizeChaveAcesso(chaveAcesso);
      if (!validateChaveAcesso(chaveAcesso)) {
        return NextResponse.json(
          { error: 'Chave de acesso inválida após normalização' },
          { status: 400 }
        );
      }
      
      console.log('Chave de acesso normalizada:', chaveAcesso);

      // Verificar cache
      const cached = cache.get(chaveAcesso);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json({ data: cached.data });
      }

      // Se o qrData for uma URL (especialmente do RS), tentar usar diretamente primeiro
      // O RS precisa dos parâmetros |3|1 na URL quando acessada via fetch
      if (qrData.startsWith('http://') || qrData.startsWith('https://')) {
        try {
          console.log('Tentando consultar diretamente pela URL do QR code (com parâmetros originais)...');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          // Usar a URL original com todos os parâmetros (incluindo |3|1 para RS)
          const directResponse = await fetch(qrData, {
            method: 'GET',
            headers: {
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
              'Accept-Encoding': 'gzip, deflate, br',
              'Referer': 'https://www.sefaz.rs.gov.br/',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
            },
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (directResponse.ok) {
            const directText = await directResponse.text();
            const directContentType = directResponse.headers.get('content-type') || '';
            
            console.log('Resposta direta - Content-Type:', directContentType);
            console.log('Resposta direta - Primeiros 500 chars:', directText.substring(0, 500));
            
            // Verifica se há erro na resposta
            if (directText.includes('902') || directText.includes('Parâmetros informados inválidos')) {
              console.warn('Erro 902 na resposta direta, tentando sem parâmetros...');
              // Tenta sem os parâmetros |3|1
              const urlWithoutParams = qrData.split('|')[0];
              try {
                const retryResponse = await fetch(urlWithoutParams, {
                  method: 'GET',
                  headers: {
                    'Accept': 'application/xml, text/xml, text/html, */*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
                    'Referer': 'https://www.sefaz.rs.gov.br/',
                  },
                  signal: AbortSignal.timeout(10000),
                });
                
                if (retryResponse.ok) {
                  const retryText = await retryResponse.text();
                  if (!retryText.includes('902')) {
                    // Processa a resposta sem erro
                    const { extractXMLFromHTML } = await import('@/lib/nf-scanner/sefaz-client');
                    const { parseNFXML } = await import('@/lib/nf-scanner/xml-parser');
                    const extractedXml = extractXMLFromHTML(retryText);
                    if (extractedXml) {
                      const invoiceData = parseNFXML(extractedXml);
                      if (invoiceData) {
                        const { normalizeChaveAcesso } = await import('@/lib/nf-scanner/utils');
                        const chave = normalizeChaveAcesso(invoiceData.chaveAcesso);
                        cache.set(chave, { data: invoiceData, timestamp: Date.now() });
                        return NextResponse.json({ data: invoiceData });
                      }
                    }
                  }
                }
              } catch (retryError) {
                console.warn('Erro ao tentar sem parâmetros:', retryError);
              }
            }
            
            // Se retornou XML, usar diretamente
            if (directContentType.includes('xml') || directText.trim().startsWith('<?xml') || directText.trim().startsWith('<nfeProc') || directText.trim().startsWith('<NFe')) {
              const { parseNFXML } = await import('@/lib/nf-scanner/xml-parser');
              const invoiceData = parseNFXML(directText);
              if (invoiceData) {
                const { normalizeChaveAcesso } = await import('@/lib/nf-scanner/utils');
                const chave = normalizeChaveAcesso(invoiceData.chaveAcesso);
                cache.set(chave, { data: invoiceData, timestamp: Date.now() });
                return NextResponse.json({ data: invoiceData });
              }
            }
            
            // Se retornou HTML, tentar extrair XML
            const { extractXMLFromHTML } = await import('@/lib/nf-scanner/sefaz-client');
            const extractedXml = extractXMLFromHTML(directText);
            if (extractedXml) {
              console.log('XML extraído da resposta direta, tamanho:', extractedXml.length);
              const { parseNFXML } = await import('@/lib/nf-scanner/xml-parser');
              const invoiceData = parseNFXML(extractedXml);
              if (invoiceData) {
                console.log('XML parseado com sucesso!');
                const { normalizeChaveAcesso } = await import('@/lib/nf-scanner/utils');
                const chave = normalizeChaveAcesso(invoiceData.chaveAcesso);
                cache.set(chave, { data: invoiceData, timestamp: Date.now() });
                return NextResponse.json({ data: invoiceData });
              } else {
                console.error('Falha ao parsear XML extraído');
              }
            } else {
              console.warn('Não foi possível extrair XML do HTML retornado, tentando parsear HTML diretamente...');
              
              // Se for HTML do RS, tentar parsear diretamente
              if (qrData.includes('sefaz.rs.gov.br')) {
                const { parseRSHTML } = await import('@/lib/nf-scanner/html-parser');
                const invoiceData = parseRSHTML(directText, chaveAcesso);
                if (invoiceData) {
                  console.log('HTML parseado com sucesso!');
                  cache.set(chaveAcesso, { data: invoiceData, timestamp: Date.now() });
                  return NextResponse.json({ data: invoiceData });
                }
              }
              
              console.log('HTML completo (primeiros 2000 chars):', directText.substring(0, 2000));
            }
          }
        } catch (directError) {
          console.warn('Erro ao consultar URL diretamente, tentando via chave de acesso:', directError);
          // Continua para o fluxo normal
        }
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
    console.log('QR Code Data:', { 
      rawData: qrCodeData.rawData?.substring(0, 100),
      url: qrCodeData.url,
      chaveAcesso: qrCodeData.chaveAcesso 
    });
    
    let chaveAcesso = qrCodeData.chaveAcesso || extractChaveAcesso(qrCodeData.rawData);
    
    if (!chaveAcesso) {
      console.error('Não foi possível extrair chave de acesso. QR Code Data:', qrCodeData);
      return NextResponse.json(
        { 
          error: 'QR code inválido: não foi possível extrair a chave de acesso. Verifique se é um QR code de nota fiscal válido.',
          debug: process.env.NODE_ENV === 'development' ? { 
            rawData: qrCodeData.rawData?.substring(0, 200),
            url: qrCodeData.url 
          } : undefined
        },
        { status: 400 }
      );
    }
    
    // Garantir que a chave está normalizada (apenas 44 dígitos)
    const { normalizeChaveAcesso, validateChaveAcesso } = await import('@/lib/nf-scanner/utils');
    chaveAcesso = normalizeChaveAcesso(chaveAcesso);
    if (!validateChaveAcesso(chaveAcesso)) {
      return NextResponse.json(
        { error: 'Chave de acesso inválida após normalização' },
        { status: 400 }
      );
    }
    
    console.log('Chave de acesso normalizada:', chaveAcesso);

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

