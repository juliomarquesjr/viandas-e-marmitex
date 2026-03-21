// Parser de HTML de notas fiscais (para SEFAZes que retornam HTML ao invés de XML)

import { InvoiceData, InvoiceItem } from './types';
import { extractUFFromChave, normalizeChaveAcesso } from './utils';

/**
 * Extrai texto de um elemento HTML usando regex simples
 */
function extractText(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);
  if (match) {
    return match[1]?.trim() || null;
  }
  return null;
}

/**
 * Extrai múltiplos textos usando regex
 */
function extractAllTexts(html: string, pattern: RegExp): string[] {
  const matches = html.matchAll(pattern);
  const results: string[] = [];
  for (const match of matches) {
    if (match[1]) {
      results.push(match[1].trim());
    }
  }
  return results;
}

/**
 * Remove tags HTML e limpa o texto
 */
function cleanText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '') // Remove tags HTML
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converte valor monetário de string para reais.
 * Ex: "R$ 10,50" ou "10,50" -> 10.5
 * Ex: "9,60" -> 9.6
 * Ex: "96" -> 96
 */
function parseCurrency(value: string): number {
  // Remove R$, espaços
  let cleaned = value
    .replace(/R\$/gi, '')
    .trim();
  
  // Verifica se tem vírgula ou ponto decimal
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  
  if (hasComma) {
    // Tem vírgula - formato brasileiro (ex: "9,60" ou "1.234,56")
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  } else if (hasDot) {
    // Tem ponto - pode ser decimal ("9.60") ou milhar ("1.234")
    const decimalPattern = /^\d+\.\d{2}$/;
    const thousandPattern = /^\d{1,3}(?:\.\d{3})+$/;

    if (decimalPattern.test(cleaned)) {
      return parseFloat(cleaned) || 0;
    }

    if (thousandPattern.test(cleaned)) {
      return parseFloat(cleaned.replace(/\./g, '')) || 0;
    }

    return parseFloat(cleaned.replace(/\./g, '')) || 0;
  } else {
    return parseFloat(cleaned.replace(/\D/g, '')) || 0;
  }
}

function extractMonetaryValue(html: string, patterns: RegExp[]): number | undefined {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    const rawValue = match?.[1] || match?.[2];
    if (!rawValue) {
      continue;
    }

    const parsedValue = parseCurrency(cleanText(rawValue));
    if (parsedValue > 0) {
      return parsedValue;
    }
  }

  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractValueFromSummaryLine(html: string, label: string): number | undefined {
  const escapedLabel = escapeRegExp(label);
  const pattern = new RegExp(
    `<div[^>]*id="linhaTotal"[^>]*>[\\s\\S]*?<label[^>]*>${escapedLabel}\\s*R\\$:\\s*<\\/label>\\s*<span[^>]*class="totalNumb[^"]*"[^>]*>([\\d.,]+)<\\/span>`,
    'i'
  );
  const match = html.match(pattern);
  return match?.[1] ? parseCurrency(cleanText(match[1])) : undefined;
}

function extractValueAfterMarker(html: string, marker: string): number | undefined {
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) {
    return undefined;
  }

  const snippet = html.slice(markerIndex, markerIndex + 400);
  const match = snippet.match(/<span[^>]*class="totalNumb[^"]*"[^>]*>([\d.,]+)<\/span>/i);
  return match?.[1] ? parseCurrency(cleanText(match[1])) : undefined;
}

function buildCurrencyPatterns(label: string): RegExp[] {
  return [
    new RegExp(`${label}\\s*R\\$\\s*:?\\s*([\\d.,]+)`, 'i'),
    new RegExp(`${label}[^\\d]{0,20}([\\d.,]+)`, 'i'),
    new RegExp(`<strong>${label}\\s*:?\\s*<\\/strong>\\s*([^<]+)`, 'i'),
    new RegExp(`${label}[^<]*<strong>([^<]+)<\\/strong>`, 'i'),
  ];
}

/**
 * Extrai CNPJ de string (remove formatação)
 */
function extractCNPJ(text: string): string {
  return text.replace(/\D/g, '');
}

/**
 * Extrai CPF de string (remove formatação)
 */
function extractCPF(text: string): string {
  return text.replace(/\D/g, '');
}

/**
 * Parseia HTML da SEFAZ do RS e extrai dados da nota fiscal
 */
export function parseRSHTML(html: string, chaveAcesso: string): InvoiceData | null {
  try {
    console.log('Iniciando parse do HTML do RS, tamanho:', html.length);
    
    const uf = extractUFFromChave(chaveAcesso) || 'RS';
    const chaveNormalizada = normalizeChaveAcesso(chaveAcesso);
    
    // Extrair nome do emitente (está na div com id="u20" ou classe "txtTopo")
    const emitenteNomeMatch = html.match(/<div[^>]*(?:id="u20"|class="txtTopo")[^>]*>([^<]+)<\/div>/i);
    const emitenteNome = emitenteNomeMatch ? cleanText(emitenteNomeMatch[1]) : '';
    
    // Extrair CNPJ do emitente
    const cnpjMatch = html.match(/CNPJ:\s*([\d.\/\-]+)/i);
    const cnpj = cnpjMatch ? extractCNPJ(cnpjMatch[1]) : '';
    
    // Extrair endereço do emitente (pode estar em múltiplas divs com class="text")
    const enderecoMatches = html.match(/CNPJ:[\s\S]*?(?:<div[^>]*class="text"[^>]*>([^<]+)<\/div>[\s\S]*?){1,5}/i);
    let enderecoCompleto = '';
    
    // Tenta extrair todas as divs de texto após o CNPJ
    const cnpjIndex = html.indexOf('CNPJ:');
    if (cnpjIndex !== -1) {
      const afterCnpj = html.substring(cnpjIndex);
      const textDivs = afterCnpj.matchAll(/<div[^>]*class="text"[^>]*>([^<]+)<\/div>/gi);
      const enderecoParts: string[] = [];
      let count = 0;
      for (const match of textDivs) {
        if (count > 0) { // Pula a primeira (que é o CNPJ)
          enderecoParts.push(cleanText(match[1]));
        }
        count++;
        if (count > 5) break; // Limita a 5 partes
      }
      enderecoCompleto = enderecoParts.join(', ');
    }
    
    // Parsear endereço (formato: "LOGRADOURO, NUMERO, BAIRRO, CIDADE, UF")
    const enderecoParts = enderecoCompleto.split(',').map(p => p.trim()).filter(p => p);
    const logradouro = enderecoParts[0] || '';
    const numeroEndereco = enderecoParts[1] || '';
    const bairro = enderecoParts[2] || '';
    const municipio = enderecoParts[3] || '';
    const ufEmitente = enderecoParts[4] || uf;
    
    // Extrair dados do consumidor
    const consumidorCPFMatch = html.match(/<strong>CPF:\s*<\/strong>([\d.\-]+)/i);
    const consumidorCPF = consumidorCPFMatch ? extractCPF(consumidorCPFMatch[1]) : '';
    
    const consumidorNomeMatch = html.match(/<strong>Nome:\s*<\/strong>([^<]+)/i);
    const consumidorNome = consumidorNomeMatch ? cleanText(consumidorNomeMatch[1]) : '';
    
    // Extrair itens da tabela
    const itens: InvoiceItem[] = [];
    
    // Padrão para encontrar itens na tabela - mais flexível
    // Formato do HTML: <tr id="Item + X"><td>...<span class="txtTit">DESCRIÇÃO</span>...<span class="RCod">(Código: XXX)</span>...<span class="Rqtd"><strong>Qtde.:</strong>X</span>...<span class="RUN"><strong>UN: </strong>XXX</span>...<span class="RvlUnit"><strong>Vl. Unit.:</strong> X,XX</span>...<td align="right" class="txtT">X,XX</td>
    
    // Primeiro, encontra todas as linhas de itens
    const itemRowPattern = /<tr[^>]*id="Item[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    
    let itemCount = 0;
    while ((rowMatch = itemRowPattern.exec(html)) !== null) {
      itemCount++;
      const rowHtml = rowMatch[1];
      
      // Extrai descrição
      const descMatch = rowHtml.match(/<span[^>]*class="txtTit"[^>]*>([^<]+)<\/span>/i);
      const descricao = descMatch ? cleanText(descMatch[1]) : '';
      
      if (!descricao) {
        console.log(`Item ${itemCount}: descrição não encontrada, pulando...`);
        continue;
      }
      
      console.log(`Item ${itemCount}: ${descricao}`);
      
      // Extrai código (opcional)
      const codMatch = rowHtml.match(/<span[^>]*class="RCod"[^>]*>\(Código:\s*([^)]+)\)/i);
      const codigo = codMatch ? cleanText(codMatch[1]) : undefined;
      
      // Extrai quantidade
      const qtdMatch = rowHtml.match(/<span[^>]*class="Rqtd"[^>]*><strong>Qtde\.:<\/strong>([^<]+)/i);
      const quantidadeStr = qtdMatch ? cleanText(qtdMatch[1]) : '0';
      const quantidade = parseFloat(quantidadeStr.replace(',', '.')) || 0;
      
      // Extrai unidade
      const unMatch = rowHtml.match(/<span[^>]*class="RUN"[^>]*><strong>UN:\s*<\/strong>([^<]+)/i);
      const unidade = unMatch ? cleanText(unMatch[1]) : undefined;
      
      // Extrai valor unitário
      const vlUnitMatch = rowHtml.match(/<span[^>]*class="RvlUnit"[^>]*><strong>Vl\.\s*Unit\.:<\/strong>\s*([^<]+)/i);
      const vlUnitText = vlUnitMatch ? cleanText(vlUnitMatch[1]) : '';
      const valorUnitario = vlUnitText ? parseCurrency(vlUnitText) : 0;
      if (vlUnitText) {
        console.log(`  - Valor unitário texto: "${vlUnitText}" -> R$ ${valorUnitario}`);
      }
      
      // Extrai valor total (última coluna alinhada à direita)
      // Pode estar em diferentes formatos: <td align="right" class="txtT"> ou apenas <td align="right">
      let vlTotalMatch = rowHtml.match(/<td[^>]*align="right"[^>]*class="txtT"[^>]*>([^<]+)<\/td>/i);
      if (!vlTotalMatch) {
        // Tenta sem a classe txtT
        vlTotalMatch = rowHtml.match(/<td[^>]*align="right"[^>]*>([^<]+)<\/td>/i);
      }
      // Se ainda não encontrou, tenta qualquer td com align="right" no final da linha
      if (!vlTotalMatch) {
        const allRightTds = rowHtml.matchAll(/<td[^>]*align="right"[^>]*>([^<]+)<\/td>/gi);
        const rightTds = Array.from(allRightTds);
        if (rightTds.length > 0) {
          // Pega o último (que geralmente é o total)
          vlTotalMatch = rightTds[rightTds.length - 1];
        }
      }
      const vlTotalText = vlTotalMatch ? cleanText(vlTotalMatch[1]) : '';
      const valorTotal = vlTotalText ? parseCurrency(vlTotalText) : (valorUnitario * quantidade);
      if (vlTotalText) {
        console.log(`  - Valor total texto: "${vlTotalText}" -> R$ ${valorTotal}`);
      }
      
      if (descricao && quantidade > 0) {
        const item = {
          codigo,
          descricao,
          quantidade,
          unidade,
          valorUnitario: valorUnitario || (valorTotal / quantidade),
          valorTotal,
        };
        console.log(`  - Qtd: ${quantidade}, Unit: ${item.valorUnitario}, Total: ${valorTotal}`);
        itens.push(item);
      } else {
        console.log(`  - Item ${itemCount} ignorado: descricao=${descricao}, quantidade=${quantidade}`);
      }
    }
    
    console.log(`Total de itens encontrados: ${itens.length}`);
    
    // Se não encontrou itens com o padrão acima, tenta padrão alternativo mais simples
    if (itens.length === 0) {
      console.log('Tentando padrão alternativo para extrair itens...');
      // Busca por qualquer linha que contenha descrição, quantidade e valores
      const simpleItemPattern = /<tr[^>]*>[\s\S]*?<span[^>]*class="txtTit"[^>]*>([^<]+)<\/span>[\s\S]*?<strong>Qtde\.:<\/strong>([^<]+)[\s\S]*?<strong>Vl\.\s*Unit\.:<\/strong>\s*([^<]+)[\s\S]*?<td[^>]*align="right"[^>]*>([^<]+)<\/td>/gi;
      
      let simpleMatch;
      while ((simpleMatch = simpleItemPattern.exec(html)) !== null) {
        const descricao = cleanText(simpleMatch[1]);
        const quantidade = parseFloat(cleanText(simpleMatch[2]).replace(',', '.'));
        const valorUnitario = parseCurrency(cleanText(simpleMatch[3]));
        const valorTotal = parseCurrency(cleanText(simpleMatch[4]));
        
        if (descricao && !isNaN(quantidade) && quantidade > 0) {
          itens.push({
            descricao,
            quantidade,
            valorUnitario,
            valorTotal,
          });
        }
      }
    }
    
    // Calcular totais
    const somaItens = itens.reduce((sum, item) => sum + item.valorTotal, 0);
    const valorProdutos =
      extractValueFromSummaryLine(html, 'Valor total') ??
      extractMonetaryValue(html, buildCurrencyPatterns('Valor total')) ??
      somaItens;
    const valorDesconto = extractMonetaryValue(html, [
      /<div[^>]*id="linhaTotal"[^>]*>[\s\S]*?<label[^>]*>Descontos\s*R\$:\s*<\/label>\s*<span[^>]*class="totalNumb[^"]*"[^>]*>([\d.,]+)<\/span>/i,
      ...buildCurrencyPatterns('Descontos'),
      ...buildCurrencyPatterns('Desconto'),
      /<td[^>]*>Desconto[^<]*<\/td>[\s\S]*?<td[^>]*align="right"[^>]*>([^<]+)<\/td>/i,
      /<span[^>]*class="txtT"[^>]*>Desconto[^<]*<\/span>[\s\S]*?<span[^>]*class="txtT"[^>]*>([^<]+)<\/span>/i,
    ]);
    const valorAPagar =
      extractValueFromSummaryLine(html, 'Valor a pagar') ??
      extractMonetaryValue(html, buildCurrencyPatterns('Valor a pagar'));
    const valorPago =
      extractValueAfterMarker(html, 'Valor pago R$:') ??
      extractMonetaryValue(html, buildCurrencyPatterns('Valor pago'));

    // Tentar extrair total final da nota (prioridade: valor a pagar)
    let valorTotal = valorAPagar ?? somaItens;
    
    // Busca por padrões comuns de total no HTML do RS
    const totalPatterns = [
      ...buildCurrencyPatterns('Total'),
      /<strong>Total:\s*<\/strong>([^<]+)/i,
      /<td[^>]*>Total[^<]*<\/td>[\s\S]*?<td[^>]*align="right"[^>]*>([^<]+)<\/td>/i,
      /<span[^>]*class="txtT"[^>]*>Total[^<]*<\/span>[\s\S]*?<span[^>]*class="txtT"[^>]*>([^<]+)<\/span>/i,
      /<div[^>]*class="txtT"[^>]*>Total[^<]*<\/div>[\s\S]*?<div[^>]*class="txtT"[^>]*>([^<]+)<\/div>/i,
    ];

    if (!valorAPagar) {
      for (const pattern of totalPatterns) {
        const match = html.match(pattern);
        if (match) {
          const totalValue = parseCurrency(cleanText(match[1] || match[2]));
          if (totalValue > 0) {
            valorTotal = totalValue;
            console.log('Total extraído do HTML:', valorTotal);
            break;
          }
        }
      }
    }

    const descontoInferido =
      valorDesconto == null && valorProdutos > valorTotal
        ? Number((valorProdutos - valorTotal).toFixed(2))
        : undefined;
    
    // Se não encontrou total específico, usa a soma dos itens
    if (valorTotal === valorProdutos && valorProdutos > 0) {
      console.log('Total calculado pela soma dos itens:', valorTotal);
    }
    
    // Extrair número e série da nota (pode estar na chave de acesso ou no HTML)
    const numeroMatch = html.match(/N[úu]mero[^<]*<strong>([^<]+)<\/strong>/i);
    const numero = numeroMatch ? cleanText(numeroMatch[1]) : chaveNormalizada.substring(25, 34);
    
    const serieMatch = html.match(/S[ée]rie[^<]*<strong>([^<]+)<\/strong>/i);
    const serie = serieMatch ? cleanText(serieMatch[1]) : undefined;
    
    // Extrair data de emissão
    const dataMatch = html.match(/Data[^<]*<strong>([^<]+)<\/strong>/i);
    let dataEmissao = new Date().toISOString().split('T')[0];
    if (dataMatch) {
      const dataStr = cleanText(dataMatch[1]);
      // Tenta parsear data no formato brasileiro (DD/MM/YYYY)
      const dateParts = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (dateParts) {
        const [, day, month, year] = dateParts;
        dataEmissao = `${year}-${month}-${day}`;
      }
    }
    
    // Construir objeto InvoiceData
    const invoiceData: InvoiceData = {
      chaveAcesso: chaveNormalizada,
      uf,
      modelo: '65', // NFCe
      numero,
      serie,
      dataEmissao,
      emitente: {
        cnpj,
        razaoSocial: emitenteNome,
        endereco: {
          logradouro,
          numero: numeroEndereco,
          bairro,
          municipio,
          uf: ufEmitente,
        },
      },
      destinatario: consumidorCPF || consumidorNome ? {
        cpf: consumidorCPF || undefined,
        nome: consumidorNome || undefined,
      } : undefined,
      itens,
      totais: {
        valorProdutos, // Valor bruto dos produtos
        valorDesconto: valorDesconto ?? descontoInferido,
        valorTotal, // Valor final da nota (já com descontos)
        valorPago,
      },
    };
    
    console.log('HTML parseado com sucesso! Itens encontrados:', itens.length);
    console.log('Total da nota:', valorTotal);
    
    return invoiceData;
  } catch (error) {
    console.error('Erro ao parsear HTML do RS:', error);
    return null;
  }
}

