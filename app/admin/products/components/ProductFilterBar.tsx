"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Search,
  X,
  LayoutList,
  LayoutGrid,
  SlidersHorizontal,
  CircleDot,
  Tag,
  Shapes,
} from "lucide-react";
import { Label } from "@/app/components/ui/label";
import type { Category } from "../page";
import { DynamicCategoryIcon } from "./CategoryIconPicker";

interface ProductFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter: "all" | "active" | "inactive";
  onStatusChange: (value: "all" | "active" | "inactive") => void;
  typeFilter: "all" | "sellable" | "addon";
  onTypeChange: (value: "all" | "sellable" | "addon") => void;
  categories: Category[];
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  viewMode: "table" | "grid";
  onViewModeChange: (mode: "table" | "grid") => void;
  totalCount?: number;
  filteredCount?: number;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
};

const TYPE_LABELS: Record<string, string> = {
  sellable: "Venda",
  addon: "Adicional",
};

export function ProductFilterBar({
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  categories,
  categoryFilter,
  onCategoryChange,
  viewMode,
  onViewModeChange,
  totalCount,
  filteredCount,
}: ProductFilterBarProps) {
  const hasStatusFilter = statusFilter !== "all";
  const hasTypeFilter = typeFilter !== "all";
  const hasCategoryFilter = categoryFilter !== "all";
  const hasAnyFilter = hasStatusFilter || hasTypeFilter || hasCategoryFilter;
  const activeFilterCount =
    (hasStatusFilter ? 1 : 0) + (hasTypeFilter ? 1 : 0) + (hasCategoryFilter ? 1 : 0);

  const activeCategoryLabel =
    categoryFilter === "none"
      ? "Sem categoria"
      : categories.find((c) => c.id === categoryFilter)?.name ?? categoryFilter;
  const activeCategoryIcon =
    categoryFilter !== "none" ? categories.find((c) => c.id === categoryFilter)?.icon : undefined;
  const displayCount = hasAnyFilter ? filteredCount : totalCount;

  const [chipsVisible, setChipsVisible] = React.useState(hasAnyFilter);
  React.useEffect(() => {
    setChipsVisible(hasAnyFilter);
  }, [hasAnyFilter]);

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
                <span className="text-xs text-[color:var(--muted-foreground)]">de {totalCount} produtos</span>
              </>
            ) : (
              <>
                <span className="text-sm font-bold tabular-nums text-[color:var(--foreground)]">{displayCount}</span>
                <span className="text-xs text-[color:var(--muted-foreground)]">produtos</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col items-stretch gap-2.5 p-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Buscar produto
          </Label>
          <Input
            placeholder="Buscar por nome ou código..."
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

        <div className="w-full shrink-0 space-y-1.5 sm:w-[160px]">
          <Label className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Status
          </Label>
          <div className="relative">
            <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as "all" | "active" | "inactive")}>
              <SelectTrigger className="border-[color:var(--border)] bg-[color:var(--card)] pl-9 text-[color:var(--foreground)] hover:border-[color:var(--border-dark)]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="z-[9999] border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)] shadow-lg" position="popper" side="bottom" align="start">
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
            <CircleDot className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
          </div>
        </div>

        <div className="w-full shrink-0 space-y-1.5 sm:w-[160px]">
          <Label className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Tipo
          </Label>
          <div className="relative">
            <Select value={typeFilter} onValueChange={(v) => onTypeChange(v as "all" | "sellable" | "addon")}>
              <SelectTrigger className="border-[color:var(--border)] bg-[color:var(--card)] pl-9 text-[color:var(--foreground)] hover:border-[color:var(--border-dark)]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="z-[9999] border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)] shadow-lg" position="popper" side="bottom" align="start">
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="sellable">Venda</SelectItem>
                <SelectItem value="addon">Adicional</SelectItem>
              </SelectContent>
            </Select>
            <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
          </div>
        </div>

        {categories.length > 0 && (
          <div className="w-full shrink-0 space-y-1.5 sm:w-[180px]">
            <Label className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
              Categoria
            </Label>
            <div className="relative">
              <Select value={categoryFilter} onValueChange={onCategoryChange}>
                <SelectTrigger className="border-[color:var(--border)] bg-[color:var(--card)] pl-9 text-[color:var(--foreground)] hover:border-[color:var(--border-dark)]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="z-[9999] border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)] shadow-lg" position="popper" side="bottom" align="start">
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        {cat.icon ? (
                          <DynamicCategoryIcon name={cat.icon} className="h-3.5 w-3.5 shrink-0 text-[color:var(--muted-foreground)]" />
                        ) : (
                          <Tag className="h-3.5 w-3.5 shrink-0 text-[color:var(--muted-foreground)]" />
                        )}
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Shapes className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
            </div>
          </div>
        )}

        <div className="hidden h-10 w-px shrink-0 bg-[color:var(--border)] sm:block" />

        <div
          className="flex shrink-0 self-center overflow-hidden rounded-lg border border-[color:var(--border)] sm:self-auto"
          role="group"
          aria-label="Modo de visualização"
        >
          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={cn(
              "flex h-10 items-center gap-2 px-3 text-sm font-medium transition-colors",
              viewMode === "table"
                ? "bg-primary text-white"
                : "bg-[color:var(--card)] text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]",
            )}
            aria-pressed={viewMode === "table"}
          >
            <LayoutList className="h-4 w-4" />
            Tabela
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "flex h-10 items-center gap-2 border-l border-[color:var(--border)] px-3 text-sm font-medium transition-colors",
              viewMode === "grid"
                ? "bg-primary text-white"
                : "bg-[color:var(--card)] text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]",
            )}
            aria-pressed={viewMode === "grid"}
          >
            <LayoutGrid className="h-4 w-4" />
            Grade
          </button>
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

          {hasStatusFilter && (
            <Badge variant="info" size="sm" dot className="gap-1.5 pl-2 pr-1">
              Status: {STATUS_LABELS[statusFilter]}
              <button
                type="button"
                onClick={() => onStatusChange("all")}
                className="cursor-pointer rounded p-0.5 transition-colors hover:bg-blue-200"
                aria-label="Remover filtro de status"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {hasTypeFilter && (
            <Badge variant="info" size="sm" dot className="gap-1.5 pl-2 pr-1">
              Tipo: {TYPE_LABELS[typeFilter]}
              <button
                type="button"
                onClick={() => onTypeChange("all")}
                className="cursor-pointer rounded p-0.5 transition-colors hover:bg-blue-200"
                aria-label="Remover filtro de tipo"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {hasCategoryFilter && (
            <Badge
              variant="info"
              size="sm"
              dot
              className="gap-1.5 pl-2 pr-1"
              icon={
                activeCategoryIcon ? (
                  <DynamicCategoryIcon name={activeCategoryIcon} className="h-3.5 w-3.5 shrink-0" />
                ) : undefined
              }
            >
              Categoria: {activeCategoryLabel}
              <button
                type="button"
                onClick={() => onCategoryChange("all")}
                className="cursor-pointer rounded p-0.5 transition-colors hover:bg-blue-200"
                aria-label="Remover filtro de categoria"
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
