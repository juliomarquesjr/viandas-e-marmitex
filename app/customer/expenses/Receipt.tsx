"use client";

import type { CSSProperties } from "react";
import { weightOf, type Movement } from "../components/ficha/movements";
import { ProductThumb } from "../components/pedidos/ProductThumb";
import { formatBRL, formatKg, formatLongDate, formatTime } from "../lib/format";
import "./receipt.css";

const SPARKS = [0, 45, 90, 135, 180, 225, 270, 315];

/** Selo de "pago": o disco carimba, o check se desenha, anéis se abrem e faíscas saltam. */
function PaidSeal() {
  return (
    <span className="c-seal" aria-hidden="true">
      <svg viewBox="0 0 84 84">
        <circle className="c-seal-ripple" cx="42" cy="42" r="26" />
        <circle className="c-seal-ripple r2" cx="42" cy="42" r="26" />
        {SPARKS.map((angle) => (
          <line
            key={angle}
            className="c-seal-spark"
            x1="42"
            y1="4"
            x2="42"
            y2="11"
            style={{ "--a": `${angle}deg` } as CSSProperties}
          />
        ))}
        <g className="c-seal-disc">
          <circle cx="42" cy="42" r="26" fill="currentColor" />
          <path
            className="c-seal-check"
            d="m31 43 8 8 15-16"
            fill="none"
            stroke="var(--c-surface)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </span>
  );
}

/** Comprovante de um lançamento da ficha: compra ou pagamento. */
export function Receipt({ movement }: { movement: Movement }) {
  const when = (
    <div className="c-receipt-head">
      <div>
        <p className="c-eyebrow">{movement.kind === "pay" ? "Pagamento recebido" : "Compra na ficha"}</p>
        <h2>{formatLongDate(movement.createdAt)}</h2>
        <div className="c-receipt-when c-num">{formatTime(movement.createdAt)}</div>
      </div>
      {movement.kind === "pay" && <PaidSeal />}
    </div>
  );

  if (movement.kind === "pay") {
    const cash = movement.cashReceivedCents;
    const change = movement.changeCents;
    const hasCash = cash !== null && cash !== undefined && cash > 0;
    const hasChange = change !== null && change !== undefined && change > 0;
    return (
      <article className="c-receipt" aria-label="Comprovante do pagamento">
        {when}
        <hr className="c-dash" />
        {hasCash && (
          <div className="c-sum">
            <span>Valor recebido</span>
            <span>{formatBRL(cash)}</span>
          </div>
        )}
        {hasChange && (
          <div className="c-sum">
            <span>Troco</span>
            <span>{formatBRL(change)}</span>
          </div>
        )}
        {(hasCash || hasChange) && <hr className="c-dash" />}
        <div className="c-sum is-total is-paid">
          <span>Abatido da ficha</span>
          <span className="is-neg c-num">{formatBRL(movement.totalCents)}</span>
        </div>
        <p className="c-foot">Este pagamento já foi descontado do seu saldo.</p>
      </article>
    );
  }

  return (
    <article className="c-receipt" aria-label="Comprovante da compra">
      {when}
      <hr className="c-dash" />
      {movement.items.length > 0 ? (
        <ul className="c-items has-thumbs">
          {movement.items.map((item, i) => {
            const kg = weightOf(item);
            const product = item.product ?? { id: `item-${i}`, name: "Item" };
            const unit = item.priceCents ?? null;
            return (
              <li key={item.id ?? `${product.id}-${i}`}>
                <span className="c-li-media">
                  <ProductThumb product={product} size="lg" />
                  {kg === 0 && item.quantity > 1 && <span className="c-li-qty">{item.quantity}×</span>}
                </span>
                <span className="c-li-body">
                  <span className="c-li-name">{product.name}</span>
                  <span className="c-li-sub c-num">
                    {kg > 0 ? formatKg(kg) : unit !== null ? `${item.quantity} × ${formatBRL(unit)}` : `${item.quantity}×`}
                  </span>
                </span>
                {unit !== null && kg === 0 && <span className="c-p">{formatBRL(unit * item.quantity)}</span>}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="c-foot">Os itens desta compra não foram registrados.</p>
      )}
      <hr className="c-dash" />
      <div className="c-sum is-total">
        <span>Total</span>
        <span className="c-num">{formatBRL(movement.totalCents)}</span>
      </div>
      <p className="c-foot">Valor somado ao saldo da sua ficha.</p>
    </article>
  );
}
