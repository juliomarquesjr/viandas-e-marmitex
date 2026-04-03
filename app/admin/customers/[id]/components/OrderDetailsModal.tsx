"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import {
  Calendar,
  Receipt,
  Package,
  CreditCard,
  Banknote,
  QrCode,
  IdCard,
  Wallet,
  Truck,
  Minus,
  Printer,
  Clock,
  CheckCircle,
  XCircle,
  Check,
  ArrowLeft,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface Order {
  id: string;
  status: string;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents?: number;
  totalCents: number;
  paymentMethod: string | null;
  cashReceivedCents?: number | null;
  changeCents?: number | null;
  createdAt: string;
  items: {
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
  }[];
  type?: string;
}

interface OrderDetailsModalProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onPrint?: (orderId: string) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

const statusMap: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending: {
    label: "Pendente",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  confirmed: {
    label: "Confirmado",
    icon: CheckCircle,
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  preparing: {
    label: "Preparando",
    icon: Package,
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  ready: {
    label: "Pronto",
    icon: Check,
    color: "bg-green-100 text-green-700 border-green-200",
  },
  delivered: {
    label: "Entregue",
    icon: Truck,
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  cancelled: {
    label: "Cancelado",
    icon: XCircle,
    color: "bg-red-100 text-red-700 border-red-200",
  },
};

const paymentMethodMap: Record<string, { label: string; icon: React.ElementType }> = {
  cash: { label: "Dinheiro", icon: Banknote },
  credit: { label: "Cartão de Crédito", icon: CreditCard },
  debit: { label: "Cartão de Débito", icon: CreditCard },
  pix: { label: "PIX", icon: QrCode },
  invoice: { label: "Ficha do Cliente", icon: IdCard },
  ficha_payment: { label: "Pagamento de Ficha", icon: Wallet },
  dinheiro: { label: "Dinheiro", icon: Banknote },
  "ficha do cliente": { label: "Ficha do Cliente", icon: IdCard },
  fichadocliente: { label: "Ficha do Cliente", icon: IdCard },
  "cartão débito": { label: "Cartão de Débito", icon: CreditCard },
  "cartão crédito": { label: "Cartão de Crédito", icon: CreditCard },
  "cartao debito": { label: "Cartão de Débito", icon: CreditCard },
  "cartao credito": { label: "Cartão de Crédito", icon: CreditCard },
  cartãocrédito: { label: "Cartão de Crédito", icon: CreditCard },
  cartãodébito: { label: "Cartão de Débito", icon: CreditCard },
};

function formatCurrency(cents: number | null) {
  if (cents === null || cents === undefined) return "N/A";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPaymentMethodLabel(method: string | null) {
  if (!method) return "Não especificado";
  return paymentMethodMap[method]?.label || method;
}

function getPaymentMethodIcon(method: string | null): React.ElementType | null {
  if (!method) return null;
  return paymentMethodMap[method]?.icon || null;
}

function getStatusInfo(status: string) {
  return (
    statusMap[status] || {
      label: status,
      icon: Clock,
      color: "bg-slate-100 text-slate-700 border-slate-200",
    }
  );
}

// Cores determinísticas para produtos
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

function getProductInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// =============================================================================
// SECTION DIVIDER
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

// =============================================================================
// MODAL PRINCIPAL
// =============================================================================

export function OrderDetailsModal({
  open,
  order,
  onClose,
  onPrint,
}: OrderDetailsModalProps) {
  if (!order) return null;

  const isFichaPayment =
    order.type === "ficha_payment" || order.paymentMethod === "ficha_payment";

  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = statusInfo.icon;
  const PaymentIcon = getPaymentMethodIcon(order.paymentMethod);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh] p-0 gap-0">
        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <div
          className="px-6 pt-6 pb-5 border-b border-slate-200 flex-shrink-0"
          style={{ background: "var(--modal-header-bg)" }}
        >
          <div className="flex items-center gap-3">
            {/* Ícone principal */}
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{
                background: "var(--modal-header-icon-bg)",
                outline: "1px solid var(--modal-header-icon-ring)",
              }}
            >
              {isFichaPayment ? (
                <Wallet className="h-5 w-5 text-primary" />
              ) : (
                <Receipt className="h-5 w-5 text-primary" />
              )}
            </div>

            {/* Título e badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  className="text-lg font-bold leading-snug"
                  style={{ color: "var(--modal-header-text)" }}
                >
                  {isFichaPayment ? "Entrada de Valores" : `Pedido #${order.id.slice(0, 8).toUpperCase()}`}
                </h2>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                    statusInfo.color
                  )}
                >
                  <StatusIcon className="h-3 w-3" />
                  {statusInfo.label}
                </span>
              </div>

              <p
                className="flex items-center gap-1.5 mt-1.5 text-xs"
                style={{ color: "var(--modal-header-description)" }}
              >
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                Criado em {formatDate(order.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* ── BODY — scrollável ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Seção: Pagamento */}
          <div className="space-y-3">
            <SectionDivider label="Pagamento" />

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-3 p-4 bg-slate-50">
                <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  {PaymentIcon ? (
                    <PaymentIcon className="h-4 w-4 text-green-600" />
                  ) : (
                    <CreditCard className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    Forma de Pagamento
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {getPaymentMethodLabel(order.paymentMethod)}
                  </p>
                </div>
              </div>

              {/* Valores em dinheiro */}
              {order.paymentMethod === "cash" &&
                order.cashReceivedCents != null &&
                order.changeCents != null && (
                  <div className="divide-y divide-slate-100">
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-slate-600">Recebido</span>
                      <span className="text-sm font-semibold text-green-700 tabular-nums">
                        {formatCurrency(order.cashReceivedCents)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-slate-600">Troco</span>
                      <span className="text-sm font-semibold text-blue-600 tabular-nums">
                        {formatCurrency(order.changeCents)}
                      </span>
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Seção: Itens do Pedido */}
          {!isFichaPayment && (
            <div className="space-y-3">
              <SectionDivider label={`Itens do Pedido (${order.items.length})`} />

              <div className="space-y-2">
                {order.items.map((item) => {
                  const isWeightBased = item.weightKg && Number(item.weightKg) > 0;
                  const totalCents = item.priceCents * item.quantity;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-all duration-150"
                    >
                      {/* Thumbnail do produto */}
                      <div className="h-10 w-10 rounded-lg flex-shrink-0 overflow-hidden ring-1 ring-slate-200">
                        {item.product.imageUrl ? (
                          <Image
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div
                            className={cn(
                              "h-full w-full flex items-center justify-center",
                              getProductColor(item.product.name)
                            )}
                          >
                            <span className="text-[10px] font-bold text-white leading-none">
                              {getProductInitials(item.product.name)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info do item */}
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

                      {/* Preço */}
                      <p className="text-sm font-semibold text-slate-900 tabular-nums flex-shrink-0">
                        {formatCurrency(totalCents)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seção: Totais */}
          {!isFichaPayment && (
            <div className="space-y-3">
              <SectionDivider label="Totais" />

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium text-slate-900 tabular-nums">
                    {formatCurrency(order.subtotalCents)}
                  </span>
                </div>

                {order.discountCents && order.discountCents > 0 ? (
                  <div className="flex items-center justify-between px-4 py-3 text-sm bg-red-50/50">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Minus className="h-3.5 w-3.5 text-red-500" />
                      Desconto
                    </span>
                    <span className="font-medium text-red-600 tabular-nums">
                      -{formatCurrency(order.discountCents)}
                    </span>
                  </div>
                ) : null}

                {order.deliveryFeeCents && order.deliveryFeeCents > 0 ? (
                  <div className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Truck className="h-3.5 w-3.5 text-slate-400" />
                      Taxa de entrega
                    </span>
                    <span className="font-medium text-slate-900 tabular-nums">
                      +{formatCurrency(order.deliveryFeeCents)}
                    </span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between px-4 py-4 bg-primary/5 border-t border-slate-100">
                  <span className="text-sm font-semibold text-slate-700">Total</span>
                  <span className="text-xl font-bold text-emerald-600 tabular-nums">
                    {formatCurrency(order.totalCents)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Ficha Payment - valor */}
          {isFichaPayment && (
            <div className="space-y-3">
              <SectionDivider label="Valor" />

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-4 bg-emerald-50">
                  <span className="text-sm font-semibold text-slate-700">
                    Valor Creditado
                  </span>
                  <span className="text-xl font-bold text-emerald-600 tabular-nums">
                    {formatCurrency(order.totalCents)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────── */}
        <DialogFooter className="flex items-center justify-between gap-2 px-6 py-4 border-t-2 border-slate-200 bg-slate-100 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Button>

          <div className="flex gap-2">
            {onPrint && !isFichaPayment && (
              <Button
                size="sm"
                onClick={() => {
                  onPrint(order.id);
                }}
                className="gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                Imprimir
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
