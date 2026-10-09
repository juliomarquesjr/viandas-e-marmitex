"use client";

import Link from "next/link";
import * as React from "react";
import type { StatusSource } from "../../lib/order-status";
import { Money, StatusArt } from "../kit";
import "./pedido.css";

export interface SentOrder {
  id: string;
  totalCents: number;
  lines: Array<{ productId: string; name: string; quantity: number }>;
}

/** O pedido recém-enviado, no formato que o StatusArt entende (aguardando a loja). */
const WAITING: StatusSource = {
  deliveryStatus: "pending",
  deliveryFeeCents: 0,
  deliveryStartedAt: null,
  hasCourier: false,
  estimatedDeliveryTime: null,
  deliveredAt: null,
  source: "online",
  approval: "awaiting",
};

/**
 * Confirmação em tela cheia (não um aviso que some): é o momento em que o cliente precisa ter
 * certeza de que o pedido foi. O foco vai para o título ao aparecer.
 */
export function OrderSent({ order }: { order: SentOrder }) {
  const title = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="c-ped-sent">
      <div className="c-ped-sent-hero c-rise">
        <StatusArt order={WAITING} size={96} />
        <h1 ref={title} tabIndex={-1}>
          Pedido enviado!
        </h1>
        <p>A loja vai confirmar em instantes.</p>
      </div>

      <section className="c-receipt c-rise" style={{ ["--c-i" as string]: 1 }} aria-label="Resumo do pedido">
        <ul className="c-items">
          {order.lines.map((line) => (
            <li key={line.productId}>
              <span className="c-q c-num">{line.quantity}×</span>
              <span className="c-n">{line.name}</span>
            </li>
          ))}
        </ul>
        <hr className="c-dash" />
        <div className="c-sum is-total">
          <span>Total</span>
          <Money cents={order.totalCents} countUp className="c-ped-sent-money" />
        </div>
        <p className="c-foot">Você paga na retirada, no balcão.</p>
      </section>

      <div className="c-actions c-rise" style={{ ["--c-i" as string]: 2 }}>
        <Link href={`/pre-orders?item=${encodeURIComponent(order.id)}`} className="c-btn is-primary">
          Acompanhar pedido
        </Link>
        <Link href="/dashboard" className="c-btn is-ghost">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
