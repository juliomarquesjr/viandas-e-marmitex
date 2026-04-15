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
import { Label } from "@/app/components/ui/label";
import {
  Search,
  X,
  LayoutList,
  LayoutGrid,
  SlidersHorizontal,
  CircleDot,
} from "lucide-react";

interface CustomerFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter: "all" | "active" | "inactive";
  onStatusChange: (value: "all" | "active" | "inactive") => void;
  viewMode: "table" | "grid";
  onViewModeChange: (mode: "table" | "grid") => void;
  totalCount?: number;
  filteredCount?: number;
}

const STATUS_LABELS: Record<Exclude<CustomerFilterBarProps["statusFilter"], "all">, string> = {
  active: "Ativo",
  inactive: "Inativo",
};

export function CustomerFilterBar({
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusChange,
  viewMode,
  onViewModeChange,
  totalCount,
  filteredCount,
}: CustomerFilterBarProps) {
  const hasStatusFilter = statusFilter !== "all";
  const hasAnyFilter = hasStatusFilter;
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
              1 ativo
            </span>
          )}
        </div>

        {totalCount !== undefined && (
          <div className="flex items-center gap-1.5">
            {hasAnyFilter ? (
              <>
                <span className="text-sm font-bold tabular-nums text-[color:var(--foreground)]">{filteredCount}</span>
                <span className="text-xs text-[color:var(--muted-foreground)]">de {totalCount} clientes</span>
              </>
            ) : (
              <>
                <span className="text-sm font-bold tabular-nums text-[color:var(--foreground)]">{displayCount}</span>
                <span className="text-xs text-[color:var(--muted-foreground)]">clientes</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col items-stretch gap-2.5 p-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Buscar cliente
          </Label>
          <Input
            placeholder="Buscar por nome, telefone, email ou codigo..."
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
            <Select
              value={statusFilter}
              onValueChange={(value) => onStatusChange(value as "all" | "active" | "inactive")}
            >
              <SelectTrigger className="border-[color:var(--border)] bg-[color:var(--card)] pl-9 text-[color:var(--foreground)] hover:border-[color:var(--border-dark)]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent
                className="z-[9999] border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)] shadow-lg"
                position="popper"
                side="bottom"
                align="start"
              >
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
            <CircleDot className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
          </div>
        </div>

        <div className="hidden h-10 w-px shrink-0 bg-[color:var(--border)] sm:block" />

        <div
          className="flex items-center self-center overflow-hidden rounded-lg border border-[color:var(--border)] shrink-0 sm:self-auto"
          role="group"
          aria-label="Modo de visualizacao"
        >
          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={cn(
              "flex h-10 w-10 items-center justify-center transition-colors duration-150",
              viewMode === "table"
                ? "bg-primary text-white"
                : "bg-[color:var(--card)] text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
            )}
            title="Visualizacao em tabela"
            aria-label="Visualizacao em tabela"
            aria-pressed={viewMode === "table"}
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "flex h-10 w-10 items-center justify-center transition-colors duration-150",
              viewMode === "grid"
                ? "bg-primary text-white"
                : "bg-[color:var(--card)] text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
            )}
            title="Visualizacao em mosaico"
            aria-label="Visualizacao em mosaico"
            aria-pressed={viewMode === "grid"}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          chipsVisible ? "max-h-16 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="flex flex-wrap items-center gap-2 border-t border-[color:var(--border)] px-4 pb-3 pt-0">
          <span className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Filtros:
          </span>
          {hasStatusFilter && (
            <Badge variant="info" size="sm" dot className="gap-1.5 pl-2 pr-1">
              {STATUS_LABELS[statusFilter]}
              <button
                type="button"
                onClick={() => onStatusChange("all")}
                className="cursor-pointer rounded p-0.5 transition-colors hover:bg-blue-200"
                aria-label={`Remover filtro ${STATUS_LABELS[statusFilter]}`}
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
