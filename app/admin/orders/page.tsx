"use client";

import { DailySalesPrintModal } from "@/app/components/DailySalesPrintModal";
import { DeleteConfirmDialog } from "@/app/components/DeleteConfirmDialog";
import { OrderModal } from "@/app/components/OrderModal";
import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { PageHeader } from "@/app/admin/components/layout/PageHeader";
import { DataTable, Column } from "@/app/admin/components/data-display/DataTable";
import { EmptyState } from "@/app/admin/components/data-display/EmptyState";
import { SkeletonTable } from "@/app/admin/components/data-display/LoadingSkeleton";
import { cn } from "@/lib/utils";
import {
  Banknote,
  Check,
  CheckCircle,
  Clock,
  CreditCard,
  IdCard,
  Loader2,
  Package,
  Printer,
  QrCode,
  Truck,
  User,
  Wallet,
  XCircle,
  ShoppingCart,
  List,
  ListX,
} from "lucide-react";
import {
  getDesktopPrintPreferences,
  isDesktopRuntime,
  printBitmapToDesktopPrinter,
} from "@/lib/runtime/capabilities";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OrderStatsCards } from "./components/OrderStatsCards";
import { OrderActionsMenu } from "./components/OrderActionsMenu";
import { OrderFilterBar } from "./components/OrderFilterBar";
import { OrderPageSkeleton } from "./components/OrderPageSkeleton";

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
};

const PRODUCT_SUMMARY_STORAGE_KEY = "admin-orders-product-summary-enabled";
const DESKTOP_PRINT_FRAME_ID = "desktop-order-print-frame";

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

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-indigo-100 text-indigo-800",
  ready: "bg-green-100 text-green-800",
  delivered: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800",
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

type OrderItem = {
  id: string;
  quantity: number;
  priceCents: number;
  weightKg?: number | null;
  product: { id: string; name: string; imageUrl?: string | null; pricePerKgCents?: number | null };
};

function ProductAvatars({ items }: { items: OrderItem[] }) {
  const MAX_SHOWN = 3;
  const shown = items.slice(0, MAX_SHOWN);
  const extra = items.length - MAX_SHOWN;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((item, i) => (
          <div key={i} className="relative shrink-0" style={{ zIndex: MAX_SHOWN - i }}>
            {item.product.imageUrl ? (
              <div className="h-7 w-7 rounded-full ring-2 ring-white overflow-hidden bg-slate-100" title={item.product.name}>
                <Image src={item.product.imageUrl} alt={item.product.name} width={28} height={28} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div
                className={cn("h-7 w-7 rounded-full ring-2 ring-white flex items-center justify-center", getProductColor(item.product.name))}
                title={item.product.name}
              >
                <span className="text-[9px] font-bold text-white leading-none">{getProductInitials(item.product.name)}</span>
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-slate-700 text-white text-[8px] font-bold flex items-center justify-center ring-1 ring-white leading-none">
              {item.weightKg && Number(item.weightKg) > 0 ? `${Number(item.weightKg).toFixed(1)}` : item.quantity}
            </span>
          </div>
        ))}
        {extra > 0 && (
          <div className="h-7 w-7 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center" style={{ zIndex: 0 }}>
            <span className="text-[9px] font-bold text-slate-600">+{extra}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const getTodayDateValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getPaymentMethodLabel = (method: string | null) => {
  if (!method) return "Não especificado";
  const hasMethod = method in paymentMethodMap;

  if (hasMethod) {
    return paymentMethodMap[method as keyof typeof paymentMethodMap].label;
  }

  return method;
};

export default function AdminOrdersPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    searchTerm: "",
    dateRange: {
      start: getTodayDateValue(),
      end: getTodayDateValue(),
    },
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [dailySalesPrintModalOpen, setDailySalesPrintModalOpen] = useState(false);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [productSummaryEnabled, setProductSummaryEnabled] = useState(false);
  const [productSummaryPreferenceLoaded, setProductSummaryPreferenceLoaded] = useState(false);
  const [isBitmapPrinting, setIsBitmapPrinting] = useState(false);
  const [desktopPrintWaiting, setDesktopPrintWaiting] = useState(false);
  const [activePrintSessionId, setActivePrintSessionId] = useState<string | null>(null);

  // Load product summary state from local storage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = window.localStorage.getItem(PRODUCT_SUMMARY_STORAGE_KEY);
      if (saved !== null) {
        setProductSummaryEnabled(saved === "true");
      }
    } catch {
      // Ignora indisponibilidade do storage sem quebrar a tela.
    } finally {
      setProductSummaryPreferenceLoaded(true);
    }
  }, []);

  const removeDesktopPrintFrame = useCallback(() => {
    const existingFrame = document.getElementById(DESKTOP_PRINT_FRAME_ID);
    if (existingFrame) existingFrame.remove();
  }, []);

  useEffect(() => {
    const onPrintMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; printSessionId?: string | null } | null;
      if (!data?.type) return;

      if (data.type === "desktop-print-dialog-opening") {
        if (activePrintSessionId && data.printSessionId && data.printSessionId !== activePrintSessionId) return;
        setDesktopPrintWaiting(false);
        setActivePrintSessionId(null);
        return;
      }

      if (data.type === "desktop-print-finished") {
        if (activePrintSessionId && data.printSessionId && data.printSessionId !== activePrintSessionId) return;
        setDesktopPrintWaiting(false);
        setActivePrintSessionId(null);
        removeDesktopPrintFrame();
      }
    };

    window.addEventListener("message", onPrintMessage);
    return () => window.removeEventListener("message", onPrintMessage);
  }, [activePrintSessionId, removeDesktopPrintFrame]);

  // Save product summary state only after the initial preference has been loaded.
  useEffect(() => {
    if (typeof window === "undefined" || !productSummaryPreferenceLoaded) return;

    try {
      window.localStorage.setItem(PRODUCT_SUMMARY_STORAGE_KEY, String(productSummaryEnabled));
    } catch {
      // Ignora indisponibilidade do storage sem quebrar a tela.
    }
  }, [productSummaryEnabled, productSummaryPreferenceLoaded]);

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((prev) => {
        if (prev.searchTerm === searchInput) return prev;
        return { ...prev, searchTerm: searchInput };
      });
      setCurrentPage(1);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
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
      setAllOrders(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [filters.dateRange.end, filters.dateRange.start]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleDateRangeChange = useCallback((dateRange: { start: string; end: string }) => {
    setFilters((prev) => ({ ...prev, dateRange }));
    setCurrentPage(1);
  }, []);

  const handleResetDateRange = useCallback(() => {
    const today = getTodayDateValue();
    setFilters((prev) => ({
      ...prev,
      dateRange: {
        start: today,
        end: today,
      },
    }));
    setCurrentPage(1);
  }, []);

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

      setAllOrders((prev) => prev.filter((order) => order.id !== orderToDelete));
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
      showToast("Venda excluída com sucesso!", "success");
    } catch (error) {
      console.error("Error deleting order:", error);
      showToast("Erro ao excluir venda. Por favor, tente novamente.", "error");
    }
  };

  const tryDirectThermalPrint = useCallback(async (orderId: string) => {
    const preferences = await getDesktopPrintPreferences();
    const printerTarget =
      preferences.defaultThermalPrinterName?.trim() || preferences.defaultThermalPrinterId?.trim() || null;

    if (!printerTarget || !preferences.thermalAutoPrintModules.sales) return false;

    const printSessionId = crypto.randomUUID();

    setIsBitmapPrinting(true);
    try {
      const bitmapData = await new Promise<{ imageData: number[]; width: number; height: number }>(
        (resolve, reject) => {
          const iframe = document.createElement('iframe');
          iframe.style.cssText =
            'position:absolute;left:-9999px;top:-9999px;width:320px;height:1px;opacity:0;pointer-events:none;border:none;';
          iframe.src = `/print/receipt-thermal?orderId=${orderId}&printSessionId=${printSessionId}&captureMode=true`;
          document.body.appendChild(iframe);

          const timeout = setTimeout(() => {
            document.body.removeChild(iframe);
            reject(new Error('Timeout aguardando captura bitmap da venda'));
          }, 30_000);

          const handler = (e: MessageEvent) => {
            if (e.data?.type === 'thermal-bitmap-capture' && e.data.printSessionId === printSessionId) {
              clearTimeout(timeout);
              window.removeEventListener('message', handler);
              document.body.removeChild(iframe);
              resolve({ imageData: e.data.imageData, width: e.data.width, height: e.data.height });
            }
          };
          window.addEventListener('message', handler);
        },
      );

      await printBitmapToDesktopPrinter(
        printerTarget,
        bitmapData.imageData,
        bitmapData.width,
        bitmapData.height,
        `Venda ${orderId.slice(-8).toUpperCase()}`,
      );
    } finally {
      setIsBitmapPrinting(false);
    }

    return true;
  }, []);

  const printThermalReceipt = async (orderId: string) => {
    const printSessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    if (isDesktopRuntime()) {
      try {
        const printedDirectly = await tryDirectThermalPrint(orderId);
        if (printedDirectly) {
          showToast("Venda enviada para a impressora térmica configurada.", "success");
          return;
        }
      } catch (error) {
        console.warn("Falha na impressão direta da venda:", error);
      }

      setActivePrintSessionId(printSessionId);
      setDesktopPrintWaiting(true);
      removeDesktopPrintFrame();

      const receiptUrl = `/print/receipt-thermal?orderId=${orderId}&printSessionId=${printSessionId}&autoPrint=0`;
      const iframe = document.createElement("iframe");
      iframe.id = DESKTOP_PRINT_FRAME_ID;
      iframe.src = receiptUrl;
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.position = "fixed";
      iframe.style.width = "1px";
      iframe.style.height = "1px";
      iframe.style.right = "-9999px";
      iframe.style.bottom = "-9999px";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      window.setTimeout(() => {
        setDesktopPrintWaiting(false);
        setActivePrintSessionId(null);
        iframe.remove();
      }, 60000);
      return;
    }

    const receiptUrl = `/print/receipt-thermal?orderId=${orderId}&printSessionId=${printSessionId}`;
    window.open(receiptUrl, '_blank');
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setOrderModalOpen(true);
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

  const getPaymentMethodIcon = (method: string | null) => {
    if (!method) return null;
    const hasMethod = method in paymentMethodMap;

    if (hasMethod) {
      return paymentMethodMap[method as keyof typeof paymentMethodMap].icon;
    }
    return null;
  };

  const filteredOrders = useMemo(() => {
    const normalizedSearch = filters.searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return allOrders;
    }

    return allOrders.filter((order) => {
      const customerName = order.customer?.name?.toLowerCase() ?? "";
      const customerPhone = order.customer?.phone?.toLowerCase() ?? "";
      const orderId = order.id.toLowerCase();
      const paymentMethod = getPaymentMethodLabel(order.paymentMethod).toLowerCase();

      return (
        customerName.includes(normalizedSearch) ||
        customerPhone.includes(normalizedSearch) ||
        orderId.includes(normalizedSearch) ||
        paymentMethod.includes(normalizedSearch)
      );
    });
  }, [allOrders, filters.searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
            className="flex items-center gap-3 hover:bg-slate-50 p-2 rounded-lg transition-colors max-w-xs"
          >
            <div className="h-9 w-9 rounded-full flex-shrink-0 overflow-hidden bg-blue-100 flex items-center justify-center">
              {order.customer.imageUrl ? (
                <img
                  src={order.customer.imageUrl}
                  alt={order.customer.name}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-blue-600" />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-slate-900 text-sm hover:text-blue-600 transition-colors truncate">
                {order.customer.name}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {order.customer.phone}
              </div>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 text-slate-500 text-sm max-w-xs p-2">
            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-slate-400" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-slate-500 truncate">Venda avulsa</div>
            </div>
          </div>
        )
      ),
    },
    {
      key: "items",
      header: "Itens",
      render: (_value, order) => (
        <div className="flex items-center gap-3">
          {order.items.length > 0 && <ProductAvatars items={order.items} />}
          <div className="min-w-0">
            <p className="text-slate-700 font-medium text-xs mb-0.5">
              {order.items.length} item{order.items.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-0.5">
              {order.items.slice(0, 2).map((item, idx) => (
                <p key={idx} className="text-[11px] text-slate-400 truncate max-w-[160px]">
                  {item.weightKg && Number(item.weightKg) > 0
                    ? `${Number(item.weightKg).toFixed(3)} kg × ${item.product.name}`
                    : `${item.quantity}× ${item.product.name}`}
                </p>
              ))}
              {order.items.length > 2 && (
                <p className="text-[11px] text-slate-400 italic">+{order.items.length - 2} mais...</p>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "totalCents",
      header: "Valor",
      sortable: true,
      render: (_value, order) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm">
            {formatCurrency(order.totalCents)}
          </p>
          {order.discountCents > 0 && (
            <p className="text-[11px] text-red-500">-{formatCurrency(order.discountCents)}</p>
          )}
          {order.deliveryFeeCents > 0 && (
            <p className="text-[11px] text-slate-400">+{formatCurrency(order.deliveryFeeCents)} entrega</p>
          )}
          {order.paymentMethod === "cash" && order.cashReceivedCents != null && order.changeCents != null && (
            <p className="text-[11px] text-blue-500">troco {formatCurrency(order.changeCents)}</p>
          )}
        </div>
      ),
    },
    {
      key: "paymentMethod",
      header: "Pagamento",
      align: "center",
      render: (_value, order) => {
        const Icon = getPaymentMethodIcon(order.paymentMethod);
        const label = getPaymentMethodLabel(order.paymentMethod);
        return Icon ? (
          <div className="flex flex-col items-center gap-0.5">
            <Icon className="h-5 w-5 text-slate-400" />
            <span className="text-[10px] text-slate-400 leading-tight text-center">{label}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-500">{label}</span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (_value, order) => {
        const statusInfo = getStatusInfo(order.status);
        return (
          <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium", statusColors[order.status] || "bg-slate-100 text-slate-800")}>
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {statusInfo.label}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      header: "Data",
      sortable: true,
      render: (_value, order) => (
        <p className="text-[11px] text-slate-500 whitespace-nowrap">
          {formatDate(order.createdAt)}
        </p>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "60px",
      render: (_value, order) => (
        <OrderActionsMenu
          onPrint={() => printThermalReceipt(order.id)}
          onViewCustomer={() => order.customer && handleViewCustomer(order.customer.id)}
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
          <div className="flex gap-2">
            <Button
              variant={productSummaryEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setProductSummaryEnabled(!productSummaryEnabled)}
            >
              {productSummaryEnabled ? (
                <>
                  <List className="h-4 w-4 mr-2" />
                  Resumo Ativo
                </>
              ) : (
                <>
                  <ListX className="h-4 w-4 mr-2" />
                  Resumo Inativo
                </>
              )}
            </Button>
            <Button size="sm" onClick={() => setDailySalesPrintModalOpen(true)}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Vendas Diárias
            </Button>
          </div>
        }
      />

      {loading && allOrders.length === 0 ? (
        <OrderPageSkeleton />
      ) : (
        <>
          <OrderStatsCards orders={allOrders} />

          <OrderFilterBar
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            dateRange={filters.dateRange}
            onDateRangeChange={handleDateRangeChange}
            onResetDateRange={handleResetDateRange}
            totalCount={allOrders.length}
            filteredCount={filteredOrders.length}
          />

          {allOrders.length > 0 && productSummary.length > 0 && productSummaryEnabled && (
            <Card variant="outline">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Resumo de Produtos
                </CardTitle>
                <CardDescription>
                  Quantidade total de cada produto nas vendas do período
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const maxQty = productSummary[0]?.totalQuantity ?? 1;
                  const rankColors = [
                    "bg-yellow-400 text-yellow-900",
                    "bg-slate-300 text-slate-700",
                    "bg-amber-600 text-amber-100",
                  ];
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {productSummary.map((product, index) => {
                        const badgeColor = index < 3 ? rankColors[index] : "bg-slate-100 text-slate-500";
                        const progressPct = Math.round((product.totalQuantity / maxQty) * 100);
                        return (
                          <div
                            key={product.productId}
                            className="flex flex-col p-3 bg-slate-50 rounded-lg border border-slate-100 hover:shadow-md transition-all hover:border-blue-200"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Package className="h-4 w-4 text-blue-600" />
                              </div>
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${badgeColor}`}>
                                #{index + 1}
                              </span>
                            </div>
                            <h3 className="text-xs font-medium text-slate-900 truncate mb-1">
                              {product.productName}
                            </h3>
                            <div className="flex items-baseline gap-1 mb-2">
                              <span className="text-lg font-bold text-blue-600">
                                {product.totalQuantity}
                              </span>
                              <span className="text-xs text-slate-500">unid.</span>
                            </div>
                            <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-1 bg-blue-400 rounded-full"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          <Card variant="outline">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">
                Lista de Vendas
              </CardTitle>
              <CardDescription>
                {filteredOrders.length} venda{filteredOrders.length !== 1 ? "s" : ""} encontrada
                {filteredOrders.length !== 1 ? "s" : ""}
                {filters.searchTerm.trim()
                  ? ` de ${allOrders.length}`
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <SkeletonTable rows={5} columns={5} hasActions />
              ) : error ? (
                <EmptyState
                  icon={XCircle}
                  title="Erro ao carregar vendas"
                  description={error}
                  action={{
                    label: "Tentar novamente",
                    onClick: loadOrders,
                  }}
                />
              ) : filteredOrders.length === 0 ? (
                <EmptyState
                  icon={ShoppingCart}
                  title="Nenhuma venda encontrada"
                  description={
                    filters.searchTerm || filters.dateRange.start || filters.dateRange.end
                      ? "Tente ajustar os filtros de busca"
                      : "Ainda não há vendas registradas"
                  }
                />
              ) : (
                <DataTable
                  data={filteredOrders}
                  columns={columns}
                  rowKey="id"
                  className="rounded-none border-0 shadow-none -mx-5 -mb-5"
                  onRowClick={handleViewOrder}
                  pagination={{
                    page: currentPage,
                    pageSize: itemsPerPage,
                    total: filteredOrders.length,
                    onPageChange: setCurrentPage,
                  }}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Modals */}
      <OrderModal
        open={orderModalOpen}
        onOpenChange={setOrderModalOpen}
        order={selectedOrder}
        onPrint={printThermalReceipt}
        onViewCustomer={handleViewCustomer}
        onDelete={() => {
          if (selectedOrder) {
            setOrderToDelete(selectedOrder.id);
            setDeleteDialogOpen(true);
          }
        }}
        hasCustomer={!!selectedOrder?.customer}
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

      {desktopPrintWaiting && (
        <div className="fixed inset-0 z-[100] bg-slate-900/35 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Preparando impressão</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Aguarde um instante. A janela de escolha da impressora será exibida em seguida.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isBitmapPrinting && (
        <div className="fixed inset-0 z-[100] bg-slate-900/35 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-9 w-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Loader2 className="h-5 w-5 text-green-600 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Enviando para a impressora</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Aguarde enquanto o cupom é preparado e enviado para a impressora térmica.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
