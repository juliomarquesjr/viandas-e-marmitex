"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { StatusBadge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Barcode,
  Edit,
  ArrowRight,
  Clock,
  Receipt,
  Wallet,
  Calendar,
  Home,
  ChevronRight,
  Package,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer } from "../page";

// =============================================================================
// TYPES
// =============================================================================

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";

interface Order {
  id: string;
  status: OrderStatus;
  totalCents: number;
  createdAt: string;
  items: Array<{ product: { name: string }; quantity: number }>;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatCurrency(cents: number) {
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
  });
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusMap: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  confirmed: { label: "Confirmado", color: "bg-blue-100 text-blue-700 border-blue-200" },
  preparing: { label: "Preparando", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  ready: { label: "Pronto", color: "bg-green-100 text-green-700 border-green-200" },
  delivered: { label: "Entregue", color: "bg-purple-100 text-purple-700 border-purple-200" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700 border-red-200" },
};

// =============================================================================
// SKELETON
// =============================================================================

function ModalSkeleton() {
  return (
    <>
      <div
        className="px-6 pt-8 pb-6 flex flex-col items-center gap-4 border-b border-slate-200"
        style={{ background: "var(--modal-header-bg)" }}
      >
        <div className="h-[108px] w-[108px] rounded-full bg-slate-200 animate-pulse" />
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="h-6 w-48 bg-slate-200 animate-pulse rounded-lg" />
          <div className="h-4 w-20 bg-slate-200 animate-pulse rounded-full" />
          <div className="h-3 w-36 bg-slate-200 animate-pulse rounded mt-0.5" />
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        <div className="space-y-3">
          <div className="h-3 w-16 bg-slate-100 animate-pulse rounded" />
          <div className="h-4 w-40 bg-slate-100 animate-pulse rounded" />
          <div className="h-4 w-56 bg-slate-100 animate-pulse rounded" />
        </div>
        <div className="space-y-3 pt-1">
          <div className="h-3 w-20 bg-slate-100 animate-pulse rounded" />
          <div className="h-4 w-64 bg-slate-100 animate-pulse rounded" />
        </div>
        <div className="space-y-3 pt-1">
          <div className="h-3 w-20 bg-slate-100 animate-pulse rounded" />
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[72px] rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="space-y-3 pt-1">
          <div className="h-3 w-24 bg-slate-100 animate-pulse rounded" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>

      <div className="border-t-2 border-slate-200 bg-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="h-5 w-20 bg-slate-200 animate-pulse rounded-full" />
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-slate-200 animate-pulse rounded-lg" />
          <div className="h-8 w-32 bg-slate-200 animate-pulse rounded-lg" />
        </div>
      </div>
    </>
  );
}

// =============================================================================
// SECTION DIVIDER
// =============================================================================

function SectionLabel({ label }: { label: string }) {
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
// MINI-CARD FINANCEIRO
// =============================================================================

function FinancialCard({
  label,
  value,
  icon: Icon,
  colorScheme,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  colorScheme: "amber" | "purple" | "emerald" | "red";
}) {
  const schemes = {
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      label: "text-amber-700",
      value: "text-amber-900",
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      label: "text-purple-700",
      value: "text-purple-900",
    },
    emerald: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      label: "text-emerald-700",
      value: "text-emerald-900",
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-200",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      label: "text-red-700",
      value: "text-red-900",
    },
  };
  const s = schemes[colorScheme];

  return (
    <div className={cn("rounded-xl p-3 border flex flex-col gap-2", s.bg, s.border)}>
      <div className="flex items-center justify-between">
        <p className={cn("text-[10px] font-semibold uppercase tracking-wide leading-tight", s.label)}>
          {label}
        </p>
        <div className={cn("h-6 w-6 rounded-md flex items-center justify-center", s.iconBg)}>
          <Icon className={cn("h-3 w-3", s.iconColor)} />
        </div>
      </div>
      <p className={cn("text-base font-bold tabular-nums leading-none", s.value)}>{value}</p>
    </div>
  );
}

// =============================================================================
// AVATAR CIRCULAR COM ANEL DE STATUS
// =============================================================================

function CustomerAvatar({
  imageUrl,
  name,
  active,
}: {
  imageUrl?: string;
  name: string;
  active: boolean;
}) {
  const ringClass = active
    ? "bg-gradient-to-br from-emerald-400 to-teal-500"
    : "bg-slate-300";

  return (
    <div className={cn("p-[3px] rounded-full shadow-lg", ringClass)}>
      <div className="h-24 w-24 rounded-full border-[3px] border-white overflow-hidden bg-slate-100 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <User className="h-10 w-10 text-slate-300" />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// ITEM DE HISTÓRICO DE PEDIDO
// =============================================================================

function OrderHistoryItem({
  order,
  onClick,
}: {
  order: Order;
  onClick: () => void;
}) {
  const status = statusMap[order.status] || statusMap.pending;
  const firstItem = order.items[0];
  const itemCount = order.items.length;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-all duration-150 text-left group"
    >
      {/* Ícone de pedido */}
      <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 transition-colors">
        <Package className="h-4 w-4 text-slate-500" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500">
            #{order.id.slice(0, 8).toUpperCase()}
          </span>
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", status.color)}>
            {status.label}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 truncate">
          {firstItem ? `${firstItem.product.name}${itemCount > 1 ? ` +${itemCount - 1}` : ""}` : "Sem itens"}
        </p>
      </div>

      {/* Valor e data */}
      <div className="flex flex-col items-end flex-shrink-0">
        <span className="text-sm font-semibold text-slate-900 tabular-nums">
          {formatCurrency(order.totalCents)}
        </span>
        <span className="text-[10px] text-slate-400 mt-0.5">
          {formatDate(order.createdAt)}
        </span>
      </div>

      {/* Seta */}
      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
    </button>
  );
}

// =============================================================================
// MODAL PRINCIPAL
// =============================================================================

interface CustomerDetailsModalProps {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  onEdit: () => void;
}

export function CustomerDetailsModal({
  open,
  customer,
  onClose,
  onEdit,
}: CustomerDetailsModalProps) {
  const router = useRouter();

  const [stats, setStats] = React.useState<{
    pendingAmount: number;
    totalOrders: number;
    balanceAmount: number;
    totalSpent: number;
  } | null>(null);
  const [recentOrders, setRecentOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Busca métricas e pedidos recentes ao abrir o modal
  React.useEffect(() => {
    if (!open || !customer) return;

    setStats(null);
    setRecentOrders([]);
    setLoading(true);

    Promise.all([
      fetch(`/api/orders?customerId=${customer.id}&size=1000`).then((r) => r.json()),
      fetch(`/api/ficha-payments?customerId=${customer.id}`).then((r) => r.json()),
    ])
      .then(([ordersData, fichaData]) => {
        const orders: Order[] = ordersData.data ?? [];

        // Ordenar por data (mais recente primeiro)
        const sortedOrders = [...orders].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Calcular métricas
        const pendingAmount = orders
          .filter((o) => o.status === "pending")
          .reduce((sum, o) => sum + o.totalCents, 0);

        const totalSpent = orders
          .filter((o) => o.status !== "cancelled")
          .reduce((sum, o) => sum + o.totalCents, 0);

        setStats({
          pendingAmount,
          totalOrders: orders.length,
          balanceAmount: fichaData.balanceCents ?? 0,
          totalSpent,
        });

        // Pegar os 5 pedidos mais recentes
        setRecentOrders(sortedOrders.slice(0, 5));
      })
      .catch(() => {
        setStats(null);
        setRecentOrders([]);
      })
      .finally(() => setLoading(false));
  }, [open, customer?.id]);

  if (!customer) return null;

  const address = customer.address as {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    zip?: string;
  } | undefined;
  const addressLine = [
    address?.street && address?.number
      ? `${address.street}, ${address.number}`
      : address?.street,
    address?.neighborhood,
    address?.city,
  ]
    .filter(Boolean)
    .join(" · ");

  const joinedDate = new Date(customer.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const balanceColor = stats && stats.balanceAmount > 0 ? "red" : "emerald";
  const balanceLabel = stats && stats.balanceAmount > 0 ? "Saldo Devedor" : "Crédito";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh] p-0 gap-0">
        {loading ? (
          <ModalSkeleton />
        ) : (
          <>
            {/* ── HEADER — avatar centralizado ──────────────────────── */}
            <div
              className="px-6 pt-8 pb-6 flex flex-col items-center gap-4 border-b border-slate-200 flex-shrink-0"
              style={{ background: "var(--modal-header-bg)" }}
            >
              <CustomerAvatar
                imageUrl={customer.imageUrl}
                name={customer.name}
                active={customer.active}
              />

              <div className="text-center space-y-1.5">
                <h2
                  className="text-xl font-bold leading-tight"
                  style={{ color: "var(--modal-header-text)" }}
                >
                  {customer.name}
                </h2>

                <div className="flex items-center justify-center gap-2">
                  <StatusBadge
                    status={customer.active ? "active" : "inactive"}
                    size="sm"
                  />
                </div>

                <p
                  className="text-xs flex items-center justify-center gap-1.5"
                  style={{ color: "var(--modal-header-description)" }}
                >
                  <Calendar className="h-3 w-3 shrink-0" />
                  Cliente desde {joinedDate}
                </p>
              </div>
            </div>

            {/* ── BODY — scrollável ─────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Contato e Documentos */}
              <div className="space-y-3">
                <SectionLabel label="Contato" />

                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {/* Telefone */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Phone className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          Telefone
                        </p>
                        <p className="text-sm font-medium text-slate-800 mt-0.5">
                          {customer.phone}
                        </p>
                      </div>
                    </div>

                    {/* Email */}
                    {customer.email && (
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Mail className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                            Email
                          </p>
                          <p className="text-sm font-medium text-slate-800 mt-0.5 truncate">
                            {customer.email}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Documento */}
                    {customer.doc && (
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                            Documento
                          </p>
                          <p className="text-sm font-mono font-medium text-slate-800 mt-0.5">
                            {customer.doc}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Código de barras */}
                    {customer.barcode && (
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Barcode className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                            Código de Barras
                          </p>
                          <p className="text-sm font-mono font-medium text-slate-800 mt-0.5">
                            {customer.barcode}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Endereço */}
              {addressLine && (
                <div className="space-y-3">
                  <SectionLabel label="Endereço" />

                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-start gap-3 px-4 py-3">
                      <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Home className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          Endereço Completo
                        </p>
                        <p className="text-sm font-medium text-slate-800 mt-0.5 leading-snug">
                          {addressLine}
                        </p>
                        {address?.zip && (
                          <p className="text-xs text-slate-500 mt-1">
                            CEP: {address.zip}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Financeiro */}
              <div className="space-y-3">
                <SectionLabel label="Financeiro" />

                {stats ? (
                  <div className="grid grid-cols-2 gap-2">
                    <FinancialCard
                      label="Total Gasto"
                      value={formatCurrency(stats.totalSpent)}
                      icon={TrendingUp}
                      colorScheme="emerald"
                    />
                    <FinancialCard
                      label="Pendente"
                      value={formatCurrency(stats.pendingAmount)}
                      icon={Clock}
                      colorScheme="amber"
                    />
                    <FinancialCard
                      label="Pedidos"
                      value={String(stats.totalOrders)}
                      icon={Receipt}
                      colorScheme="purple"
                    />
                    <FinancialCard
                      label={balanceLabel}
                      value={formatCurrency(Math.abs(stats.balanceAmount))}
                      icon={Wallet}
                      colorScheme={balanceColor}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <AlertCircle className="h-5 w-5 text-slate-400 flex-shrink-0" />
                    <p className="text-sm text-slate-500">
                      Não foi possível carregar os dados financeiros.
                    </p>
                  </div>
                )}
              </div>

              {/* Pedidos Recentes */}
              <div className="space-y-3">
                <SectionLabel label={`Pedidos Recentes (${recentOrders.length})`} />

                {recentOrders.length > 0 ? (
                  <div className="space-y-2">
                    {recentOrders.map((order) => (
                      <OrderHistoryItem
                        key={order.id}
                        order={order}
                        onClick={() => {
                          onClose();
                          router.push(`/admin/customers/${customer.id}`);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <Package className="h-5 w-5 text-slate-400 flex-shrink-0" />
                    <p className="text-sm text-slate-500">
                      Nenhum pedido registrado ainda.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── FOOTER ────────────────────────────────────────────── */}
            <DialogFooter className="flex items-center justify-between gap-2 px-6 py-4 border-t-2 border-slate-200 bg-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  className="gap-1.5"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Editar
                </Button>
              </div>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  onClose();
                  router.push(`/admin/customers/${customer.id}`);
                }}
              >
                Ver Ficha Completa
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
