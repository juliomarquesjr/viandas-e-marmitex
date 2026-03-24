"use client";

import { DeleteConfirmDialog } from "@/app/components/DeleteConfirmDialog";
import { PreOrderFormDialog } from "@/app/components/PreOrderFormDialog";
import { PreOrderPaymentDialog } from "@/app/components/PreOrderPaymentDialog";
import { PreOrderSummaryModal } from "@/app/components/PreOrderSummaryModal";
import { PreOrderDetailsModal } from "@/app/components/PreOrderDetailsModal";
import { DeliveryStatusBadge } from "@/app/components/DeliveryStatusBadge";
import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { PageHeader } from "@/app/admin/components/layout/PageHeader";
import { DataTable, Column } from "@/app/admin/components/data-display/DataTable";
import { EmptyState } from "@/app/admin/components/data-display/EmptyState";
import { SkeletonTable } from "@/app/admin/components/data-display/LoadingSkeleton";
import { cn } from "@/lib/utils";
import {
  Package,
  Printer,
  ShoppingCart,
  List,
  ListX,
  XCircle,
  User,
  Search,
  Plus,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PreOrderStatsCards } from "./components/PreOrderStatsCards";
import { PreOrdersPageSkeleton } from "./components/PreOrdersSkeletonLoader";
import { PreOrderActionsMenu } from "./components/PreOrderActionsMenu";

// =============================================================================
// TIPOS
// =============================================================================

type PreOrder = {
  id: string;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  notes: string | null;
  createdAt: string;
  customerId: string | null;
  deliveryStatus?: string | null;
  customer: {
    id: string;
    name: string;
    phone: string;
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

type ProductSummary = {
  productId: string;
  productName: string;
  totalQuantity: number;
};

// =============================================================================
// UTILITÁRIOS VISUAIS
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

function getProductInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

type PreOrderItem = {
  id: string;
  quantity: number;
  priceCents: number;
  weightKg?: number | null;
  product: { id: string; name: string; imageUrl?: string | null; pricePerKgCents?: number | null };
};

function ProductAvatars({ items }: { items: PreOrderItem[] }) {
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

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function AdminPreOrdersPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [allPreOrders, setAllPreOrders] = useState<PreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [isPreOrderDialogOpen, setIsPreOrderDialogOpen] = useState(false);
  const [editingPreOrderId, setEditingPreOrderId] = useState<string | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPreOrder, setSelectedPreOrder] = useState<PreOrder | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [preOrderToDelete, setPreOrderToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [productSummaryEnabled, setProductSummaryEnabled] = useState(false);
  const [preOrderDetailsModalOpen, setPreOrderDetailsModalOpen] = useState(false);
  const [preOrderSummaryModalOpen, setPreOrderSummaryModalOpen] = useState(false);

  // Load product summary state from session storage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('productSummaryEnabled');
    if (saved !== null) {
      setProductSummaryEnabled(saved === 'true');
    }
  }, []);

  // Save product summary state to session storage when it changes
  useEffect(() => {
    sessionStorage.setItem('productSummaryEnabled', String(productSummaryEnabled));
  }, [productSummaryEnabled]);

  // Product summary
  const productSummary = useMemo(() => {
    const map: { [key: string]: { productId: string; productName: string; totalQuantity: number } } = {};
    for (const preOrder of allPreOrders) {
      for (const item of preOrder.items) {
        const id = item.product.id;
        if (map[id]) {
          map[id].totalQuantity += item.quantity;
        } else {
          map[id] = { productId: id, productName: item.product.name, totalQuantity: item.quantity };
        }
      }
    }
    return Object.values(map).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [allPreOrders]);

  const loadPreOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/pre-orders`);
      if (!response.ok) throw new Error("Failed to fetch pre-orders");
      const result = await response.json();
      setAllPreOrders(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pre-orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreOrders();
  }, [loadPreOrders]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openModal = params.get('openModal');
    if (openModal === 'true') {
      const url = new URL(window.location.href);
      url.searchParams.delete('openModal');
      window.history.replaceState({}, '', url.toString());

      setTimeout(() => {
        setEditingPreOrderId(null);
        setIsPreOrderDialogOpen(true);
      }, 100);
    }
  }, []);

  const openDeleteDialog = (preOrderId: string) => {
    setPreOrderToDelete(preOrderId);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePreOrder = async () => {
    if (!preOrderToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/pre-orders?id=${preOrderToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete pre-order");
      }

      setAllPreOrders((prev) => prev.filter((preOrder) => preOrder.id !== preOrderToDelete));
      setDeleteDialogOpen(false);
      setPreOrderToDelete(null);
      showToast("Pré-pedido excluído com sucesso!", "success");
    } catch (error) {
      console.error("Error deleting pre-order:", error);
      showToast("Erro ao excluir pré-pedido. Por favor, tente novamente.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const printThermalReceipt = (preOrderId: string) => {
    const receiptUrl = `/print/pre-order-thermal?preOrderId=${preOrderId}`;
    window.open(receiptUrl, '_blank');
  };

  const convertToOrder = async (preOrder: PreOrder) => {
    setSelectedPreOrder(preOrder);
    setIsPaymentDialogOpen(true);
  };

  const handleConfirmConversion = async (paymentMethod: string, discountCents: number, cashReceived?: number, change?: number) => {
    if (!selectedPreOrder) return;

    setIsConverting(true);

    try {
      const paymentMethodMap: { [key: string]: string } = {
        "cash": "cash",
        "debit": "debit",
        "credit": "credit",
        "pix": "pix",
        "ficha_payment": "invoice"
      };

      const apiPaymentMethod = paymentMethodMap[paymentMethod] || paymentMethod;

      if (discountCents !== selectedPreOrder.discountCents) {
        const updateResponse = await fetch(`/api/pre-orders`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: selectedPreOrder.id,
            customerId: selectedPreOrder.customerId,
            items: selectedPreOrder.items.map(item => ({
              productId: item.product.id,
              quantity: item.quantity,
              priceCents: item.priceCents
            })),
            discountCents: discountCents,
            deliveryFeeCents: selectedPreOrder.deliveryFeeCents,
            notes: selectedPreOrder.notes,
            totalCents: selectedPreOrder.subtotalCents - discountCents + selectedPreOrder.deliveryFeeCents
          }),
        });

        if (!updateResponse.ok) {
          throw new Error('Failed to update pre-order discount');
        }
      }

      const conversionData: any = {
        preOrderId: selectedPreOrder.id,
        paymentMethod: apiPaymentMethod
      };

      if (apiPaymentMethod === "cash" && cashReceived !== undefined && change !== undefined) {
        conversionData.cashReceived = cashReceived;
        conversionData.change = change;
      }

      const response = await fetch('/api/pre-orders?convert=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversionData),
      });

      if (!response.ok) {
        throw new Error('Failed to convert pre-order to order');
      }

      setIsPaymentDialogOpen(false);
      setSelectedPreOrder(null);
      loadPreOrders();
      showToast('Pré-pedido convertido em venda com sucesso!', 'success');
    } catch (error) {
      console.error("Error converting pre-order to order:", error);
      showToast("Erro ao converter pré-pedido em venda. Por favor, tente novamente.", 'error');
    } finally {
      setIsConverting(false);
    }
  };

  const openNewPreOrderDialog = () => {
    setEditingPreOrderId(null);
    setIsPreOrderDialogOpen(true);
  };

  const openEditPreOrderDialog = (preOrderId: string) => {
    setEditingPreOrderId(preOrderId);
    setIsPreOrderDialogOpen(true);
  };

  const handleViewPreOrderDetails = (preOrder: PreOrder) => {
    setSelectedPreOrder(preOrder);
    setPreOrderDetailsModalOpen(true);
  };

  const handleViewPreOrderSummary = (preOrder: PreOrder) => {
    setSelectedPreOrder(preOrder);
    setPreOrderSummaryModalOpen(true);
  };

  const handleViewCustomer = (customerId: string) => {
    router.push(`/admin/customers/${customerId}`);
  };

  // Filtrar pré-pedidos
  const filteredPreOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return allPreOrders;
    }

    return allPreOrders.filter((preOrder) => {
      const customerName = preOrder.customer?.name?.toLowerCase() ?? "";
      const customerPhone = preOrder.customer?.phone?.toLowerCase() ?? "";
      const productNames = preOrder.items.map(item => item.product.name.toLowerCase()).join(" ");

      return (
        customerName.includes(normalizedSearch) ||
        customerPhone.includes(normalizedSearch) ||
        productNames.includes(normalizedSearch)
      );
    });
  }, [allPreOrders, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredPreOrders.length / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Table columns
  const columns: Column<PreOrder>[] = [
    {
      key: "customer",
      header: "Cliente",
      sortable: true,
      render: (_value, preOrder) => (
        preOrder.customer ? (
          <Link
            href={`/admin/customers/${preOrder.customer.id}`}
            className="flex items-center gap-3 hover:bg-slate-50 p-2 rounded-lg transition-colors max-w-xs"
          >
            <div className="h-9 w-9 rounded-full flex-shrink-0 overflow-hidden bg-blue-100 flex items-center justify-center">
              {preOrder.customer.imageUrl ? (
                <img
                  src={preOrder.customer.imageUrl}
                  alt={preOrder.customer.name}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-blue-600" />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-slate-900 text-sm hover:text-blue-600 transition-colors truncate">
                {preOrder.customer.name}
              </div>
              <div className="text-xs text-slate-500 truncate">
                {preOrder.customer.phone}
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
      render: (_value, preOrder) => (
        <div className="flex items-center gap-3">
          {preOrder.items.length > 0 && <ProductAvatars items={preOrder.items} />}
          <div className="min-w-0">
            <p className="text-slate-700 font-medium text-xs mb-0.5">
              {preOrder.items.length} item{preOrder.items.length !== 1 ? "s" : ""}
            </p>
            <div className="space-y-0.5">
              {preOrder.items.slice(0, 2).map((item, idx) => (
                <p key={idx} className="text-[11px] text-slate-400 truncate max-w-[160px]">
                  {item.weightKg && Number(item.weightKg) > 0
                    ? `${Number(item.weightKg).toFixed(3)} kg × ${item.product.name}`
                    : `${item.quantity}× ${item.product.name}`}
                </p>
              ))}
              {preOrder.items.length > 2 && (
                <p className="text-[11px] text-slate-400 italic">+{preOrder.items.length - 2} mais...</p>
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
      render: (_value, preOrder) => (
        <div>
          <p className="font-semibold text-slate-900 text-sm">
            {formatCurrency(preOrder.totalCents)}
          </p>
          {preOrder.discountCents > 0 && (
            <p className="text-[11px] text-red-500">-{formatCurrency(preOrder.discountCents)}</p>
          )}
          {preOrder.deliveryFeeCents > 0 && (
            <p className="text-[11px] text-slate-400">+{formatCurrency(preOrder.deliveryFeeCents)} entrega</p>
          )}
        </div>
      ),
    },
    {
      key: "notes",
      header: "Descrição",
      render: (_value, preOrder) => (
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          </div>
          <div className="text-sm text-slate-900 max-w-xs truncate">
            {preOrder.notes || "-"}
          </div>
        </div>
      ),
    },
    {
      key: "deliveryStatus",
      header: "Status",
      align: "center",
      render: (_value, preOrder) => (
        preOrder.deliveryStatus ? (
          <DeliveryStatusBadge status={preOrder.deliveryStatus as any} />
        ) : (
          <span className="text-xs text-slate-500">-</span>
        )
      ),
    },
    {
      key: "createdAt",
      header: "Data",
      sortable: true,
      render: (_value, preOrder) => (
        <p className="text-[11px] text-slate-500 whitespace-nowrap">
          {formatDate(preOrder.createdAt)}
        </p>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "60px",
      render: (_value, preOrder) => (
        <PreOrderActionsMenu
          onEdit={() => openEditPreOrderDialog(preOrder.id)}
          onViewDetails={() => handleViewPreOrderDetails(preOrder)}
          onViewSummary={() => handleViewPreOrderSummary(preOrder)}
          onPrint={() => printThermalReceipt(preOrder.id)}
          onConvert={() => convertToOrder(preOrder)}
          onTrack={() => router.push(`/admin/pre-orders/${preOrder.id}/tracking`)}
          onDelete={() => openDeleteDialog(preOrder.id)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Pré-Pedidos"
        description="Acompanhe todos os pré-pedidos cadastrados"
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
            <Button size="sm" onClick={openNewPreOrderDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Pré-Pedido
            </Button>
          </div>
        }
      />

      {loading && allPreOrders.length === 0 ? (
        <PreOrdersPageSkeleton />
      ) : (
        <>
          <PreOrderStatsCards preOrders={allPreOrders} />

          {/* Busca */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2">
                <div className="flex-1 max-w-md">
                  <Input
                    placeholder="Buscar por cliente ou produto..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    leftIcon={<Search className="h-4 w-4" />}
                    rightIcon={
                      searchInput ? (
                        <button
                          type="button"
                          onClick={() => setSearchInput("")}
                          className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                          aria-label="Limpar busca"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      ) : undefined
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {allPreOrders.length > 0 && productSummary.length > 0 && productSummaryEnabled && (
            <Card variant="outline">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Resumo de Produtos
                </CardTitle>
                <CardDescription>
                  Quantidade total de cada produto nos pré-pedidos do período
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
                Lista de Pré-Pedidos
              </CardTitle>
              <CardDescription>
                {filteredPreOrders.length} pré-pedido{filteredPreOrders.length !== 1 ? "s" : ""} encontrado{filteredPreOrders.length !== 1 ? "s" : ""}
                {searchTerm.trim() ? ` de ${allPreOrders.length}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <SkeletonTable rows={5} columns={5} hasActions />
              ) : error ? (
                <EmptyState
                  icon={XCircle}
                  title="Erro ao carregar pré-pedidos"
                  description={error}
                  action={{
                    label: "Tentar novamente",
                    onClick: loadPreOrders,
                  }}
                />
              ) : filteredPreOrders.length === 0 ? (
                <EmptyState
                  icon={ShoppingCart}
                  title="Nenhum pré-pedido encontrado"
                  description={
                    searchTerm.trim()
                      ? "Tente ajustar os filtros de busca"
                      : "Ainda não há pré-pedidos registrados"
                  }
                />
              ) : (
                <DataTable
                  data={filteredPreOrders}
                  columns={columns}
                  rowKey="id"
                  className="rounded-none border-0 shadow-none -mx-5 -mb-5"
                  onRowClick={handleViewPreOrderDetails}
                  pagination={{
                    page: currentPage,
                    pageSize: itemsPerPage,
                    total: filteredPreOrders.length,
                    onPageChange: setCurrentPage,
                  }}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Modals */}
      <PreOrderSummaryModal
        open={preOrderSummaryModalOpen}
        onOpenChange={setPreOrderSummaryModalOpen}
        preOrder={selectedPreOrder}
      />

      <PreOrderDetailsModal
        open={preOrderDetailsModalOpen}
        onOpenChange={setPreOrderDetailsModalOpen}
        preOrder={selectedPreOrder}
        onPrint={printThermalReceipt}
        onEdit={(id) => { setPreOrderDetailsModalOpen(false); openEditPreOrderDialog(id); }}
        onConvert={(preOrder) => { setPreOrderDetailsModalOpen(false); convertToOrder(preOrder); }}
        onTrack={(id) => { setPreOrderDetailsModalOpen(false); router.push(`/admin/pre-orders/${id}/tracking`); }}
        onDelete={(id) => { setPreOrderDetailsModalOpen(false); openDeleteDialog(id); }}
      />

      <PreOrderFormDialog
        open={isPreOrderDialogOpen}
        onOpenChange={setIsPreOrderDialogOpen}
        preOrderId={editingPreOrderId || undefined}
        onPreOrderSaved={loadPreOrders}
      />

      {selectedPreOrder && (
        <PreOrderPaymentDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          preOrder={selectedPreOrder}
          onConfirm={handleConfirmConversion}
          isConverting={isConverting}
        />
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Confirmar Exclusão"
        description="Tem certeza que deseja excluir este pré-pedido? Esta ação não pode ser desfeita."
        onConfirm={confirmDeletePreOrder}
        confirmText="Excluir"
        cancelText="Cancelar"
        isLoading={isDeleting}
      />
    </div>
  );
}
