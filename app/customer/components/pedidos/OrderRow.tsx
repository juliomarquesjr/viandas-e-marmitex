"use client";

import { ShoppingBag, Truck } from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";
import { formatBRL, formatDayMonth, formatTime } from "../../lib/format";
import { fulfillmentOf, toneOf } from "../../lib/order-status";
import type { PreOrder } from "../../lib/types";
import { StatusChip, cx } from "../kit";

/** Linha da lista de pedidos: abre o detalhe pela URL (?item=<id>). */
export function OrderRow({
  order,
  href,
  current,
  onOpen,
}: {
  order: PreOrder;
  href: string;
  current: boolean;
  onOpen: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const tone = toneOf(order);
  const fulfillment = fulfillmentOf(order);
  const onTheWay = order.deliveryStatus === "out_for_delivery" || order.deliveryStatus === "in_transit";
  const Icon = onTheWay ? Truck : ShoppingBag;

  const count = order.items.length;
  const parts = [`${count} ${count === 1 ? "item" : "itens"}`, formatBRL(order.totalCents)];
  if (fulfillment === "pickup") parts.push("Retirada");
  else if (fulfillment === "delivery") parts.push("Entrega");

  return (
    <Link
      href={href}
      scroll={false}
      prefetch={false}
      className={cx("c-row", tone === "go" && "is-flag")}
      aria-current={current ? "true" : undefined}
      onClick={onOpen}
    >
      <span className={cx("c-oic", tone === "go" && "is-go", tone === "prog" && "is-prog")} aria-hidden="true">
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <span className="c-row-main">
        <strong>
          Pedido de {formatDayMonth(order.createdAt)} · {formatTime(order.createdAt)}
        </strong>
        <small className="c-num">{parts.join(" · ")}</small>
      </span>
      <StatusChip order={order} />
    </Link>
  );
}
