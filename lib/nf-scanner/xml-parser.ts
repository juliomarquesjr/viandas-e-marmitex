// Parser de XML de notas fiscais

import { XMLParser } from 'fast-xml-parser';
import { InvoiceData, InvoiceItem, InvoiceEmitent, InvoiceTotals } from './types';
import { extractUFFromChave, formatValueToCents } from './utils';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  trimValues: true,
});

/**
 * Parseia XML de NF-e/NFC-e e extrai dados estruturados
 */
export function parseNFXML(xml: string): InvoiceData | null {
  try {
    const json = parser.parse(xml);
    
    // Tenta encontrar a estrutura da nota (pode variar)
    let nfeProc = json.nfeProc || json.NFe || json.NFCe || json;
    
    // Se estiver dentro de um wrapper
    if (nfeProc.NFe) {
      nfeProc = nfeProc.NFe;
    }
    
    if (nfeProc.infNFe) {
      return parseNFeStructure(nfeProc);
    }
    
    if (nfeProc.infNFCe) {
      return parseNFCeStructure(nfeProc);
    }
    
    // Tenta encontrar qualquer estrutura que contenha infNFe ou infNFCe
    const infNFe = findInObject(json, 'infNFe') || findInObject(json, 'infNFCe');
    if (infNFe) {
      return parseNFeStructure({ infNFe });
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao parsear XML:', error);
    return null;
  }
}

/**
 * Parseia estrutura de NFe
 */
function parseNFeStructure(nfe: any): InvoiceData | null {
  try {
    const infNFe = nfe.infNFe || nfe;
    const ide = infNFe['@_'] || infNFe.ide || {};
    const emit = infNFe.emit || {};
    const dest = infNFe.dest || {};
    const det = infNFe.det || [];
    const total = infNFe.total || {};
    const totalICMSTot = total.ICMSTot || total.ICMS || {};
    
    const chaveAcesso = infNFe['@_Id']?.replace('NFe', '') || ide.chave || '';
    const modelo = ide.mod || ide['@_mod'] || '55';
    const numero = ide.nNF || ide['@_nNF'] || '';
    const serie = ide.serie || ide['@_serie'] || '';
    
    const dataEmissao = formatDate(ide.dhEmi || ide.dEmi || ide['@_dhEmi'] || ide['@_dEmi']);
    const dataEntradaSaida = ide.dhSaiEnt ? formatDate(ide.dhSaiEnt) : undefined;
    
    const uf = extractUFFromChave(chaveAcesso) || '';
    
    const emitente: InvoiceEmitent = {
      cnpj: emit.CNPJ || emit['@_CNPJ'] || '',
      razaoSocial: emit.xNome || emit['@_xNome'] || '',
      nomeFantasia: emit.xFant || emit['@_xFant'],
      endereco: emit.enderEmit ? {
        logradouro: emit.enderEmit.xLgr || emit.enderEmit['@_xLgr'],
        numero: emit.enderEmit.nro || emit.enderEmit['@_nro'],
        bairro: emit.enderEmit.xBairro || emit.enderEmit['@_xBairro'],
        municipio: emit.enderEmit.xMun || emit.enderEmit['@_xMun'],
        uf: emit.enderEmit.UF || emit.enderEmit['@_UF'],
        cep: emit.enderEmit.CEP || emit.enderEmit['@_CEP'],
      } : undefined,
    };
    
    const destinatario = dest.CPF || dest.CNPJ ? {
      cpf: dest.CPF || dest['@_CPF'],
      cnpj: dest.CNPJ || dest['@_CNPJ'],
      nome: dest.xNome || dest['@_xNome'],
    } : undefined;
    
    // Processa itens
    const itens: InvoiceItem[] = Array.isArray(det) ? det.map(parseItem) : (det ? [parseItem(det)] : []);
    
    const totais: InvoiceTotals = {
      valorProdutos: parseNumber(totalICMSTot.vProd || totalICMSTot['@_vProd'] || '0'),
      valorDesconto: parseNumber(totalICMSTot.vDesc || totalICMSTot['@_vDesc'] || '0'),
      valorFrete: parseNumber(totalICMSTot.vFrete || totalICMSTot['@_vFrete'] || '0'),
      valorICMS: parseNumber(totalICMSTot.vICMS || totalICMSTot['@_vICMS'] || '0'),
      valorTotal: parseNumber(totalICMSTot.vNF || totalICMSTot['@_vNF'] || totalICMSTot.vProd || totalICMSTot['@_vProd'] || '0'),
    };
    
    return {
      chaveAcesso,
      numero: String(numero),
      serie: serie ? String(serie) : undefined,
      modelo: modelo === '65' ? '65' : '55',
      dataEmissao,
      dataEntradaSaida,
      emitente,
      destinatario,
      itens,
      totais,
      uf,
    };
  } catch (error) {
    console.error('Erro ao parsear estrutura NFe:', error);
    return null;
  }
}

/**
 * Parseia estrutura de NFCe
 */
function parseNFCeStructure(nfce: any): InvoiceData | null {
  // NFCe tem estrutura similar à NFe
  return parseNFeStructure(nfce);
}

/**
 * Parseia um item da nota fiscal
 */
function parseItem(det: any): InvoiceItem {
  const prod = det.prod || det;
  const imposto = det.imposto || {};
  
  return {
    codigo: prod.cProd || prod['@_cProd'],
    descricao: prod.xProd || prod['@_xProd'] || '',
    quantidade: parseNumber(prod.qCom || prod['@_qCom'] || '1'),
    unidade: prod.uCom || prod['@_uCom'],
    valorUnitario: parseNumber(prod.vUnCom || prod['@_vUnCom'] || prod.vProd || prod['@_vProd'] || '0'),
    valorTotal: parseNumber(prod.vProd || prod['@_vProd'] || '0'),
  };
}

/**
 * Parseia número (string para number)
 */
function parseNumber(value: string | number | undefined): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const str = String(value).replace(',', '.');
  return parseFloat(str) || 0;
}

/**
 * Formata data do formato XML para ISO string
 */
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // Formato: 2024-01-15T10:30:00-03:00 ou 2024-01-15
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Busca recursivamente por uma chave no objeto
 */
function findInObject(obj: any, key: string): any {
  if (!obj || typeof obj !== 'object') return null;
  
  if (key in obj) {
    return obj[key];
  }
  
  for (const k in obj) {
    if (typeof obj[k] === 'object') {
      const found = findInObject(obj[k], key);
      if (found) return found;
    }
  }
  
  return null;
}

