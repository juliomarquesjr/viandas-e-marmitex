"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { DeliveryStatusBadge } from "@/app/components/DeliveryStatusBadge";
import {
  Calendar,
  ChevronRight,
  FileText,
  Home,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Printer,
  Receipt,
  ShoppingCart,
  Trash2,
  Truck,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// =============================================================================
// TIPOS
// =============================================================================

type CustomerAddress = {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
};

type PreOrderItem = {
  id: string;
  quantity: number;
  priceCents: number;
  weightKg?: number | null;
  product: {
    id: string;
    name: string;
    imageUrl?: string | null;
    pricePerKgCents?: number | null;
  };
};

type PreOrder = {
  id: string;
  deliveryStatus?: string | null;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  notes: string | null;
  createdAt: string;
  customerId: string | null;
  customer: {
    id: string;
    name: string;
    phone: string;
    imageUrl?: string | null;
    address?: CustomerAddress | null;
  } | null;
  items: PreOrderItem[];
};

interface PreOrderDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preOrder: PreOrder | null;
  onPrint: (preOrderId: string) => void;
  onEdit: (preOrderId: string) => void;
  onConvert: (preOrder: PreOrder) => void;
  onTrack: (preOrderId: string) => void;
  onDelete: (preOrderId: string) => void;
}

// =============================================================================
// UTILITÁRIOS
// =============================================================================

const PRODUCT_COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

function getProductColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PRODUCT_COLORS[Math.abs(hash) % PRODUCT_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatCurrency(cents: number | null): string {
  if (cents === null || cents === undefined) return "N/A";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAddress(addr: CustomerAddress): string {
  const parts: string[] = [];
  if (addr.street) {
    parts.push(addr.number ? `${addr.street}, ${addr.number}` : addr.street);
  }
  if (addr.complement) parts.push(addr.complement);
  if (addr.neighborhood) parts.push(addr.neighborhood);
  const cityState = [addr.city, addr.state].filter(Boolean).join(" - ");
  if (cityState) parts.push(cityState);
  if (addr.zip) parts.push(`CEP ${addr.zip}`);
  return parts.join(" · ");
}

// =============================================================================
// COMPONENTES INTERNOS
// =============================================================================

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

function SecondaryActionsMenu({
  onTrack,
  onDelete,
}: {
  onTrack: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label="Mais ações"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {open && (
        <div className="absolute left-0 bottom-full mb-2 z-50 w-48 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 overflow-hidden">
          <button
            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 gap-2"
            onClick={() => { setOpen(false); onTrack(); }}
          >
            <MapPin className="h-4 w-4 text-slate-400" />
            Rastrear entrega
          </button>
          <div className="border-t border-slate-100 my-1" />
          <button
            className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 gap-2"
            onClick={() => { setOpen(false); onDelete(); }}
          >
            <Trash2 className="h-4 w-4" />
            Remover
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PreOrderDetailsModal({
  open,
  onOpenChange,
  preOrder,
  onPrint,
  onEdit,
  onConvert,
  onTrack,
  onDelete,
}: PreOrderDetailsModalProps) {
  if (!preOrder) return null;

  const close = () => onOpenChange(false);

  const addr = preOrder.customer?.address as CustomerAddress | null | undefined;
  const hasAddress = addr && Object.values(addr).some(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh] p-0 gap-0">

        {/* ── HEADER ─────────────────────────────────────────────── */}
        <DialogHeader
          className="px-6 pt-6 pb-5 border-b border-slate-200 flex-shrink-0"
          style={{ background: "var(--modal-header-bg)" }}
        >
          <DialogTitle
            className="flex items-center gap-3 text-lg font-bold leading-snug"
            style={{ color: "var(--modal-header-text)" }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{
                background: "var(--modal-header-icon-bg)",
                outline: "1px solid var(--modal-header-icon-ring)",
              }}
            >
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>

            <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
              <span>Pré-Pedido #{preOrder.id.slice(0, 8).toUpperCase()}</span>
              {preOrder.deliveryStatus && (
                <DeliveryStatusBadge status={preOrder.deliveryStatus as any} />
              )}
            </div>
          </DialogTitle>

          <DialogDescription
            className="flex items-center gap-1.5 mt-1.5 ml-[52px]"
            style={{ color: "var(--modal-header-description)" }}
          >
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            Criado em {formatDate(preOrder.createdAt)}
          </DialogDescription>
        </DialogHeader>

        {/* ── BODY ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Seção: Cliente */}
          <div className="space-y-3">
            <SectionDivider label="Cliente" />

            {preOrder.customer ? (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                {/* Linha principal do cliente */}
                <div className="flex items-center gap-4 p-4 bg-slate-50">
                  {/* Avatar */}
                  <div className="h-12 w-12 rounded-full flex-shrink-0 overflow-hidden ring-2 ring-white shadow-sm">
                    {preOrder.customer.imageUrl ? (
                      <Image
                        src={preOrder.customer.imageUrl}
                        alt={preOrder.customer.name}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">
                          {getInitials(preOrder.customer.name)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Nome + link */}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 text-base truncate">
                      {preOrder.customer.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ID: {preOrder.customer.id.slice(0, 8)}
                    </p>
                  </div>

                  {/* Botão ver perfil */}
                  <Link
                    href={`/admin/customers/${preOrder.customer.id}`}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors flex-shrink-0"
                  >
                    Ver perfil
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* Dados de contato e endereço */}
                <div className="divide-y divide-slate-100">
                  {/* Telefone */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Telefone</p>
                      <p className="text-sm font-medium text-slate-800 mt-0.5">
                        {preOrder.customer.phone}
                      </p>
                    </div>
                  </div>

                  {/* Endereço */}
                  {hasAddress && (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Home className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Endereço</p>
                        {/* Rua + número */}
                        {(addr?.street || addr?.number) && (
                          <p className="text-sm font-medium text-slate-800 mt-0.5">
                            {[addr?.street, addr?.number].filter(Boolean).join(", ")}
                            {addr?.complement && (
                              <span className="text-slate-500 font-normal"> — {addr.complement}</span>
                            )}
                          </p>
                        )}
                        {/* Bairro */}
                        {addr?.neighborhood && (
                          <p className="text-xs text-slate-500 mt-0.5">{addr.neighborhood}</p>
                        )}
                        {/* Cidade + estado + CEP */}
                        {(addr?.city || addr?.state || addr?.zip) && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {[addr?.city, addr?.state].filter(Boolean).join(" - ")}
                            {addr?.zip && <span> · CEP {addr.zip}</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Venda avulsa</p>
                  <p className="text-xs text-slate-400">Sem cliente cadastrado</p>
                </div>
              </div>
            )}
          </div>

          {/* Seção: Itens */}
          <div className="space-y-3">
            <SectionDivider label={`Itens do Pedido (${preOrder.items.length})`} />

            <div className="space-y-2">
              {preOrder.items.map((item) => {
                const isWeightBased = item.weightKg && Number(item.weightKg) > 0;
                const totalCents = isWeightBased
                  ? item.priceCents
                  : item.priceCents * item.quantity;

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors"
                  >
                    <div className="h-9 w-9 rounded-lg flex-shrink-0 overflow-hidden ring-1 ring-slate-200">
                      {item.product.imageUrl ? (
                        <Image
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          width={36}
                          height={36}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className={`h-full w-full flex items-center justify-center ${getProductColor(item.product.name)}`}>
                          <span className="text-[10px] font-bold text-white leading-none">
                            {getInitials(item.product.name)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isWeightBased
                          ? `${Number(item.weightKg).toFixed(3)} kg × ${formatCurrency(item.product.pricePerKgCents ?? item.priceCents)}/kg`
                          : `${item.quantity}× ${formatCurrency(item.priceCents)}/un.`}
                      </p>
                    </div>

                    <p className="text-sm font-semibold text-slate-900 tabular-nums flex-shrink-0">
                      {formatCurrency(totalCents)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seção: Totais */}
          <div className="space-y-3">
            <SectionDivider label="Totais" />

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 text-sm border-b border-slate-100">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium text-slate-900 tabular-nums">
                  {formatCurrency(preOrder.subtotalCents)}
                </span>
              </div>

              {preOrder.discountCents > 0 && (
                <div className="flex items-center justify-between px-4 py-3 text-sm border-b border-slate-100 bg-red-50/50">
                  <span className="text-slate-600">Desconto</span>
                  <span className="font-medium text-red-600 tabular-nums">
                    -{formatCurrency(preOrder.discountCents)}
                  </span>
                </div>
              )}

              {preOrder.deliveryFeeCents > 0 && (
                <div className="flex items-center justify-between px-4 py-3 text-sm border-b border-slate-100">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Truck className="h-3.5 w-3.5 text-slate-400" />
                    Taxa de entrega
                  </span>
                  <span className="font-medium text-slate-900 tabular-nums">
                    +{formatCurrency(preOrder.deliveryFeeCents)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between px-4 py-4 bg-primary/5">
                <span className="text-sm font-semibold text-slate-700">Total</span>
                <span className="text-xl font-bold text-emerald-600 tabular-nums">
                  {formatCurrency(preOrder.totalCents)}
                </span>
              </div>
            </div>
          </div>

          {/* Seção: Observações (condicional) */}
          {preOrder.notes && (
            <div className="space-y-3">
              <SectionDivider label="Observações" />
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
                <FileText className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900 leading-relaxed">{preOrder.notes}</p>
              </div>
            </div>
          )}

          {/* Seção: Entrega (condicional) */}
          {preOrder.deliveryStatus && (
            <div className="space-y-3">
              <SectionDivider label="Status de Entrega" />
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
                <Truck className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-600">Status atual:</span>
                <DeliveryStatusBadge status={preOrder.deliveryStatus as any} />
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────── */}
        <DialogFooter className="flex items-center justify-between gap-3 px-6 py-4 border-t-2 border-slate-200 bg-slate-100 flex-shrink-0">
          {/* Esquerda: ações secundárias via menu */}
          <SecondaryActionsMenu
            onTrack={() => { close(); onTrack(preOrder.id); }}
            onDelete={() => { close(); onDelete(preOrder.id); }}
          />

          {/* Direita: ações primárias */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => { close(); onEdit(preOrder.id); }}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>

            <Button
              variant="outline"
              className="gap-2"
              onClick={() => { onPrint(preOrder.id); close(); }}
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>

            <Button
              variant="default"
              className="gap-2"
              onClick={() => { close(); onConvert(preOrder); }}
            >
              <Receipt className="h-4 w-4" />
              Converter em Venda
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
