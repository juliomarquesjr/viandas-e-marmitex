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
  'RS': 'https://www.sefaz.rs.gov.br/nfce/consulta',
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
  'RS': (chave: string) => `https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?p=${chave}`,
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
    const uf = extractUFFromChave(chaveAcesso);
    
    if (!uf) {
      return {
        success: false,
        error: 'Não foi possível identificar a UF da chave de acesso',
      };
    }
    
    // Tenta usar URL específica para XML se disponível
    const xmlUrlBuilder = SEFAZ_XML_URLS[uf];
    if (xmlUrlBuilder) {
      const xmlUrl = xmlUrlBuilder(chaveAcesso);
      
      try {
        const response = await fetch(xmlUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/xml, text/xml, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          // Timeout de 10 segundos
          signal: AbortSignal.timeout(10000),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();
        
        // Verifica se é XML
        if (contentType.includes('xml') || text.trim().startsWith('<?xml') || text.trim().startsWith('<')) {
          return {
            success: true,
            xml: text,
          };
        }
        
        // Se não for XML, pode ser HTML (algumas SEFAZes retornam HTML)
        if (contentType.includes('html') || text.includes('<!DOCTYPE') || text.includes('<html')) {
          return {
            success: true,
            html: text,
          };
        }
        
        // Tenta parsear como XML mesmo sem o content-type correto
        if (text.trim().startsWith('<?xml') || text.trim().startsWith('<nfeProc') || text.trim().startsWith('<NFe')) {
          return {
            success: true,
            xml: text,
          };
        }
        
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
    
    const response = await fetch(`${baseUrl}?p=${chaveAcesso}`, {
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
  // Tenta encontrar XML embutido no HTML
  const xmlMatch = html.match(/<nfeProc[^>]*>[\s\S]*?<\/nfeProc>/i) || 
                    html.match(/<NFe[^>]*>[\s\S]*?<\/NFe>/i) ||
                    html.match(/<NFCe[^>]*>[\s\S]*?<\/NFCe>/i);
  
  if (xmlMatch) {
    return xmlMatch[0];
  }
  
  return null;
}

