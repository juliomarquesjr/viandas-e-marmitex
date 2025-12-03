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
    const urlObj = new URL(url);
    
    // Tenta extrair do parâmetro 'p' (padrão NFCe)
    const pParam = urlObj.searchParams.get('p');
    if (pParam && validateChaveAcesso(pParam)) {
      return normalizeChaveAcesso(pParam);
    }
    
    // Tenta extrair do pathname
    const pathParts = urlObj.pathname.split('/');
    for (const part of pathParts) {
      if (validateChaveAcesso(part)) {
        return normalizeChaveAcesso(part);
      }
    }
    
    return null;
  } catch {
    // Se não for uma URL válida, tenta extrair diretamente
    if (validateChaveAcesso(url)) {
      return normalizeChaveAcesso(url);
    }
    return null;
  }
}

/**
 * Extrai a chave de acesso de uma string (pode ser URL ou chave direta)
 */
export function extractChaveAcesso(input: string): string | null {
  // Primeiro tenta como URL
  const fromURL = extractChaveFromURL(input);
  if (fromURL) return fromURL;
  
  // Se não funcionou, tenta como chave direta
  if (validateChaveAcesso(input)) {
    return normalizeChaveAcesso(input);
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

