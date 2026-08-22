"use client";

import { Badge } from "../../components/ui/badge";
import type { Product } from "../types";
import { ProductThumb } from "./ProductThumb";

/** A partir daqui o card ganha aviso âmbar de estoque acabando. */
const LOW_STOCK_THRESHOLD = 3;

interface ProductCardProps {
  product: Product;
  canAdd: boolean;
  /** Quantas unidades deste produto já estão no carrinho. */
  qtyInCart?: number;
  onAdd: (product: Product) => void;
}

export function ProductCard({
  product,
  canAdd,
  qtyInCart = 0,
  onAdd,
}: ProductCardProps) {
  const price = product.priceCents / 100;
  const isWeightBased = !!product.pricePerKgCents && product.pricePerKgCents > 0;

  const stockControlled = !!product.stockEnabled;
  const stock = product.stock ?? null;
  const isOut = stockControlled && stock === 0;
  const isUnknownStock = stockControlled && stock === null;
  const blocked = isOut || isUnknownStock;
  const isLow = stockControlled && stock !== null && stock > 0 && stock <= LOW_STOCK_THRESHOLD;
  // Tem estoque na prateleira, mas o carrinho já segurou tudo que havia.
  const atCartLimit = !canAdd && !blocked;

  const railClass = blocked
    ? "bg-red-600"
    : isLow
    ? "bg-amber-500"
    : atCartLimit
    ? "bg-amber-400"
    : "";

  return (
    <button
      onClick={() => onAdd(product)}
      disabled={!canAdd}
      style={
        blocked
          ? {
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(220,38,38,0.05) 0 7px, transparent 7px 15px)",
            }
          : undefined
      }
      className={`group relative flex min-h-[112px] w-full items-center gap-3 overflow-hidden rounded-2xl border p-3 text-left transition-all duration-200 ${
        blocked
          ? "border-red-200 bg-white cursor-not-allowed"
          : canAdd
          ? `bg-white shadow-sm cursor-pointer hover:-translate-y-[3px] hover:border-blue-200 hover:shadow-[0_16px_32px_-18px_rgba(37,99,235,0.55),0_3px_9px_rgba(15,23,42,0.07)] active:translate-y-0 active:scale-[0.995] ${
              isLow
                ? "border-amber-200"
                : qtyInCart > 0
                ? "border-blue-200 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_0_0_1px_rgba(37,99,235,0.16)]"
                : "border-slate-100"
            }`
          : "border-amber-200 bg-amber-50/40 cursor-not-allowed"
      }`}
    >
      {/* Fio de luz no topo — só aparece no hover de um card clicável */}
      {canAdd && (
        <span className="pointer-events-none absolute inset-x-[12%] top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      )}

      {/* Trilho de status na borda esquerda */}
      {railClass && <span className={`absolute inset-y-0 left-0 w-[3px] ${railClass}`} />}

      {/* Contador de unidades já no carrinho */}
      {qtyInCart > 0 && !blocked && (
        <span className="absolute top-2 right-2 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10.5px] font-bold text-white shadow-[0_3px_8px_-3px_rgba(37,99,235,0.95)]">
          {qtyInCart}
        </span>
      )}

      <div className="relative flex-shrink-0">
        <ProductThumb
          src={product.imageUrl}
          alt={product.name}
          dimmed={blocked}
          className="h-[88px] w-[68px] rounded-[14px]"
          imageClassName={canAdd ? "group-hover:scale-105" : ""}
        />
        {/* Fita sobre a foto: na quina do card ela encobria o fim do nome. */}
        {blocked && (
          <span className="pointer-events-none absolute inset-x-[-15px] top-1/2 -translate-y-1/2 -rotate-[38deg] bg-red-600 py-1 text-center text-[8.5px] font-bold tracking-[0.12em] text-white shadow-md">
            {isOut ? "ESGOTADO" : "INDISPON."}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p
          className={`line-clamp-2 text-sm font-semibold leading-snug transition-colors ${
            blocked ? "text-slate-400" : "text-slate-800 group-hover:text-slate-900"
          }`}
        >
          {product.name}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`text-sm font-bold tabular-nums ${
              blocked ? "text-slate-400" : canAdd ? "text-primary" : "text-slate-500"
            }`}
          >
            {isWeightBased
              ? `R$ ${(product.pricePerKgCents! / 100).toFixed(2)}/kg`
              : `R$ ${price.toFixed(2)}`}
          </span>
          {isWeightBased && <Badge variant="warning" size="sm">Por Quilo</Badge>}
          {product.productType === "addon" && (
            <Badge variant="secondary" size="sm">Adicional</Badge>
          )}
        </div>

        <StockLine
          isOut={isOut}
          isUnknownStock={isUnknownStock}
          isLow={isLow}
          atCartLimit={atCartLimit}
          stockControlled={stockControlled}
          stock={stock}
        />
      </div>
    </button>
  );
}

function StockLine({
  isOut,
  isUnknownStock,
  isLow,
  atCartLimit,
  stockControlled,
  stock,
}: {
  isOut: boolean;
  isUnknownStock: boolean;
  isLow: boolean;
  atCartLimit: boolean;
  stockControlled: boolean;
  stock: number | null;
}) {
  if (isOut) {
    return <Line tone="text-red-700 font-semibold" dot="bg-red-600">Repor estoque</Line>;
  }
  if (isUnknownStock) {
    return <Line tone="text-red-700 font-semibold" dot="bg-red-600">Estoque não informado</Line>;
  }
  if (atCartLimit) {
    return <Line tone="text-amber-700 font-semibold" dot="bg-amber-500">Limite no carrinho</Line>;
  }
  if (isLow) {
    return <Line tone="text-amber-700 font-semibold" dot="bg-amber-500">Últimas {stock} un.</Line>;
  }
  if (stockControlled && stock !== null) {
    return <Line tone="text-muted-foreground" dot="bg-emerald-400">Estoque: {stock} un.</Line>;
  }
  return null;
}

function Line({
  tone,
  dot,
  children,
}: {
  tone: string;
  dot: string;
  children: React.ReactNode;
}) {
  return (
    <span className={`flex items-center gap-1.5 pt-0.5 text-[11px] leading-none ${tone}`}>
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${dot}`} />
      {children}
    </span>
  );
}
