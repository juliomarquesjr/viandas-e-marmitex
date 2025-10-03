export interface SmartSearchResult {
  success: boolean;
  data: any[];
  message: string;
  suggestions?: string[];
  needsRefinement?: boolean;
}

export function generateSmartCustomerSearchQueries(searchTerm: string): string[] {
  const queries = [];
  const cleanTerm = searchTerm.trim();
  
  // 1. Busca exata (mais específica)
  queries.push(`SELECT id, name, phone, email, doc, address FROM "Customer" WHERE name = '${cleanTerm}' LIMIT 1`);
  
  // 2. Busca por início do nome (mais comum)
  queries.push(`SELECT id, name, phone, email, doc, address FROM "Customer" WHERE name ILIKE '${cleanTerm}%' LIMIT 10`);
  
  // 3. Busca parcial (mais ampla)
  queries.push(`SELECT id, name, phone, email, doc, address FROM "Customer" WHERE name ILIKE '%${cleanTerm}%' LIMIT 10`);
  
  // 4. Busca por palavras separadas (para nomes compostos)
  const words = cleanTerm.split(' ').filter(word => word.length > 2);
  if (words.length > 1) {
    const wordPattern = words.map(word => `name ILIKE '%${word}%'`).join(' AND ');
    queries.push(`SELECT id, name, phone, email, doc, address FROM "Customer" WHERE ${wordPattern} LIMIT 10`);
  }
  
  return queries;
}

export function analyzeSearchResults(results: any[], searchTerm: string): SmartSearchResult {
  if (results.length === 0) {
    return {
      success: false,
      data: [],
      message: `Não encontrei nenhum cliente com o nome "${searchTerm}".`,
      suggestions: [
        'Verifique se o nome está correto',
        'Tente usar apenas o primeiro nome',
        'Tente usar parte do sobrenome',
        'Verifique se há variações na grafia (acentos, hífens)',
        'Tente buscar por telefone ou email se souber'
      ],
      needsRefinement: true
    };
  }

  if (results.length === 1) {
    return {
      success: true,
      data: results,
      message: `Encontrei o cliente "${results[0].name}".`,
      needsRefinement: false
    };
  }

  // Múltiplos resultados
  const exactMatches = results.filter(c => 
    c.name.toLowerCase() === searchTerm.toLowerCase()
  );

  if (exactMatches.length === 1) {
    return {
      success: true,
      data: exactMatches,
      message: `Encontrei o cliente "${exactMatches[0].name}".`,
      needsRefinement: false
    };
  }

  return {
    success: true,
    data: results.slice(0, 10),
    message: `Encontrei ${results.length} cliente(s) com nome similar a "${searchTerm}".`,
    suggestions: [
      'Seja mais específico com o nome completo',
      'Adicione o sobrenome se souber',
      'Verifique a lista abaixo e escolha o cliente correto',
      'Tente buscar por telefone ou email se souber'
    ],
    needsRefinement: true
  };
}

export function formatCustomerSearchResponse(result: SmartSearchResult): string {
  let response = result.message;
  
  if (result.success && result.data.length > 0) {
    response += '\n\n**Clientes encontrados:**\n\n';
    
    result.data.forEach((customer, index) => {
      response += `**${index + 1}. ${customer.name}**\n`;
      
      if (customer.phone) {
        response += `📞 Telefone: ${customer.phone}\n`;
      }
      
      if (customer.email) {
        response += `📧 Email: ${customer.email}\n`;
      }
      
      if (customer.doc) {
        response += `📄 Documento: ${customer.doc}\n`;
      }
      
      if (customer.address) {
        const address = formatAddress(customer.address);
        response += `🏠 Endereço: ${address}\n`;
      }
      
      response += '\n';
    });
  }
  
  if (result.suggestions && result.suggestions.length > 0) {
    response += '\n**💡 Dicas para refinar a busca:**\n';
    result.suggestions.forEach(suggestion => {
      response += `• ${suggestion}\n`;
    });
  }
  
  return response.trim();
}

function formatAddress(address: any): string {
  if (!address || typeof address !== 'object') {
    return 'Endereço não informado';
  }

  const parts = [];
  
  if (address.street) parts.push(address.street);
  if (address.number) parts.push(address.number);
  if (address.complement) parts.push(address.complement);
  if (address.neighborhood) parts.push(address.neighborhood);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.zip) parts.push(`CEP: ${address.zip}`);

  return parts.join(', ') || 'Endereço não informado';
}
