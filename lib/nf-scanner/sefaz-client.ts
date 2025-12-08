// Cliente para consulta à SEFAZ

import { SEFAZResponse } from './types';
import { extractUFFromChave } from './utils';

/**
 * Mapeamento de URLs de consulta pública por UF
 * Formato: URL base para consulta de NFCe/NFe
 */
const SEFAZ_URLS: Record<string, string> = {
  'AC': 'https://www.sefaznet.ac.gov.br/nfce/consulta',
  'AL': 'https://www.sefaz.al.gov.br/nfce/consulta',
  'AP': 'https://www.sefaz.ap.gov.br/nfce/consulta',
  'AM': 'https://www.sefaz.am.gov.br/nfce/consulta',
  'BA': 'https://www.sefaz.ba.gov.br/nfce/consulta',
  'CE': 'https://www.sefaz.ce.gov.br/nfce/consulta',
  'DF': 'https://www.fazenda.df.gov.br/nfce/consulta',
  'ES': 'https://www.sefaz.es.gov.br/nfce/consulta',
  'GO': 'https://www.sefaz.go.gov.br/nfce/consulta',
  'MA': 'https://www.sefaz.ma.gov.br/nfce/consulta',
  'MT': 'https://www.sefaz.mt.gov.br/nfce/consulta',
  'MS': 'https://www.sefaz.ms.gov.br/nfce/consulta',
  'MG': 'https://www.nfce.fazenda.mg.gov.br/nfce/consulta',
  'PA': 'https://www.sefaz.pa.gov.br/nfce/consulta',
  'PB': 'https://www.sefaz.pb.gov.br/nfce/consulta',
  'PR': 'https://www.fazenda.pr.gov.br/nfce/consulta',
  'PE': 'https://www.sefaz.pe.gov.br/nfce/consulta',
  'PI': 'https://www.sefaz.pi.gov.br/nfce/consulta',
  'RJ': 'https://www.fazenda.rj.gov.br/nfce/consulta',
  'RN': 'https://www.sefaz.rn.gov.br/nfce/consulta',
  'RS': 'https://www.sefaz.rs.gov.br/NFCE/consulta',
  'RO': 'https://www.sefaz.ro.gov.br/nfce/consulta',
  'RR': 'https://www.sefaz.rr.gov.br/nfce/consulta',
  'SC': 'https://www.sefaz.sc.gov.br/nfce/consulta',
  'SP': 'https://www.nfce.fazenda.sp.gov.br/consulta',
  'SE': 'https://www.sefaz.se.gov.br/nfce/consulta',
  'TO': 'https://www.sefaz.to.gov.br/nfce/consulta',
};

/**
 * URLs alternativas para consulta via API/XML direto (quando disponível)
 */
const SEFAZ_XML_URLS: Record<string, (chave: string) => string> = {
  'SP': (chave: string) => `https://www.nfce.fazenda.sp.gov.br/ConsultaNFCe/consultaNFCe.jsp?p=${chave}`,
  'RJ': (chave: string) => `https://www.fazenda.rj.gov.br/nfce/qrcode?p=${chave}`,
  'MG': (chave: string) => `https://www.nfce.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml?p=${chave}`,
  'PR': (chave: string) => `https://www.fazenda.pr.gov.br/nfce/qrcode?p=${chave}`,
  'RS': (chave: string) => {
    // RS precisa apenas da chave de 44 dígitos, sem os parâmetros |versao|tipo
    const chaveLimpa = chave.replace(/\D/g, '').substring(0, 44);
    // RS usa formato diferente - tenta URL alternativa também
    return `https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?p=${chaveLimpa}`;
  },
  'SC': (chave: string) => `https://www.sefaz.sc.gov.br/nfce/consulta?p=${chave}`,
  'GO': (chave: string) => `https://www.sefaz.go.gov.br/nfce/qrcode?p=${chave}`,
  'ES': (chave: string) => `https://www.sefaz.es.gov.br/nfce/qrcode?p=${chave}`,
  'BA': (chave: string) => `https://www.sefaz.ba.gov.br/nfce/qrcode?p=${chave}`,
  'CE': (chave: string) => `https://www.sefaz.ce.gov.br/nfce/qrcode?p=${chave}`,
  'PE': (chave: string) => `https://www.sefaz.pe.gov.br/nfce/qrcode?p=${chave}`,
  'PB': (chave: string) => `https://www.sefaz.pb.gov.br/nfce/qrcode?p=${chave}`,
  'RN': (chave: string) => `https://www.sefaz.rn.gov.br/nfce/qrcode?p=${chave}`,
  'AL': (chave: string) => `https://www.sefaz.al.gov.br/nfce/qrcode?p=${chave}`,
  'SE': (chave: string) => `https://www.sefaz.se.gov.br/nfce/qrcode?p=${chave}`,
  'PI': (chave: string) => `https://www.sefaz.pi.gov.br/nfce/qrcode?p=${chave}`,
  'MA': (chave: string) => `https://www.sefaz.ma.gov.br/nfce/qrcode?p=${chave}`,
  'PA': (chave: string) => `https://www.sefaz.pa.gov.br/nfce/qrcode?p=${chave}`,
  'AP': (chave: string) => `https://www.sefaz.ap.gov.br/nfce/qrcode?p=${chave}`,
  'AM': (chave: string) => `https://www.sefaz.am.gov.br/nfce/qrcode?p=${chave}`,
  'RR': (chave: string) => `https://www.sefaz.rr.gov.br/nfce/qrcode?p=${chave}`,
  'RO': (chave: string) => `https://www.sefaz.ro.gov.br/nfce/qrcode?p=${chave}`,
  'AC': (chave: string) => `https://www.sefaznet.ac.gov.br/nfce/qrcode?p=${chave}`,
  'TO': (chave: string) => `https://www.sefaz.to.gov.br/nfce/qrcode?p=${chave}`,
  'MT': (chave: string) => `https://www.sefaz.mt.gov.br/nfce/qrcode?p=${chave}`,
  'MS': (chave: string) => `https://www.sefaz.ms.gov.br/nfce/qrcode?p=${chave}`,
  'DF': (chave: string) => `https://www.fazenda.df.gov.br/nfce/qrcode?p=${chave}`,
};

/**
 * Consulta a SEFAZ usando a chave de acesso
 */
export async function consultarSEFAZ(chaveAcesso: string): Promise<SEFAZResponse> {
  try {
    // Normalizar a chave de acesso (garantir que tem apenas 44 dígitos)
    const { normalizeChaveAcesso, validateChaveAcesso } = await import('./utils');
    const chaveNormalizada = normalizeChaveAcesso(chaveAcesso);
    
    if (!validateChaveAcesso(chaveNormalizada)) {
      return {
        success: false,
        error: 'Chave de acesso inválida (deve ter 44 dígitos)',
      };
    }
    
    const uf = extractUFFromChave(chaveNormalizada);
    
    if (!uf) {
      return {
        success: false,
        error: 'Não foi possível identificar a UF da chave de acesso',
      };
    }
    
    console.log(`Consultando SEFAZ ${uf} com chave: ${chaveNormalizada.substring(0, 20)}...`);
    
    // Para RS, a consulta direta pode não funcionar, então vamos tentar usar a URL original do QR code se disponível
    // Mas primeiro, tenta usar URL específica para XML se disponível
    const xmlUrlBuilder = SEFAZ_XML_URLS[uf];
    if (xmlUrlBuilder) {
      const xmlUrl = xmlUrlBuilder(chaveNormalizada);
      console.log(`URL de consulta: ${xmlUrl}`);
      
      try {
        const response = await fetch(xmlUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/xml, text/xml, text/html, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Referer': `https://www.sefaz.rs.gov.br/NFCE/`,
          },
          // Timeout de 10 segundos
          signal: AbortSignal.timeout(10000),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();
        
        console.log(`SEFAZ ${uf} - Content-Type:`, contentType);
        console.log(`SEFAZ ${uf} - Primeiros 500 caracteres:`, text.substring(0, 500));
        
        // Verifica se há erro na resposta (especialmente para RS)
        if (text.includes('902') || text.includes('Parâmetros informados inválidos') || text.includes('parâmetros inválidos')) {
          console.warn(`SEFAZ ${uf} - Erro 902 detectado: Parâmetros informados inválidos`);
          return {
            success: false,
            error: 'SEFAZ retornou erro: Parâmetros informados inválidos. A chave de acesso pode estar incorreta ou a nota pode não estar disponível para consulta pública.',
          };
        }
        
        // Verifica se é XML
        if (contentType.includes('xml') || text.trim().startsWith('<?xml') || text.trim().startsWith('<nfeProc') || text.trim().startsWith('<NFe')) {
          console.log(`SEFAZ ${uf} - Retornando como XML`);
          return {
            success: true,
            xml: text,
          };
        }
        
        // Se não for XML, pode ser HTML (algumas SEFAZes retornam HTML)
        if (contentType.includes('html') || text.includes('<!DOCTYPE') || text.includes('<html')) {
          console.log(`SEFAZ ${uf} - Retornando como HTML, tentando extrair XML`);
          const extractedXml = extractXMLFromHTML(text);
          if (extractedXml) {
            return {
              success: true,
              xml: extractedXml,
            };
          }
          return {
            success: true,
            html: text,
          };
        }
        
        // Tenta parsear como XML mesmo sem o content-type correto
        if (text.trim().startsWith('<?xml') || text.trim().startsWith('<nfeProc') || text.trim().startsWith('<NFe')) {
          console.log(`SEFAZ ${uf} - Detectado XML sem content-type correto`);
          return {
            success: true,
            xml: text,
          };
        }
        
        // Última tentativa: verifica se tem XML embutido
        const extractedXml = extractXMLFromHTML(text);
        if (extractedXml) {
          console.log(`SEFAZ ${uf} - XML extraído do conteúdo`);
          return {
            success: true,
            xml: extractedXml,
          };
        }
        
        console.log(`SEFAZ ${uf} - Retornando como HTML (sem XML encontrado)`);
        return {
          success: true,
          html: text,
        };
      } catch (fetchError) {
        // Se falhar, continua para tentar URL base
        console.warn(`Erro ao consultar SEFAZ ${uf} via XML URL:`, fetchError);
      }
    }
    
    // Fallback: tenta URL base
    const baseUrl = SEFAZ_URLS[uf];
    if (!baseUrl) {
      return {
        success: false,
        error: `URL de consulta não configurada para UF ${uf}`,
      };
    }
    
    const response = await fetch(`${baseUrl}?p=${chaveNormalizada}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml, text/html, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: `Erro HTTP ${response.status} ao consultar SEFAZ`,
      };
    }
    
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    
    if (contentType.includes('xml') || text.trim().startsWith('<?xml') || text.trim().startsWith('<nfeProc') || text.trim().startsWith('<NFe')) {
      return {
        success: true,
        xml: text,
      };
    }
    
    return {
      success: true,
      html: text,
    };
  } catch (error) {
    console.error('Erro ao consultar SEFAZ:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao consultar SEFAZ',
    };
  }
}

/**
 * Extrai XML de uma resposta HTML (algumas SEFAZes retornam HTML com XML embutido)
 */
export function extractXMLFromHTML(html: string): string | null {
  console.log('Tentando extrair XML do HTML, tamanho:', html.length);
  
  // Tenta encontrar XML embutido no HTML com diferentes padrões
  const patterns = [
    // Padrões completos (mais específicos primeiro)
    /<nfeProc[^>]*>[\s\S]*?<\/nfeProc>/i,
    /<procNFe[^>]*>[\s\S]*?<\/procNFe>/i,
    /<procNFCe[^>]*>[\s\S]*?<\/procNFCe>/i,
    /<NFe[^>]*>[\s\S]*?<\/NFe>/i,
    /<NFCe[^>]*>[\s\S]*?<\/NFCe>/i,
    // Procura por tags XML dentro de scripts ou textareas (com grupos de captura)
    /<script[^>]*>[\s\S]*?(<nfeProc[^>]*>[\s\S]*?<\/nfeProc>)[\s\S]*?<\/script>/i,
    /<textarea[^>]*>[\s\S]*?(<nfeProc[^>]*>[\s\S]*?<\/nfeProc>)[\s\S]*?<\/textarea>/i,
    /<script[^>]*>[\s\S]*?(<procNFe[^>]*>[\s\S]*?<\/procNFe>)[\s\S]*?<\/script>/i,
    /<script[^>]*>[\s\S]*?(<procNFCe[^>]*>[\s\S]*?<\/procNFCe>)[\s\S]*?<\/script>/i,
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      // Se o match tiver grupos, pega o primeiro grupo (XML), senão pega o match completo
      const xml = match[1] || match[0];
      console.log('XML extraído do HTML via padrão, tamanho:', xml.length);
      return xml;
    }
  }
  
  // Tenta encontrar qualquer estrutura XML completa começando com <?xml
  const xmlStart = html.indexOf('<?xml');
  if (xmlStart !== -1) {
    // Procura pelo fechamento de nfeProc
    let xmlEnd = html.indexOf('</nfeProc>', xmlStart);
    if (xmlEnd === -1) {
      xmlEnd = html.indexOf('</procNFe>', xmlStart);
    }
    if (xmlEnd === -1) {
      xmlEnd = html.indexOf('</procNFCe>', xmlStart);
    }
    if (xmlEnd !== -1) {
      const closingTag = html.substring(xmlEnd, xmlEnd + 10); // </nfeProc> ou similar
      const xml = html.substring(xmlStart, xmlEnd + closingTag.length);
      console.log('XML encontrado via busca de <?xml, tamanho:', xml.length);
      return xml;
    }
  }
  
  // Procura por tags que começam com <nfeProc, <procNFe, etc (sem <?xml)
  const tagPatterns = [
    /<nfeProc[^>]*>/i,
    /<procNFe[^>]*>/i,
    /<procNFCe[^>]*>/i,
    /<NFe[^>]*>/i,
    /<NFCe[^>]*>/i,
  ];
  
  for (const tagPattern of tagPatterns) {
    const tagMatch = html.match(tagPattern);
    if (tagMatch) {
      const tagStart = tagMatch.index!;
      const tagName = tagMatch[0].match(/<(\w+)/)?.[1] || '';
      const closingTag = `</${tagName}>`;
      const closingIndex = html.indexOf(closingTag, tagStart);
      
      if (closingIndex !== -1) {
        const xml = html.substring(tagStart, closingIndex + closingTag.length);
        console.log(`XML encontrado via busca de tag ${tagName}, tamanho:`, xml.length);
        return xml;
      }
    }
  }
  
  // Última tentativa: busca por qualquer estrutura que pareça XML
  const nfeStart = html.search(/<[nN][fF][eE][Pp][Rr][Oo][Cc]/);
  if (nfeStart !== -1) {
    // Encontra a tag de abertura completa
    let tagEnd = html.indexOf('>', nfeStart);
    if (tagEnd === -1) return null;
    
    // Extrai o nome da tag
    const tagContent = html.substring(nfeStart + 1, tagEnd);
    const tagName = tagContent.split(/\s/)[0];
    
    // Procura o fechamento correspondente
    const closingTag = `</${tagName}>`;
    const closingIndex = html.indexOf(closingTag, tagEnd);
    
    if (closingIndex !== -1) {
      const xml = html.substring(nfeStart, closingIndex + closingTag.length);
      console.log(`XML encontrado via busca genérica de tag ${tagName}, tamanho:`, xml.length);
      return xml;
    }
  }
  
  console.log('Não foi possível extrair XML do HTML');
  console.log('Amostra do HTML (últimos 1000 chars):', html.substring(Math.max(0, html.length - 1000)));
  return null;
}

