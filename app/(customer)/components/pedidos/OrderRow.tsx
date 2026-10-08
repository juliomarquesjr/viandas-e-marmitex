"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { formatBRL, formatDayMonth, formatTime } from "../../lib/format";
import { fulfillmentOf, toneOf } from "../../lib/order-status";
import type { PreOrder } from "../../lib/types";
import { StatusChip, cx } from "../kit";
import { ThumbStack } from "./ThumbStack";

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Hoje", "Ontem" ou "30/09": curto o bastante para não quebrar a linha ao lado da pilha de fotos. */
function dayLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (sameDay(date, now)) return "Hoje";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return sameDay(date, yesterday) ? "Ontem" : formatDayMonth(iso);
}

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
      <ThumbStack items={order.items} fallbackId={order.id} />
      <span className="c-row-main">
        <strong>
          <span className="c-sr">Pedido de </span>
          {dayLabel(order.createdAt)} · {formatTime(order.createdAt)}
        </strong>
        <small className="c-num">{parts.join(" · ")}</small>
      </span>
      <StatusChip order={order} />
    </Link>
  );
}
