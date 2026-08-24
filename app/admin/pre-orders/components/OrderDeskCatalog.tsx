"use client";

import { EmptyState } from "@/app/admin/components/data-display/EmptyState";
import { Input } from "@/app/components/ui/input";
import { cn } from "@/lib/utils";
import { formatWeightKg, isWeightBasedProduct } from "@/lib/weight";
import { Check, Package, Plus, Scale, Search, X } from "lucide-react";
import { useMemo } from "react";
import { formatCurrency } from "../lib/preOrderView";
import {
  kgInDraft,
  matchesQuery,
  readStock,
  unitsInDraft,
  type CatalogProduct,
  type DraftItem,
} from "../lib/orderDraft";

/** A categoria "todos" não existe no banco: é o estado inicial do trilho. */
export const ALL_CATEGORIES = "__all__";

type OrderDeskCatalogProps = {
  products: CatalogProduct[];
  items: DraftItem[];
  query: string;
  onQueryChange: (query: string) => void;
  categoryId: string;
  onCategoryChange: (categoryId: string) => void;
  onAdd: (product: CatalogProduct) => void;
  disabled?: boolean;
};

export function OrderDeskCatalog({
  products,
  items,
  query,
  onQueryChange,
  categoryId,
  onCategoryChange,
  onAdd,
  disabled,
}: OrderDeskCatalogProps) {
  /**
   * As categorias saem dos próprios produtos carregados. Buscar
   * `/api/categories` traria também as vazias, e um trilho com "Sobremesas · 0"
   * é uma gaveta que não abre.
   */
  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const product of products) {
      const category = product.category;
      const id = category?.id ?? "__none__";
      const name = category?.name ?? "Sem categoria";
      const current = map.get(id) ?? { id, name, count: 0 };
      current.count += 1;
      map.set(id, current);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
    );
  }, [products]);

  const visible = useMemo(() => {
    return products
      .filter((product) => {
        if (categoryId !== ALL_CATEGORIES) {
          const id = product.category?.id ?? "__none__";
          if (id !== categoryId) return false;
        }
        return matchesQuery(product, query);
      })
      // Ordem alfabética: quem procura no cardápio procura pelo nome, e a
      // posição do produto na grade não pode mudar conforme a categoria.
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [products, categoryId, query]);

  return (
    <div className="flex min-h-0 flex-col bg-[color:var(--background)]">
      <div className="flex flex-col gap-2.5 border-b border-[color:var(--border)] bg-[color:var(--card)] px-3.5 py-3">
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar no cardápio — nome, categoria ou código"
          aria-label="Buscar produto"
          disabled={disabled}
          leftIcon={<Search className="h-4 w-4" />}
          rightIcon={
            query ? (
              <button type="button" onClick={() => onQueryChange("")} aria-label="Limpar busca">
                <X className="h-4 w-4" />
              </button>
            ) : undefined
          }
        />

        <div
          role="group"
          aria-label="Categorias"
          className="scroll-slim flex gap-px overflow-x-auto rounded-lg border border-[color:var(--border)] bg-[color:var(--border)]"
        >
          <CategoryTab
            label="Todos"
            count={products.length}
            active={categoryId === ALL_CATEGORIES}
            onClick={() => onCategoryChange(ALL_CATEGORIES)}
          />
          {categories.map((category) => (
            <CategoryTab
              key={category.id}
              label={category.name}
              count={category.count}
              active={categoryId === category.id}
              onClick={() => onCategoryChange(category.id)}
            />
          ))}
        </div>
      </div>

      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
        {visible.length === 0 ? (
          <div className="flex justify-center pt-10">
            <EmptyState
              size="sm"
              variant="search"
              title="Nada no cardápio para isso"
              description={
                query
                  ? `Nenhum produto para "${query}" nesta categoria.`
                  : "Esta categoria não tem produtos ativos."
              }
              action={
                query || categoryId !== ALL_CATEGORIES
                  ? {
                      label: "Limpar filtros",
                      onClick: () => {
                        onQueryChange("");
                        onCategoryChange(ALL_CATEGORIES);
                      },
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {visible.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                items={items}
                onAdd={() => onAdd(product)}
                disabled={disabled}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-w-[70px] flex-1 bg-[color:var(--card)] px-2 py-2 text-center transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--ring)]",
        active
          ? "bg-[color:var(--primary-lighter)] shadow-[inset_0_-2px_0_var(--primary)]"
          : "hover:bg-[color:var(--muted)]"
      )}
    >
      <span className="block text-[15px] font-bold leading-none tabular-nums">{count}</span>
      <span className="mt-1 block truncate text-[9.5px] font-semibold uppercase tracking-[0.07em] text-[color:var(--muted-foreground)]">
        {label}
      </span>
    </button>
  );
}

function ProductCard({
  product,
  items,
  onAdd,
  disabled,
}: {
  product: CatalogProduct;
  items: DraftItem[];
  onAdd: () => void;
  disabled?: boolean;
}) {
  const byWeight = isWeightBasedProduct(product);
  const stock = readStock(product, items);
  const units = unitsInDraft(items, product.id);
  const kg = kgInDraft(items, product.id);
  const inDraft = units > 0;

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      title={byWeight ? `Lançar ${product.name} e informar o peso` : `Adicionar ${product.name}`}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        inDraft
          ? "border-primary bg-[color:var(--primary-lighter)]"
          : "border-[color:var(--border)] bg-[color:var(--card)] hover:border-primary hover:bg-[color:var(--primary-lighter)]",
        stock.out && !inDraft && "opacity-60"
      )}
    >
      <span className="h-9 w-9 flex-none overflow-hidden rounded-lg bg-[color:var(--muted)] ring-1 ring-[color:var(--border)]">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(event) => {
              (event.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <Package className="h-4 w-4 text-[color:var(--muted-foreground)]" />
          </span>
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium leading-tight">{product.name}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[13px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {byWeight
              ? `${formatCurrency(Number(product.pricePerKgCents))}/kg`
              : formatCurrency(product.priceCents)}
          </span>
          {byWeight && (
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-[color:var(--state-pronto-fg)] [background:var(--state-pronto-bg)]">
              <Scale className="h-3 w-3" />
              kg
            </span>
          )}
          {stock.controlled && <StockLine stock={stock} />}
        </span>
      </span>

      <span className="flex flex-none flex-col items-center gap-0.5">
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-lg",
            inDraft ? "bg-[color:var(--primary-light)] text-primary" : "bg-primary text-white"
          )}
        >
          {byWeight ? (
            <Scale className="h-3.5 w-3.5" />
          ) : inDraft ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </span>
        {inDraft && (
          <span className="text-[10px] font-bold tabular-nums text-primary">
            {byWeight ? `${formatWeightKg(kg)} kg` : `×${units}`}
          </span>
        )}
      </span>
    </button>
  );
}

function StockLine({ stock }: { stock: ReturnType<typeof readStock> }) {
  const { tone, dot, text } = describeStock(stock);
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10.5px] font-semibold", tone)}>
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 flex-none rounded-full", dot)} />
      <span className="tabular-nums">{text}</span>
    </span>
  );
}

function describeStock(stock: ReturnType<typeof readStock>) {
  if (stock.unknown) {
    return { tone: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500", text: "Estoque não informado" };
  }
  if (stock.out) {
    return { tone: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500", text: "Sem estoque" };
  }
  if (stock.exceeds) {
    return {
      tone: "text-amber-700 dark:text-amber-400",
      dot: "bg-amber-500",
      text: `${stock.units} pedidas · ${stock.stock} em estoque`,
    };
  }
  if (stock.low) {
    return {
      tone: "text-amber-700 dark:text-amber-400",
      dot: "bg-amber-500",
      text: `Últimas ${stock.stock} un.`,
    };
  }
  return {
    tone: "text-[color:var(--muted-foreground)]",
    dot: "bg-emerald-500",
    text: `Estoque ${stock.stock}`,
  };
}
