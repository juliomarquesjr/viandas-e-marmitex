"use client";

import { DeleteConfirmDialog } from "@/app/components/DeleteConfirmDialog";
import { DailySalesPrintModal } from "@/app/components/DailySalesPrintModal";
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
  IdCard,
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
import { useEffect, useState } from "react";

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

export default function AdminOrdersPage() {
  const { showToast } = useToast();
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
                        <td className="py-4 px-6 w-8">
                          <div className="flex items-center gap-2">
                            {/* Botão de Imprimir Recibo */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => printThermalReceipt(order.id)}
                              className="h-9 w-9 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-border"
                              title="Imprimir recibo térmico"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            
                            {/* Botão de Excluir */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeleteDialog(order.id)}
                              className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-border"
                              title="Excluir venda"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
