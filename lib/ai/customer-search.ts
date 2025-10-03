export interface CustomerSearchResult {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  doc?: string;
  address?: any;
}

export interface SearchResponse {
  type: 'exact' | 'partial' | 'multiple' | 'none';
  customers: CustomerSearchResult[];
  message: string;
  suggestions?: string[];
}

export function analyzeCustomerSearch(customers: CustomerSearchResult[], searchTerm: string): SearchResponse {
  if (customers.length === 0) {
    return {
      type: 'none',
      customers: [],
      message: `Não encontrei nenhum cliente com o nome "${searchTerm}".`,
      suggestions: [
        'Verifique se o nome está correto',
        'Tente usar apenas o primeiro nome',
        'Tente usar parte do sobrenome',
        'Verifique se há variações na grafia'
      ]
    };
  }

  if (customers.length === 1) {
    return {
      type: 'exact',
      customers,
      message: `Encontrei o cliente "${customers[0].name}".`
    };
  }

  // Múltiplos resultados
  const exactMatches = customers.filter(c => 
    c.name.toLowerCase() === searchTerm.toLowerCase()
  );

  if (exactMatches.length === 1) {
    return {
      type: 'exact',
      customers: exactMatches,
      message: `Encontrei o cliente "${exactMatches[0].name}".`
    };
  }

  return {
    type: 'multiple',
    customers: customers.slice(0, 10), // Limitar a 10 resultados
    message: `Encontrei ${customers.length} cliente(s) com nome similar a "${searchTerm}".`,
    suggestions: [
      'Seja mais específico com o nome completo',
      'Adicione o sobrenome se souber',
      'Verifique a lista abaixo e escolha o cliente correto'
    ]
  };
}

export function formatCustomerList(customers: CustomerSearchResult[]): string {
  if (customers.length === 0) return '';

  let result = '**Clientes encontrados:**\n\n';
  
  customers.forEach((customer, index) => {
    result += `**${index + 1}. ${customer.name}**\n`;
    
    if (customer.phone) {
      result += `📞 Telefone: ${customer.phone}\n`;
    }
    
    if (customer.email) {
      result += `📧 Email: ${customer.email}\n`;
    }
    
    if (customer.doc) {
      result += `📄 Documento: ${customer.doc}\n`;
    }
    
    if (customer.address) {
      const address = formatAddress(customer.address);
      result += `🏠 Endereço: ${address}\n`;
    }
    
    result += '\n';
  });

  return result.trim();
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

export function generateCustomerSearchQueries(searchTerm: string): string[] {
  const queries = [];
  
  // Busca exata
  queries.push(`SELECT id, name, phone, email, doc, address FROM "Customer" WHERE name = '${searchTerm}' LIMIT 1`);
  
  // Busca parcial (começando com o termo)
  queries.push(`SELECT id, name, phone, email, doc, address FROM "Customer" WHERE name ILIKE '${searchTerm}%' LIMIT 10`);
  
  // Busca parcial (contendo o termo)
  queries.push(`SELECT id, name, phone, email, doc, address FROM "Customer" WHERE name ILIKE '%${searchTerm}%' LIMIT 10`);
  
  return queries;
}
