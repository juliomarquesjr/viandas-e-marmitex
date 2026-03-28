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
import { Badge } from "@/app/components/ui/badge";
import {
  Banknote,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  CreditCard,
  Home,
  IdCard,
  MapPin,
  Minus,
  Package,
  Phone,
  Plus,
  Printer,
  QrCode,
  Receipt,
  Trash2,
  Truck,
  User,
  Wallet,
  XCircle,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

type OrderItem = {
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

type Order = {
  id: string;
  status: string;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  paymentMethod: string | null;
  cashReceivedCents: number | null;
  changeCents: number | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    address?: any;
    imageUrl?: string | null;
  } | null;
  items: OrderItem[];
};

const statusMap = {
  pending: {
    label: "Pendente",
    icon: Clock,
    variant: "warning" as const,
  },
  confirmed: {
    label: "Confirmado",
    icon: CheckCircle,
    variant: "info" as const,
  },
  preparing: {
    label: "Preparando",
    icon: Package,
    variant: "info" as const,
  },
  ready: {
    label: "Pronto",
    icon: Check,
    variant: "success" as const,
  },
  delivered: {
    label: "Entregue",
    icon: Truck,
    variant: "success" as const,
  },
  cancelled: {
    label: "Cancelado",
    icon: XCircle,
    variant: "error" as const,
  },
};

const paymentMethodMap = {
  cash: { label: "Dinheiro", icon: Banknote },
  credit: { label: "Cartão de Crédito", icon: CreditCard },
  debit: { label: "Cartão de Débito", icon: CreditCard },
  pix: { label: "PIX", icon: QrCode },
  invoice: { label: "Ficha do Cliente", icon: IdCard },
  ficha_payment: { label: "Pagamento de Ficha", icon: Wallet },
  dinheiro: { label: "Dinheiro", icon: Banknote },
  "ficha do cliente": { label: "Ficha do Cliente", icon: IdCard },
  "fichadocliente": { label: "Ficha do Cliente", icon: IdCard },
  "cartão débito": { label: "Cartão de Débito", icon: CreditCard },
  "cartão crédito": { label: "Cartão de Crédito", icon: CreditCard },
  "cartao debito": { label: "Cartão de Débito", icon: CreditCard },
  "cartao credito": { label: "Cartão de Crédito", icon: CreditCard },
  cartãocrédito: { label: "Cartão de Crédito", icon: CreditCard },
  cartãodébito: { label: "Cartão de Débito", icon: CreditCard },
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  preparing: "bg-indigo-100 text-indigo-700 border-indigo-200",
  ready: "bg-green-100 text-green-700 border-green-200",
  delivered: "bg-purple-100 text-purple-700 border-purple-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

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

interface OrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onPrint: (orderId: string) => void;
  onViewCustomer?: (customerId: string) => void;
  onDelete?: () => void;
  hasCustomer?: boolean;
}

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

export function OrderModal({ open, onOpenChange, order, onPrint, onViewCustomer, onDelete, hasCustomer }: OrderModalProps) {
  if (!order) return null;

  const formatCurrency = (cents: number | null) => {
    if (cents === null || cents === undefined) return "N/A";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusInfo = (status: string) => {
    return (
      statusMap[status as keyof typeof statusMap] || {
        label: status,
        icon: Clock,
        variant: "default" as const,
      }
    );
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return "Não especificado";
    const hasMethod = method in paymentMethodMap;
    if (hasMethod) {
      return paymentMethodMap[method as keyof typeof paymentMethodMap].label;
    }
    return method;
  };

  const getPaymentMethodIcon = (method: string | null) => {
    if (!method) return null;
    const hasMethod = method in paymentMethodMap;
    if (hasMethod) {
      return paymentMethodMap[method as keyof typeof paymentMethodMap].icon;
    }
    return null;
  };

  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = statusInfo.icon;
  const PaymentIcon = getPaymentMethodIcon(order.paymentMethod);

  const addr = order.customer?.address;
  const hasAddress = addr && Object.values(addr).some((v) => v);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh] p-0 gap-0">
        {/* HEADER */}
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
              <Receipt className="h-5 w-5 text-primary" />
            </div>

            <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
              <span>Venda #{order.id.slice(0, 8).toUpperCase()}</span>
              <Badge className={cn("border", statusColors[order.status] || statusColors.pending)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusInfo.label}
              </Badge>
            </div>
          </DialogTitle>

          <DialogDescription
            className="flex items-center gap-1.5 mt-1.5 ml-[52px]"
            style={{ color: "var(--modal-header-description)" }}
          >
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            Criado em {formatDate(order.createdAt)}
          </DialogDescription>
        </DialogHeader>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Seção: Cliente */}
          <div className="space-y-3">
            <SectionDivider label="Cliente" />

            {order.customer ? (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-4 p-4 bg-slate-50">
                  <div className="h-12 w-12 rounded-full flex-shrink-0 overflow-hidden ring-2 ring-white shadow-sm">
                    {order.customer.imageUrl ? (
                      <Image
                        src={order.customer.imageUrl}
                        alt={order.customer.name}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">
                          {getProductInitials(order.customer.name)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 text-base truncate">
                      {order.customer.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ID: {order.customer.id.slice(0, 8)}
                    </p>
                  </div>

                  <Link
                    href={`/admin/customers/${order.customer.id}`}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors flex-shrink-0"
                  >
                    Ver perfil
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="divide-y divide-slate-100">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        Telefone
                      </p>
                      <p className="text-sm font-medium text-slate-800 mt-0.5">
                        {order.customer.phone}
                      </p>
                    </div>
                  </div>

                  {hasAddress && (
                    <div className="flex items-start gap-3 px-4 py-3">
                      <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Home className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          Endereço
                        </p>
                        {addr.street && addr.number && (
                          <p className="text-sm font-medium text-slate-800 mt-0.5">
                            {addr.street}, {addr.number}
                            {addr.complement && (
                              <span className="text-slate-500 font-normal"> — {addr.complement}</span>
                            )}
                          </p>
                        )}
                        {addr.neighborhood && (
                          <p className="text-xs text-slate-500 mt-0.5">{addr.neighborhood}</p>
                        )}
                        {(addr.city || addr.state || addr.zip) && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {[addr.city, addr.state].filter(Boolean).join(" - ")}
                            {addr.zip && <span> · CEP {addr.zip}</span>}
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

              {order.paymentMethod === "cash" && order.cashReceivedCents != null && order.changeCents != null && (
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

          {/* Seção: Itens */}
          <div className="space-y-3">
            <SectionDivider label={`Itens do Pedido (${order.items.length})`} />

            <div className="space-y-2">
              {order.items.map((item) => {
                const isWeightBased = item.weightKg && Number(item.weightKg) > 0;
                const totalCents = item.priceCents * item.quantity;

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
                        <div
                          className={`h-full w-full flex items-center justify-center ${getProductColor(item.product.name)}`}
                        >
                          <span className="text-[10px] font-bold text-white leading-none">
                            {getProductInitials(item.product.name)}
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
                  {formatCurrency(order.subtotalCents)}
                </span>
              </div>

              {order.discountCents > 0 && (
                <div className="flex items-center justify-between px-4 py-3 text-sm border-b border-slate-100 bg-red-50/50">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Minus className="h-3.5 w-3.5 text-red-500" />
                    Desconto
                  </span>
                  <span className="font-medium text-red-600 tabular-nums">
                    -{formatCurrency(order.discountCents)}
                  </span>
                </div>
              )}

              {order.deliveryFeeCents > 0 && (
                <div className="flex items-center justify-between px-4 py-3 text-sm border-b border-slate-100">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Truck className="h-3.5 w-3.5 text-slate-400" />
                    Taxa de entrega
                  </span>
                  <span className="font-medium text-slate-900 tabular-nums">
                    +{formatCurrency(order.deliveryFeeCents)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between px-4 py-4 bg-primary/5">
                <span className="text-sm font-semibold text-slate-700">Total</span>
                <span className="text-xl font-bold text-emerald-600 tabular-nums">
                  {formatCurrency(order.totalCents)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <DialogFooter className="flex items-center justify-between gap-2 px-6 py-4 border-t-2 border-slate-200 bg-slate-100 flex-shrink-0">
          <div className="flex gap-2">
            {hasCustomer && onViewCustomer && (
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onViewCustomer(order.customer!.id);
                }}
                className="gap-2"
              >
                <User className="h-4 w-4" />
                Ver Cliente
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                onClick={() => {
                  onOpenChange(false);
                  onDelete();
                }}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            )}
          </div>
          <Button
            onClick={() => {
              onPrint(order.id);
              onOpenChange(false);
            }}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimir Recibo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
