"use client";

import * as React from "react";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { cn } from "@/lib/utils";
import { Calendar, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";

interface OrderFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  dateRange: {
    start: string;
    end: string;
  };
  onDateRangeChange: (range: { start: string; end: string }) => void;
  onResetDateRange: () => void;
  totalCount?: number;
  filteredCount?: number;
}

const getTodayDateValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (date: string) => {
  if (!date) return "";
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR");
};

export function OrderFilterBar({
  searchValue,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  onResetDateRange,
  totalCount,
  filteredCount,
}: OrderFilterBarProps) {
  const today = React.useMemo(() => getTodayDateValue(), []);
  const hasSearchFilter = searchValue.trim().length > 0;
  const hasCustomDateFilter = dateRange.start !== today || dateRange.end !== today;
  const hasAnyFilter = hasSearchFilter || hasCustomDateFilter;
  const activeFilterCount = (hasSearchFilter ? 1 : 0) + (hasCustomDateFilter ? 1 : 0);
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
                <span className="text-xs text-[color:var(--muted-foreground)]">de {totalCount} vendas</span>
              </>
            ) : (
              <>
                <span className="text-sm font-bold tabular-nums text-[color:var(--foreground)]">{displayCount}</span>
                <span className="text-xs text-[color:var(--muted-foreground)]">vendas</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col items-stretch gap-2.5 p-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Buscar venda
          </Label>
          <Input
            placeholder="Buscar por cliente, telefone, pagamento ou ID..."
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

        <div className="w-full shrink-0 space-y-1.5 lg:w-[180px]">
          <Label className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Data inicial
          </Label>
          <div className="relative">
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) => onDateRangeChange({ start: e.target.value, end: dateRange.end })}
              className="border-[color:var(--border)] bg-[color:var(--card)] pl-9 text-[color:var(--foreground)] hover:border-[color:var(--border-dark)] [color-scheme:light] data-[admin-theme=dark]:[color-scheme:dark]"
            />
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
          </div>
        </div>

        <div className="w-full shrink-0 space-y-1.5 lg:w-[180px]">
          <Label className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted-foreground)]">
            Data final
          </Label>
          <div className="relative">
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) => onDateRangeChange({ start: dateRange.start, end: e.target.value })}
              className="border-[color:var(--border)] bg-[color:var(--card)] pl-9 text-[color:var(--foreground)] hover:border-[color:var(--border-dark)] [color-scheme:light] data-[admin-theme=dark]:[color-scheme:dark]"
            />
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
          </div>
        </div>

        <div className="hidden h-10 w-px shrink-0 bg-[color:var(--border)] lg:block" />

        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-10 shrink-0 border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)] hover:bg-[color:var(--muted)]",
            !hasAnyFilter && "text-[color:var(--muted-foreground)]",
          )}
          onClick={() => {
            onSearchChange("");
            onResetDateRange();
          }}
          disabled={!hasAnyFilter}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Limpar
        </Button>
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
          {hasCustomDateFilter && (
            <Badge variant="info" size="sm" dot className="gap-1.5 pl-2 pr-1">
              Período: {formatDateLabel(dateRange.start)} - {formatDateLabel(dateRange.end)}
              <button
                type="button"
                onClick={onResetDateRange}
                className="cursor-pointer rounded p-0.5 transition-colors hover:bg-blue-200"
                aria-label="Remover filtro de período"
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
