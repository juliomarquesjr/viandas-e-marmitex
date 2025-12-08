// Utilitários para processamento de notas fiscais

/**
 * Mapeamento de códigos UF para siglas
 */
const UF_CODES: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA',
  '16': 'AP', '17': 'TO', '21': 'MA', '22': 'PI', '23': 'CE',
  '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE',
  '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT',
  '52': 'GO', '53': 'DF'
};

/**
 * Extrai a UF da chave de acesso (primeiros 2 dígitos)
 */
export function extractUFFromChave(chaveAcesso: string): string | null {
  if (!chaveAcesso || chaveAcesso.length < 2) {
    return null;
  }
  
  const ufCode = chaveAcesso.substring(0, 2);
  return UF_CODES[ufCode] || null;
}

/**
 * Valida se a chave de acesso tem o formato correto (44 dígitos)
 */
export function validateChaveAcesso(chaveAcesso: string): boolean {
  if (!chaveAcesso) return false;
  
  // Remove espaços e caracteres especiais
  const cleaned = chaveAcesso.replace(/\D/g, '');
  
  // Deve ter exatamente 44 dígitos
  return cleaned.length === 44;
}

/**
 * Normaliza a chave de acesso removendo espaços e caracteres especiais
 */
export function normalizeChaveAcesso(chaveAcesso: string): string {
  return chaveAcesso.replace(/\D/g, '');
}

/**
 * Extrai a chave de acesso de uma URL da SEFAZ
 */
export function extractChaveFromURL(url: string): string | null {
  try {
    // Tenta criar URL - pode falhar se não tiver protocolo
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    } catch {
      // Se não tiver protocolo, adiciona https://
      try {
        urlObj = new URL(`https://${url}`);
      } catch {
        // Se ainda falhar, tenta extrair diretamente
        return null;
      }
    }
    
    // Tenta extrair do parâmetro 'p' (padrão NFCe)
    // O parâmetro pode ter formato: chave|versao|tipo ou apenas chave
    const pParam = urlObj.searchParams.get('p');
    if (pParam) {
      // Remove tudo após o primeiro | (parâmetros adicionais)
      const chavePart = pParam.split('|')[0];
      const cleaned = normalizeChaveAcesso(chavePart);
      if (validateChaveAcesso(cleaned)) {
        return cleaned;
      }
      // Se não validou, tenta pegar os primeiros 44 dígitos
      const allDigits = cleaned.replace(/\D/g, '');
      if (allDigits.length >= 44) {
        const chave = allDigits.substring(0, 44);
        if (validateChaveAcesso(chave)) {
          return chave;
        }
      }
    }
    
    // Tenta extrair de outros parâmetros de query
    for (const [key, value] of urlObj.searchParams.entries()) {
      const cleaned = normalizeChaveAcesso(value);
      if (validateChaveAcesso(cleaned)) {
        return cleaned;
      }
    }
    
    // Tenta extrair do pathname
    const pathParts = urlObj.pathname.split('/');
    for (const part of pathParts) {
      if (part) {
        const cleaned = normalizeChaveAcesso(part);
        if (validateChaveAcesso(cleaned)) {
          return cleaned;
        }
      }
    }
    
    // Tenta extrair do hash
    if (urlObj.hash) {
      const cleaned = normalizeChaveAcesso(urlObj.hash.replace('#', ''));
      if (validateChaveAcesso(cleaned)) {
        return cleaned;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Extrai a chave de acesso de uma string (pode ser URL ou chave direta)
 */
export function extractChaveAcesso(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }
  
  // Remove espaços e quebras de linha
  const cleaned = input.trim().replace(/\s+/g, '');
  
  // Primeiro tenta como URL
  const fromURL = extractChaveFromURL(cleaned);
  if (fromURL) return fromURL;
  
  // Tenta encontrar sequência de 44 dígitos no texto
  // Isso ajuda quando há texto antes ou depois da chave
  const digitSequence = cleaned.match(/\d{44}/);
  if (digitSequence) {
    const chave = digitSequence[0];
    if (validateChaveAcesso(chave)) {
      return normalizeChaveAcesso(chave);
    }
  }
  
  // Se não funcionou, tenta como chave direta (normalizada)
  const normalized = normalizeChaveAcesso(cleaned);
  if (validateChaveAcesso(normalized)) {
    return normalized;
  }
  
  // Última tentativa: procura por padrão de chave de acesso (44 dígitos)
  // mesmo que tenha outros caracteres misturados
  const allDigits = cleaned.replace(/\D/g, '');
  if (allDigits.length >= 44) {
    // Pega os primeiros 44 dígitos
    const chave = allDigits.substring(0, 44);
    if (validateChaveAcesso(chave)) {
      return chave;
    }
  }
  
  return null;
}

/**
 * Formata valor monetário para centavos
 */
export function formatValueToCents(value: number): number {
  return Math.round(value * 100);
}

/**
 * Formata centavos para valor monetário
 */
export function formatCentsToValue(cents: number): number {
  return cents / 100;
}

