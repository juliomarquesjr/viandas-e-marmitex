"use client";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { PageHeader } from "@/app/admin/components/layout/PageHeader";
import { DataTable, Column } from "@/app/admin/components/data-display/DataTable";
import { EmptyState } from "@/app/admin/components/data-display/EmptyState";
import { SkeletonTable } from "@/app/admin/components/data-display/LoadingSkeleton";
import { DeleteConfirmDialog } from "@/app/components/DeleteConfirmDialog";
import { PreOrderFormDialog } from "@/app/components/PreOrderFormDialog";
import { PreOrderPaymentDialog } from "@/app/components/PreOrderPaymentDialog";
import { DeliveryStatusBadge } from "@/app/components/DeliveryStatusBadge";
import { useToast } from "@/app/components/Toast";
import {
  MoreVertical,
  Package,
  Printer,
  Receipt,
  ShoppingCart,
  Tag,
  Ticket,
  Trash2,
  User,
  Users,
  X,
  MapPin,
  Plus,
  TrendingUp,
  Search,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  deliveryStatus?: string;
  customer: {
    id: string;
    name: string;
    phone: string;
  } | null;
  items: {
    id: string;
    quantity: number;
    priceCents: number;
    product: {
      id: string;
      name: string;
    };
  }[];
};

type ProductSummary = {
  productId: string;
  productName: string;
  totalQuantity: number;
};

// =============================================================================
// MENU DE AÇÕES
// =============================================================================

function PreOrderActionsMenu({
  onEdit,
  onDelete,
  onPrint,
  onConvert,
  onTrack,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onPrint: () => void;
  onConvert: () => void;
  onTrack: () => void;
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
            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            <Package className="h-4 w-4 mr-2 text-slate-400" />
            Editar
          </button>

          <button
            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onPrint();
            }}
          >
            <Printer className="h-4 w-4 mr-2 text-slate-400" />
            Imprimir recibo
          </button>

          <button
            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onConvert();
            }}
          >
            <Receipt className="h-4 w-4 mr-2 text-slate-400" />
            Converter em venda
          </button>

          <button
            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onTrack();
            }}
          >
            <MapPin className="h-4 w-4 mr-2 text-slate-400" />
            Rastrear Entrega
          </button>

          <button
            className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function AdminPreOrdersPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [preOrders, setPreOrders] = useState<PreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // Estados de busca e filtros
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in_progress" | "delivered" | "cancelled">("all");
  const [filters, setFilters] = useState({
    searchTerm: "",
    dateRange: { start: "", end: "" }
  });

  const [isPreOrderDialogOpen, setIsPreOrderDialogOpen] = useState(false);
  const [editingPreOrderId, setEditingPreOrderId] = useState<string | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPreOrder, setSelectedPreOrder] = useState<PreOrder | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [preOrderToDelete, setPreOrderToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadPreOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.dateRange.start) {
        params.append("startDate", filters.dateRange.start);
      }

      if (filters.dateRange.end) {
        params.append("endDate", filters.dateRange.end);
      }

      const response = await fetch(`/api/pre-orders?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch pre-orders");
      const result = await response.json();

      setPreOrders(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pre-orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreOrders();
  }, []);

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);
    return () => clearTimeout(timer);
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

  const handleFilterChange = (newFilters: { searchTerm: string; dateRange: { start: string; end: string } }) => {
    setFilters(newFilters);
  };

  const formatCurrency = (cents: number | null) => {
    if (cents === null || cents === undefined) return "N/A";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const calculateProductSummary = (): ProductSummary[] => {
    const productMap: { [key: string]: ProductSummary } = {};

    filteredPreOrders.forEach(preOrder => {
      preOrder.items.forEach(item => {
        const productId = item.product.id;
        if (productMap[productId]) {
          productMap[productId].totalQuantity += item.quantity;
        } else {
          productMap[productId] = {
            productId: productId,
            productName: item.product.name,
            totalQuantity: item.quantity
          };
        }
      });
    });

    return Object.values(productMap).sort((a, b) => b.totalQuantity - a.totalQuantity);
  };

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

      setPreOrders((prev) => prev.filter((preOrder) => preOrder.id !== preOrderToDelete));
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openNewPreOrderDialog = () => {
    setEditingPreOrderId(null);
    setIsPreOrderDialogOpen(true);
  };

  const openEditPreOrderDialog = (preOrderId: string) => {
    setEditingPreOrderId(preOrderId);
    setIsPreOrderDialogOpen(true);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Filtrar pré-pedidos
  const filteredPreOrders = preOrders.filter((preOrder) => {
    const matchesSearch =
      !searchTerm ||
      preOrder.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      preOrder.customer?.phone.includes(searchTerm) ||
      preOrder.items.some(item => item.product.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      statusFilter === "all" ||
      preOrder.deliveryStatus === statusFilter ||
      (!preOrder.deliveryStatus && statusFilter === "pending");
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const totalValue = filteredPreOrders.reduce((sum, preOrder) => sum + preOrder.totalCents, 0);
  const itemsWithDiscount = filteredPreOrders.filter((preOrder) => preOrder.discountCents > 0).length;
  const totalDiscount = filteredPreOrders.reduce((sum, preOrder) => sum + preOrder.discountCents, 0);

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
            className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg transition-colors max-w-xs"
          >
            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-gray-900 text-sm hover:text-blue-600 transition-colors truncate">
                {preOrder.customer.name}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {preOrder.customer.phone}
              </div>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 text-gray-500 text-sm max-w-xs p-2">
            <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Users className="h-4 w-4 text-gray-400" />
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
      key: "items",
      header: "Itens",
      render: (_value, preOrder) => (
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
            <Package className="h-4 w-4 text-orange-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-900">
              {preOrder.items.length} item{preOrder.items.length !== 1 ? "s" : ""}
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {preOrder.items.slice(0, 2).map((item, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-xs"
                >
                  {item.quantity}x {truncateText(item.product.name, 15)}
                </Badge>
              ))}
              {preOrder.items.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{preOrder.items.length - 2} mais
                </Badge>
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
        <div className="flex flex-col items-start">
          <div className="font-bold text-gray-900">
            {formatCurrency(preOrder.totalCents)}
          </div>
          {preOrder.discountCents > 0 && (
            <div className="text-xs text-red-600 font-medium mt-1">
              Desconto: -{formatCurrency(preOrder.discountCents)}
            </div>
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
          <div className="text-sm text-gray-900 max-w-xs truncate">
            {preOrder.notes || "-"}
          </div>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Data",
      sortable: true,
      render: (_value, preOrder) => (
        <div className="flex flex-col">
          <div className="text-sm font-medium text-gray-900">
            {formatDate(preOrder.createdAt)}
          </div>
          <div className="text-xs text-gray-500">
            {new Date(preOrder.createdAt).toLocaleDateString('pt-BR', { weekday: 'short' })}
          </div>
        </div>
      ),
    },
    {
      key: "deliveryStatus",
      header: "Status",
      render: (_value, preOrder) => (
        <div className="flex flex-col gap-2">
          {preOrder.deliveryStatus ? (
            <DeliveryStatusBadge
              status={preOrder.deliveryStatus as any}
            />
          ) : (
            <span className="text-xs text-gray-500">-</span>
          )}
          {preOrder.deliveryStatus &&
            preOrder.deliveryStatus !== "pending" &&
            preOrder.deliveryStatus !== "cancelled" && (
            <Link href={`/admin/pre-orders/${preOrder.id}/tracking`}>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                Rastrear
              </Button>
            </Link>
          )}
        </div>
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
          <Button onClick={openNewPreOrderDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Pré-Pedido
          </Button>
        }
      />

      {/* Estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-900">{filteredPreOrders.length}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Valor Total</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalValue)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Com Desconto</p>
                <p className="text-2xl font-bold text-amber-600">{itemsWithDiscount}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Tag className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Desconto</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDiscount)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Ticket className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Busca */}
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Buscar por cliente, telefone ou produto..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>

            {/* Filtro de Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendente</option>
              <option value="in_progress">Em Progresso</option>
              <option value="delivered">Entregue</option>
              <option value="cancelled">Cancelado</option>
            </select>

            {/* Limpar Filtros */}
            {(searchInput || statusFilter !== "all") && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchInput("");
                  setStatusFilter("all");
                }}
              >
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Summary */}
      {filteredPreOrders.length > 0 && (
        <Card variant="outline">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Resumo de Produtos
            </CardTitle>
            <CardDescription>
              Quantidade total de cada produto em todos os pré-pedidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {calculateProductSummary().map((product) => (
                <div
                  key={product.productId}
                  className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100 hover:shadow-md transition-all hover:border-blue-200"
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
          </CardContent>
        </Card>
      )}

      {/* Pre-Orders Table */}
      {loading ? (
        <SkeletonTable rows={5} columns={6} hasActions />
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadPreOrders}>Tentar novamente</Button>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          data={filteredPreOrders}
          columns={columns}
          rowKey="id"
          emptyMessage="Nenhum pré-pedido encontrado"
          rowActions={(preOrder) => (
            <PreOrderActionsMenu
              onEdit={() => openEditPreOrderDialog(preOrder.id)}
              onDelete={() => openDeleteDialog(preOrder.id)}
              onPrint={() => printThermalReceipt(preOrder.id)}
              onConvert={() => convertToOrder(preOrder)}
              onTrack={() => router.push(`/admin/pre-orders/${preOrder.id}/tracking`)}
            />
          )}
        />
      )}

      {/* Modals */}
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
