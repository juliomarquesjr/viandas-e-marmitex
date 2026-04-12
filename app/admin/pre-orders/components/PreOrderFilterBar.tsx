"use client";

import * as React from "react";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Search, SlidersHorizontal, Tag, X } from "lucide-react";

interface PreOrderFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedProductIds: string[];
  onSelectedProductIdsChange: (value: string[]) => void;
  productOptions: Array<{ id: string; name: string }>;
  totalCount?: number;
  filteredCount?: number;
}

export function PreOrderFilterBar({
  searchValue,
  onSearchChange,
  selectedProductIds,
  onSelectedProductIdsChange,
  productOptions,
  totalCount,
  filteredCount,
}: PreOrderFilterBarProps) {
  const hasSearchFilter = searchValue.trim().length > 0;
  const hasProductFilter = selectedProductIds.length > 0;
  const hasAnyFilter = hasSearchFilter || hasProductFilter;
  const activeFilterCount = (hasSearchFilter ? 1 : 0) + (hasProductFilter ? 1 : 0);
  const displayCount = hasAnyFilter ? filteredCount : totalCount;
  const [chipsVisible, setChipsVisible] = React.useState(hasAnyFilter);
  const selectedProductLabels = productOptions
    .filter((product) => selectedProductIds.includes(product.id))
    .map((product) => product.name);
  const selectedProductsSummary =
    selectedProductLabels.length === 0
      ? "Todos os produtos"
      : selectedProductLabels.length === 1
        ? selectedProductLabels[0]
        : `${selectedProductLabels.length} produtos selecionados`;

  React.useEffect(() => {
    setChipsVisible(hasAnyFilter);
  }, [hasAnyFilter]);

  const toggleProduct = React.useCallback(
    (productId: string) => {
      if (selectedProductIds.includes(productId)) {
        onSelectedProductIdsChange(selectedProductIds.filter((id) => id !== productId));
        return;
      }

      onSelectedProductIdsChange([...selectedProductIds, productId]);
    },
    [onSelectedProductIdsChange, selectedProductIds],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-card">
      <div className="flex items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-[color:var(--foreground)]">Busca e filtros</span>
          {hasAnyFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold leading-none text-primary">
              {activeFilterCount} ativo{activeFilterCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {totalCount !== undefined && (
          <div className="flex items-center gap-1.5">
            {hasAnyFilter ? (
              <>
                <span className="text-sm font-bold tabular-nums text-[color:var(--foreground)]">{filteredCount}</span>
                <span className="text-xs text-[color:var(--muted-foreground)]">de {totalCount} pré-pedidos</span>
              </>
            ) : (
              <>
                <span className="text-sm font-bold tabular-nums text-[color:var(--foreground)]">{displayCount}</span>
                <span className="text-xs text-[color:var(--muted-foreground)]">pré-pedidos</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col items-stretch gap-2.5 p-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Buscar pré-pedido
          </Label>
          <Input
            placeholder="Buscar por cliente, telefone ou produto..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)] placeholder:text-[color:var(--muted-foreground)] hover:border-[color:var(--border-dark)]"
            leftIcon={<Search className="h-4 w-4" />}
            rightIcon={
              searchValue ? (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="cursor-pointer text-[color:var(--muted-foreground)] transition-colors hover:text-[color:var(--foreground)]"
                  aria-label="Limpar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : undefined
            }
          />
        </div>

        <div className="w-full shrink-0 space-y-1.5 sm:w-[180px]">
          <Label className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Produto
          </Label>
          <div className="relative">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-[color:var(--border)] bg-[color:var(--card)] pl-9 pr-3 text-sm text-[color:var(--foreground)] transition-colors hover:border-[color:var(--border-dark)]"
                >
                  <span className="truncate text-left">{selectedProductsSummary}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[color:var(--muted-foreground)]" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[260px] p-2">
                <div className="mb-2 flex items-center justify-between px-2 py-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
                    Produtos
                  </span>
                  {hasProductFilter && (
                    <button
                      type="button"
                      onClick={() => onSelectedProductIdsChange([])}
                      className="text-xs font-medium text-primary transition-colors hover:opacity-80"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {productOptions.map((product) => {
                    const selected = selectedProductIds.includes(product.id);

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => toggleProduct(product.id)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-[color:var(--foreground)] transition-colors hover:bg-[color:var(--muted)]"
                      >
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            selected
                              ? "border-primary bg-primary text-white"
                              : "border-[color:var(--border)] bg-[color:var(--card)] text-transparent",
                          )}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                        <span className="truncate">{product.name}</span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
          </div>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          chipsVisible ? "max-h-16 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="flex flex-wrap items-center gap-2 border-t border-[color:var(--border)] px-4 pb-3 pt-0">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Filtros:
          </span>

          {hasSearchFilter && (
            <Badge variant="info" size="sm" dot className="gap-1.5 pl-2 pr-1">
              Busca: {searchValue}
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="cursor-pointer rounded p-0.5 transition-colors hover:bg-blue-200"
                aria-label="Remover filtro de busca"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {hasProductFilter && (
            <Badge variant="info" size="sm" dot className="gap-1.5 pl-2 pr-1">
              Produto: {selectedProductsSummary}
              <button
                type="button"
                onClick={() => onSelectedProductIdsChange([])}
                className="cursor-pointer rounded p-0.5 transition-colors hover:bg-blue-200"
                aria-label="Remover filtro de produto"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
