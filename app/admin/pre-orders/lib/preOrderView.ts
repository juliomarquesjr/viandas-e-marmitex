import type { CSSProperties } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Package,
  Truck,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";

// =============================================================================
// TIPOS
// =============================================================================

export type PreOrderItem = {
  id: string;
  quantity: number;
  priceCents: number;
  weightKg?: number | string | null;
  product: {
    id: string;
    name: string;
    imageUrl?: string | null;
    pricePerKgCents?: number | null;
    productType?: string | null;
  };
};

export type PreOrderTracking = {
  id: string;
  status: string;
  timestamp: string;
  notes?: string | null;
};

export type PreOrder = {
  id: string;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  notes: string | null;
  createdAt: string;
  customerId: string | null;
  deliveryStatus?: string | null;
  estimatedDeliveryTime?: string | null;
  deliveryStartedAt?: string | null;
  deliveredAt?: string | null;
  deliveryPerson?: { id: string; name: string } | null;
  tracking?: PreOrderTracking[];
  customer: {
    id: string;
    name: string;
    phone: string;
    imageUrl?: string | null;
    address?: any;
  } | null;
  items: PreOrderItem[];
};

// =============================================================================
// ETAPAS
// =============================================================================

/**
 * As etapas que a operação enxerga. Não são o enum do banco: `cobrar` é
 * derivado (entregue e ainda existente = ainda não virou venda, porque a
 * conversão apaga o registro) e `faturado` só passa a existir quando o
 * pré-pedido deixar de ser deletado na conversão.
 */
export type PreOrderStage =
  | "fila"
  | "producao"
  | "pronto"
  | "rota"
  | "cobrar"
  | "faturado"
  | "cancelado";

export const STAGE_ORDER: PreOrderStage[] = [
  "cobrar",
  "rota",
  "pronto",
  "producao",
  "fila",
  "faturado",
  "cancelado",
];

/** Ordem do fluxo, usada pela trilha do dia (esquerda para a direita). */
export const RAIL_ORDER: PreOrderStage[] = [
  "fila",
  "producao",
  "pronto",
  "rota",
  "cobrar",
  "faturado",
  "cancelado",
];

type StageMeta = {
  label: string;
  /** Texto curto para a trilha do dia. */
  railLabel: string;
  icon: LucideIcon;
  /** Prefixo dos tokens em globals.css: --state-<token>, -bg, -fg. */
  token: string;
  /** Etapas em que o dinheiro ainda não entrou no caixa. */
  open: boolean;
};

export const STAGE_META: Record<PreOrderStage, StageMeta> = {
  fila: { label: "Na fila", railLabel: "Na fila", icon: ClipboardList, token: "fila", open: true },
  producao: { label: "Em produção", railLabel: "Produção", icon: Package, token: "producao", open: true },
  pronto: {
    label: "Aguardando retirada",
    railLabel: "Retirada",
    icon: CheckCircle2,
    token: "pronto",
    open: true,
  },
  rota: { label: "Em rota", railLabel: "Em rota", icon: Truck, token: "rota", open: true },
  cobrar: { label: "A cobrar", railLabel: "A cobrar", icon: AlertTriangle, token: "cobrar", open: true },
  faturado: { label: "Faturado", railLabel: "Faturados", icon: Wallet, token: "faturado", open: false },
  cancelado: { label: "Cancelado", railLabel: "Cancelados", icon: XCircle, token: "cancelado", open: false },
};

/**
 * Os status que `PUT /api/pre-orders/[id]/delivery` aceita — espelham o enum
 * `DeliveryStatus` do Prisma. A tela nunca oferece uma transição que o servidor
 * vá recusar: qualquer status novo entra aqui junto com a migration.
 */
export const SUPPORTED_STATUSES = [
  "pending",
  "preparing",
  "ready",
  "out_for_delivery",
  "in_transit",
  "delivered",
  "cancelled",
] as const;

export function isSupportedStatus(status: string): boolean {
  return (SUPPORTED_STATUSES as readonly string[]).includes(status);
}

/** O status que o servidor precisa receber para o pedido ficar em cada etapa. */
export const STATUS_OF_STAGE: Record<PreOrderStage, string | null> = {
  fila: "pending",
  producao: "preparing",
  pronto: "ready",
  rota: "out_for_delivery",
  cobrar: "delivered",
  cancelado: "cancelled",
  // Faturado não é um status de entrega: é consequência de receber o pedido.
  faturado: null,
};

/** As etapas que dá para escolher à mão, na ordem do fluxo. */
export function selectableStages(): PreOrderStage[] {
  return RAIL_ORDER.filter((stage) => {
    const status = STATUS_OF_STAGE[stage];
    return status !== null && isSupportedStatus(status);
  });
}

export function stageOf(preOrder: Pick<PreOrder, "deliveryStatus">): PreOrderStage {
  switch (preOrder.deliveryStatus) {
    case "preparing":
      return "producao";
    case "ready":
      return "pronto";
    case "out_for_delivery":
    case "in_transit":
      return "rota";
    case "delivered":
      return "cobrar";
    case "cancelled":
      return "cancelado";
    default:
      return "fila";
  }
}

/** Variáveis CSS da etapa, para aplicar via `style` e herdar nos filhos. */
export function stageVars(stage: PreOrderStage): CSSProperties {
  const { token } = STAGE_META[stage];
  return {
    ["--st" as string]: `var(--state-${token})`,
    ["--st-bg" as string]: `var(--state-${token}-bg)`,
    ["--st-fg" as string]: `var(--state-${token}-fg)`,
  };
}

// =============================================================================
// FORMATAÇÃO
// =============================================================================

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatCurrency(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "R$ 0,00";
  return currency.format(cents / 100);
}

const amount = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Valor sem o símbolo, para colunas que já têm cabeçalho de moeda — como a
 * comanda. Não dá para tirar o "R$" com replace: o Intl usa espaço
 * inquebrável (U+00A0) entre o símbolo e o número.
 */
export function formatAmount(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "0,00";
  return amount.format(cents / 100);
}

export function formatTime(value: string | Date): string {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Só a hora quando é do dia; data completa quando não é. */
export function formatWhen(value: string | Date, now: Date = new Date()): string {
  const date = new Date(value);
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  return sameDay ? formatTime(date) : formatDateTime(date);
}

/** "há 1h19", "há 8 min". Retorna null para menos de um minuto. */
export function formatElapsed(from: string | Date, now: Date = new Date()): string | null {
  const minutes = Math.floor((now.getTime() - new Date(from).getTime()) / 60000);
  if (minutes < 1) return null;
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `há ${hours}h` : `há ${hours}h${String(rest).padStart(2, "0")}`;
}

export function weightOf(item: PreOrderItem): number | null {
  if (item.weightKg === null || item.weightKg === undefined) return null;
  const value = Number(item.weightKg);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** "0,840 kg Feijoada" para produto a peso, "12× Marmita P" para unitário. */
export function describeItem(item: PreOrderItem): string {
  const weight = weightOf(item);
  if (weight !== null) {
    return `${weight.toFixed(3).replace(".", ",")} kg ${item.product.name}`;
  }
  return `${item.quantity}× ${item.product.name}`;
}

export function describeItems(items: PreOrderItem[], max = 2): string {
  if (items.length === 0) return "Sem itens";
  const shown = items.slice(0, max).map(describeItem).join(" · ");
  const rest = items.length - max;
  return rest > 0 ? `${shown} · +${rest}` : shown;
}

export type ItemTally = {
  productId: string;
  name: string;
  /** Unidades, para produtos com preço unitário. */
  units: number;
  /** Quilos somados, para produtos vendidos a peso. */
  kg: number;
  /** O peso é a medida do produto: unidades e quilos nunca se misturam. */
  byWeight: boolean;
};

/**
 * Quanto de cada produto os pedidos somam. Peso e unidade são grandezas
 * diferentes e são contados em campos separados — somar `quantity` de um
 * produto a peso daria "1" para 0,840 kg de feijoada.
 */
export function aggregateItems(preOrders: PreOrder[]): ItemTally[] {
  const map = new Map<string, ItemTally>();

  for (const preOrder of preOrders) {
    for (const item of preOrder.items) {
      const weight = weightOf(item);
      const current = map.get(item.product.id) ?? {
        productId: item.product.id,
        name: item.product.name,
        units: 0,
        kg: 0,
        byWeight: false,
      };

      if (weight !== null) {
        current.kg += weight;
        current.byWeight = true;
      } else {
        current.units += item.quantity;
      }

      map.set(item.product.id, current);
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const weightOfTally = (tally: ItemTally) => (tally.byWeight ? tally.kg : tally.units);
    return weightOfTally(b) - weightOfTally(a);
  });
}

/** "21 un" ou "0,840 kg" — a grandeza que o produto realmente usa. */
export function formatTallyAmount(tally: ItemTally): string {
  if (tally.byWeight) return `${tally.kg.toFixed(3).replace(".", ",")} kg`;
  return `${tally.units} un`;
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export type Fulfillment = "delivery" | "pickup" | "unknown";

/**
 * Entrega ou balcão. O schema não tem `fulfillmentType`, e o formulário grava
 * `deliveryFeeCents: 0` para todo pedido — então a taxa sozinha não distingue
 * nada. Só afirmamos "entrega" quando há prova (taxa cobrada, entregador
 * atribuído ou o pedido já tendo saído). No resto, a resposta é "não sei", e a
 * interface não inventa um rótulo.
 */
export function fulfillmentOf(preOrder: PreOrder): Fulfillment {
  if (preOrder.deliveryFeeCents > 0) return "delivery";
  if (preOrder.deliveryPerson || preOrder.deliveryStartedAt) return "delivery";

  // Despachar decide a modalidade, e a trilha guarda essa decisão. Depois de
  // entregue os dois caminhos viram `delivered`, então é o histórico que diz
  // por onde o pedido saiu.
  const history = new Set([
    preOrder.deliveryStatus ?? "",
    ...(preOrder.tracking ?? []).map((entry) => entry.status),
  ]);

  if (history.has("out_for_delivery") || history.has("in_transit")) return "delivery";
  if (history.has("ready")) return "pickup";

  return "unknown";
}
