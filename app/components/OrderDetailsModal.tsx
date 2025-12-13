"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Badge } from "@/app/components/ui/badge";
import {
  Banknote,
  Check,
  CheckCircle,
  Clock,
  CreditCard,
  IdCard,
  MapPin,
  Minus,
  Package,
  Plus,
  Printer,
  QrCode,
  Receipt,
  Truck,
  User,
  Wallet,
  XCircle,
  Phone,
  Calendar,
} from "lucide-react";
import Link from "next/link";

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
  } | null;
  items: {
    id: string;
    quantity: number;
    priceCents: number;
    weightKg?: number | null;
    product: {
      id: string;
      name: string;
      pricePerKgCents?: number | null;
    };
  }[];
};

const statusMap = {
  pending: {
    label: "Pendente",
    icon: Clock,
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    iconColor: "text-yellow-600",
  },
  confirmed: {
    label: "Confirmado",
    icon: CheckCircle,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    iconColor: "text-blue-600",
  },
  preparing: {
    label: "Preparando",
    icon: Package,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    iconColor: "text-indigo-600",
  },
  ready: {
    label: "Pronto",
    icon: Check,
    color: "bg-green-50 text-green-700 border-green-200",
    iconColor: "text-green-600",
  },
  delivered: {
    label: "Entregue",
    icon: Truck,
    color: "bg-purple-50 text-purple-700 border-purple-200",
    iconColor: "text-purple-600",
  },
  cancelled: {
    label: "Cancelado",
    icon: XCircle,
    color: "bg-red-50 text-red-700 border-red-200",
    iconColor: "text-red-600",
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

interface OrderDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onPrint: (orderId: string) => void;
}

export function OrderDetailsModal({
  open,
  onOpenChange,
  order,
  onPrint,
}: OrderDetailsModalProps) {
  if (!order) return null;

  const formatCurrency = (cents: number | null) => {
    if (cents === null || cents === undefined) return "N/A";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
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
        color: "bg-gray-50 text-gray-700 border-gray-200",
        iconColor: "text-gray-600",
      }
    );
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return "Não especificado";
    const hasMethod = method in paymentMethodMap;
    if (hasMethod) {
      return paymentMethodMap[method as keyof typeof paymentMethodMap].label;
    } else {
      const directAccess = (paymentMethodMap as any)[method];
      if (directAccess && directAccess.label) {
        return directAccess.label;
      }
      return method;
    }
  };

  const getPaymentMethodIcon = (method: string | null) => {
    if (!method) return null;
    const hasMethod = method in paymentMethodMap;
    if (hasMethod) {
      return paymentMethodMap[method as keyof typeof paymentMethodMap].icon;
    } else {
      const directAccess = (paymentMethodMap as any)[method];
      if (directAccess && directAccess.icon) {
        return directAccess.icon;
      }
      return null;
    }
  };

  const StatusIcon = getStatusInfo(order.status).icon;
  const PaymentIcon = getPaymentMethodIcon(order.paymentMethod);
  const statusInfo = getStatusInfo(order.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden !p-0 flex flex-col">
        {/* Header com gradiente e status */}
        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <DialogTitle className="text-2xl font-bold text-foreground">
                  Detalhes da Venda
                </DialogTitle>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  className={`${statusInfo.color} border shadow-sm`}
                >
                  <StatusIcon className={`h-3.5 w-3.5 ${statusInfo.iconColor} mr-1.5`} />
                  {statusInfo.label}
                </Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {formatDate(order.createdAt)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-extrabold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
                {formatCurrency(order.totalCents)}
              </div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Total
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Grid com informações principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cliente */}
            <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-xl p-5 border border-blue-100/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-blue-100">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Cliente
                </h3>
              </div>
              {order.customer ? (
                <div className="space-y-2">
                  <div className="text-lg font-bold text-foreground">
                    {order.customer.name}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {order.customer.phone}
                  </div>
                  <Link href={`/admin/customers/${order.customer.id}`} className="inline-block mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs hover:bg-blue-50 border-blue-200 text-blue-700 hover:text-blue-900"
                    >
                      Ver ficha completa
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-base font-medium text-muted-foreground">
                  Venda Avulsa
                </div>
              )}
            </div>

            {/* Pagamento */}
            <div className="bg-gradient-to-br from-green-50/50 to-emerald-50/30 rounded-xl p-5 border border-green-100/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-green-100">
                  {PaymentIcon ? (
                    <PaymentIcon className="h-4 w-4 text-green-600" />
                  ) : (
                    <CreditCard className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Pagamento
                </h3>
              </div>
              <div className="space-y-2">
                <div className="text-lg font-bold text-foreground">
                  {getPaymentMethodLabel(order.paymentMethod)}
                </div>
                {(order.discountCents > 0 || order.subtotalCents !== order.totalCents) && (
                  <div className="space-y-1 pt-2 border-t border-green-200">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(order.subtotalCents)}
                      </span>
                    </div>
                    {order.discountCents > 0 && (
                      <div className="flex justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <Minus className="h-3 w-3 text-red-500" />
                          <span className="text-muted-foreground">Desconto:</span>
                        </div>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(order.discountCents)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {order.paymentMethod === "cash" &&
                  order.cashReceivedCents != null &&
                  order.changeCents != null && (
                    <div className="space-y-1.5 pt-2 border-t border-green-200">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Recebido:</span>
                        <span className="font-semibold text-green-700">
                          {formatCurrency(order.cashReceivedCents)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Troco:</span>
                        <span className="font-semibold text-blue-600">
                          {formatCurrency(order.changeCents)}
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Endereço do Cliente */}
          {order.customer?.address && (
            <div className="bg-gradient-to-br from-purple-50/50 to-violet-50/30 rounded-xl p-5 border border-purple-100/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-purple-100">
                  <MapPin className="h-4 w-4 text-purple-600" />
                </div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Endereço do Cliente
                </h3>
              </div>
              <div className="space-y-1.5">
                {order.customer.address.street && order.customer.address.number && (
                  <div className="text-sm font-medium text-foreground">
                    {order.customer.address.street}, {order.customer.address.number}
                  </div>
                )}
                {order.customer.address.complement && (
                  <div className="text-sm text-muted-foreground">
                    {order.customer.address.complement}
                  </div>
                )}
                {(order.customer.address.neighborhood || order.customer.address.city) && (
                  <div className="text-sm text-muted-foreground">
                    {order.customer.address.neighborhood && `${order.customer.address.neighborhood}, `}
                    {order.customer.address.city}
                    {order.customer.address.state && ` - ${order.customer.address.state}`}
                  </div>
                )}
                {order.customer.address.zip && (
                  <div className="text-sm text-muted-foreground">
                    CEP: {order.customer.address.zip}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Itens */}
          <div className="bg-white rounded-xl p-5 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-orange-100">
                <Package className="h-4 w-4 text-orange-600" />
              </div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Itens ({order.items.length})
              </h3>
            </div>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground truncate">
                        {item.product.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.weightKg && Number(item.weightKg) > 0 ? (
                          <>
                            {Number(item.weightKg).toFixed(3)} kg × {formatCurrency(item.priceCents / Number(item.weightKg))}/kg
                          </>
                        ) : (
                          <>
                            {formatCurrency(item.priceCents)} cada
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="font-bold text-foreground">
                      {formatCurrency(item.quantity * item.priceCents)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumo Financeiro */}
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-gray-100">
                <Receipt className="h-4 w-4 text-gray-600" />
              </div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Resumo
              </h3>
            </div>
            <div className="space-y-2.5">
              {order.deliveryFeeCents > 0 && (
                <div className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-1.5">
                    <Plus className="h-3 w-3 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Taxa de Entrega</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">
                    {formatCurrency(order.deliveryFeeCents)}
                  </span>
                </div>
              )}
              
              <div className="border-t border-border mt-3 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-foreground">Total</span>
                  <span className="text-2xl font-extrabold text-primary">
                    {formatCurrency(order.totalCents)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer fixo com ações */}
        <div className="border-t border-border bg-gray-50/50 p-6 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border"
          >
            Fechar
          </Button>
          <Button
            onClick={() => {
              onPrint(order.id);
              onOpenChange(false);
            }}
            className="bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Recibo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
