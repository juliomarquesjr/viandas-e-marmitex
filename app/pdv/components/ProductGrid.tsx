"use client";

import { Boxes, SearchX } from "lucide-react";
import { totalQtyInCartForProduct } from "@/lib/pdv/stockQuantity";
import type { CartItem, Product } from "../types";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  /** Já filtrados pela busca e pelo quadro de categoria ativo. */
  products: Product[];
  /** Total do catálogo, antes de qualquer filtro — separa "sem cadastro" de "sem resultado". */
  totalProducts?: number;
  searchQuery?: string;
  /** Há filtro de categoria ativo — muda o texto do estado vazio. */
  filtered?: boolean;
  loadingProducts: boolean;
  cart: CartItem[];
  canAddProductUnits: (
    product: Product,
    cart: CartItem[],
    additionalUnits: number
  ) => boolean;
  onAddProduct: (product: Product) => void;
}

export function ProductGrid({
  products,
  totalProducts,
  searchQuery = "",
  filtered = false,
  loadingProducts,
  cart,
  canAddProductUnits,
  onAddProduct,
}: ProductGridProps) {
  if (loadingProducts) {
    return (
      <div className="pdv-product-grid min-h-0 flex-1 content-start gap-2.5 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex min-h-[112px] items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3">
            <div className="h-[88px] w-[68px] flex-shrink-0 animate-pulse rounded-[14px] bg-slate-200" />
            <div className="flex-1 space-y-2.5">
              <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
              <div className="h-2 w-1/2 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    const hasCatalog = (totalProducts ?? 0) > 0;
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          {searchQuery ? (
            <SearchX className="h-7 w-7 text-slate-400" />
          ) : (
            <Boxes className="h-7 w-7 text-slate-400" />
          )}
        </div>
        <p className="max-w-[38ch] text-sm text-muted-foreground">
          {searchQuery ? (
            <>
              Nenhum produto encontrado para{" "}
              <span className="font-medium text-slate-700">&quot;{searchQuery}&quot;</span>
              {filtered ? " neste filtro." : "."}
            </>
          ) : filtered ? (
            "Nenhum produto neste filtro."
          ) : hasCatalog ? (
            "Nenhum produto disponível."
          ) : (
            "Nenhum produto cadastrado."
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="pdv-product-grid min-h-0 flex-1 content-start gap-2.5 overflow-y-auto pr-1 pb-2">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          canAdd={canAddProductUnits(product, cart, 1)}
          qtyInCart={totalQtyInCartForProduct(cart, product.id)}
          onAdd={onAddProduct}
        />
      ))}
    </div>
  );
}
