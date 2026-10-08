"use client";

import { weightOf, type Movement } from "../components/ficha/movements";
import { formatBRL, formatKg, formatLongDate, formatTime } from "../lib/format";

/** Comprovante de um lançamento da ficha: compra ou pagamento. */
export function Receipt({ movement }: { movement: Movement }) {
  const when = (
    <div>
      <p className="c-eyebrow">{movement.kind === "pay" ? "Pagamento" : "Compra na ficha"}</p>
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
        <div className="c-sum is-total">
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
        <ul className="c-items">
          {movement.items.map((item, i) => {
            const kg = weightOf(item);
            return (
              <li key={item.id ?? `${item.product?.id}-${i}`}>
                <span className="c-q">{kg > 0 ? formatKg(kg) : `${item.quantity}×`}</span>
                <span className="c-n">{item.product?.name ?? "Item"}</span>
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
