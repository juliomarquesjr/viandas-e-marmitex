"use client";

import * as React from "react";
import { Card, CardContent } from "@/app/components/ui/card";
import { StatusBadge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  User,
  MoreVertical,
  Edit,
  Trash2,
  Barcode,
  Phone,
  Mail,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Customer } from "../page";

// =============================================================================
// MENU DE AÇÕES DO CARD
// =============================================================================

function CardActionsMenu({
  customer,
  onEdit,
  onDelete,
  onDownloadBarcode,
}: {
  customer: Customer;
  onEdit: () => void;
  onDelete: () => void;
  onDownloadBarcode: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="icon-sm"
        className="bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        aria-label="Ações"
      >
        <MoreVertical className="h-4 w-4" />
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-48 bg-white rounded-lg border border-slate-200 shadow-lg py-1">
          {customer.barcode && (
            <button
              className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onDownloadBarcode();
              }}
            >
              <Barcode className="h-4 w-4 mr-2 text-slate-400" />
              Etiqueta
            </button>
          )}
          <button
            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onEdit();
            }}
          >
            <Edit className="h-4 w-4 mr-2 text-slate-400" />
            Editar
          </button>
          <button
            className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remover
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CARD DE CLIENTE
// =============================================================================

function CustomerCard({
  customer,
  onEdit,
  onDelete,
  onDownloadBarcode,
  onCardClick,
}: {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
  onDownloadBarcode: (customer: Customer) => void;
  onCardClick?: (customer: Customer) => void;
}) {
  return (
    <Card
      variant="interactive"
      className="relative flex flex-col overflow-hidden group"
      onClick={() => onCardClick?.(customer)}
    >
      {/* Botão de ações */}
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <CardActionsMenu
          customer={customer}
          onEdit={() => onEdit(customer)}
          onDelete={() => onDelete(customer.id)}
          onDownloadBarcode={() => onDownloadBarcode(customer)}
        />
      </div>

      {/* Avatar */}
      <div className="w-full aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
        {customer.imageUrl ? (
          <img
            src={customer.imageUrl}
            alt={customer.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="h-12 w-12 text-slate-300" />
        )}
      </div>

      {/* Conteúdo */}
      <CardContent className="p-3 flex flex-col gap-1.5 flex-1">
        {/* Nome */}
        <p className="font-medium text-slate-900 text-sm leading-tight line-clamp-2">
          {customer.name}
        </p>

        {/* Telefone */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Phone className="h-3 w-3 shrink-0" />
          <span className="truncate">{customer.phone}</span>
        </div>

        {/* Email (opcional) */}
        {customer.email && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
        )}

        {/* Badge de status */}
        <div className="mt-auto pt-1">
          <StatusBadge status={customer.active ? "active" : "inactive"} size="sm" />
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// GRID VIEW PRINCIPAL
// =============================================================================

export interface CustomerGridViewProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
  onDownloadBarcode: (customer: Customer) => void;
  onCardClick?: (customer: Customer) => void;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
  emptyMessage?: string;
}

export function CustomerGridView({
  customers,
  onEdit,
  onDelete,
  onDownloadBarcode,
  onCardClick,
  pagination,
  emptyMessage = "Nenhum cliente encontrado",
}: CustomerGridViewProps) {
  const { page, pageSize, total, onPageChange, onPageSizeChange } = pagination;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  const pageSizeOptions = [10, 25, 50, 100];

  if (customers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-400 text-sm">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Grid de cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {customers.map((customer) => (
          <CustomerCard
            key={customer.id}
            customer={customer}
            onEdit={onEdit}
            onDelete={onDelete}
            onDownloadBarcode={onDownloadBarcode}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      {/* Paginação */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border border-slate-200 rounded-xl bg-slate-50">
        <div className="text-sm text-slate-500">
          Mostrando <span className="font-medium">{startItem}</span> a{" "}
          <span className="font-medium">{endItem}</span> de{" "}
          <span className="font-medium">{total}</span> registros
        </div>

        <div className="flex items-center gap-2">
          <select
            id="grid-page-size"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(1)}
              disabled={page === 1}
              aria-label="Primeira página"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 px-2">
              <span className="text-sm font-medium">{page}</span>
              <span className="text-slate-400">/</span>
              <span className="text-sm text-slate-500">{totalPages}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(totalPages)}
              disabled={page === totalPages}
              aria-label="Última página"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
