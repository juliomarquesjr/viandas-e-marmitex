"use client";

import { DailySalesPrintModal } from "@/app/components/DailySalesPrintModal";
import { DeleteConfirmDialog } from "@/app/components/DeleteConfirmDialog";
import { OrderDetailsModal } from "@/app/components/OrderDetailsModal";
import { SalesFilter } from "@/app/components/sales/SalesFilter";
import { SalesAnalysisModal } from "@/app/components/SalesAnalysisModal";
import { useToast } from "@/app/components/Toast";
import { AnimatedCard } from "@/app/components/ui/animated-card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/app/components/ui/card";
import { motion } from "framer-motion";
import {
  Banknote,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  IdCard,
  MoreVertical,
  Package,
  Printer,
  QrCode,
  Receipt,
  Trash2,
  Truck,
  User,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
    product: {
      id: string;
      name: string;
    };
  }[];
};

const statusMap = {
  pending: {
    label: "Pendente",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-800",
  },
  confirmed: {
    label: "Confirmado",
    icon: CheckCircle,
    color: "bg-blue-100 text-blue-800",
  },
  preparing: {
    label: "Preparando",
    icon: Package,
    color: "bg-indigo-100 text-indigo-800",
  },
  ready: { label: "Pronto", icon: Check, color: "bg-green-100 text-green-800" },
  delivered: {
    label: "Entregue",
    icon: Truck,
    color: "bg-purple-100 text-purple-800",
  },
  cancelled: {
    label: "Cancelado",
    icon: XCircle,
    color: "bg-red-100 text-red-800",
  },
};

const paymentMethodMap = {
  // Valores do enum PaymentMethod
  cash: { label: "Dinheiro", icon: Banknote },
  credit: { label: "Cartão de Crédito", icon: CreditCard },
  debit: { label: "Cartão de Débito", icon: CreditCard },
  pix: { label: "PIX", icon: QrCode },
  invoice: { label: "Ficha do Cliente", icon: IdCard },
  ficha_payment: { label: "Pagamento de Ficha", icon: Wallet },
  
  // Valores antigos/alternativos para compatibilidade
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

// Menu de opções por venda
function OrderActionsMenu({
  onViewDetails,
  onPrint,
  onViewCustomer,
  onDelete,
  hasCustomer,
}: {
  onViewDetails: () => void;
  onPrint: () => void;
  onViewCustomer: () => void;
  onDelete: () => void;
  hasCustomer: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({ 
    position: 'fixed',
    zIndex: 50,
    display: 'none'
  });

  // Fecha o menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
        setMenuStyle(prev => ({ ...prev, display: 'none' }));
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Calcular posição do menu quando abrir
  useEffect(() => {
    if (open && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const menuHeight = 200; // Altura aproximada do menu
      
      let top, bottom;
      
      // Verificar se o menu cabe abaixo do botão
      if (rect.bottom + menuHeight <= window.innerHeight) {
        // Abrir para baixo
        top = `${rect.bottom + 4}px`;
        bottom = 'auto';
      } else {
        // Abrir para cima
        top = 'auto';
        bottom = `${window.innerHeight - rect.top + 4}px`;
      }
      
      setMenuStyle({
        position: 'fixed',
        top,
        bottom,
        right: `${window.innerWidth - rect.right}px`,
        zIndex: 1000,
        display: 'block'
      });
    } else {
      setMenuStyle(prev => ({ ...prev, display: 'none' }));
    }
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
        aria-label="Ações da venda"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical className="h-5 w-5 text-muted-foreground" />
      </Button>
      <div 
        role="menu"
        className="w-40 bg-background border border-border rounded-lg shadow-xl py-2 animate-fade-in min-w-max"
        style={menuStyle}
      >
        <button
          role="menuitem"
          className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors duration-200 rounded-lg"
          onClick={() => {
            setOpen(false);
            setMenuStyle(prev => ({ ...prev, display: 'none' }));
            onViewDetails();
          }}
        >
          <FileText className="h-4 w-4 mr-2 text-blue-500" />
          Ver detalhes
        </button>
        <button
          role="menuitem"
          className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors duration-200 rounded-lg"
          onClick={() => {
            setOpen(false);
            setMenuStyle(prev => ({ ...prev, display: 'none' }));
            onPrint();
          }}
        >
          <Printer className="h-4 w-4 mr-2 text-blue-500" />
          Imprimir recibo
        </button>
        {hasCustomer && (
          <button
            role="menuitem"
            className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors duration-200 rounded-lg"
            onClick={() => {
              setOpen(false);
              setMenuStyle(prev => ({ ...prev, display: 'none' }));
              onViewCustomer();
            }}
          >
            <User className="h-4 w-4 mr-2 text-blue-500" />
            Ver cliente
          </button>
        )}
        <div className="border-t border-border my-1"></div>
        <button
          role="menuitem"
          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 rounded-lg"
          onClick={() => {
            setOpen(false);
            setMenuStyle(prev => ({ ...prev, display: 'none' }));
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Remover
        </button>
      </div>
    </div>
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
      start: new Date().toISOString().split('T')[0], // Data de hoje
      end: new Date().toISOString().split('T')[0]    // Data de hoje
    }
  });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  
  // State for daily sales print modal
  const [dailySalesPrintModalOpen, setDailySalesPrintModalOpen] = useState(false);
  
  // State for order details modal
  const [orderDetailsModalOpen, setOrderDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Resumo de produtos agregado a partir de allOrders
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

  // Scroll horizontal do resumo de produtos
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
    const delta = 320; // px por clique
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

      // Buscar todos os dados do período (sem paginação na API)
      params.append("size", "1000"); // Número grande para pegar todos os dados
      params.append("page", "1");

      const response = await fetch(`/api/orders?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch orders");
      const result = await response.json();

      setAllOrders(result.data);
      setTotalOrders(result.data.length);
      
      // Calcular paginação
      const totalPagesCount = Math.ceil(result.data.length / itemsPerPage);
      setTotalPages(totalPagesCount);
      
      // Paginar os dados no frontend
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

  // Reagir às mudanças de página
  useEffect(() => {
    if (allOrders.length > 0) {
      const sliceStart = (currentPage - 1) * itemsPerPage;
      const sliceEnd = sliceStart + itemsPerPage;
      const paginatedOrders = allOrders.slice(sliceStart, sliceEnd);
      setOrders(paginatedOrders);
    }
  }, [currentPage, allOrders]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleFilterChange = (newFilters: { searchTerm: string; dateRange: { start: string; end: string } }) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset para primeira página quando filtros mudarem
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

      // Remover o pedido da lista
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

  // Função para imprimir recibo térmico
  const printThermalReceipt = (orderId: string) => {
    const receiptUrl = `/print/receipt-thermal?orderId=${orderId}`;
    window.open(receiptUrl, '_blank');
  };

  // Handler para visualizar detalhes da venda
  const handleViewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setOrderDetailsModalOpen(true);
  };

  // Handler para acessar ficha do cliente
  const handleViewCustomer = (customerId: string) => {
    router.push(`/admin/customers/${customerId}`);
  };

  const getStatusInfo = (status: string) => {
    return (
      statusMap[status as keyof typeof statusMap] || {
        label: status,
        icon: Clock,
        color: "bg-gray-100 text-gray-800",
      }
    );
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return "Não especificado";
    
    // Verificar se o método está no mapeamento
    const hasMethod = method in paymentMethodMap;
    
    if (hasMethod) {
      return paymentMethodMap[method as keyof typeof paymentMethodMap].label;
    } else {
      // Tentar acessar diretamente
      const directAccess = (paymentMethodMap as any)[method];
      
      if (directAccess && directAccess.label) {
        return directAccess.label;
      }
      
      return method;
    }
  };

  const getPaymentMethodIcon = (method: string | null) => {
    if (!method) return null;
    
    // Verificar se o método está no mapeamento
    const hasMethod = method in paymentMethodMap;
    
    if (hasMethod) {
      return paymentMethodMap[method as keyof typeof paymentMethodMap].icon;
    } else {
      // Tentar acessar diretamente
      const directAccess = (paymentMethodMap as any)[method];
      
      if (directAccess && directAccess.icon) {
        return directAccess.icon;
      }
      
      return null;
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

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Gerenciamento de Vendas
          </h1>
          <p className="text-muted-foreground">Acompanhe todas as vendas realizadas</p>
        </div>
        <Button
          onClick={() => setDailySalesPrintModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          Imprimir Vendas Diárias
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedCard delay={0.1}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
                  Total de Vendas
                </p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {formatCurrency(
                    allOrders.reduce((sum, order) => sum + order.totalCents, 0)
                  )}
                </p>
                <p className="text-sm text-blue-700 mt-2 font-medium">
                  {totalOrders} venda{totalOrders !== 1 ? "s" : ""}
                </p>
              </div>
              <Receipt className="h-10 w-10 text-blue-600 flex-shrink-0" />
            </div>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-600 uppercase tracking-wide">
                  Vendas Avulsas
                </p>
                <p className="text-2xl font-bold text-orange-900 mt-1">
                  {formatCurrency(
                    allOrders
                      .filter((order) => order.customer === null)
                      .reduce((sum, order) => sum + order.totalCents, 0)
                  )}
                </p>
                <p className="text-sm text-orange-700 mt-2 font-medium">
                  {allOrders.filter((order) => order.customer === null).length} venda{allOrders.filter((order) => order.customer === null).length !== 1 ? "s" : ""}
                </p>
              </div>
              <User className="h-10 w-10 text-orange-600 flex-shrink-0" />
            </div>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard delay={0.3}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">
                  Vendas com Ficha
                </p>
                <p className="text-2xl font-bold text-indigo-900 mt-1">
                  {formatCurrency(
                    allOrders
                      .filter((order) => order.paymentMethod === "invoice")
                      .reduce((sum, order) => sum + order.totalCents, 0)
                  )}
                </p>
                <p className="text-sm text-indigo-700 mt-2 font-medium">
                  {allOrders.filter((order) => order.paymentMethod === "invoice").length} venda{allOrders.filter((order) => order.paymentMethod === "invoice").length !== 1 ? "s" : ""}
                </p>
              </div>
              <IdCard className="h-10 w-10 text-indigo-600 flex-shrink-0" />
            </div>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard delay={0.4}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-600 uppercase tracking-wide">
                  Outras Vendas
                </p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {formatCurrency(
                    allOrders
                      .filter((order) => order.customer !== null && order.paymentMethod !== "invoice")
                      .reduce((sum, order) => sum + order.totalCents, 0)
                  )}
                </p>
                <p className="text-sm text-green-700 mt-2 font-medium">
                  {allOrders.filter((order) => order.customer !== null && order.paymentMethod !== "invoice").length} venda{allOrders.filter((order) => order.customer !== null && order.paymentMethod !== "invoice").length !== 1 ? "s" : ""}
                </p>
              </div>
              <CreditCard className="h-10 w-10 text-green-600 flex-shrink-0" />
            </div>
          </CardContent>
        </AnimatedCard>
      </div>

      {/* Botão para Análise Detalhada */}
      <AnimatedCard>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Análise Detalhada das Vendas
              </h3>
              <p className="text-sm text-muted-foreground">
                Visualize a desagregação completa com explicações detalhadas de cada categoria
              </p>
            </div>
            <Button
              onClick={() => setShowDetailsModal(true)}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Análise Detalhada
            </Button>
          </div>
        </CardContent>
      </AnimatedCard>

      {/* Barra de Busca e Filtros */}
      <AnimatedCard>
        <SalesFilter onFilterChange={handleFilterChange} />
      </AnimatedCard>

      {/* Resumo agregado de itens (quantidade por produto) */}
      {allOrders.length > 0 && (
        <AnimatedCard>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-foreground">
              Resumo de Produtos nas Vendas do Período
            </CardTitle>
            <CardDescription>
              Quantidade total de cada produto nas vendas filtradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              if (productSummary.length === 0) {
                return (
                  <div className="text-center py-6">
                    <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nenhum produto encontrado nas vendas</p>
                  </div>
                );
              }

              return (
                <div className="relative">
                  {productSummary.length > 4 && (
                    <>
                      {/* Gradientes de borda */}
                      <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-background to-transparent z-10" />
                      <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-background to-transparent z-10" />

                      {/* Setas */}
                      <button
                        type="button"
                        className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full border bg-background shadow-md flex items-center justify-center transition-colors ${
                          canScrollLeft ? "hover:bg-accent" : "opacity-50 cursor-not-allowed"
                        }`}
                        onClick={() => canScrollLeft && scrollProducts("left")}
                        aria-label="Deslizar para a esquerda"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full border bg-background shadow-md flex items-center justify-center transition-colors ${
                          canScrollRight ? "hover:bg-accent" : "opacity-50 cursor-not-allowed"
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
                    className="overflow-x-auto scroll-smooth no-scrollbar"
                  >
                    <div className="flex gap-4 pr-10 pl-10">
                      {productSummary.map((product) => (
                        <div
                          key={product.productId}
                          className="flex min-w-[240px] items-center p-4 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200 hover:border-blue-300"
                        >
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mr-4">
                            <Package className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">
                              {product.productName}
                            </h3>
                            <div className="mt-1 flex items-center">
                              <span className="text-lg font-bold text-blue-600">
                                {product.totalQuantity}
                              </span>
                              <span className="ml-2 text-xs text-gray-500">
                                unidades
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
            {/* Ocultar scrollbar de forma cross-browser apenas nesta seção */}
            <style jsx>{`
              .no-scrollbar::-webkit-scrollbar { display: none; }
              .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
          </CardContent>
        </AnimatedCard>
      )}

      {/* Tabela de Pedidos */}
      <AnimatedCard>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">
            Lista de Vendas
          </CardTitle>
          <CardDescription>
            {totalOrders} venda{totalOrders !== 1 ? "s" : ""} encontrada{totalOrders !== 1 ? "s" : ""} | Página {currentPage} de {totalPages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-4 text-muted-foreground">Carregando vendas...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Erro ao carregar vendas
              </h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button
                onClick={loadOrders}
                className="bg-primary hover:bg-primary/90"
              >
                Tentar novamente
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50 rounded-t-lg">
                    <th className="text-left py-4 px-6 font-semibold text-foreground text-sm">
                      Cliente
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground text-sm">
                      Itens
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground text-sm">
                      Valor
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground text-sm">
                      Pagamento
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground text-sm">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground text-sm">
                      Data
                    </th>
                    <th className="text-left py-4 px-6 font-semibold text-foreground text-sm w-8">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => {
                    const StatusIcon = getStatusInfo(order.status).icon;
                    return (
                      <motion.tr
                        key={order.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-b border-border hover:bg-accent/50 transition-all duration-200"
                      >
                        <td className="py-4 px-6">
                          {order.customer ? (
                            <Link 
                              href={`/admin/customers/${order.customer.id}`}
                              className="flex items-center gap-3 hover:bg-accent p-2 rounded-lg transition-colors max-w-xs"
                            >
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-foreground text-sm hover:text-primary transition-colors truncate">
                                  {order.customer.name}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {order.customer.phone}
                                </div>
                              </div>
                            </Link>
                          ) : (
                            <div className="flex items-center gap-3 text-muted-foreground text-sm max-w-xs">
                              <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <User className="h-5 w-5 text-gray-400" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-gray-500 truncate">
                                  Venda avulsa
                                </div>
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                              <Package className="h-4 w-4 text-orange-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-foreground">
                                {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {order.items.slice(0, 2).map((item, idx) => (
                                  <span 
                                    key={idx}
                                    className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 border border-orange-200"
                                  >
                                    {item.quantity}x {truncateText(item.product.name, 15)}
                                  </span>
                                ))}
                                {order.items.length > 2 && (
                                  <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
                                    +{order.items.length - 2} mais
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex flex-col items-start">
                            <div className="font-bold text-foreground text-lg">
                              {formatCurrency(order.totalCents)}
                            </div>
                            
                            {/* Detalhes Financeiros - só mostra se houver desconto ou taxa de entrega */}
                            {(order.discountCents > 0 || order.deliveryFeeCents > 0) && (
                              <div className="mt-2 pt-2 border-t border-border space-y-0.5 text-xs">
                                {/* Subtotal - só mostra se houver desconto ou taxa de entrega */}
                                <div className="flex justify-between text-muted-foreground">
                                  <span>Subtotal:</span>
                                  <span>{formatCurrency(order.subtotalCents)}</span>
                                </div>
                                
                                {/* Desconto */}
                                {order.discountCents > 0 && (
                                  <div className="flex justify-between text-red-600 font-medium">
                                    <span>Desc.:</span>
                                    <span>-{formatCurrency(order.discountCents)}</span>
                                  </div>
                                )}
                                
                                {/* Taxa de Entrega */}
                                {order.deliveryFeeCents > 0 && (
                                  <div className="flex justify-between text-muted-foreground">
                                    <span>Entrega:</span>
                                    <span>+{formatCurrency(order.deliveryFeeCents)}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Informações de Pagamento em Dinheiro */}
                            {order.paymentMethod === "cash" &&
                              order.cashReceivedCents != null &&
                              order.changeCents != null && (
                                <div className="mt-2 pt-2 border-t border-border space-y-0.5 text-xs">
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
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const paymentMethod = order.paymentMethod;
                              const Icon = getPaymentMethodIcon(paymentMethod);
                              const label = getPaymentMethodLabel(paymentMethod);
                              
                              if (Icon) {
                                return (
                                  <>
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                      <Icon className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium text-foreground truncate">
                                        {label}
                                      </div>
                                    </div>
                                  </>
                                );
                              } else {
                                return (
                                  <div className="text-sm text-foreground">
                                    {label}
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <Badge
                            className={`${
                              getStatusInfo(order.status).color
                            } border px-3 py-1.5 rounded-full text-xs font-medium gap-1.5`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {getStatusInfo(order.status).label}
                          </Badge>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-foreground">
                              {formatDate(order.createdAt)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString('pt-BR', { weekday: 'short' }).charAt(0).toUpperCase() + new Date(order.createdAt).toLocaleDateString('pt-BR', { weekday: 'short' }).slice(1)}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <OrderActionsMenu
                            onViewDetails={() => handleViewOrderDetails(order)}
                            onPrint={() => printThermalReceipt(order.id)}
                            onViewCustomer={() => handleViewCustomer(order.customer!.id)}
                            onDelete={() => openDeleteDialog(order.id)}
                            hasCustomer={!!order.customer}
                          />
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>

              {orders.length === 0 && (
                <div className="text-center py-12">
                  <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Nenhuma venda encontrada
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {filters.dateRange.start || filters.dateRange.end
                      ? "Tente ajustar os filtros de busca"
                      : "Ainda não há vendas registradas"}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </AnimatedCard>

      {/* Componente de Paginação */}
      {orders.length > 0 && totalPages > 1 && (
        <AnimatedCard>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(endIndex, totalOrders)} de {totalOrders} venda{totalOrders !== 1 ? "s" : ""}
              </div>

              <div className="flex items-center gap-2">
                {/* Botão Anterior */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="h-9 w-9 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Números das páginas */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const pages = [];
                    const maxVisiblePages = 5;
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                    if (endPage - startPage + 1 < maxVisiblePages) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }

                    if (startPage > 1) {
                      pages.push(
                        <Button
                          key={1}
                          variant={currentPage === 1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(1)}
                          className="h-9 w-9 p-0"
                        >
                          1
                        </Button>
                      );
                      if (startPage > 2) {
                        pages.push(
                          <span key="ellipsis1" className="px-2 text-muted-foreground">
                            ...
                          </span>
                        );
                      }
                    }

                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant={currentPage === i ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(i)}
                          className="h-9 w-9 p-0"
                        >
                          {i}
                        </Button>
                      );
                    }

                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(
                          <span key="ellipsis2" className="px-2 text-muted-foreground">
                            ...
                          </span>
                        );
                      }
                      pages.push(
                        <Button
                          key={totalPages}
                          variant={currentPage === totalPages ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(totalPages)}
                          className="h-9 w-9 p-0"
                        >
                          {totalPages}
                        </Button>
                      );
                    }

                    return pages;
                  })()}
                </div>

                {/* Botão Próximo */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="h-9 w-9 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </AnimatedCard>
      )}

      {/* Modal de Detalhes da Venda */}
      <OrderDetailsModal
        open={orderDetailsModalOpen}
        onOpenChange={setOrderDetailsModalOpen}
        order={selectedOrder}
        onPrint={printThermalReceipt}
      />

      {/* Modal de Análise Detalhada */}
      <SalesAnalysisModal 
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        allOrders={allOrders}
        totalOrders={totalOrders}
        filters={filters}
      />
      
      {/* Modal de Confirmação de Exclusão */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Confirmar Exclusão"
        description="Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita."
        onConfirm={confirmDeleteOrder}
        confirmText="Excluir"
        cancelText="Cancelar"
      />
      
      {/* Modal de Impressão de Vendas Diárias */}
      <DailySalesPrintModal
        open={dailySalesPrintModalOpen}
        onOpenChange={setDailySalesPrintModalOpen}
      />
    </div>
  );
}

// Função para truncar texto com ellipsis
const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
