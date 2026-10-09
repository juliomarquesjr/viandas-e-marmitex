/** Formato das respostas de /api/customer/*, como a tela as recebe (datas em ISO). */

export interface ExpenseItem {
  id?: string;
  quantity: number;
  priceCents?: number;
  /** Decimal do Prisma chega como texto. */
  weightKg?: string | number | null;
  product: { id: string; name: string; imageUrl?: string | null };
}

export interface PendingOrder {
  id: string;
  totalCents: number;
  createdAt: string;
  items: ExpenseItem[];
}

export interface FichaPayment {
  id: string;
  totalCents: number;
  createdAt: string;
  status: string;
  cashReceivedCents: number | null;
  changeCents: number | null;
}

export interface ExpensesResponse {
  /** Saldo de toda a ficha, sem filtro: positivo é o que o cliente deve. */
  balanceCents: number;
  /** Totais de toda a ficha, sem filtro. */
  totalPending: number;
  totalPayments: number;
  /** Totais só do período pedido; `null` quando não há filtro. */
  period: { pendingCents: number; paymentsCents: number } | null;
  /** Listas já filtradas pelo período, quando houver. */
  pendingOrders: PendingOrder[];
  fichaPayments: FichaPayment[];
}

export type DeliveryStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "in_transit"
  | "delivered"
  | "cancelled";

export interface PreOrderItem {
  id: string;
  quantity: number;
  /** Preço unitário; o total da linha é priceCents × quantity. */
  priceCents: number;
  weightKg: string | number | null;
  product: { id: string; name: string; imageUrl: string | null };
}

/** Quem criou o pedido: o estabelecimento (balcão) ou o próprio cliente pelo app. */
export type OrderSource = "staff" | "online";

/** Resposta da loja a um pedido feito pelo cliente. */
export type OrderApproval = "awaiting" | "accepted" | "rejected" | "cancelled";

export interface PreOrder {
  id: string;
  totalCents: number;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  notes: string | null;
  createdAt: string;
  deliveryStatus: DeliveryStatus;
  estimatedDeliveryTime: string | null;
  deliveryStartedAt: string | null;
  deliveredAt: string | null;
  /** Há um entregador designado (o nome e o contato não vêm para o cliente). */
  hasCourier: boolean;
  /** Ausente em respostas antigas: tratado como "staff". */
  source?: OrderSource;
  /** Só pedidos online têm aprovação; no balcão é `null`. */
  approval?: OrderApproval | null;
  respondedAt?: string | null;
  rejectReason?: string | null;
  /** Online aguardando a loja além do prazo (20 min). */
  expired?: boolean;
  items: PreOrderItem[];
}

export interface PreOrdersResponse {
  data: PreOrder[];
  total: number;
}

export interface CustomerAddress {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  doc: string | null;
  address: CustomerAddress | null;
  imageUrl?: string | null;
}

/* ---------------------------------------------------------- pedido online */

export type ClosedReason = "disabled" | "paused" | "no_windows" | "closed";

export interface MenuProduct {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  imageUrl: string | null;
  category: { id: string; name: string } | null;
  /** Dá para pedir agora (a loja está aberta e o produto está em uma janela aberta). */
  availableNow: boolean;
  soldOut: boolean;
  /** Quando dá para pedir, ex.: "seg–sex 10:00–13:00". */
  schedule: string[];
}

export interface OrderingLimits {
  maxPending: number;
  maxItems: number;
  maxQuantity: number;
  notesMax: number;
  graceMinutes: number;
}

/** Resposta de GET /api/customer/ordering/menu. */
export interface OrderingMenu {
  enabled: boolean;
  open: boolean;
  reason: ClosedReason | null;
  minutesToClose: number | null;
  closesAt: string | null;
  nextOpening: { label: string; at: string } | null;
  /** Relógio do servidor no momento da resposta: a tela não confia no do aparelho. */
  serverNow: string;
  awaitingCount: number;
  limits: OrderingLimits;
  products: MenuProduct[];
}
