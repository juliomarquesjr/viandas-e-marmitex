"use client";

import { formatBRL } from "../../lib/format";
import type { MenuProduct } from "../../lib/types";
import { cx } from "../kit";
import { ProductThumb } from "../pedidos/ProductThumb";
import "./pedido.css";
import { QuantityControl } from "./QuantityControl";

/**
 * Uma linha do cardápio: foto, nome, descrição (2 linhas), preço e o "+" na mesma linha.
 * Esgotado e fora do horário não têm botão: o motivo aparece em texto, nunca só pela cor.
 */
export function MenuProductRow({
  product,
  quantity,
  canOrder,
  maxQuantity,
  onChange,
  onLimit,
}: {
  product: MenuProduct;
  quantity: number;
  /** A loja está aberta agora (pelo relógio do servidor). */
  canOrder: boolean;
  maxQuantity: number;
  onChange: (product: MenuProduct, quantity: number) => void;
  onLimit: () => void;
}) {
  const orderable = canOrder && product.availableNow && !product.soldOut;
  const when =
    // loja fechada/pausada: a faixa do topo já explica, o produto não repete
    !product.soldOut && !product.availableNow
      ? product.schedule.length > 0
        ? `Disponível: ${product.schedule.join(" · ")}`
        : "Indisponível agora"
      : null;

  return (
    <li className={cx("c-pm", product.soldOut && "is-soldout", when && "is-na")}>
      <ProductThumb product={product} size="lg" />
      <div className="c-pm-body">
        <h3 className="c-pm-name">{product.name}</h3>
        {product.description?.trim() && <p className="c-pm-desc">{product.description.trim()}</p>}
        <div className="c-pm-foot">
          <span className="c-pm-price c-num">{formatBRL(product.priceCents)}</span>
          {product.soldOut ? (
            <span className="c-pill is-off">Esgotado</span>
          ) : orderable ? (
            <QuantityControl
              name={product.name}
              quantity={quantity}
              max={maxQuantity}
              onChange={(n) => onChange(product, n)}
              onLimit={onLimit}
            />
          ) : null}
        </div>
        {when && <p className="c-pm-when">{when}</p>}
      </div>
    </li>
  );
}
