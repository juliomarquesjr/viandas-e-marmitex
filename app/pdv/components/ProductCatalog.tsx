"use client";

import { filterProducts } from "@/lib/pdv/productSearch";
import { Search, X } from "lucide-react";
import { useMemo, type RefObject } from "react";
import { Input } from "../../components/ui/input";
import { useCatalogFilters } from "../hooks/useCatalogFilters";
import type { CartItem, Product } from "../types";
import { CategoryNav } from "./CategoryNav";
import { LastItemPanel } from "./LastItemPanel";
import { ProductGrid } from "./ProductGrid";

interface ProductCatalogProps {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  setQuery: (q: string) => void;
  products: Product[];
  loadingProducts: boolean;
  cart: CartItem[];
  lastAddedId: string | null;
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
  lastAddedId,
  canAddProductUnits,
  onAddProduct,
}: ProductCatalogProps) {
  const trimmedQuery = query.trim();

  const searched = useMemo(
    () => filterProducts(products, trimmedQuery),
    [products, trimmedQuery]
  );

  const { mode, changeMode, availableModes, tiles, activeKey, selectTile, displayed } =
    useCatalogFilters(searched);

  // Enter com um único resultado adiciona direto — evita ter que clicar no card.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" && trimmedQuery) {
      e.preventDefault();
      setQuery("");
      return;
    }
    if (e.key !== "Enter" || !trimmedQuery) return;
    e.preventDefault();
    const [only] = displayed;
    if (displayed.length !== 1 || !canAddProductUnits(only, cart, 1)) return;
    onAddProduct(only);
    setQuery("");
  };

  return (
    <section className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      {/* Faixa de operação: busca + filtros à esquerda, conferência à direita */}
      <div className="grid flex-shrink-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="flex min-w-0 flex-col justify-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Código de barras ou nome do produto"
              className="h-[52px] bg-white pl-12 pr-14 text-[15px] shadow-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Limpar busca"
                title="Limpar busca (Esc)"
                className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <p className="min-w-0 text-[11px] leading-snug text-muted-foreground">
              {trimmedQuery ? (
                <>
                  {displayed.length}{" "}
                  {displayed.length === 1 ? "produto" : "produtos"} —{" "}
                  <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 text-[10px]">
                    Esc
                  </kbd>{" "}
                  limpa
                </>
              ) : (
                <>
                  Leitora ou busca manual —{" "}
                  <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 text-[10px]">
                    Ctrl+K
                  </kbd>{" "}
                  foca o campo
                </>
              )}
            </p>

            {availableModes.length > 1 && (
              <div className="ml-auto flex flex-shrink-0 gap-1">
                {availableModes.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => changeMode(m.key)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all duration-150 ${
                      mode === m.key
                        ? "bg-primary text-white shadow-sm"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <CategoryNav tiles={tiles} activeKey={activeKey} onSelect={selectTile} />
        </div>

        <LastItemPanel cart={cart} products={products} lastAddedId={lastAddedId} />
      </div>

      <ProductGrid
        products={displayed}
        totalProducts={products.length}
        searchQuery={trimmedQuery}
        filtered={activeKey !== "all"}
        loadingProducts={loadingProducts}
        cart={cart}
        canAddProductUnits={canAddProductUnits}
        onAddProduct={onAddProduct}
      />
    </section>
  );
}
