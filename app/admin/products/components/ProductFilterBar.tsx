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
} from "lucide-react";
import { Label } from "@/app/components/ui/label";

// =============================================================================
// TIPOS
// =============================================================================

interface ProductFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter: "all" | "active" | "inactive";
  onStatusChange: (value: "all" | "active" | "inactive") => void;
  typeFilter: "all" | "sellable" | "addon";
  onTypeChange: (value: "all" | "sellable" | "addon") => void;
  viewMode: "table" | "grid";
  onViewModeChange: (mode: "table" | "grid") => void;
  totalCount?: number;
  filteredCount?: number;
}

// =============================================================================
// LABELS
// =============================================================================

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
};

const TYPE_LABELS: Record<string, string> = {
  sellable: "Venda",
  addon: "Adicional",
};

// =============================================================================
// COMPONENTE
// =============================================================================

export function ProductFilterBar({
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  viewMode,
  onViewModeChange,
  totalCount,
  filteredCount,
}: ProductFilterBarProps) {
  const hasStatusFilter = statusFilter !== "all";
  const hasTypeFilter = typeFilter !== "all";
  const hasAnyFilter = hasStatusFilter || hasTypeFilter;
  const activeFilterCount = (hasStatusFilter ? 1 : 0) + (hasTypeFilter ? 1 : 0);

  // Contagem a exibir: filtrada quando há filtros, total caso contrário
  const displayCount = hasAnyFilter ? filteredCount : totalCount;

  // Animação da linha de chips com max-h transition
  const [chipsVisible, setChipsVisible] = React.useState(hasAnyFilter);
  React.useEffect(() => {
    setChipsVisible(hasAnyFilter);
  }, [hasAnyFilter]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">

      {/* ── Header informativo ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          {/* Ícone com fundo azul */}
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-slate-700">Busca e filtros</span>
          {/* Badge de filtros ativos */}
          {hasAnyFilter && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full leading-none">
              {activeFilterCount} ativo{activeFilterCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Contador de produtos — sempre visível */}
        {totalCount !== undefined && (
          <div className="flex items-center gap-1.5">
            {hasAnyFilter ? (
              <>
                <span className="text-sm font-bold text-slate-800 tabular-nums">{filteredCount}</span>
                <span className="text-xs text-slate-400">de {totalCount} produtos</span>
              </>
            ) : (
              <>
                <span className="text-sm font-bold text-slate-800 tabular-nums">{displayCount}</span>
                <span className="text-xs text-slate-400">produtos</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Row de controles: Busca + Selects + Separador + Toggle ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5 p-3">

        {/* Campo de busca */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Buscar produto
          </Label>
          <Input
            placeholder="Buscar por nome ou código..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            rightIcon={
              searchValue ? (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label="Limpar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : undefined
            }
          />
        </div>

        {/* Filtro de Status — estilo modal de despesas */}
        <div className="space-y-1.5 shrink-0 w-full sm:w-[160px]">
          <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Status
          </Label>
          <div className="relative">
            <Select
              value={statusFilter}
              onValueChange={(v) => onStatusChange(v as "all" | "active" | "inactive")}
            >
              <SelectTrigger className="pl-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="z-[9999] bg-white border border-slate-200 shadow-lg" position="popper" side="bottom" align="start">
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
            <CircleDot className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Filtro de Tipo — estilo modal de despesas */}
        <div className="space-y-1.5 shrink-0 w-full sm:w-[160px]">
          <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Tipo
          </Label>
          <div className="relative">
            <Select
              value={typeFilter}
              onValueChange={(v) => onTypeChange(v as "all" | "sellable" | "addon")}
            >
              <SelectTrigger className="pl-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="z-[9999] bg-white border border-slate-200 shadow-lg" position="popper" side="bottom" align="start">
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="sellable">Venda</SelectItem>
                <SelectItem value="addon">Adicional</SelectItem>
              </SelectContent>
            </Select>
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Separador vertical (só desktop) */}
        <div className="hidden sm:block w-px h-10 bg-slate-200 shrink-0" />

        {/* Toggle de visualização */}
        <div
          className="flex items-center rounded-lg border border-slate-200 overflow-hidden shrink-0 self-center sm:self-auto"
          role="group"
          aria-label="Modo de visualização"
        >
          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={cn(
              "flex items-center justify-center h-10 w-10 transition-colors duration-150",
              viewMode === "table"
                ? "bg-primary text-white"
                : "bg-white text-slate-500 hover:bg-slate-50"
            )}
            title="Visualização em tabela"
            aria-label="Visualização em tabela"
            aria-pressed={viewMode === "table"}
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "flex items-center justify-center h-10 w-10 transition-colors duration-150",
              viewMode === "grid"
                ? "bg-primary text-white"
                : "bg-white text-slate-500 hover:bg-slate-50"
            )}
            title="Visualização em mosaico"
            aria-label="Visualização em mosaico"
            aria-pressed={viewMode === "grid"}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Chips de filtros ativos (animado) ── */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          chipsVisible ? "max-h-16 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3 pt-0 border-t border-slate-100">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Filtros:</span>
          {hasStatusFilter && (
            <Badge variant="info" size="sm" dot className="pl-2 pr-1 gap-1.5">
              {STATUS_LABELS[statusFilter]}
              <button
                type="button"
                onClick={() => onStatusChange("all")}
                className="rounded hover:bg-blue-200 transition-colors p-0.5 cursor-pointer"
                aria-label={`Remover filtro ${STATUS_LABELS[statusFilter]}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {hasTypeFilter && (
            <Badge variant="info" size="sm" dot className="pl-2 pr-1 gap-1.5">
              {TYPE_LABELS[typeFilter]}
              <button
                type="button"
                onClick={() => onTypeChange("all")}
                className="rounded hover:bg-blue-200 transition-colors p-0.5 cursor-pointer"
                aria-label={`Remover filtro ${TYPE_LABELS[typeFilter]}`}
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
