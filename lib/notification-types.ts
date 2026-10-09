/**
 * Contrato entre as APIs de notificação e as telas. Só tipos e constantes:
 * pode ser importado tanto no navegador quanto no servidor.
 */

/** Tipos de notificação. Cada novo tipo entra aqui e em NOTIFICATION_TYPE_LABEL. */
export type NotificationType = 'payment_intent';

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  payment_intent: 'Pagamento informado',
};

export type PaymentIntentStatus = 'pending' | 'confirmed' | 'rejected';

/** Resumo da intenção de pagamento que acompanha a notificação, para a lista não precisar de outra busca. */
export interface NotificationPaymentSummary {
  id: string;
  status: PaymentIntentStatus;
  amountCents: number;
  confirmedAmountCents: number | null;
}

/** Item do sino, como as telas o recebem (datas em ISO). */
export interface NotificationDTO {
  id: string;
  type: NotificationType | string;
  title: string;
  message: string | null;
  customerId: string | null;
  customerName: string | null;
  refType: string | null;
  refId: string | null;
  /** Alguém já abriu. */
  readAt: string | null;
  /** A ação pedida já foi tomada; nulo significa que ainda pede ação. */
  resolvedAt: string | null;
  createdAt: string;
  /** Presente quando `refType` é "PaymentIntent". */
  paymentIntent: NotificationPaymentSummary | null;
}

/** Pedido feito pelo cliente que espera o admin aceitar ou recusar. */
export interface AwaitingOrderDTO {
  id: string;
  customerId: string | null;
  customerName: string | null;
  /** "2 × Marmita M, 1 × Suco": o resumo para decidir sem abrir o pedido. */
  summary: string;
  itemCount: number;
  totalCents: number;
  notes: string | null;
  createdAt: string;
  /** Ficou sem resposta além do prazo: só dá para recusar. */
  expired: boolean;
}

/** GET /api/notifications */
export interface NotificationListResponse {
  notifications: NotificationDTO[];
  /** O número do sino: notificações não lidas ou que ainda pedem ação + pedidos do cliente aguardando. */
  badgeCount: number;
  /** Quantas pedem ação agora (pagamentos a revisar + pedidos aguardando). */
  pendingCount: number;
  /** Pedidos feitos pelo cliente aguardando resposta, o mais antigo primeiro (até 10). */
  awaitingOrders: AwaitingOrderDTO[];
  /** Quantos pedidos aguardam (pode ser maior que a lista). */
  awaitingOrdersCount: number;
  /** Passe em `?before=` para buscar as mais antigas; nulo quando acabou. */
  nextBefore: string | null;
}

/** GET /api/payment-intents/[id], para o operador revisar. */
export interface PaymentIntentReviewDTO {
  id: string;
  status: PaymentIntentStatus;
  amountCents: number;
  /** Saldo devedor que o cliente tinha quando informou o pagamento. */
  balanceAtInformCents: number;
  /** Saldo devedor agora (pode ter mudado desde então). */
  currentBalanceCents: number;
  confirmedAmountCents: number | null;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  customer: { id: string; name: string; phone: string | null };
}

/** Intenção de pagamento como o próprio cliente a vê. */
export interface CustomerPaymentIntentDTO {
  id: string;
  status: PaymentIntentStatus;
  amountCents: number;
  confirmedAmountCents: number | null;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

/** POST /api/customer/payment-intents */
export interface CreatePaymentIntentResponse {
  intent: CustomerPaymentIntentDTO;
  /** Verdadeiro quando já havia uma intenção igual aguardando; nada novo foi criado. */
  duplicate: boolean;
}

/** GET /api/customer/payment-intents */
export interface CustomerPaymentIntentsResponse {
  /** As aguardando revisão e as revisadas nos últimos 3 dias, da mais nova para a mais antiga. */
  intents: CustomerPaymentIntentDTO[];
}

/** Menor e maior valores que o cliente pode informar, em centavos. */
export const PAYMENT_INTENT_MIN_CENTS = 100;
/** Quantas intenções aguardando o mesmo cliente pode ter ao mesmo tempo. */
export const PAYMENT_INTENT_MAX_PENDING = 3;
/** Por quanto tempo o cliente ainda vê o resultado de uma intenção já revisada. */
export const PAYMENT_INTENT_VISIBLE_HOURS = 72;
