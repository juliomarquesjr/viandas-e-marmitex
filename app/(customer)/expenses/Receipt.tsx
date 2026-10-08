"use client";

import type { CSSProperties } from "react";
import { weightOf, type Movement } from "../components/ficha/movements";
import { ProductThumb } from "../components/pedidos/ProductThumb";
import { formatBRL, formatKg, formatLongDate, formatTime } from "../lib/format";
import { MovementArt } from "./MovementArt";
import "./receipt.css";

/** Atraso da entrada em cena de cada bloco (c-rise), como no detalhe do pedido. */
const rise = (i: number) => ({ ["--c-i" as string]: i }) as CSSProperties;

/** Cartão de topo, igual ao andamento do pedido: ilustração animada à esquerda, título e frase ao lado. */
function StatusCard({ movement }: { movement: Movement }) {
  const isPay = movement.kind === "pay";
  return (
    <section className="c-status c-rise" style={rise(0)} aria-label={isPay ? "Pagamento" : "Compra"}>
      <div className="c-status-top">
        <MovementArt movement={movement} />
        <div>
          <h2>{isPay ? "Pagamento recebido" : "Compra na ficha"}</h2>
          <p>
            {isPay
              ? `${formatBRL(movement.totalCents)} abatidos da sua ficha.`
              : `${formatBRL(movement.totalCents)} somados ao seu saldo.`}
          </p>
        </div>
      </div>
    </section>
  );
}

/** Comprovante de um lançamento da ficha: compra ou pagamento. */
export function Receipt({ movement }: { movement: Movement }) {
  const when = (
    <div>
      <p className="c-eyebrow">{movement.kind === "pay" ? "Pagamento" : "Compra"}</p>
      <h2>{formatLongDate(movement.createdAt)}</h2>
      <div className="c-receipt-when c-num">{formatTime(movement.createdAt)}</div>
    </div>
  );

  if (movement.kind === "pay") {
    const cash = movement.cashReceivedCents;
    const change = movement.changeCents;
    const hasCash = cash !== null && cash !== undefined && cash > 0;
    const hasChange = change !== null && change !== undefined && change > 0;
    return (
      <>
        <StatusCard movement={movement} />
        <article className="c-receipt c-rise" style={rise(1)} aria-label="Comprovante do pagamento">
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
      </>
    );
  }

  return (
    <>
      <StatusCard movement={movement} />
      <article className="c-receipt c-rise" style={rise(1)} aria-label="Comprovante da compra">
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
                      {kg > 0
                        ? formatKg(kg)
                        : unit !== null
                          ? `${item.quantity} × ${formatBRL(unit)}`
                          : `${item.quantity}×`}
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
    </>
  );
}
