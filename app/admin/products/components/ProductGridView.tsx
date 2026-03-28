"use client";

import * as React from "react";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge, StatusBadge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import {
  Package,
  MoreVertical,
  Edit,
  Trash2,
  Barcode,
  Tag,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Product, Category } from "../page";
import { DynamicCategoryIcon } from "./CategoryIconPicker";

// =============================================================================
// MENU DE AÇÕES DO CARD
// =============================================================================

function CardActionsMenu({
  product,
  onEdit,
  onDelete,
  onDownloadBarcode,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  onDownloadBarcode: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white"
          aria-label="Ações"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={4}
        collisionPadding={12}
        className="w-max max-w-[min(100vw-1.5rem,20rem)] p-1 bg-white text-slate-700 border-slate-200 shadow-lg"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {product.barcode && (
          <button
            type="button"
            className="flex items-center w-full whitespace-nowrap px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-sm"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onDownloadBarcode();
            }}
          >
            <Barcode className="h-4 w-4 mr-2 shrink-0 text-slate-400" />
            Etiqueta
          </button>
        )}
        <button
          type="button"
          className="flex items-center w-full whitespace-nowrap px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-sm"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
            onEdit();
          }}
        >
          <Edit className="h-4 w-4 mr-2 shrink-0 text-slate-400" />
          Editar
        </button>
        <button
          type="button"
          className="flex items-center w-full whitespace-nowrap px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-sm"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4 mr-2 shrink-0" />
          Remover
        </button>
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// CARD DE PRODUTO
// =============================================================================

function ProductCard({
  product,
  getCategory,
  formatPrice,
  onEdit,
  onDelete,
  onDownloadBarcode,
}: {
  product: Product;
  getCategory: (id?: string) => Category | undefined;
  formatPrice: (cents: number) => string;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onDownloadBarcode: (product: Product) => void;
}) {
  const stock = product.stock ?? 0;
  const stockColor = product.stockEnabled
    ? stock <= 0
      ? "text-red-600"
      : stock < 10
        ? "text-amber-600"
        : "text-emerald-600"
    : "text-slate-500";

  return (
    <Card variant="interactive" className="relative flex flex-col overflow-hidden group">
      {/* Botão de ações */}
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <CardActionsMenu
          product={product}
          onEdit={() => onEdit(product)}
          onDelete={() => onDelete(product.id)}
          onDownloadBarcode={() => onDownloadBarcode(product)}
        />
      </div>

      {/* Imagem */}
      <div className="w-full aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="h-12 w-12 text-slate-300" />
        )}
      </div>

      {/* Conteúdo */}
      <CardContent className="p-3 flex flex-col gap-1.5 flex-1">
        {/* Nome */}
        <p className="font-medium text-slate-900 text-sm leading-tight line-clamp-2">
          {product.name}
        </p>

        {/* Categoria */}
        {(() => {
          const cat = getCategory(product.categoryId);
          return (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              {cat?.icon ? (
                <DynamicCategoryIcon name={cat.icon} className="h-3 w-3 shrink-0" />
              ) : (
                <Tag className="h-3 w-3 shrink-0" />
              )}
              <span className="truncate">{cat?.name ?? "Sem categoria"}</span>
            </div>
          );
        })()}

        {/* Preço */}
        <p className="font-semibold text-slate-900 text-sm">
          {formatPrice(product.priceCents)}
        </p>
        {product.pricePerKgCents && (
          <p className="text-xs text-slate-500 -mt-1">
            {formatPrice(product.pricePerKgCents)}/kg
          </p>
        )}

        {/* Estoque (sempre presente para padronizar altura do card) */}
        <p className={`text-xs font-medium ${stockColor}`}>
          {product.stockEnabled ? `Estoque: ${stock}` : "Estoque: sem controle"}
        </p>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-1">
          <Badge
            variant={product.productType === "sellable" ? "primary" : "default"}
            size="sm"
          >
            {product.productType === "sellable" ? "Venda" : "Adicional"}
          </Badge>
          <StatusBadge status={product.active ? "active" : "inactive"} size="sm" />
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// GRID VIEW PRINCIPAL
// =============================================================================

export interface ProductGridViewProps {
  products: Product[];
  getCategory: (id?: string) => Category | undefined;
  formatPrice: (cents: number) => string;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onDownloadBarcode: (product: Product) => void;
  onCardClick?: (product: Product) => void;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
  emptyMessage?: string;
}

export function ProductGridView({
  products,
  getCategory,
  formatPrice,
  onEdit,
  onDelete,
  onDownloadBarcode,
  onCardClick,
  pagination,
  emptyMessage = "Nenhum produto encontrado",
}: ProductGridViewProps) {
  const { page, pageSize, total, onPageChange, onPageSizeChange } = pagination;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  const pageSizeOptions = [10, 25, 50, 100];

  if (products.length === 0) {
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
        {products.map((product) => (
          <div
            key={product.id}
            onClick={() => onCardClick?.(product)}
            className={onCardClick ? "cursor-pointer" : undefined}
          >
            <ProductCard
              product={product}
              getCategory={getCategory}
              formatPrice={formatPrice}
              onEdit={onEdit}
              onDelete={onDelete}
              onDownloadBarcode={onDownloadBarcode}
            />
          </div>
        ))}
      </div>

      {/* Paginação (mesma experiência da listagem) */}
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
