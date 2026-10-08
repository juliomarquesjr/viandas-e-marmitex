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

type StatusSource = Pick<
  PreOrder,
  "deliveryStatus" | "deliveryFeeCents" | "deliveryStartedAt" | "hasCourier" | "estimatedDeliveryTime" | "deliveredAt"
>;

export function fulfillmentOf(order: StatusSource): Fulfillment {
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

export function stepNames(order: StatusSource): string[] {
  return STEPS[fulfillmentOf(order)];
}

/** Posição na lista de etapas; -1 quando cancelado. */
export function stepIndex(order: StatusSource): number {
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
  return order.deliveryStatus === "delivered" || order.deliveryStatus === "cancelled";
}

export function toneOf(order: StatusSource): StatusTone {
  const s = order.deliveryStatus;
  if (s === "cancelled") return "off";
  if (s === "delivered") return "done";
  if (s === "out_for_delivery" || s === "in_transit") return "go";
  if (s === "ready" && fulfillmentOf(order) === "pickup") return "go";
  return "prog";
}

/** Rótulo curto, para o badge da lista. */
export function shortLabel(order: StatusSource): string {
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

/** Status animado: o ponto do badge pulsa enquanto o pedido anda. */
export function isLive(order: StatusSource): boolean {
  const s = order.deliveryStatus;
  return s === "preparing" || s === "ready" || s === "out_for_delivery" || s === "in_transit";
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Título e frase de apoio do detalhe do pedido. */
export function headline(order: StatusSource): { title: string; text: string } {
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

/** Dá para acompanhar no mapa: só entrega que já saiu ou terminou. */
export function canTrack(order: StatusSource): boolean {
  const s = order.deliveryStatus;
  return fulfillmentOf(order) === "delivery" && (s === "out_for_delivery" || s === "in_transit" || s === "delivered");
}
