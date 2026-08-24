/**
 * Formatação compartilhada pela ficha do cliente.
 *
 * Os mapas de status e de forma de pagamento que moravam aqui saíram junto com
 * a tabela antiga de histórico: o extrato do ciclo não repete "Ficha do
 * Cliente · Pendente" em toda linha, e o `OrderDetailsModal` já mantém os seus.
 */

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
