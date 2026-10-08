"use client";

import Link from "next/link";
import { formatBRL, formatDay, formatDayMonth, formatTime, formatWeekdayShort } from "../../lib/format";
import { itemCount, itemsLabel, itemsTitle, type Movement } from "./movements";

/**
 * Linha de compra ou pagamento da ficha, igual no Início e na Ficha.
 * Com `href` é um link (vai para a Ficha); com `onSelect` é um botão que
 * escolhe o lançamento na própria Ficha.
 */
export function MovementRow({
  movement,
  href,
  onSelect,
  current = false,
}: {
  movement: Movement;
  href?: string;
  onSelect?: (id: string) => void;
  current?: boolean;
}) {
  const isPay = movement.kind === "pay";

  const content = (
    <>
      <span className="c-row-date" aria-hidden="true">
        <b className="c-num">{formatDay(movement.createdAt)}</b>
        <i>{formatWeekdayShort(movement.createdAt)}</i>
      </span>
      <span className="c-row-main">
        <strong>{isPay ? "Pagamento recebido" : itemsTitle(movement.items)}</strong>
        <small className="c-num">
          {formatDayMonth(movement.createdAt)} ·{" "}
          {isPay ? (
            <>
              <span className="c-tag">Pagamento</span>
              {formatTime(movement.createdAt)}
            </>
          ) : (
            <>
              {formatTime(movement.createdAt)} · {itemsLabel(itemCount(movement.items))}
            </>
          )}
        </small>
      </span>
      {isPay ? (
        <span className="c-amt c-num is-in">
          <span aria-hidden="true">− </span>
          <span className="c-sr">abatido </span>
          {formatBRL(movement.totalCents)}
        </span>
      ) : (
        <span className="c-amt c-num">{formatBRL(movement.totalCents)}</span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="c-row">
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="c-row"
      aria-current={current ? "true" : undefined}
      onClick={() => onSelect?.(movement.id)}
    >
      {content}
    </button>
  );
}
