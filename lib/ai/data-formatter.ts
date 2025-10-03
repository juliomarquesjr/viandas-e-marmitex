import { analyzeCustomerSearch, CustomerSearchResult, formatCustomerList } from "./customer-search";

export interface FormattedResponse {
  message: string;
  data?: any;
  sql?: string; // Apenas para debug interno
  reason?: string; // Apenas para debug interno
}

export function formatAddress(address: any): string {
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

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function processCustomerData(customers: any[]): string {
  if (!customers || customers.length === 0) {
    return 'Nenhum cliente encontrado.';
  }

  const customer = customers[0];
  let response = `**${customer.name}**`;
  
  if (customer.phone) {
    response += `\n📞 Telefone: ${customer.phone}`;
  }
  
  if (customer.email) {
    response += `\n📧 Email: ${customer.email}`;
  }
  
  if (customer.doc) {
    response += `\n📄 Documento: ${customer.doc}`;
  }
  
  if (customer.address) {
    const formattedAddress = formatAddress(customer.address);
    response += `\n🏠 Endereço: ${formattedAddress}`;
  }
  
  if (customer.total_pedidos) {
    response += `\n🛒 Total de pedidos: ${customer.total_pedidos}`;
  }
  
  if (customer.total_gasto) {
    response += `\n💰 Total gasto: ${formatCurrency(customer.total_gasto * 100)}`;
  }
  
  if (customer.ultimo_pedido) {
    response += `\n📅 Último pedido: ${formatDate(customer.ultimo_pedido)}`;
  }

  return response;
}

export function processOrderData(orders: any[]): string {
  if (!orders || orders.length === 0) {
    return 'Nenhum pedido encontrado.';
  }

  let response = `Encontrei ${orders.length} pedido(s):\n\n`;
  
  orders.forEach((order, index) => {
    response += `**Pedido #${order.id || index + 1}**\n`;
    
    if (order.cliente) {
      response += `👤 Cliente: ${order.cliente}\n`;
    }
    
    if (order.status) {
      const statusEmoji = getStatusEmoji(order.status);
      response += `${statusEmoji} Status: ${order.status}\n`;
    }
    
    if (order.valor) {
      response += `💰 Valor: ${formatCurrency(order.valor * 100)}\n`;
    }
    
    if (order.createdAt) {
      response += `📅 Data: ${formatDateTime(order.createdAt)}\n`;
    }
    
    response += '\n';
  });

  return response.trim();
}

export function processSalesData(sales: any[]): string {
  if (!sales || sales.length === 0) {
    return 'Nenhuma venda encontrada.';
  }

  let response = `📊 Relatório de vendas:\n\n`;
  
  sales.forEach((sale, index) => {
    if (sale.data) {
      response += `📅 **${formatDate(sale.data)}**\n`;
    } else if (sale.mes) {
      response += `📅 **${formatDate(sale.mes)}**\n`;
    }
    
    if (sale.vendas) {
      response += `🛒 Vendas: ${sale.vendas}\n`;
    }
    
    if (sale.faturamento) {
      response += `💰 Faturamento: ${formatCurrency(sale.faturamento * 100)}\n`;
    }
    
    response += '\n';
  });

  return response.trim();
}

export function processProductData(products: any[]): string {
  if (!products || products.length === 0) {
    return 'Nenhum produto encontrado.';
  }

  let response = `🛍️ Produtos encontrados:\n\n`;
  
  products.forEach((product, index) => {
    response += `**${index + 1}. ${product.name}**\n`;
    
    if (product.total_vendido) {
      response += `📦 Vendidos: ${product.total_vendido}\n`;
    }
    
    if (product.receita) {
      response += `💰 Receita: ${formatCurrency(product.receita * 100)}\n`;
    }
    
    if (product.preco_medio) {
      response += `💵 Preço médio: ${formatCurrency(product.preco_medio * 100)}\n`;
    }
    
    response += '\n';
  });

  return response.trim();
}

function getStatusEmoji(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': '⏳',
    'confirmed': '✅',
    'preparing': '👨‍🍳',
    'ready': '🍽️',
    'delivered': '🚚',
    'cancelled': '❌'
  };
  
  return statusMap[status.toLowerCase()] || '📋';
}

export function createCleanResponse(
  message: string, 
  data: any[], 
  sql?: string, 
  reason?: string
): FormattedResponse {
  // Processar dados baseado no tipo de consulta
  let processedData = '';
  
  if (data.length > 0) {
    const firstRow = data[0];
    
    // Detectar tipo de dados baseado nas colunas
    if (firstRow.name && (firstRow.phone || firstRow.email || firstRow.address)) {
      // Dados de cliente - usar análise inteligente
      const customers = data as CustomerSearchResult[];
      const searchAnalysis = analyzeCustomerSearch(customers, firstRow.name);
      
      if (searchAnalysis.type === 'exact') {
        processedData = processCustomerData([searchAnalysis.customers[0]]);
      } else if (searchAnalysis.type === 'multiple') {
        processedData = formatCustomerList(searchAnalysis.customers);
        if (searchAnalysis.suggestions) {
          processedData += '\n\n**💡 Dicas para refinar a busca:**\n';
          searchAnalysis.suggestions.forEach(suggestion => {
            processedData += `• ${suggestion}\n`;
          });
        }
      } else if (searchAnalysis.type === 'none') {
        processedData = searchAnalysis.message;
        if (searchAnalysis.suggestions) {
          processedData += '\n\n**💡 Dicas para melhorar a busca:**\n';
          searchAnalysis.suggestions.forEach(suggestion => {
            processedData += `• ${suggestion}\n`;
          });
        }
      }
    } else if (firstRow.id && (firstRow.status || firstRow.cliente)) {
      // Dados de pedidos
      processedData = processOrderData(data);
    } else if (firstRow.data || firstRow.mes) {
      // Dados de vendas
      processedData = processSalesData(data);
    } else if (firstRow.name && (firstRow.total_vendido || firstRow.receita)) {
      // Dados de produtos
      processedData = processProductData(data);
    } else {
      // Dados genéricos
      processedData = `Encontrei ${data.length} registro(s).`;
    }
  } else {
    processedData = 'Nenhum dado encontrado.';
  }

  return {
    message: `${message}\n\n${processedData}`,
    data: data, // Manter dados originais para debug interno
    sql: sql, // Manter SQL para debug interno
    reason: reason // Manter motivo para debug interno
  };
}
