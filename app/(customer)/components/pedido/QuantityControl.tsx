"use client";

import { Minus, Plus } from "lucide-react";
import * as React from "react";
import { cx } from "../kit";
import "./pedido.css";

/**
 * "+" de 44 px que vira (− n +) na mesma linha, sem mudar a altura dela. O botão "+" é sempre o
 * mesmo elemento, então o foco do teclado não se perde ao adicionar o primeiro; ao tirar o
 * último, o foco volta para ele.
 */
export function QuantityControl({
  name,
  quantity,
  max,
  onChange,
  onLimit,
}: {
  name: string;
  quantity: number;
  max: number;
  onChange: (quantity: number) => void;
  /** O cliente tentou passar do máximo. */
  onLimit?: () => void;
}) {
  const plus = React.useRef<HTMLButtonElement>(null);
  const atMax = quantity >= max;

  return (
    <div className={cx("c-qty", quantity > 0 && "has-n")} role={quantity > 0 ? "group" : undefined} aria-label={quantity > 0 ? `Quantidade de ${name}` : undefined}>
      {quantity > 0 && (
        <button
          type="button"
          className="c-qty-btn c-qty-minus"
          aria-label={quantity === 1 ? `Tirar ${name} do carrinho` : `Diminuir a quantidade de ${name}`}
          onClick={() => {
            if (quantity === 1) plus.current?.focus();
            onChange(quantity - 1);
          }}
        >
          <Minus size={18} aria-hidden="true" />
        </button>
      )}
      {quantity > 0 && (
        <span className="c-qty-n c-num">
          <span aria-hidden="true">{quantity}</span>
          <span className="c-sr" aria-live="polite">
            {quantity} no carrinho
          </span>
        </span>
      )}
      <button
        ref={plus}
        type="button"
        className="c-qty-btn c-qty-plus"
        aria-label={quantity > 0 ? `Aumentar a quantidade de ${name}` : `Adicionar ${name}`}
        aria-disabled={atMax || undefined}
        onClick={() => {
          if (atMax) onLimit?.();
          else onChange(quantity + 1);
        }}
      >
        <Plus size={20} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  );
}
