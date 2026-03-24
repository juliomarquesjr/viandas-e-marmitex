"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
} from "@/app/components/ui/dialog";
import { Badge, StatusBadge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Package,
  Edit,
  Barcode,
  DollarSign,
  Tag,
  FileText,
  Info,
  Calendar,
  CheckCircle,
  XCircle,
  Layers,
  Weight,
  Archive,
} from "lucide-react";
import type { Product, Category } from "../page";

// =============================================================================
// HELPERS
// =============================================================================

function formatPrice(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getCategoryName(categories: Category[], categoryId?: string) {
  if (!categoryId) return null;
  return categories.find((c) => c.id === categoryId)?.name ?? null;
}

// =============================================================================
// SEÇÃO DE INFO (reutilizada no body)
// =============================================================================

function InfoSection({
  icon: Icon,
  label,
  iconBg,
  iconColor,
  gradient,
  border,
  children,
}: {
  icon: React.ElementType;
  label: string;
  iconBg: string;
  iconColor: string;
  gradient: string;
  border: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl p-4 border ${gradient} ${border}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {label}
        </h3>
      </div>
      {children}
    </div>
  );
}

// =============================================================================
// MODAL PRINCIPAL
// =============================================================================

export interface ProductPreviewModalProps {
  product: Product | null;
  categories: Category[];
  open: boolean;
  onClose: () => void;
  onEdit: (product: Product) => void;
}

export function ProductPreviewModal({
  product,
  categories,
  open,
  onClose,
  onEdit,
}: ProductPreviewModalProps) {
  if (!product) return null;

  const categoryName = getCategoryName(categories, product.categoryId);
  const stock = product.stock ?? 0;
  const stockColor =
    stock <= 0
      ? "text-red-600"
      : stock < 10
      ? "text-amber-600"
      : "text-emerald-600";
  const stockLabel =
    stock <= 0 ? "Sem estoque" : stock < 10 ? "Estoque baixo" : "Em estoque";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {/*
       * max-w-3xl para comportar o layout side-by-side.
       * flex-row divide o modal em painel esquerdo (imagem) + painel direito (conteúdo).
       */}
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-row !p-0">

        {/* ── PAINEL ESQUERDO — IMAGEM ───────────────────────────────── */}
        <div className="relative w-56 shrink-0 overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            /* Placeholder quando não há imagem */
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-50 flex flex-col items-center justify-center gap-3">
              <div className="p-5 rounded-2xl bg-white/70 shadow-sm">
                <Package className="h-16 w-16 text-slate-300" />
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Sem imagem
              </span>
            </div>
          )}

          {/* Gradiente inferior para legibilidade dos badges */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

          {/* Badge de tipo — topo esquerdo */}
          <div className="absolute top-3 left-3 z-10">
            <Badge
              variant={product.productType === "sellable" ? "primary" : "default"}
              size="sm"
              className="shadow-md backdrop-blur-sm"
            >
              {product.productType === "sellable" ? "Venda" : "Adicional"}
            </Badge>
          </div>

          {/* Badge de status — rodapé */}
          <div className="absolute bottom-3 left-3 z-10">
            <StatusBadge
              status={product.active ? "active" : "inactive"}
              size="sm"
              className="shadow-md backdrop-blur-sm"
            />
          </div>
        </div>

        {/* ── PAINEL DIREITO — CONTEÚDO ─────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Header (texto puro, sem imagem) */}
          <div
            className="px-6 pt-6 pb-5 border-b border-white/20 pr-14"
            style={{ background: "var(--modal-header-bg)" }}
          >
            <h2
              className="text-xl font-bold leading-tight mb-2"
              style={{ color: "var(--modal-header-text)" }}
            >
              {product.name}
            </h2>

            <div className="flex flex-col gap-1">
              {categoryName && (
                <span
                  className="text-sm flex items-center gap-1.5"
                  style={{ color: "var(--modal-header-description)" }}
                >
                  <Tag className="h-3.5 w-3.5 shrink-0" />
                  {categoryName}
                </span>
              )}
              {product.barcode && (
                <span
                  className="text-xs flex items-center gap-1.5 font-mono"
                  style={{ color: "var(--modal-header-description)" }}
                >
                  <Barcode className="h-3.5 w-3.5 shrink-0" />
                  {product.barcode}
                </span>
              )}
            </div>
          </div>

          {/* Body scrollável */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">

            {/* Preço + Estoque */}
            <div className="grid grid-cols-2 gap-3">
              <InfoSection
                icon={DollarSign}
                label="Preço"
                iconBg="bg-emerald-100"
                iconColor="text-emerald-600"
                gradient="bg-gradient-to-br from-emerald-50/80 to-green-50/40"
                border="border-emerald-100/70"
              >
                <div className="text-2xl font-extrabold text-emerald-700 tabular-nums">
                  {formatPrice(product.priceCents)}
                </div>
                {product.pricePerKgCents ? (
                  <div className="flex items-center gap-1 mt-1 text-sm text-emerald-600">
                    <Weight className="h-3.5 w-3.5 shrink-0" />
                    {formatPrice(product.pricePerKgCents)}/kg
                  </div>
                ) : null}
              </InfoSection>

              <InfoSection
                icon={Archive}
                label="Estoque"
                iconBg="bg-blue-100"
                iconColor="text-blue-600"
                gradient="bg-gradient-to-br from-blue-50/80 to-indigo-50/40"
                border="border-blue-100/70"
              >
                {product.stockEnabled ? (
                  <>
                    <div className={`text-2xl font-extrabold tabular-nums ${stockColor}`}>
                      {stock}
                    </div>
                    <div className={`text-sm mt-1 font-medium ${stockColor} opacity-80`}>
                      {stockLabel}
                    </div>
                  </>
                ) : (
                  <div className="text-base font-medium text-slate-400 pt-1">
                    Não controlado
                  </div>
                )}
              </InfoSection>
            </div>

            {/* Descrição */}
            {product.description && (
              <InfoSection
                icon={FileText}
                label="Descrição"
                iconBg="bg-slate-100"
                iconColor="text-slate-500"
                gradient="bg-white"
                border="border-slate-200 shadow-sm"
              >
                <p className="text-sm text-slate-700 leading-relaxed">
                  {product.description}
                </p>
              </InfoSection>
            )}

            {/* Detalhes técnicos */}
            <InfoSection
              icon={Info}
              label="Detalhes"
              iconBg="bg-slate-100"
              iconColor="text-slate-500"
              gradient="bg-gradient-to-br from-slate-50 to-gray-50/60"
              border="border-slate-200"
            >
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <dt className="text-xs text-slate-400 mb-1">Tipo de produto</dt>
                  <dd className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {product.productType === "sellable"
                      ? "Produto para venda"
                      : "Produto adicional"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-slate-400 mb-1">Situação</dt>
                  <dd className="flex items-center gap-1.5 text-sm font-medium">
                    {product.active ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span className="text-emerald-700">Ativo</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-500">Inativo</span>
                      </>
                    )}
                  </dd>
                </div>

                {product.barcode && (
                  <div>
                    <dt className="text-xs text-slate-400 mb-1">Código de barras</dt>
                    <dd className="flex items-center gap-1.5 text-sm font-mono font-medium text-slate-700">
                      <Barcode className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {product.barcode}
                    </dd>
                  </div>
                )}

                <div>
                  <dt className="text-xs text-slate-400 mb-1">Cadastrado em</dt>
                  <dd className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {formatDate(product.createdAt)}
                  </dd>
                </div>
              </dl>
            </InfoSection>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-slate-200 bg-slate-100 px-5 py-4 flex items-center justify-end gap-3 shrink-0">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button
              onClick={() => {
                onClose();
                onEdit(product);
              }}
            >
              <Edit className="h-4 w-4 mr-1.5" />
              Editar produto
            </Button>
          </div>

        </div>
        {/* fim painel direito */}

      </DialogContent>
    </Dialog>
  );
}
