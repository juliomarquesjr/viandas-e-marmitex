import type { ExpenseItem, ExpensesResponse } from "../../lib/types";

/**
 * Compras e pagamentos da ficha numa linha do tempo só, do mais novo para o
 * mais antigo. Os dois vêm da mesma tabela de pedidos, então o id não repete.
 */
export type Movement =
  | {
      kind: "buy";
      id: string;
      createdAt: string;
      totalCents: number;
      items: ExpenseItem[];
    }
  | {
      kind: "pay";
      id: string;
      createdAt: string;
      totalCents: number;
      cashReceivedCents: number | null;
      changeCents: number | null;
    };

export function buildMovements(data: Pick<ExpensesResponse, "pendingOrders" | "fichaPayments">): Movement[] {
  const buys: Movement[] = (data.pendingOrders ?? []).map((order) => ({
    kind: "buy",
    id: order.id,
    createdAt: order.createdAt,
    totalCents: order.totalCents,
    items: order.items ?? [],
  }));
  const pays: Movement[] = (data.fichaPayments ?? []).map((payment) => ({
    kind: "pay",
    id: payment.id,
    createdAt: payment.createdAt,
    totalCents: payment.totalCents,
    cashReceivedCents: payment.cashReceivedCents,
    changeCents: payment.changeCents,
  }));
  return [...buys, ...pays].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Peso do item em kg, ou 0 quando o item é vendido por unidade. */
export function weightOf(item: ExpenseItem): number {
  const kg = Number(item.weightKg ?? 0);
  return Number.isFinite(kg) && kg > 0 ? kg : 0;
}

/** Quantos itens a compra tem: por unidade soma a quantidade; por peso conta um. */
export function itemCount(items: ExpenseItem[]): number {
  return items.reduce((sum, item) => sum + (weightOf(item) > 0 ? 1 : Math.max(1, item.quantity || 0)), 0);
}

export function itemsLabel(count: number): string {
  return `${count} ${count === 1 ? "item" : "itens"}`;
}

/** "Marmita G, Refrigerante lata" */
export function itemsTitle(items: ExpenseItem[]): string {
  const names = items.map((item) => item.product?.name).filter(Boolean);
  return names.length > 0 ? names.join(", ") : "Compra na ficha";
}
