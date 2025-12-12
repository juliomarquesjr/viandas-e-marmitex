import { getServerSession } from "next-auth";
import { customerAuthOptions } from "./auth-customer";

export interface CustomerSession {
  user: {
    id: string;
    customerId: string;
    name?: string | null;
    email?: string | null;
    phone: string;
  };
}

/**
 * Obtém a sessão do cliente autenticado
 */
export async function getCustomerSession(): Promise<CustomerSession | null> {
  const session = await getServerSession(customerAuthOptions);
  if (!session || !session.user) {
    return null;
  }
  
  // Verificar se é uma sessão de cliente (tem customerId)
  const user = session.user as any;
  if (!user.customerId) {
    return null;
  }

  return {
    user: {
      id: user.id,
      customerId: user.customerId,
      name: user.name,
      email: user.email,
      phone: user.phone
    }
  };
}

/**
 * Verifica se o usuário está autenticado como cliente
 */
export async function isCustomerAuthenticated(): Promise<boolean> {
  const session = await getCustomerSession();
  return session !== null;
}

/**
 * Obtém o ID do cliente da sessão
 */
export async function getCustomerId(): Promise<string | null> {
  const session = await getCustomerSession();
  return session?.user?.customerId || null;
}

/**
 * Formata valor em centavos para reais
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

/**
 * Formata data para exibição
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);
}

