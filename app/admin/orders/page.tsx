"use client";

import { DailySalesPrintModal } from "@/app/components/DailySalesPrintModal";
import { DeleteConfirmDialog } from "@/app/components/DeleteConfirmDialog";
import { OrderDetailsModal } from "@/app/components/OrderDetailsModal";
import { OrderSummaryModal } from "@/app/components/OrderSummaryModal";
import { SalesFilter } from "@/app/components/sales/SalesFilter";
import { SalesAnalysisModal } from "@/app/components/SalesAnalysisModal";
import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { PageHeader } from "@/app/admin/components/layout/PageHeader";
import { DataTable, Column } from "@/app/admin/components/data-display/DataTable";
import { EmptyState } from "@/app/admin/components/data-display/EmptyState";
import { SkeletonTable } from "@/app/admin/components/data-display/LoadingSkeleton";
import {
  Banknote,
  Check,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  IdCard,
  Package,
  Printer,
  QrCode,
  Receipt,
  Trash2,
  Truck,
  User,
  Wallet,
  XCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { OrderStatsCards } from "./components/OrderStatsCards";

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
  pending: { label: "Pendente", icon: Clock, variant: "warning" as const },
  confirmed: { label: "Confirmado", icon: CheckCircle, variant: "info" as const },
  preparing: { label: "Preparando", icon: Package, variant: "info" as const },
  ready: { label: "Pronto", icon: Check, variant: "success" as const },
  delivered: { label: "Entregue", icon: Truck, variant: "success" as const },
  cancelled: { label: "Cancelado", icon: XCircle, variant: "error" as const },
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

// =============================================================================
// MENU DE AÇÕES
// =============================================================================
function OrderActionsMenu({
  onViewDetails,
  onViewSummary,
  onPrint,
  onViewCustomer,
  onDelete,
  hasCustomer,
}: {
  onViewDetails: () => void;
  onViewSummary: () => void;
  onPrint: () => void;
  onViewCustomer: () => void;
  onDelete: () => void;
  hasCustomer: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(!open)}
        aria-label="Ações"
      >
        <MoreVertical className="h-4 w-4" />
        </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-48 bg-white rounded-lg border border-slate-200 shadow-lg py-1">
            <button
              role="menuitem"
              className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setOpen(false);
                onViewSummary();
              }}
            >
              <Package className="h-4 w-4 mr-2 text-slate-400" />
              Ver resumo
            </button>
            <button
              role="menuitem"
              className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setOpen(false);
                onViewDetails();
              }}
            >
              <FileText className="h-4 w-4 mr-2 text-slate-400" />
              Ver detalhes
            </button>
            <button
              role="menuitem"
              className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setOpen(false);
                onPrint();
              }}
            >
              <Printer className="h-4 w-4 mr-2 text-slate-400" />
              Imprimir recibo
            </button>
            {hasCustomer && (
              <button
                role="menuitem"
                className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setOpen(false);
                  onViewCustomer();
                }}
              >
                <User className="h-4 w-4 mr-2 text-slate-400" />
                Ver cliente
              </button>
            )}
            <div className="border-t border-slate-100 my-1"></div>
            <button
              role="menuitem"
              className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              onClick={() => {
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
// COMPONENTE PRINCIPAL
// =============================================================================
function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  delay = 0,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  color: "blue" | "orange" | "indigo" | "green";
  delay?: number;
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-green-50 text-green-600",
  };

  const valueColorClasses = {
    blue: "text-blue-900",
    orange: "text-orange-900",
    indigo: "text-indigo-900",
    green: "text-green-900",
  };

  const subtitleColorClasses = {
    blue: "text-blue-600",
    orange: "text-orange-600",
    indigo: "text-indigo-600",
    green: "text-green-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card variant="elevated" className="h-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {title}
              </p>
              <p className={`text-2xl font-bold mt-1 ${valueColorClasses[color]}`}>
                {value}
              </p>
              <p className={`text-sm mt-1 font-medium ${subtitleColorClasses[color]}`}>
                {subtitle}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AdminOrdersPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const itemsPerPage = 10;
  const [filters, setFilters] = useState({
    searchTerm: "",
    dateRange: {
      start: new Date().toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    }
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [dailySalesPrintModalOpen, setDailySalesPrintModalOpen] = useState(false);
  const [orderDetailsModalOpen, setOrderDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderSummaryModalOpen, setOrderSummaryModalOpen] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Product summary
  const productSummary = useMemo(() => {
    const map: { [key: string]: { productId: string; productName: string; totalQuantity: number } } = {};
    for (const order of allOrders) {
      for (const item of order.items) {
        const id = item.product.id;
        if (map[id]) {
          map[id].totalQuantity += item.quantity;
        } else {
          map[id] = { productId: id, productName: item.product.name, totalQuantity: item.quantity };
        }
      }
    }
    return Object.values(map).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [allOrders]);

  // Scroll handlers
  const productsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const el = productsScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  const scrollProducts = (dir: "left" | "right") => {
    const el = productsScrollRef.current;
    if (!el) return;
    const delta = 320;
    el.scrollBy({ left: dir === "left" ? -delta : delta, behavior: "smooth" });
    setTimeout(updateScrollButtons, 350);
  };

  useEffect(() => {
    updateScrollButtons();
    const el = productsScrollRef.current;
    if (!el) return;
    const onScroll = () => updateScrollButtons();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [productSummary]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.dateRange.start) {
        params.append("startDate", filters.dateRange.start);
      }

      if (filters.dateRange.end) {
        params.append("endDate", filters.dateRange.end);
      }

      params.append("size", "1000");
      params.append("page", "1");

      const response = await fetch(`/api/orders?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch orders");
      const result = await response.json();

      setAllOrders(result.data);
      setTotalOrders(result.data.length);

      const totalPagesCount = Math.ceil(result.data.length / itemsPerPage);
      setTotalPages(totalPagesCount);

      const sliceStart = (currentPage - 1) * itemsPerPage;
      const sliceEnd = sliceStart + itemsPerPage;
      const paginatedOrders = result.data.slice(sliceStart, sliceEnd);

      setOrders(paginatedOrders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [filters.dateRange]);

  useEffect(() => {
    if (allOrders.length > 0) {
      const sliceStart = (currentPage - 1) * itemsPerPage;
      const sliceEnd = sliceStart + itemsPerPage;
      const paginatedOrders = allOrders.slice(sliceStart, sliceEnd);
      setOrders(paginatedOrders);
    }
  }, [currentPage, allOrders]);

  const handleFilterChange = (newFilters: { searchTerm: string; dateRange: { start: string; end: string } }) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const formatCurrency = (cents: number | null) => {
    if (cents === null || cents === undefined) return "N/A";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const openDeleteDialog = (orderId: string) => {
    setOrderToDelete(orderId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;

    try {
      const response = await fetch(`/api/orders?id=${orderToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete order");
      }

      setOrders((prev) => prev.filter((order) => order.id !== orderToDelete));
      setAllOrders((prev) => prev.filter((order) => order.id !== orderToDelete));
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
      showToast("Venda excluída com sucesso!", "success");
    } catch (error) {
      console.error("Error deleting order:", error);
      showToast("Erro ao excluir venda. Por favor, tente novamente.", "error");
    }
  };

  const printThermalReceipt = (orderId: string) => {
    const receiptUrl = `/print/receipt-thermal?orderId=${orderId}`;
    window.open(receiptUrl, '_blank');
  };

  const handleViewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setOrderDetailsModalOpen(true);
  };

  const handleViewOrderSummary = (order: Order) => {
    setSelectedOrder(order);
    setOrderSummaryModalOpen(true);
  };

  const handleViewCustomer = (customerId: string) => {
    router.push(`/admin/customers/${customerId}`);
  };

  const getStatusInfo = (status: string) => {
    return statusMap[status as keyof typeof statusMap] || {
      label: status,
      variant: "default" as const,
    };
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Table columns
  const columns: Column<Order>[] = [
    {
      key: "customer",
      header: "Cliente",
      sortable: true,
      render: (_value, order) => (
        order.customer ? (
          <Link
            href={`/admin/customers/${order.customer.id}`}
            className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg transition-colors max-w-xs"
          >
            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-gray-900 text-sm hover:text-blue-600 transition-colors truncate">
                {order.customer.name}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {order.customer.phone}
              </div>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 text-gray-500 text-sm max-w-xs p-2">
            <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-gray-400" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-gray-500 truncate">
                Venda avulsa
              </div>
            </div>
          </div>
        )
      ),
    },
    {
      key: "totalCents",
      header: "Valor",
      sortable: true,
      render: (_value, order) => (
        <div className="flex flex-col items-start">
          <div className="font-bold text-gray-900">
            {formatCurrency(order.totalCents)}
          </div>
          {(order.discountCents > 0 || order.deliveryFeeCents > 0) && (
            <div className="mt-1 pt-1 border-t border-gray-100 space-y-0.5 text-xs">
              {order.discountCents > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Desc.:</span>
                  <span>-{formatCurrency(order.discountCents)}</span>
                </div>
              )}
              {order.deliveryFeeCents > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Entrega:</span>
                  <span>+{formatCurrency(order.deliveryFeeCents)}</span>
                </div>
              )}
            </div>
          )}
          {order.paymentMethod === "cash" && order.cashReceivedCents != null && order.changeCents != null && (
            <div className="mt-1 pt-1 border-t border-gray-100 space-y-0.5 text-xs">
              <div className="flex justify-between text-green-600">
                <span>Recebido:</span>
                <span>{formatCurrency(order.cashReceivedCents)}</span>
              </div>
              <div className="flex justify-between text-blue-600">
                <span>Troco:</span>
                <span>{formatCurrency(order.changeCents)}</span>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "paymentMethod",
      header: "Pagamento",
      render: (_value, order) => {
        const Icon = getPaymentMethodIcon(order.paymentMethod);
        const label = getPaymentMethodLabel(order.paymentMethod);

        return (
          <div className="flex items-center gap-2">
            {Icon ? (
              <>
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">{label}</span>
              </>
            ) : (
              <span className="text-sm text-gray-500">{label}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (_value, order) => {
        const statusInfo = getStatusInfo(order.status);
        const statusColors: Record<string, string> = {
          pending: "bg-yellow-100 text-yellow-800",
          confirmed: "bg-blue-100 text-blue-800",
          preparing: "bg-indigo-100 text-indigo-800",
          ready: "bg-green-100 text-green-800",
          delivered: "bg-purple-100 text-purple-800",
          cancelled: "bg-red-100 text-red-800",
        };
        return (
          <Badge className={`${statusColors[order.status] || "bg-gray-100 text-gray-800"} px-2.5 py-1 rounded-full text-xs font-medium`}>
            {statusInfo.label}
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      header: "Data",
      sortable: true,
      render: (_value, order) => (
        <div className="flex flex-col">
          <div className="text-sm font-medium text-gray-900">
            {formatDate(order.createdAt)}
          </div>
          <div className="text-xs text-gray-500">
            {new Date(order.createdAt).toLocaleDateString('pt-BR', { weekday: 'short' })}
          </div>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "60px",
      render: (_value, order) => (
        <OrderActionsMenu
          onViewDetails={() => handleViewOrderDetails(order)}
          onViewSummary={() => handleViewOrderSummary(order)}
          onPrint={() => printThermalReceipt(order.id)}
          onViewCustomer={() => handleViewCustomer(order.customer!.id)}
          onDelete={() => openDeleteDialog(order.id)}
          hasCustomer={!!order.customer}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Vendas"
        description="Acompanhe todas as vendas realizadas"
        icon={ShoppingCart}
        actions={
          <Button onClick={() => setDailySalesPrintModalOpen(true)}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Vendas Diárias
          </Button>
        }
      />

      {/* Stats Cards */}
      <OrderStatsCards orders={allOrders} />

      {/* Analysis Card */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-50">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Análise Detalhada das Vendas
                </h3>
                <p className="text-sm text-gray-500">
                  Visualize a desagregação completa com explicações detalhadas
                </p>
              </div>
            </div>
            <Button onClick={() => setShowDetailsModal(true)}>
              <Receipt className="h-4 w-4 mr-2" />
              Análise Detalhada
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card variant="outline">
        <CardContent className="p-4">
          <SalesFilter onFilterChange={handleFilterChange} />
        </CardContent>
      </Card>

      {/* Product Summary */}
      {allOrders.length > 0 && productSummary.length > 0 && (
        <Card variant="outline">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Resumo de Produtos
            </CardTitle>
            <CardDescription>
              Quantidade total de cada produto nas vendas do período
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {productSummary.length > 4 && (
                <>
                  <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-white to-transparent z-10" />
                  <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-white to-transparent z-10" />

                  <button
                    type="button"
                    className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center transition-colors ${
                      canScrollLeft ? "hover:bg-gray-50" : "opacity-50 cursor-not-allowed"
                    }`}
                    onClick={() => canScrollLeft && scrollProducts("left")}
                    aria-label="Deslizar para a esquerda"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full border border-gray-200 bg-white shadow-sm flex items-center justify-center transition-colors ${
                      canScrollRight ? "hover:bg-gray-50" : "opacity-50 cursor-not-allowed"
                    }`}
                    onClick={() => canScrollRight && scrollProducts("right")}
                    aria-label="Deslizar para a direita"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
              <div
                ref={productsScrollRef}
                className="overflow-x-auto scroll-smooth scrollbar-hide"
              >
                <div className="flex gap-3 px-8 py-2">
                  {productSummary.map((product) => (
                    <div
                      key={product.productId}
                      className="flex min-w-[200px] items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:shadow-md transition-all hover:border-blue-200"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                        <Package className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {product.productName}
                        </h3>
                        <div className="mt-0.5 flex items-baseline gap-1">
                          <span className="text-lg font-bold text-blue-600">
                            {product.totalQuantity}
                          </span>
                          <span className="text-xs text-gray-500">unid.</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card variant="outline">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Lista de Vendas
          </CardTitle>
          <CardDescription>
            {totalOrders} venda{totalOrders !== 1 ? "s" : ""} encontrada{totalOrders !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <SkeletonTable rows={5} columns={6} hasActions />
          ) : error ? (
            <EmptyState
              icon={XCircle}
              title="Erro ao carregar vendas"
              description={error}
              action={{
                label: "Tentar novamente",
                onClick: loadOrders
              }}
            />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Nenhuma venda encontrada"
              description={
                filters.dateRange.start || filters.dateRange.end
                  ? "Tente ajustar os filtros de busca"
                  : "Ainda não há vendas registradas"
              }
            />
          ) : (
            <>
              <DataTable
                data={orders}
                columns={columns}
                rowKey="id"
                pagination={{
                  page: currentPage,
                  pageSize: itemsPerPage,
                  total: totalOrders,
                  onPageChange: setCurrentPage,
                }}
              />

              {/* Pagination Info */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                <span>
                  Mostrando {startIndex + 1} a {Math.min(endIndex, totalOrders)} de {totalOrders} venda{totalOrders !== 1 ? "s" : ""}
                </span>
                <span>
                  Página {currentPage} de {totalPages}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <OrderSummaryModal
        open={orderSummaryModalOpen}
        onOpenChange={setOrderSummaryModalOpen}
        order={selectedOrder}
      />

      <OrderDetailsModal
        open={orderDetailsModalOpen}
        onOpenChange={setOrderDetailsModalOpen}
        order={selectedOrder}
        onPrint={printThermalReceipt}
      />

      <SalesAnalysisModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        allOrders={allOrders}
        totalOrders={totalOrders}
        filters={filters}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Confirmar Exclusão"
        description="Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita."
        onConfirm={confirmDeleteOrder}
        confirmText="Excluir"
        cancelText="Cancelar"
      />

      <DailySalesPrintModal
        open={dailySalesPrintModalOpen}
        onOpenChange={setDailySalesPrintModalOpen}
      />
    </div>
  );
}
