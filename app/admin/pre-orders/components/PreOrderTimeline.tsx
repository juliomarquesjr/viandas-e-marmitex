"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Package,
  Truck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { formatElapsed, formatTime, fulfillmentOf, stageOf, type PreOrder } from "../lib/preOrderView";

type Event = {
  key: string;
  at: Date;
  title: string;
  detail?: string | null;
  icon: LucideIcon;
  token: string;
};

/**
 * Cada evento tem título, ícone e cor próprios. Entregar é um fato bom: não
 * herda o vermelho de "a cobrar", que descreve a cobrança e não a entrega.
 */
const TRACKING_EVENTS: Record<string, { title: string; icon: LucideIcon; token: string }> = {
  pending: { title: "Voltou para a fila", icon: ClipboardList, token: "fila" },
  preparing: { title: "Enviado para a cozinha", icon: Package, token: "producao" },
  ready: { title: "Pronto para retirada", icon: CheckCircle2, token: "pronto" },
  out_for_delivery: { title: "Saiu para entrega", icon: Truck, token: "rota" },
  in_transit: { title: "Em trânsito", icon: Truck, token: "rota" },
  delivered: { title: "Entregue", icon: CheckCircle2, token: "faturado" },
  cancelled: { title: "Cancelado", icon: XCircle, token: "cancelado" },
};

const CREATED_EVENT = { title: "Pedido anotado", icon: ClipboardList, token: "fila" };

/**
 * A trilha do pedido, montada a partir do que o banco realmente guarda:
 * `createdAt` e os registros de `DeliveryTracking`. As etapas anteriores ao
 * primeiro tracking não têm carimbo — por isso a trilha começa no que foi
 * anotado e não inventa horários.
 */
export function PreOrderTimeline({ preOrder, now }: { preOrder: PreOrder; now: Date }) {
  const events: Event[] = [
    {
      key: "created",
      at: new Date(preOrder.createdAt),
      title: CREATED_EVENT.title,
      detail: `${preOrder.items.length} item${preOrder.items.length !== 1 ? "s" : ""}`,
      icon: CREATED_EVENT.icon,
      token: CREATED_EVENT.token,
    },
  ];

  // Entrega e retirada terminam ambas em `delivered`; o rótulo segue o caminho
  // que o pedido de fato tomou, para não dizer "entregue" a quem retirou.
  const pickup = fulfillmentOf(preOrder) === "pickup";

  for (const entry of preOrder.tracking ?? []) {
    const event = TRACKING_EVENTS[entry.status];
    const title =
      entry.status === "delivered" && pickup ? "Retirado pelo cliente" : event?.title ?? entry.status;

    events.push({
      key: entry.id,
      at: new Date(entry.timestamp),
      title,
      detail: entry.notes,
      icon: event?.icon ?? ClipboardList,
      token: event?.token ?? "fila",
    });
  }

  events.sort((a, b) => a.at.getTime() - b.at.getTime());

  const stage = stageOf(preOrder);
  const pendingPayment = stage === "cobrar";

  return (
    <ol className="flex flex-col">
      {events.map((event, index) => {
        const next = events[index + 1];
        const duration = next
          ? humanGap(event.at, next.at)
          : pendingPayment
            ? null
            : humanGap(event.at, now);
        const last = index === events.length - 1;
        const Icon = event.icon;
        const color = `var(--state-${event.token})`;

        return (
          <li key={event.key} className="relative grid grid-cols-[26px_1fr] gap-3 pb-4 last:pb-0">
            {!last && (
              <span
                aria-hidden="true"
                className="absolute left-3 top-5 bottom-0 w-0.5 bg-[color:var(--border)]"
              />
            )}
            <span
              className="relative z-10 flex h-[26px] w-[26px] items-center justify-center rounded-full text-white ring-4 ring-[color:var(--background)]"
              style={{ background: color }}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[13.5px] font-semibold text-[color:var(--foreground)]">
                <time className="mr-2 font-mono font-bold tabular-nums" dateTime={event.at.toISOString()}>
                  {formatTime(event.at)}
                </time>
                {event.title}
              </p>
              {event.detail && (
                <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">{event.detail}</p>
              )}
              {duration && (
                <span className="mt-1.5 inline-block rounded-md bg-[color:var(--muted)] px-1.5 py-0.5 font-mono text-[11px] text-[color:var(--muted-foreground-strong)]">
                  {duration}
                </span>
              )}
            </div>
          </li>
        );
      })}

      {pendingPayment && preOrder.deliveredAt && (
        <li className="relative grid grid-cols-[26px_1fr] gap-3">
          <span
            className="relative z-10 flex h-[26px] w-[26px] items-center justify-center rounded-full text-white ring-4 ring-[color:var(--background)]"
            style={{ background: "var(--state-cobrar)" }}
          >
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[13.5px] font-semibold" style={{ color: "var(--state-cobrar-fg)" }}>
              Aguardando pagamento
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--state-cobrar-fg)" }}>
              O valor ainda não entrou no caixa.
            </p>
            <span
              className="mt-1.5 inline-block rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold"
              style={{ background: "var(--state-cobrar-bg)", color: "var(--state-cobrar-fg)" }}
            >
              {formatElapsed(preOrder.deliveredAt, now) ?? "agora"}
            </span>
          </div>
        </li>
      )}
    </ol>
  );
}

function humanGap(from: Date, to: Date): string | null {
  const minutes = Math.round((to.getTime() - from.getTime()) / 60000);
  if (minutes < 1) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, "0")}`;
}
