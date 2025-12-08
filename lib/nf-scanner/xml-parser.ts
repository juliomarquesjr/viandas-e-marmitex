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
    // Log para debug
    console.log('Iniciando parse do XML, tamanho:', xml.length);
    console.log('Primeiros 500 caracteres do XML:', xml.substring(0, 500));
    
    const json = parser.parse(xml);
    
    // Log da estrutura parseada
    console.log('Estrutura JSON parseada (chaves principais):', Object.keys(json));
    
    // Tenta encontrar a estrutura da nota (pode variar)
    let nfeProc = json.nfeProc || json.NFe || json.NFCe || json.nfeProc || json;
    
    // Se estiver dentro de um wrapper
    if (nfeProc && nfeProc.NFe) {
      nfeProc = nfeProc.NFe;
    }
    
    // Log da estrutura encontrada
    if (nfeProc) {
      console.log('Estrutura nfeProc encontrada, chaves:', Object.keys(nfeProc));
    }
    
    if (nfeProc && nfeProc.infNFe) {
      console.log('Encontrado infNFe, parseando...');
      return parseNFeStructure(nfeProc);
    }
    
    if (nfeProc && nfeProc.infNFCe) {
      console.log('Encontrado infNFCe, parseando...');
      return parseNFCeStructure(nfeProc);
    }
    
    // Tenta encontrar qualquer estrutura que contenha infNFe ou infNFCe
    const infNFe = findInObject(json, 'infNFe') || findInObject(json, 'infNFCe');
    if (infNFe) {
      console.log('Encontrado infNFe/infNFCe via busca recursiva, parseando...');
      return parseNFeStructure({ infNFe });
    }
    
    // Última tentativa: procurar por qualquer estrutura que pareça uma nota fiscal
    console.log('Estrutura não encontrada, tentando busca mais ampla...');
    const possibleKeys = ['NFe', 'NFCe', 'nfeProc', 'procNFe', 'procNFCe'];
    for (const key of possibleKeys) {
      if (json[key]) {
        const result = parseNFeStructure(json[key]);
        if (result) {
          console.log(`Estrutura encontrada em ${key}`);
          return result;
        }
      }
    }
    
    console.error('Não foi possível encontrar estrutura de nota fiscal no XML');
    return null;
  } catch (error) {
    console.error('Erro ao parsear XML:', error);
    if (error instanceof Error) {
      console.error('Mensagem de erro:', error.message);
      console.error('Stack:', error.stack);
    }
    return null;
  }
}

/**
 * Parseia estrutura de NFe
 */
function parseNFeStructure(nfe: any): InvoiceData | null {
  try {
    console.log('Parseando estrutura NFe, chaves disponíveis:', Object.keys(nfe));
    
    const infNFe = nfe.infNFe || nfe.infNFCe || nfe;
    console.log('infNFe encontrado, chaves:', infNFe ? Object.keys(infNFe) : 'não encontrado');
    
    const ide = infNFe['@_'] || infNFe.ide || {};
    const emit = infNFe.emit || {};
    const dest = infNFe.dest || {};
    const det = infNFe.det || [];
    const total = infNFe.total || {};
    const totalICMSTot = total.ICMSTot || total.ICMS || total || {};
    
    // Extrair chave de acesso de diferentes formatos
    let chaveAcesso = '';
    if (infNFe['@_Id']) {
      // Formato: NFe43251192016757010154651140000088121948994141 ou NFCe4325...
      chaveAcesso = infNFe['@_Id'].replace(/^NFe?/i, '').replace(/^NFCe?/i, '');
    } else if (infNFe['@_id']) {
      chaveAcesso = infNFe['@_id'].replace(/^NFe?/i, '').replace(/^NFCe?/i, '');
    } else if (ide.chave) {
      chaveAcesso = ide.chave;
    } else if (ide['@_chave']) {
      chaveAcesso = ide['@_chave'];
    }
    
    // Normalizar chave de acesso (remover caracteres não numéricos)
    chaveAcesso = chaveAcesso.replace(/\D/g, '');
    
    console.log('Chave de acesso extraída:', chaveAcesso);
    const modelo = ide.mod || ide['@_mod'] || ide.Mod || ide['@_Mod'] || '55';
    const numero = ide.nNF || ide['@_nNF'] || ide.nNF || ide['@_nNF'] || '';
    const serie = ide.serie || ide['@_serie'] || ide.Serie || ide['@_Serie'] || '';
    
    const dataEmissao = formatDate(
      ide.dhEmi || ide.dEmi || ide['@_dhEmi'] || ide['@_dEmi'] || 
      ide.dhEmissao || ide['@_dhEmissao'] || ide.dEmissao || ide['@_dEmissao']
    );
    const dataEntradaSaida = (ide.dhSaiEnt || ide['@_dhSaiEnt']) ? formatDate(ide.dhSaiEnt || ide['@_dhSaiEnt']) : undefined;
    
    const uf = extractUFFromChave(chaveAcesso) || '';
    
    console.log('Dados extraídos:', { modelo, numero, serie, dataEmissao, uf, chaveAcesso: chaveAcesso.substring(0, 20) + '...' });
    
    const enderecoEmit = emit.enderEmit || emit.endereco || emit.enderEmit;
    const emitente: InvoiceEmitent = {
      cnpj: emit.CNPJ || emit['@_CNPJ'] || emit.cnpj || emit['@_cnpj'] || '',
      razaoSocial: emit.xNome || emit['@_xNome'] || emit.razaoSocial || '',
      nomeFantasia: emit.xFant || emit['@_xFant'] || emit.nomeFantasia,
      endereco: enderecoEmit ? {
        logradouro: enderecoEmit.xLgr || enderecoEmit['@_xLgr'],
        numero: enderecoEmit.nro || enderecoEmit['@_nro'],
        bairro: enderecoEmit.xBairro || enderecoEmit['@_xBairro'],
        municipio: enderecoEmit.xMun || enderecoEmit['@_xMun'],
        uf: enderecoEmit.UF || enderecoEmit['@_UF'],
        cep: enderecoEmit.CEP || enderecoEmit['@_CEP'],
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

