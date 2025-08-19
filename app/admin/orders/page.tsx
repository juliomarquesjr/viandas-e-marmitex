"use client";

import { useState, useEffect } from "react";
import { 
  Receipt, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  XCircle,
  Package,
  Truck,
  Check,
  X,
  Trash2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";

type Order = {
  id: string;
  status: string;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  paymentMethod: string | null;
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
  pending: { label: "Pendente", icon: Clock, color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmado", icon: CheckCircle, color: "bg-blue-100 text-blue-800" },
  preparing: { label: "Preparando", icon: Package, color: "bg-indigo-100 text-indigo-800" },
  ready: { label: "Pronto", icon: Check, color: "bg-green-100 text-green-800" },
  delivered: { label: "Entregue", icon: Truck, color: "bg-purple-100 text-purple-800" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "bg-red-100 text-red-800" }
};

const paymentMethodMap = {
  cash: "Dinheiro",
  credit: "Cartão de Crédito",
  debit: "Cartão de Débito",
  pix: "PIX",
  invoice: "Ficha do Cliente"
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
  const [showFilters, setShowFilters] = useState(false);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      
      if (dateFilter.start) {
        params.append("startDate", dateFilter.start);
      }
      
      if (dateFilter.end) {
        params.append("endDate", dateFilter.end);
      }
      
      const response = await fetch(`/api/orders?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      const result = await response.json();
      setOrders(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, dateFilter]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/orders?id=${orderId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete order');
      }
      
      // Remover o pedido da lista
      setOrders(prev => prev.filter(order => order.id !== orderId));
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Erro ao excluir venda. Por favor, tente novamente.');
    }
  };

  const getStatusInfo = (status: string) => {
    return statusMap[status as keyof typeof statusMap] || { 
      label: status, 
      icon: Clock, 
      color: "bg-gray-100 text-gray-800" 
    };
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return "Não especificado";
    return paymentMethodMap[method as keyof typeof paymentMethodMap] || method;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Vendas</h1>
          <p className="text-gray-600">Acompanhe todas as vendas realizadas</p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total de Vendas</p>
                <p className="text-3xl font-bold text-blue-900">{orders.length}</p>
              </div>
              <Receipt className="h-12 w-12 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Vendas Confirmadas</p>
                <p className="text-3xl font-bold text-green-900">
                  {orders.filter(order => order.status === 'confirmed').length}
                </p>
              </div>
              <Check className="h-12 w-12 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Vendas Pendentes</p>
                <p className="text-3xl font-bold text-amber-900">
                  {orders.filter(order => order.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-12 w-12 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Valor Total</p>
                <p className="text-3xl font-bold text-purple-900">
                  {formatCurrency(orders.reduce((sum, order) => sum + order.totalCents, 0))}
                </p>
              </div>
              <CreditCard className="h-12 w-12 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 shadow-sm">
        {/* Busca Principal */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar por cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 text-sm border-gray-200 bg-white/80 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
          />
        </div>

        {/* Filtros e Ações */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-8 px-3 text-xs border-gray-200 text-gray-600 hover:bg-gray-50 gap-1"
          >
            <Filter className="h-3 w-3" />
            Filtros
          </Button>
        </div>
      </div>

      {/* Filtros Expandidos */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white/80 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-100 focus:border-blue-400"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendente</option>
              <option value="confirmed">Confirmado</option>
              <option value="preparing">Preparando</option>
              <option value="ready">Pronto</option>
              <option value="delivered">Entregue</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Data Início</label>
            <Input
              type="date"
              value={dateFilter.start}
              onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white/80 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-100 focus:border-blue-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Data Fim</label>
            <Input
              type="date"
              value={dateFilter.end}
              onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white/80 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-100 focus:border-blue-400"
            />
          </div>
        </div>
      )}

      {/* Tabela de Pedidos */}
      <Card className="bg-white/80 backdrop-blur-sm border-white/30 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">Lista de Vendas</CardTitle>
          <CardDescription>
            {orders.length} venda{orders.length !== 1 ? 's' : ''} encontrada{orders.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-4 text-gray-600">Carregando vendas...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Erro ao carregar vendas</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={loadOrders} className="bg-primary hover:bg-primary/90">
                Tentar novamente
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Pedido</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Cliente</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Itens</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Valor</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Pagamento</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Data</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const StatusIcon = getStatusInfo(order.status).icon;
                    return (
                      <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-mono text-sm text-gray-600">#{order.id.slice(0, 8)}</div>
                        </td>
                        
                        <td className="py-4 px-4">
                          {order.customer ? (
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 text-sm">{order.customer.name}</div>
                                <div className="text-xs text-gray-500">{order.customer.phone}</div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-500 text-sm">Sem cliente</div>
                          )}
                        </td>
                        
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-700">
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {order.items.map(item => item.product.name).join(', ')}
                          </div>
                        </td>
                        
                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-900">{formatCurrency(order.totalCents)}</div>
                          {order.discountCents > 0 && (
                            <div className="text-xs text-red-600">
                              -{formatCurrency(order.discountCents)}
                            </div>
                          )}
                        </td>
                        
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-700">
                            {getPaymentMethodLabel(order.paymentMethod)}
                          </div>
                        </td>
                        
                        <td className="py-4 px-4">
                          <Badge className={`${getStatusInfo(order.status).color} border px-2 py-1 rounded-full text-xs font-medium gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {getStatusInfo(order.status).label}
                          </Badge>
                        </td>
                        
                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-700">{formatDate(order.createdAt)}</div>
                        </td>
                        <td className="py-4 px-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteOrder(order.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Excluir venda"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {orders.length === 0 && (
                <div className="text-center py-12">
                  <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma venda encontrada</h3>
                  <p className="text-gray-600 mb-4">
                    {statusFilter !== "all" || dateFilter.start || dateFilter.end
                      ? "Tente ajustar os filtros de busca" 
                      : "Ainda não há vendas registradas"
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


