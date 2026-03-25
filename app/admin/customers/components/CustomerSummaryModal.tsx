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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer } from "../page";

// =============================================================================
// HELPERS
// =============================================================================

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

// =============================================================================
// SKELETON — exibido enquanto os dados financeiros carregam
// =============================================================================

function ModalSkeleton() {
  return (
    <>
      {/* Header skeleton */}
      <div
        className="px-6 pt-8 pb-6 flex flex-col items-center gap-4 border-b border-slate-200"
        style={{ background: "var(--modal-header-bg)" }}
      >
        {/* Avatar ring */}
        <div className="h-[108px] w-[108px] rounded-full bg-slate-200 animate-pulse" />
        {/* Nome */}
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="h-6 w-48 bg-slate-200 animate-pulse rounded-lg" />
          <div className="h-4 w-20 bg-slate-200 animate-pulse rounded-full" />
          <div className="h-3 w-36 bg-slate-200 animate-pulse rounded mt-0.5" />
        </div>
      </div>

      {/* Body skeleton */}
      <div className="px-6 py-5 space-y-5">
        {/* Contato rows */}
        <div className="space-y-3">
          <div className="h-3 w-16 bg-slate-100 animate-pulse rounded" />
          <div className="h-4 w-40 bg-slate-100 animate-pulse rounded" />
          <div className="h-4 w-56 bg-slate-100 animate-pulse rounded" />
        </div>
        {/* Endereço row */}
        <div className="space-y-3 pt-1">
          <div className="h-3 w-20 bg-slate-100 animate-pulse rounded" />
          <div className="h-4 w-64 bg-slate-100 animate-pulse rounded" />
        </div>
        {/* Financial cards */}
        <div className="space-y-3 pt-1">
          <div className="h-3 w-20 bg-slate-100 animate-pulse rounded" />
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[72px] rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        </div>
      </div>

      {/* Footer skeleton */}
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
    <div className="flex items-center gap-3">
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
  colorScheme: "amber" | "purple" | "red" | "emerald";
}) {
  const schemes = {
    amber:   { bg: "bg-amber-50",   border: "border-amber-200",   iconBg: "bg-amber-100",   iconColor: "text-amber-600",   label: "text-amber-700",   value: "text-amber-900"   },
    purple:  { bg: "bg-purple-50",  border: "border-purple-200",  iconBg: "bg-purple-100",  iconColor: "text-purple-600",  label: "text-purple-700",  value: "text-purple-900"  },
    red:     { bg: "bg-red-50",     border: "border-red-200",     iconBg: "bg-red-100",     iconColor: "text-red-600",     label: "text-red-700",     value: "text-red-900"     },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", iconBg: "bg-emerald-100", iconColor: "text-emerald-600", label: "text-emerald-700", value: "text-emerald-900" },
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
// MODAL PRINCIPAL
// =============================================================================

interface CustomerSummaryModalProps {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  onEdit: () => void;
}

export function CustomerSummaryModal({
  open,
  customer,
  onClose,
  onEdit,
}: CustomerSummaryModalProps) {
  const router = useRouter();

  const [stats, setStats] = React.useState<{
    pendingAmount: number;
    totalOrders: number;
    balanceAmount: number;
  } | null>(null);
  const [loading, setLoading] = React.useState(false);

  // Busca métricas ao abrir o modal
  React.useEffect(() => {
    if (!open || !customer) return;

    setStats(null);
    setLoading(true);

    Promise.all([
      fetch(`/api/orders?customerId=${customer.id}&size=1000`).then((r) => r.json()),
      fetch(`/api/ficha-payments?customerId=${customer.id}`).then((r) => r.json()),
    ])
      .then(([ordersData, fichaData]) => {
        const orders: any[] = ordersData.data ?? [];
        const pendingAmount = orders
          .filter((o) => o.status === "pending")
          .reduce((sum, o) => sum + o.totalCents, 0);
        setStats({
          pendingAmount,
          totalOrders: orders.length,
          balanceAmount: fichaData.balanceCents ?? 0,
        });
      })
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [open, customer?.id]);

  if (!customer) return null;

  const address = customer.address;
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
      <DialogContent className="sm:max-w-md overflow-hidden !p-0">

        {loading ? (
          <ModalSkeleton />
        ) : (
          <>
            {/* ── HEADER — avatar circular centralizado ──────────────── */}
            <div
              className="px-6 pt-8 pb-6 flex flex-col items-center gap-4 border-b border-slate-200 pr-10"
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

                <div className="flex items-center justify-center">
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

            {/* ── BODY ────────────────────────────────────────────────── */}
            <div className="px-6 py-5 space-y-4 max-h-[50vh] overflow-y-auto">

              {/* Contato */}
              <div className="space-y-2.5">
                <SectionLabel label="Contato" />
                <div className="space-y-2 pl-1">
                  <div className="flex items-center gap-2.5 text-sm text-slate-700">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {customer.phone}
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.doc && (
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{customer.doc}</span>
                    </div>
                  )}
                  {customer.barcode && (
                    <div className="flex items-center gap-2.5 text-sm text-slate-600">
                      <Barcode className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-slate-500">{customer.barcode}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Endereço */}
              {addressLine && (
                <div className="space-y-2.5">
                  <SectionLabel label="Endereço" />
                  <div className="flex items-start gap-2.5 pl-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700 leading-snug">{addressLine}</span>
                  </div>
                </div>
              )}

              {/* Financeiro */}
              <div className="space-y-2.5">
                <SectionLabel label="Financeiro" />
                {stats ? (
                  <div className="grid grid-cols-3 gap-2">
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
                  <p className="pl-1 text-sm text-slate-400 italic">
                    Não foi possível carregar os dados financeiros.
                  </p>
                )}
              </div>

            </div>

            {/* ── FOOTER ──────────────────────────────────────────────── */}
            <DialogFooter>
              <div />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
                  <Edit className="h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => router.push(`/admin/customers/${customer.id}`)}
                >
                  Ver Ficha
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </DialogFooter>
          </>
        )}

      </DialogContent>
    </Dialog>
  );
}
