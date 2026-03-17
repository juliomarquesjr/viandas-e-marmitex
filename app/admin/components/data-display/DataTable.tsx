"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";

/**
 * DataTable - Design System
 * 
 * Tabela moderna com sorting, paginação e seleção.
 * Inspirado em HubSpot/Salesforce.
 */

// =============================================================================
// TIPOS
// =============================================================================

export interface Column<T> {
  /** Chave do dado */
  key: string;
  /** Label do cabeçalho */
  header: string;
  /** Largura da coluna */
  width?: string | number;
  /** Alinhamento */
  align?: "left" | "center" | "right";
  /** Se é ordenável */
  sortable?: boolean;
  /** Render customizado */
  render?: (value: any, row: T, index: number) => React.ReactNode;
  /** Classe customizada */
  className?: string;
}

export interface DataTableProps<T> {
  /** Dados da tabela */
  data: T[];
  /** Colunas */
  columns: Column<T>[];
  /** Chave única de cada linha */
  rowKey: keyof T | ((row: T) => string);
  /** Estado de loading */
  loading?: boolean;
  /** Mensagem quando vazio */
  emptyMessage?: string;
  /** Componente de estado vazio */
  emptyComponent?: React.ReactNode;
  /** Linhas selecionadas */
  selectedRows?: Set<string>;
  /** Callback de seleção */
  onSelectionChange?: (selectedRows: Set<string>) => void;
  /** Ordenação atual */
  sortConfig?: { key: string; direction: "asc" | "desc" };
  /** Callback de ordenação */
  onSort?: (key: string, direction: "asc" | "desc") => void;
  /** Paginação */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  };
  /** Ações por linha */
  rowActions?: (row: T) => React.ReactNode;
  /** Classe do container */
  className?: string;
  /** Classe da tabela */
  tableClassName?: string;
  /** Callback ao clicar na linha */
  onRowClick?: (row: T) => void;
  /** Linha destacada */
  highlightedRows?: Set<string>;
}

// =============================================================================
// COMPONENTES AUXILIARES
// =============================================================================

/** Checkbox estilizado */
function Checkbox({
  checked,
  onChange,
  indeterminate,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  indeterminate?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "h-4 w-4 shrink-0 rounded border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        checked || indeterminate
          ? "bg-primary border-primary text-white"
          : "border-slate-300 hover:border-slate-400"
      )}
    >
      {indeterminate ? (
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 10h14v1H3v-1z" clipRule="evenodd" />
        </svg>
      ) : checked ? (
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : null}
    </button>
  );
}

/** Ícone de ordenação */
function SortIcon({ direction }: { direction?: "asc" | "desc" | null }) {
  if (!direction) return <ArrowUpDown className="h-4 w-4 text-slate-400" />;
  if (direction === "asc") return <ArrowUp className="h-4 w-4 text-primary" />;
  return <ArrowDown className="h-4 w-4 text-primary" />;
}

/** Skeleton para loading */
function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b border-slate-100">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex} className="px-4 py-3">
              <div className="h-4 bg-slate-100 rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  rowKey,
  loading = false,
  emptyMessage = "Nenhum registro encontrado",
  emptyComponent,
  selectedRows,
  onSelectionChange,
  sortConfig,
  onSort,
  pagination,
  rowActions,
  className,
  tableClassName,
  onRowClick,
  highlightedRows,
}: DataTableProps<T>) {
  // Estado local para seleção
  const [internalSelectedRows, setInternalSelectedRows] = React.useState<Set<string>>(new Set());
  const selected = selectedRows ?? internalSelectedRows;

  // Obter chave da linha
  const getRowKey = React.useCallback(
    (row: T): string => {
      if (typeof rowKey === "function") return rowKey(row);
      return String(row[rowKey]);
    },
    [rowKey]
  );

  // Handlers de seleção
  const handleSelectAll = React.useCallback(() => {
    if (selected.size === data.length) {
      onSelectionChange?.(new Set());
      setInternalSelectedRows(new Set());
    } else {
      const allKeys = new Set(data.map(getRowKey));
      onSelectionChange?.(allKeys);
      setInternalSelectedRows(allKeys);
    }
  }, [data, selected, getRowKey, onSelectionChange]);

  const handleSelectRow = React.useCallback(
    (key: string) => {
      const newSelected = new Set(selected);
      if (newSelected.has(key)) {
        newSelected.delete(key);
      } else {
        newSelected.add(key);
      }
      onSelectionChange?.(newSelected);
      setInternalSelectedRows(newSelected);
    },
    [selected, onSelectionChange]
  );

  // Handler de ordenação
  const handleSort = React.useCallback(
    (key: string) => {
      if (!onSort) return;
      const direction = sortConfig?.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
      onSort(key, direction);
    },
    [sortConfig, onSort]
  );

  // Verificar se tem seleção
  const hasSelection = onSelectionChange !== undefined || selectedRows !== undefined;
  const allSelected = data.length > 0 && selected.size === data.length;
  const someSelected = selected.size > 0 && selected.size < data.length;

  // Calcular paginação
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;
  const startItem = pagination ? (pagination.page - 1) * pagination.pageSize + 1 : 1;
  const endItem = pagination ? Math.min(pagination.page * pagination.pageSize, pagination.total) : data.length;

  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden", className)}>
      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className={cn("w-full text-sm", tableClassName)}>
          {/* Header */}
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {/* Checkbox de seleção */}
              {hasSelection && (
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={allSelected}
                    onChange={handleSelectAll}
                    indeterminate={someSelected}
                  />
                </th>
              )}

              {/* Colunas */}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider",
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right",
                    column.sortable && "cursor-pointer select-none hover:bg-slate-100 transition-colors",
                    column.className
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {column.sortable && (
                      <SortIcon
                        direction={
                          sortConfig?.key === column.key ? sortConfig.direction : null
                        }
                      />
                    )}
                  </div>
                </th>
              ))}

              {/* Ações */}
              {rowActions && (
                <th className="w-12 px-4 py-3">
                  <span className="sr-only">Ações</span>
                </th>
              )}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <TableSkeleton columns={columns.length + (hasSelection ? 1 : 0) + (rowActions ? 1 : 0)} />
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (hasSelection ? 1 : 0) + (rowActions ? 1 : 0)}
                  className="px-4 py-12 text-center"
                >
                  {emptyComponent || (
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <svg
                        className="h-12 w-12 text-slate-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                      <p>{emptyMessage}</p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const key = getRowKey(row);
                const isSelected = selected.has(key);
                const isHighlighted = highlightedRows?.has(key);

                return (
                  <tr
                    key={key}
                    className={cn(
                      "transition-colors",
                      isSelected && "bg-primary/5",
                      isHighlighted && "bg-amber-50",
                      onRowClick && "cursor-pointer hover:bg-slate-50",
                      !isSelected && !isHighlighted && "hover:bg-slate-50"
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {/* Checkbox */}
                    {hasSelection && (
                      <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelectRow(key)}
                        />
                      </td>
                    )}

                    {/* Células */}
                    {columns.map((column) => {
                      const value = row[column.key];
                      return (
                        <td
                          key={column.key}
                          className={cn(
                            "px-4 py-3 text-slate-700",
                            column.align === "center" && "text-center",
                            column.align === "right" && "text-right",
                            column.className
                          )}
                        >
                          {column.render ? column.render(value, row, index) : value}
                        </td>
                      );
                    })}

                    {/* Ações */}
                    {rowActions && (
                      <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {rowActions(row)}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {pagination && pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-slate-200 bg-slate-50">
          {/* Info */}
          <div className="text-sm text-slate-500">
            Mostrando <span className="font-medium">{startItem}</span> a{" "}
            <span className="font-medium">{endItem}</span> de{" "}
            <span className="font-medium">{pagination.total}</span> registros
          </div>

          {/* Controles */}
          <div className="flex items-center gap-2">
            {/* Tamanho da página */}
            {pagination.onPageSizeChange && (
              <select
                value={pagination.pageSize}
                onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            )}

            {/* Navegação */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => pagination.onPageChange(1)}
                disabled={pagination.page === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Números de página */}
              <div className="flex items-center gap-1 px-2">
                <span className="text-sm font-medium">{pagination.page}</span>
                <span className="text-slate-400">/</span>
                <span className="text-sm text-slate-500">{totalPages}</span>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => pagination.onPageChange(totalPages)}
                disabled={pagination.page === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
