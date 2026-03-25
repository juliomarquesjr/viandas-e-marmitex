"use client";

import { AlertCircle, Image as ImageIcon } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import type { Product } from "../types";

interface ProductCardProps {
  product: Product;
  canAdd: boolean;
  onAdd: (product: Product) => void;
}

export function ProductCard({ product, canAdd, onAdd }: ProductCardProps) {
  const hasImage = !!product.imageUrl;
  const price = product.priceCents / 100;
  const isWeightBased = product.pricePerKgCents && product.pricePerKgCents > 0;

  return (
    <button
      onClick={() => onAdd(product)}
      disabled={!canAdd}
      className={`group flex items-center gap-3 rounded-xl border p-2.5 text-left w-full transition-all duration-200 ${
        canAdd
          ? "bg-white border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/20 cursor-pointer"
          : "bg-red-50/60 border-red-100 cursor-not-allowed opacity-70"
      }`}
    >
      {/* Imagem */}
      <div className="h-[68px] w-[68px] flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shadow-inner">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl!}
            alt={product.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-7 w-7 text-slate-300"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
              }
            }}
          />
        ) : (
          <ImageIcon className="h-7 w-7 text-slate-300" />
        )}
      </div>

      {/* Conteúdo */}
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <p className="text-sm font-semibold leading-tight line-clamp-2 text-slate-800 group-hover:text-slate-900 transition-colors">
          {product.name}
        </p>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-sm font-bold tabular-nums ${canAdd ? "text-primary" : "text-slate-400"}`}>
            {isWeightBased
              ? `R$ ${(product.pricePerKgCents! / 100).toFixed(2)}/kg`
              : `R$ ${price.toFixed(2)}`}
          </span>
          {isWeightBased && (
            <Badge variant="warning" size="sm">Por Quilo</Badge>
          )}
        </div>

        {product.stockEnabled && product.stock !== undefined && (
          <span className={`text-[11px] leading-none ${
            product.stock > 0 ? "text-muted-foreground" : "text-red-600 font-medium"
          }`}>
            Estoque: {product.stock} unid.{product.stock === 0 && " • Esgotado"}
          </span>
        )}

        {!canAdd && !product.stockEnabled && (
          <Badge variant="error" size="sm" icon={<AlertCircle className="h-3 w-3" />}>
            Indisp.
          </Badge>
        )}
      </div>
    </button>
  );
}
