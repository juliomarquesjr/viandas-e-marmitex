"use client";

import {
  ArrowLeft,
  Banknote,
  Barcode as BarcodeIcon,
  Clock,
  CreditCard,
  Download,
  IdCard,
  Mail,
  MapPin,
  Package,
  Phone,
  QrCode,
  Receipt,
  Trash2,
  TrendingUp,
  User,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  doc?: string;
  barcode?: string;
  address?: any;
  active: boolean;
  createdAt: string;
};

type Order = {
  id: string;
  status: string;
  totalCents: number;
  paymentMethod: string | null;
  createdAt: string;
  items: {
    id: string;
    quantity: number;
    product: {
      id: string;
      name: string;
    };
  }[];
};

const statusMap = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "Confirmado", color: "bg-blue-100 text-blue-800" },
  preparing: { label: "Preparando", color: "bg-indigo-100 text-indigo-800" },
  ready: { label: "Pronto", color: "bg-green-100 text-green-800" },
  delivered: { label: "Entregue", color: "bg-purple-100 text-purple-800" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

const paymentMethodMap = {
  cash: { label: "Dinheiro", icon: Banknote },
  credit: { label: "Cartão de Crédito", icon: CreditCard },
  debit: { label: "Cartão de Débito", icon: CreditCard },
  pix: { label: "PIX", icon: QrCode },
  invoice: { label: "Ficha do Cliente", icon: IdCard },
  dinheiro: { label: "Dinheiro", icon: Banknote },
  "ficha do cliente": { label: "Ficha do Cliente", icon: IdCard },
  fichadocliente: { label: "Ficha do Cliente", icon: IdCard },
  "cartão débito": { label: "Cartão de Débito", icon: CreditCard },
  "cartão crédito": { label: "Cartão de Crédito", icon: CreditCard },
  "cartao debito": { label: "Cartão de Débito", icon: CreditCard },
  "cartao credito": { label: "Cartão de Crédito", icon: CreditCard },
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    pendingAmount: 0,
    last30DaysAmount: 0,
    totalOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCustomer = async () => {
    try {
      setLoading(true);

      // Carregar dados do cliente
      const customerResponse = await fetch(`/api/customers/${params.id}`);
      if (!customerResponse.ok) throw new Error("Failed to fetch customer");
      const customerData = await customerResponse.json();
      setCustomer(customerData);

      // Carregar histórico de pedidos
      const ordersResponse = await fetch(`/api/orders?customerId=${params.id}`);
      if (!ordersResponse.ok) throw new Error("Failed to fetch orders");
      const ordersData = await ordersResponse.json();
      setOrders(ordersData.data);

      // Calcular estatísticas
      calculateStats(ordersData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ordersData: Order[]) => {
    // Valor total das compras pendentes
    const pendingAmount = ordersData
      .filter((order) => order.status === "pending")
      .reduce((sum, order) => sum + order.totalCents, 0);

    // Total de compras nos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const last30DaysAmount = ordersData
      .filter((order) => new Date(order.createdAt) >= thirtyDaysAgo)
      .reduce((sum, order) => sum + order.totalCents, 0);

    // Total de pedidos
    const totalOrders = ordersData.length;

    setStats({
      pendingAmount,
      last30DaysAmount,
      totalOrders,
    });
  };

  useEffect(() => {
    if (params.id) {
      loadCustomer();
    }
  }, [params.id]);

  const formatCurrency = (cents: number) => {
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
        color: "bg-gray-100 text-gray-800",
      }
    );
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return "Não especificado";
    return (
      paymentMethodMap[method as keyof typeof paymentMethodMap]?.label || method
    );
  };

  const getPaymentMethodIcon = (method: string | null) => {
    if (!method) return null;
    return paymentMethodMap[method as keyof typeof paymentMethodMap]?.icon;
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

      // Recalcular estatísticas
      calculateStats(orders.filter((order) => order.id !== orderId));
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Erro ao excluir venda. Por favor, tente novamente.");
    }
  };

  // Função para gerar e baixar o código de barras
  const downloadBarcode = async () => {
    if (!customer || !customer.barcode) {
      alert("Este cliente não possui um código de barras definido.");
      return;
    }

    try {
      // Usar uma API online para gerar o código de barras
      const barcodeUrl = `https://barcodeapi.org/api/code128/${customer.barcode}`;

      // Criar um elemento de imagem
      const img = new Image();
      img.crossOrigin = "Anonymous";

      img.onload = () => {
        // Criar um canvas para desenhar a imagem
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          alert("Não foi possível gerar o código de barras.");
          return;
        }

        // Definir o tamanho do canvas
        canvas.width = img.width;
        canvas.height = img.height;

        // Desenhar a imagem no canvas
        ctx.drawImage(img, 0, 0);

        // Converter o canvas para blob e baixar
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `barcode-${customer.name.replace(/\s+/g, "-")}-${
              customer.barcode
            }.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        });
      };

      img.onerror = () => {
        alert("Erro ao gerar o código de barras.");
      };

      // Iniciar o carregamento da imagem
      img.src = barcodeUrl;
    } catch (error) {
      alert("Erro ao gerar o código de barras.");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-gray-600">
            Carregando informações do cliente...
          </p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Erro ao carregar cliente
          </h3>
          <p className="text-gray-600 mb-4">
            {error || "Cliente não encontrado"}
          </p>
          <Button
            onClick={() => router.back()}
            className="bg-primary hover:bg-primary/90"
          >
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="h-10 w-10 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Detalhes do Cliente
          </h1>
          <p className="text-gray-600">Informações e histórico de compras</p>
        </div>
      </div>

      {/* Informações do Cliente */}
      <Card className="bg-white/80 backdrop-blur-sm border-white/30 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Informações Pessoais
          </CardTitle>
          <CardDescription>Detalhes cadastrais do cliente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {customer.name}
              </h2>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{customer.phone}</span>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {customer.doc && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Documento:</span>
                    <span>{customer.doc}</span>
                  </div>
                )}
                {customer.barcode && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <BarcodeIcon className="h-4 w-4" />
                    <span className="font-medium">Código de Barras:</span>
                    <span>{customer.barcode}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadBarcode}
                      className="h-6 px-2 text-xs"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <Badge variant={customer.active ? "default" : "outline"}>
              {customer.active ? "Ativo" : "Inativo"}
            </Badge>
          </div>

          {customer.address && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900">Endereço</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {customer.address.street} {customer.address.number}
                    {customer.address.complement &&
                      `, ${customer.address.complement}`}
                    <br />
                    {customer.address.neighborhood}, {customer.address.city} -{" "}
                    {customer.address.state}
                    <br />
                    CEP: {customer.address.zip}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Novos Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">
                  Compras Pendentes
                </p>
                <p className="text-xl font-bold text-amber-900">
                  {formatCurrency(stats.pendingAmount)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">
                  Últimos 30 Dias
                </p>
                <p className="text-xl font-bold text-blue-900">
                  {formatCurrency(stats.last30DaysAmount)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">
                  Total de Pedidos
                </p>
                <p className="text-xl font-bold text-purple-900">
                  {stats.totalOrders}
                </p>
              </div>
              <Receipt className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Compras */}
      <Card className="bg-white/80 backdrop-blur-sm border-white/30 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Histórico de Compras
          </CardTitle>
          <CardDescription>
            {orders.length} compra{orders.length !== 1 ? "s" : ""} realizada
            {orders.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Pedido
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Itens
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Valor
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Pagamento
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Data
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="font-mono text-sm text-gray-600">
                          #{order.id.slice(0, 8)}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-700">
                          {order.items.length} item
                          {order.items.length !== 1 ? "s" : ""}
                        </div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">
                          {order.items
                            .map((item) => item.product.name)
                            .join(", ")}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900">
                          {formatCurrency(order.totalCents)}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center">
                          {(() => {
                            const Icon = getPaymentMethodIcon(
                              order.paymentMethod
                            );
                            return Icon ? (
                              <Icon className="h-5 w-5 text-gray-700" />
                            ) : (
                              <div className="text-sm text-gray-700">
                                {getPaymentMethodLabel(order.paymentMethod)}
                              </div>
                            );
                          })()}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <Badge
                          className={`${
                            getStatusInfo(order.status).color
                          } border px-2 py-1 rounded-full text-xs font-medium`}
                        >
                          {getStatusInfo(order.status).label}
                        </Badge>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-700">
                          {formatDate(order.createdAt)}
                        </div>
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
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma compra registrada
              </h3>
              <p className="text-gray-600">
                Este cliente ainda não realizou nenhuma compra.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
