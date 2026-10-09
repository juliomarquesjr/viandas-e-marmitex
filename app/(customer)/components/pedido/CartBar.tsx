"use client";

import { ShoppingBag, TriangleAlert } from "lucide-react";
import { formatBRL } from "../../lib/format";
import { cx } from "../kit";
import "./pedido.css";

/**
 * Barra fixa acima da barra de abas (celular): resume o carrinho e abre a folha. Some com o
 * carrinho vazio. Um `button` só, com o texto completo no aria-label.
 */
export function CartBar({
  items,
  totalCents,
  needsReview,
  onOpen,
}: {
  items: number;
  totalCents: number;
  needsReview: boolean;
  onOpen: () => void;
}) {
  const noun = items === 1 ? "item" : "itens";
  const label = `${needsReview ? "Revisar carrinho" : "Ver carrinho"} · ${items} ${noun}`;
  return (
    <div className="c-ped-bar">
      <button
        type="button"
        className={cx("c-ped-bar-btn", needsReview && "is-review")}
        onClick={onOpen}
        aria-label={`${label} · ${formatBRL(totalCents)}`}
        aria-haspopup="dialog"
      >
        <span className="c-ped-bar-ic" aria-hidden="true">
          {needsReview ? <TriangleAlert size={20} /> : <ShoppingBag size={20} />}
        </span>
        <span className="c-ped-bar-t" aria-hidden="true">
          {label}
        </span>
        <span className="c-ped-bar-p c-num" aria-hidden="true">
          {formatBRL(totalCents)}
        </span>
      </button>
    </div>
  );
}
