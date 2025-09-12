"use client";

import { SalesFilter } from "@/app/components/sales/SalesFilter";
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    searchTerm: "",
    dateRange: { start: "", end: "" }
  });

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

      const response = await fetch(`/api/orders?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch orders");
      const result = await response.json();

      setOrders(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [filters.dateRange]);

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

  const deleteOrder = async (orderId: string) => {
    if (
      !confirm(
        "Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/orders?id=${orderId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete order");
      }

      // Remover o pedido da lista
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Erro ao excluir venda. Por favor, tente novamente.");
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
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedCard delay={0.1}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">
                  Total de Vendas
                </p>
                <p className="text-3xl font-bold text-blue-900">
                  {orders.length}
                </p>
              </div>
              <Receipt className="h-12 w-12 text-blue-600" />
            </div>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">
                  Vendas Confirmadas
                </p>
                <p className="text-3xl font-bold text-green-900">
                  {
                    orders.filter((order) => order.status === "confirmed")
                      .length
                  }
                </p>
              </div>
              <Check className="h-12 w-12 text-green-600" />
            </div>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard delay={0.3}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">
                  Vendas Pendentes
                </p>
                <p className="text-3xl font-bold text-amber-900">
                  {orders.filter((order) => order.status === "pending").length}
                </p>
              </div>
              <Clock className="h-12 w-12 text-amber-600" />
            </div>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard delay={0.4}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">
                  Valor Total
                </p>
                <p className="text-3xl font-bold text-purple-900">
                  {formatCurrency(
                    orders.reduce((sum, order) => sum + order.totalCents, 0)
                  )}
                </p>
              </div>
              <CreditCard className="h-12 w-12 text-purple-600" />
            </div>
          </CardContent>
        </AnimatedCard>
      </div>

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
            {orders.length} venda{orders.length !== 1 ? "s" : ""} encontrada
            {orders.length !== 1 ? "s" : ""}
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 font-semibold text-foreground">
                      Pedido
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground">
                      Cliente
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground">
                      Itens
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground">
                      Valor
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground">
                      Pagamento
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground">
                      Status
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground">
                      Data
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground">
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
                        className="border-b border-border hover:bg-accent/50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="font-mono text-sm text-muted-foreground">
                            #{order.id.slice(0, 8)}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          {order.customer ? (
                            <Link 
                              href={`/admin/customers/${order.customer.id}`}
                              className="flex items-center gap-3 hover:bg-accent p-2 rounded-lg transition-colors"
                            >
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium text-foreground text-sm hover:text-primary transition-colors">
                                  {order.customer.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {order.customer.phone}
                                </div>
                              </div>
                            </Link>
                          ) : (
                            <div className="text-muted-foreground text-sm">
                              Sem cliente
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <div className="text-sm text-foreground font-medium">
                            {order.items.length} item
                            {order.items.length !== 1 ? "s" : ""}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-xs">
                            {order.items
                              .map((item) => item.product.name)
                              .join(", ")}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-bold text-foreground">
                            {formatCurrency(order.totalCents)}
                          </div>
                          {order.discountCents > 0 && (
                            <div className="text-xs text-red-600 font-medium">
                              -{formatCurrency(order.discountCents)}
                            </div>
                          )}
                          {order.paymentMethod === "dinheiro" &&
                            order.cashReceivedCents != null &&
                            order.changeCents != null && (
                              <div className="text-xs text-muted-foreground mt-1">
                                <div>
                                  Recebido:{" "}
                                  {formatCurrency(order.cashReceivedCents)}
                                </div>
                                <div>
                                  Troco: {formatCurrency(order.changeCents)}
                                </div>
                              </div>
                            )}
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center">
                            {(() => {
                              const paymentMethod = order.paymentMethod;
                              const Icon = getPaymentMethodIcon(paymentMethod);
                              const label = getPaymentMethodLabel(paymentMethod);
                              
                              if (Icon) {
                                return (
                                  <div className="flex flex-col items-center gap-1">
                                    <Icon className="h-5 w-5 text-foreground" />
                                    <span className="text-xs text-muted-foreground">{label}</span>
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="text-sm text-foreground text-center">
                                    {label}
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <Badge
                            className={`${
                              getStatusInfo(order.status).color
                            } border px-3 py-1.5 rounded-full text-xs font-medium gap-1.5`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {getStatusInfo(order.status).label}
                          </Badge>
                        </td>

                        <td className="py-4 px-4">
                          <div className="text-sm text-foreground">
                            {formatDate(order.createdAt)}
                          </div>
                        </td>
                        <td className="py-4 px-4">
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
                              onClick={() => deleteOrder(order.id)}
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
    </div>
  );
}
