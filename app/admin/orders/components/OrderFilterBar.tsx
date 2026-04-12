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
    <div className="rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 dark:from-slate-800 dark:to-slate-900 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 dark:bg-primary/15">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-100">Busca e filtros</span>
          {hasAnyFilter && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full leading-none">
              {activeFilterCount} ativo{activeFilterCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {totalCount !== undefined && (
          <div className="flex items-center gap-1.5">
            {hasAnyFilter ? (
              <>
                <span className="text-sm font-bold text-slate-800 tabular-nums dark:text-slate-100">{filteredCount}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">de {totalCount} vendas</span>
              </>
            ) : (
              <>
                <span className="text-sm font-bold text-slate-800 tabular-nums dark:text-slate-100">{displayCount}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">vendas</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-2.5 p-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide dark:text-slate-400">
            Buscar venda
          </Label>
          <Input
            placeholder="Buscar por cliente, telefone, pagamento ou ID..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600"
            leftIcon={<Search className="h-4 w-4" />}
            rightIcon={
              searchValue ? (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer dark:text-slate-500 dark:hover:text-slate-300"
                  aria-label="Limpar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : undefined
            }
          />
        </div>

        <div className="space-y-1.5 shrink-0 w-full lg:w-[180px]">
          <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide dark:text-slate-400">
            Data inicial
          </Label>
          <div className="relative">
            <Input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                onDateRangeChange({
                  start: e.target.value,
                  end: dateRange.end,
                })
              }
              className="pl-9 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 [color-scheme:light] dark:[color-scheme:dark]"
            />
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none dark:text-slate-500" />
          </div>
        </div>

        <div className="space-y-1.5 shrink-0 w-full lg:w-[180px]">
          <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide dark:text-slate-400">
            Data final
          </Label>
          <div className="relative">
            <Input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                onDateRangeChange({
                  start: dateRange.start,
                  end: e.target.value,
                })
              }
              className="pl-9 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 [color-scheme:light] dark:[color-scheme:dark]"
            />
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none dark:text-slate-500" />
          </div>
        </div>

        <div className="hidden lg:block w-px h-10 bg-slate-200 shrink-0 dark:bg-slate-700" />

        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-10 shrink-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
            !hasAnyFilter && "text-slate-400 dark:text-slate-500"
          )}
          onClick={() => {
            onSearchChange("");
            onResetDateRange();
          }}
          disabled={!hasAnyFilter}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Limpar
        </Button>
      </div>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          chipsVisible ? "max-h-16 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3 pt-0 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide dark:text-slate-500">Filtros:</span>

          {hasSearchFilter && (
            <Badge variant="info" size="sm" dot className="pl-2 pr-1 gap-1.5">
              Busca: {searchValue}
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="rounded hover:bg-blue-200 transition-colors p-0.5 cursor-pointer"
                aria-label="Remover filtro de busca"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {hasCustomDateFilter && (
            <Badge variant="info" size="sm" dot className="pl-2 pr-1 gap-1.5">
              Período: {formatDateLabel(dateRange.start)} - {formatDateLabel(dateRange.end)}
              <button
                type="button"
                onClick={onResetDateRange}
                className="rounded hover:bg-blue-200 transition-colors p-0.5 cursor-pointer"
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
