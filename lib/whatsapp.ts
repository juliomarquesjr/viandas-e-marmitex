/**
 * Utilitário para compartilhamento via WhatsApp
 */

/**
 * Gera um link do WhatsApp com uma mensagem pré-formatada
 * @param phone - Número do telefone (opcional, se não fornecido abre o WhatsApp Web)
 * @param message - Mensagem a ser enviada
 * @returns URL do WhatsApp
 */
export function generateWhatsAppLink(phone?: string, message?: string): string {
  let url = 'https://wa.me/';
  
  if (phone) {
    // Remove caracteres não numéricos do telefone
    const cleanPhone = phone.replace(/\D/g, '');
    url += cleanPhone;
  }
  
  if (message) {
    const separator = phone ? '?' : '?';
    url += `${separator}text=${encodeURIComponent(message)}`;
  }
  
  return url;
}

/**
 * Compartilha um link de rastreamento via WhatsApp
 * @param trackingUrl - URL completa do link de rastreamento
 * @param customerName - Nome do cliente (opcional)
 * @param customerPhone - Telefone do cliente (opcional, para abrir conversa direta)
 * @returns URL do WhatsApp formatada
 */
export function shareTrackingLink(
  trackingUrl: string,
  customerName?: string,
  customerPhone?: string
): string {
  const customerGreeting = customerName ? `Olá ${customerName}! ` : '';
  const message = `${customerGreeting}🍽️ Acompanhe seu pedido em tempo real:\n\n${trackingUrl}`;
  
  return generateWhatsAppLink(customerPhone, message);
}

/**
 * Abre o WhatsApp em uma nova janela/aba
 * @param url - URL do WhatsApp
 */
export function openWhatsApp(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

