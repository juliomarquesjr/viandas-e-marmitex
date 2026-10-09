import type { DeliveryStatus, PreOrder } from "./types";

/**
 * Como o pedido chega ao cliente.
 *
 * O pré-pedido não tem um campo "retirada ou entrega": a resposta sai do
 * próprio andamento. "ready" é, pelo schema, "pronto e aguardando o cliente
 * retirar no balcão"; saiu para entrega ou tem entregador é entrega. Antes de
 * ficar pronto, só a taxa de entrega dá uma pista, e sem ela não afirmamos nada.
 */
export type Fulfillment = "pickup" | "delivery" | "unknown";

/** Tom do status: ação do cliente agora, em andamento, encerrado ou cancelado. */
export type StatusTone = "go" | "prog" | "done" | "off";

export type StatusSource = Pick<
  PreOrder,
  "deliveryStatus" | "deliveryFeeCents" | "deliveryStartedAt" | "hasCourier" | "estimatedDeliveryTime" | "deliveredAt"
> &
  Partial<Pick<PreOrder, "source" | "approval" | "rejectReason" | "expired">>;

/**
 * Onde o pedido feito pelo cliente está na conversa com a loja. `null` para pedido
 * de balcão e para o pedido online que já saiu da aprovação (segue os estados normais).
 */
export type OnlineState = "awaiting" | "expired" | "accepted" | "rejected" | "cancelled";

export function onlineState(order: StatusSource): OnlineState | null {
  if (order.source !== "online") return null;
  switch (order.approval) {
    case "awaiting":
      return order.expired ? "expired" : "awaiting";
    case "rejected":
      return "rejected";
    case "cancelled":
      return "cancelled";
    case "accepted":
      return order.deliveryStatus === "pending" ? "accepted" : null;
    default:
      return null;
  }
}

/** Pedido que o cliente fez pelo app (v1: sempre retirada na loja). */
export const isOnline = (order: StatusSource) => order.source === "online";

/** A loja ainda não respondeu (vale também depois do prazo): é quando o cliente pode cancelar. */
export const isAwaitingStore = (order: StatusSource) => order.source === "online" && order.approval === "awaiting";

export function fulfillmentOf(order: StatusSource): Fulfillment {
  if (isOnline(order)) return "pickup";
  const s = order.deliveryStatus;
  if (s === "out_for_delivery" || s === "in_transit") return "delivery";
  if (s === "ready") return "pickup";
  if (order.deliveryStartedAt || order.hasCourier) return "delivery";
  if (s === "delivered") return "pickup";
  if (order.deliveryFeeCents > 0) return "delivery";
  return "unknown";
}

const STEPS: Record<Fulfillment, string[]> = {
  delivery: ["Recebido", "Em preparo", "Pronto", "A caminho", "Entregue"],
  pickup: ["Recebido", "Em preparo", "Pronto", "Retirado"],
  unknown: ["Recebido", "Em preparo", "Pronto"],
};

const ONLINE_STEPS = ["Enviado", "Aceito", "Em preparo", "Pronto", "Retirado"];

export function stepNames(order: StatusSource): string[] {
  return isOnline(order) ? ONLINE_STEPS : STEPS[fulfillmentOf(order)];
}

/** Posição na lista de etapas; -1 quando cancelado. */
export function stepIndex(order: StatusSource): number {
  if (isOnline(order)) {
    const state = onlineState(order);
    if (state === "awaiting") return 0;
    if (state === "expired" || state === "rejected" || state === "cancelled") return -1;
    switch (order.deliveryStatus as DeliveryStatus) {
      case "pending":
        return 1;
      case "preparing":
        return 2;
      case "ready":
        return 3;
      case "out_for_delivery":
      case "in_transit":
        return 3;
      case "delivered":
        return 4;
      default:
        return -1;
    }
  }
  const f = fulfillmentOf(order);
  switch (order.deliveryStatus as DeliveryStatus) {
    case "pending":
      return 0;
    case "preparing":
      return 1;
    case "ready":
      return 2;
    case "out_for_delivery":
    case "in_transit":
      return 3;
    case "delivered":
      return f === "pickup" ? 3 : 4;
    default:
      return -1;
  }
}

export function isFinished(order: StatusSource): boolean {
  // Expirado não está mais "em andamento": a loja não respondeu e o pedido não vai andar.
  return order.deliveryStatus === "delivered" || order.deliveryStatus === "cancelled" || onlineState(order) === "expired";
}

export function toneOf(order: StatusSource): StatusTone {
  const state = onlineState(order);
  if (state === "expired" || state === "rejected" || state === "cancelled") return "off";
  if (state === "awaiting" || state === "accepted") return "prog";
  const s = order.deliveryStatus;
  if (s === "cancelled") return "off";
  if (s === "delivered") return "done";
  if (s === "out_for_delivery" || s === "in_transit") return "go";
  if (s === "ready" && fulfillmentOf(order) === "pickup") return "go";
  return "prog";
}

/** Rótulo curto, para o badge da lista. */
export function shortLabel(order: StatusSource): string {
  switch (onlineState(order)) {
    case "awaiting":
      return "Enviado";
    case "expired":
      return "Sem resposta";
    case "accepted":
      return "Aceito";
    case "rejected":
      return "Recusado";
    case "cancelled":
      return "Cancelado";
  }
  switch (order.deliveryStatus as DeliveryStatus) {
    case "pending":
      return "Recebido";
    case "preparing":
      return "Em preparo";
    case "ready":
      return "Pronto";
    case "out_for_delivery":
    case "in_transit":
      return "A caminho";
    case "delivered":
      return fulfillmentOf(order) === "pickup" ? "Retirado" : "Entregue";
    default:
      return "Cancelado";
  }
}

/** Status animado: o ponto do badge pulsa enquanto o pedido anda (ou espera a resposta da loja). */
export function isLive(order: StatusSource): boolean {
  const state = onlineState(order);
  if (state === "awaiting" || state === "accepted") return true;
  if (state) return false;
  const s = order.deliveryStatus;
  return s === "preparing" || s === "ready" || s === "out_for_delivery" || s === "in_transit";
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Motivo da recusa em texto, ou null quando a loja não informou. */
export function rejectReasonOf(order: StatusSource): string | null {
  const reason = order.rejectReason?.trim();
  return reason ? reason : null;
}

/** Título e frase de apoio do detalhe do pedido. */
export function headline(order: StatusSource): { title: string; text: string } {
  switch (onlineState(order)) {
    case "awaiting":
      return {
        title: "Aguardando a loja confirmar",
        text: "Enviamos o seu pedido. Você pode cancelar enquanto a loja não responder.",
      };
    case "expired":
      return {
        title: "A loja não respondeu a tempo",
        text: "Este pedido não vai ser preparado. Cancele e faça outro, ou fale com a loja.",
      };
    case "accepted":
      return {
        title: "A loja aceitou o seu pedido",
        text: order.estimatedDeliveryTime
          ? `Pronto por volta de ${time(order.estimatedDeliveryTime)}.`
          : "Avisamos quando começar o preparo.",
      };
    case "rejected": {
      const reason = rejectReasonOf(order);
      return {
        title: "Pedido recusado",
        text: reason ? `Motivo: “${reason}”` : "A loja não informou o motivo.",
      };
    }
    case "cancelled":
      return { title: "Cancelado (por você)", text: "A loja não vai preparar este pedido." };
  }
  const pickup = fulfillmentOf(order) === "pickup";
  switch (order.deliveryStatus as DeliveryStatus) {
    case "pending":
      return { title: "Recebemos o seu pedido", text: "Aguardando a confirmação do estabelecimento." };
    case "preparing":
      return {
        title: "Estamos preparando",
        text: pickup ? "Falta pouco. Avisamos quando ficar pronto para retirar." : "Avisamos quando ficar pronto.",
      };
    case "ready":
      return pickup
        ? { title: "Pronto para retirar!", text: "Seu pedido está embalado no balcão. Diga o seu nome ao retirar." }
        : { title: "Seu pedido está pronto", text: "Aguardando o entregador." };
    case "out_for_delivery":
    case "in_transit":
      return {
        title: "Saiu para entrega",
        text: order.estimatedDeliveryTime
          ? `Chega por volta das ${time(order.estimatedDeliveryTime)}.`
          : "O entregador já está a caminho.",
      };
    case "delivered":
      return pickup
        ? { title: "Retirado", text: order.deliveredAt ? `Retirado às ${time(order.deliveredAt)}.` : "Pedido concluído." }
        : { title: "Entregue", text: order.deliveredAt ? `Chegou às ${time(order.deliveredAt)}.` : "Pedido concluído." };
    default:
      return { title: "Pedido cancelado", text: "Este pedido não foi concluído." };
  }
}

/** Título do cartão "Em andamento" do Início. */
export function activeTitle(order: StatusSource): string {
  switch (onlineState(order)) {
    case "awaiting":
      return "Aguardando a loja";
    case "accepted":
      return "Pedido aceito";
  }
  switch (order.deliveryStatus as DeliveryStatus) {
    case "ready":
      return "Pronto para retirar";
    case "preparing":
      return "Em preparo";
    case "pending":
      return "Recebido";
    default:
      return "Em andamento";
  }
}

/** Qual ilustração o StatusArt desenha. */
export type ArtKind = "wait" | "preparing" | "ready" | "truck" | "done" | "off";

export function artKind(order: StatusSource): ArtKind {
  const state = onlineState(order);
  if (state === "awaiting" || state === "accepted") return "wait";
  if (state) return "off";
  switch (order.deliveryStatus as DeliveryStatus) {
    case "pending":
      return "wait";
    case "preparing":
      return "preparing";
    case "ready":
      return "ready";
    case "out_for_delivery":
    case "in_transit":
      return "truck";
    case "delivered":
      return "done";
    default:
      return "off";
  }
}

/** Dá para acompanhar no mapa: só entrega que já saiu ou terminou. */
export function canTrack(order: StatusSource): boolean {
  const s = order.deliveryStatus;
  return fulfillmentOf(order) === "delivery" && (s === "out_for_delivery" || s === "in_transit" || s === "delivered");
}
