/**
 * Formatadores do centro de notificações.
 * O formatador de moeda é o mesmo usado nas telas de ficha do cliente
 * (Intl pt-BR / BRL, recebendo centavos), e o campo de valor segue o padrão
 * do modal de pagamento de ficha: texto em reais (type="number", step 0,01)
 * convertido com Math.round(parseFloat(valor) * 100).
 */

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/** Centavos -> texto para o campo de valor ("12.50"). */
export function centsToReaisInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Texto do campo de valor -> centavos; null quando não é um número. */
export function reaisInputToCents(value: string): number | null {
  const parsed = parseFloat(value.replace(",", "."));
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias" ou a data. */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const date = new Date(iso);
  const time = date.getTime();
  if (Number.isNaN(time)) return "";

  const diff = Math.max(0, now - time);
  if (diff < MINUTE) return "agora";
  if (diff < HOUR) return `há ${Math.floor(diff / MINUTE)} min`;

  const days = Math.round((startOfDay(new Date(now)) - startOfDay(date)) / (24 * HOUR));
  if (days <= 0) return `há ${Math.floor(diff / HOUR)} h`;
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/** "02/10/2026 às 14:35". */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hour = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${day} às ${hour}`;
}
