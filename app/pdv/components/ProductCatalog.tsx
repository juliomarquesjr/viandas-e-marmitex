"use client";

import { filterProducts } from "@/lib/pdv/productSearch";
import { Search, X } from "lucide-react";
import { useMemo, type RefObject } from "react";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { Input } from "../../components/ui/input";
import type { CartItem, Product } from "../types";
import { ProductGrid } from "./ProductGrid";

/**
 * Espera o campo ficar parado antes de filtrar a grade. Uma leitura de código
 * de barras preenche e limpa o campo em milissegundos — sem esse intervalo a
 * grade re-renderizaria a cada dígito da leitura, sem nunca ser útil.
 */
const SEARCH_DEBOUNCE_MS = 1500;

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
  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, SEARCH_DEBOUNCE_MS);

  // Campo vazio volta na hora: depois de uma leitura o campo é limpo e a grade
  // não pode ficar presa no filtro do produto que acabou de sair dela.
  const appliedQuery = trimmedQuery === "" ? "" : debouncedQuery;

  const visibleProducts = useMemo(
    () => filterProducts(products, appliedQuery),
    [products, appliedQuery]
  );

  // Enter com um único resultado adiciona direto — evita ter que clicar no card.
  // A busca por nome permanece no campo (só código de barras limpa), então dá
  // para repetir o Enter para somar unidades do mesmo item.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" && trimmedQuery) {
      e.preventDefault();
      setQuery("");
      return;
    }
    if (e.key !== "Enter" || !trimmedQuery) return;
    e.preventDefault();
    // Contra o texto atual, não contra o filtro atrasado: quem aperta Enter
    // não deve esperar o debounce para o item entrar.
    const matches = filterProducts(products, trimmedQuery);
    const [only] = matches;
    if (matches.length !== 1 || !canAddProductUnits(only, cart, 1)) return;
    onAddProduct(only);
  };

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
            onKeyDown={handleKeyDown}
            placeholder="Código de barras ou nome do produto"
            className="pl-9 pr-9 h-11 bg-white shadow-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 ml-1">
          {appliedQuery ? (
            <>
              {visibleProducts.length}{" "}
              {visibleProducts.length === 1
                ? "produto encontrado"
                : "produtos encontrados"}{" "}
              — <kbd className="px-1 py-0.5 text-[10px] rounded border border-slate-200 bg-slate-100">
                Esc
              </kbd>{" "}
              limpa a busca
            </>
          ) : (
            <>
              Leitora de código de barras ou busca manual — pressione{" "}
              <kbd className="px-1 py-0.5 text-[10px] rounded border border-slate-200 bg-slate-100">
                Ctrl+K
              </kbd>{" "}
              para focar
            </>
          )}
        </p>
      </div>

      {/* Grade de produtos com scroll próprio */}
      <ProductGrid
        products={visibleProducts}
        totalProducts={products.length}
        searchQuery={appliedQuery}
        loadingProducts={loadingProducts}
        cart={cart}
        canAddProductUnits={canAddProductUnits}
        onAddProduct={onAddProduct}
      />
    </section>
  );
}
