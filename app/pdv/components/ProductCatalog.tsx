"use client";

import { Search } from "lucide-react";
import type { RefObject } from "react";
import { Input } from "../../components/ui/input";
import type { CartItem, Product } from "../types";
import { ProductGrid } from "./ProductGrid";

interface ProductCatalogProps {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  setQuery: (q: string) => void;
  products: Product[];
  loadingProducts: boolean;
  cart: CartItem[];
  canAddProductUnits: (
    product: Product,
    cart: CartItem[],
    additionalUnits: number
  ) => boolean;
  onAddProduct: (product: Product) => void;
}

export function ProductCatalog({
  inputRef,
  query,
  setQuery,
  products,
  loadingProducts,
  cart,
  canAddProductUnits,
  onAddProduct,
}: ProductCatalogProps) {
  return (
    <section className="flex flex-col gap-3 min-h-0 h-full overflow-hidden">
      {/* Barra de busca — sempre visível, fora do scroll */}
      <div className="flex-shrink-0">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Código de barras ou nome do produto"
            className="pl-9 h-11 bg-white shadow-sm"
            maxLength={13}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 ml-1">
          Leitora de código de barras ou busca manual — pressione{" "}
          <kbd className="px-1 py-0.5 text-[10px] rounded border border-slate-200 bg-slate-100">
            Ctrl+K
          </kbd>{" "}
          para focar
        </p>
      </div>

      {/* Grade de produtos com scroll próprio */}
      <ProductGrid
        products={products}
        loadingProducts={loadingProducts}
        cart={cart}
        canAddProductUnits={canAddProductUnits}
        onAddProduct={onAddProduct}
      />
    </section>
  );
}
