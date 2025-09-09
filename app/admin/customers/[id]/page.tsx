"use client";

import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Barcode as BarcodeIcon,
  Clock,
  CreditCard,
  Download,
  FileText,
  IdCard,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  Printer,
  QrCode,
  Receipt,
  Trash2,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CustomerPresetModal } from "../../../components/CustomerPresetModal";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";

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
  ficha_payment: { label: "Pagamento de Ficha", icon: Wallet },
  dinheiro: { label: "Dinheiro", icon: Banknote },
  "ficha do cliente": { label: "Ficha do Cliente", icon: IdCard },
  fichadocliente: { label: "Ficha do Cliente", icon: IdCard },
  "cartão débito": { label: "Cartão de Débito", icon: CreditCard },
  "cartão crédito": { label: "Cartão de Crédito", icon: CreditCard },
  "cartao debito": { label: "Cartão de Débito", icon: CreditCard },
  "cartao credito": { label: "Cartão de Crédito", icon: CreditCard },
  "cartãocrédito": { label: "Cartão de Crédito", icon: CreditCard },
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
    balanceAmount: 0, // Novo campo para saldo devedor
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [change, setChange] = useState(0);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");

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

      // Carregar saldo devedor
      const balanceResponse = await fetch(`/api/ficha-payments?customerId=${params.id}`);
      if (!balanceResponse.ok) throw new Error("Failed to fetch balance");
      const balanceData = await balanceResponse.json();

      // Calcular estatísticas
      calculateStats(ordersData.data, balanceData.balanceCents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ordersData: Order[], balanceCents: number) => {
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
      balanceAmount: balanceCents, // Saldo devedor
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
      calculateStats(orders.filter((order) => order.id !== orderId), stats.balanceAmount);
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

  // Função para registrar pagamento de ficha
  const handleFichaPayment = async () => {
    if (!customer || !paymentAmount || !selectedPaymentMethod) return;

    try {
      const amountCents = Math.round(parseFloat(paymentAmount) * 100);
      
      if (amountCents <= 0) {
        alert("Por favor, informe um valor válido.");
        return;
      }

      // Preparar dados do pagamento
      const paymentData: any = {
        customerId: customer.id,
        amountCents,
        paymentMethod: selectedPaymentMethod,
      };

      // Adicionar dados específicos para pagamento em dinheiro
      if (selectedPaymentMethod === "cash" && cashReceived) {
        const cashReceivedCents = Math.round(parseFloat(cashReceived) * 100);
        const changeCents = Math.max(0, cashReceivedCents - amountCents);
        
        paymentData.cashReceivedCents = cashReceivedCents;
        paymentData.changeCents = changeCents;
      }

      const response = await fetch("/api/ficha-payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        throw new Error("Failed to create ficha payment");
      }

      // Fechar o diálogo e recarregar os dados
      setIsPaymentDialogOpen(false);
      setPaymentAmount("");
      setSelectedPaymentMethod("");
      setCashReceived("");
      setChange(0);
      loadCustomer();
    } catch (error) {
      console.error("Error creating ficha payment:", error);
      alert("Erro ao registrar pagamento. Por favor, tente novamente.");
    }
  };

  // Function to generate and open the customer report
  const generateReport = () => {
    if (!customer || !reportStartDate || !reportEndDate) {
      alert("Por favor, preencha todas as datas para gerar o relatório.");
      return;
    }

    if (new Date(reportStartDate) > new Date(reportEndDate)) {
      alert("A data inicial não pode ser maior que a data final.");
      return;
    }

    // Debug log to trace the dates being sent
    console.log('generateReport - Sending dates:', {
      customerId: customer.id,
      startDate: reportStartDate,
      endDate: reportEndDate
    });

    // Build the report URL
    const reportUrl = `/print/customer-report?customerId=${customer.id}&startDate=${reportStartDate}&endDate=${reportEndDate}`;
    
    console.log('generateReport - Report URL:', reportUrl);
    
    // Open in new tab
    window.open(reportUrl, '_blank');
    
    // Close the dialog
    setIsReportDialogOpen(false);
    // Keep the dates for the next time user opens the dialog
  };

  // Set default dates (last 30 days) with optional confirmation
  const setDefaultDates = (confirm = false) => {
    // If dates are already filled and not confirming, ask for confirmation
    if (!confirm && (reportStartDate || reportEndDate)) {
      if (window.confirm('Isso irá substituir as datas atuais pelos últimos 30 dias. Deseja continuar?')) {
        setDefaultDates(true);
      }
      return;
    }
    
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setReportEndDate(today.toISOString().split('T')[0]);
    setReportStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  };

  // Set default dates when dialog opens (only if both dates are empty)
  useEffect(() => {
    if (isReportDialogOpen && !reportStartDate && !reportEndDate) {
      setDefaultDates();
    }
  }, [isReportDialogOpen, reportStartDate, reportEndDate]);

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        {/* Novo card para saldo devedor */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">
                  Saldo Devedor
                </p>
                <p className={`text-xl font-bold ${stats.balanceAmount > 0 ? 'text-red-900' : 'text-green-900'}`}>
                  {formatCurrency(stats.balanceAmount)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

              {/* Gerenciamento de Presets de Produtos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Preset de Produtos
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure produtos que serão adicionados automaticamente ao carrinho quando este cliente for selecionado no PDV.
            </p>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setIsPresetModalOpen(true)}
              variant="outline"
              className="w-full"
            >
              <Package className="h-4 w-4 mr-2" />
              Gerenciar Presets de Produtos
            </Button>
          </CardContent>
        </Card>

      {/* Botões de ação */}
      <div className="flex justify-end gap-3">
        {/* Botão de Relatório */}
        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
              <FileText className="h-4 w-4 mr-2" />
              Relatório de Fechamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Relatório de Fechamento
              </DialogTitle>
              <DialogDescription>
                Gere um relatório imprimível com o consumo e saldo do cliente por período.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="startDate" className="text-sm font-medium">
                  Data Inicial
                </label>
                <Input
                  id="startDate"
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  max={reportEndDate || undefined}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="endDate" className="text-sm font-medium">
                  Data Final
                </label>
                <Input
                  id="endDate"
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  min={reportStartDate || undefined}
                />
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Período pré-definido:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDefaultDates()}
                  className="text-xs"
                >
                  Últimos 30 dias
                </Button>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsReportDialogOpen(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={generateReport}
                  disabled={!reportStartDate || !reportEndDate}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Gerar Relatório
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Botão de Pagamento */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Pagamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Adicionar Pagamento à Ficha</DialogTitle>
              <DialogDescription>
                Registre um pagamento para reduzir o saldo devedor do cliente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Formas de pagamento */}
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Formas de Pagamento
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Dinheiro", value: "cash", icon: Banknote },
                    { label: "Cartão Débito", value: "debit", icon: CreditCard },
                    { label: "Cartão Crédito", value: "credit", icon: CreditCard },
                    { label: "PIX", value: "pix", icon: QrCode },
                  ].map((method) => (
                    <Button
                      key={method.value}
                      variant={
                        selectedPaymentMethod === method.value ? "default" : "outline"
                      }
                      className="h-20 flex flex-col items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-md"
                      onClick={() => {
                        setSelectedPaymentMethod(method.value);
                        // Reset cash fields when changing payment method
                        if (method.value !== "cash") {
                          setCashReceived("");
                          setChange(0);
                        }
                      }}
                    >
                      <method.icon className="h-6 w-6" />
                      <span className="text-sm font-medium">{method.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Detalhes do pagamento */}
              <div className="transition-all duration-300 ease-in-out">
                {selectedPaymentMethod === "cash" ? (
                  <div className="bg-muted rounded-xl p-5 h-full animate-in fade-in slide-in-from-right-4 duration-300">
                    <h3 className="text-lg font-semibold mb-4">
                      Pagamento em Dinheiro
                    </h3>

                    <div className="space-y-5">
                      <div className="flex justify-between items-center p-4 bg-background rounded-lg">
                        <span className="text-muted-foreground">
                          Valor do Pagamento
                        </span>
                        <span className="text-xl font-bold">
                          R$ {parseFloat(paymentAmount || "0").toFixed(2)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="cashReceived"
                          className="text-sm font-medium"
                        >
                          Valor Recebido
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                            R$
                          </span>
                          <Input
                            id="cashReceived"
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={cashReceived}
                            onChange={(e) => {
                              const value = e.target.value;
                              setCashReceived(value);

                              // Calculate change
                              if (value && !isNaN(parseFloat(value)) && paymentAmount) {
                                const received = parseFloat(value);
                                const payment = parseFloat(paymentAmount);
                                const changeAmount = Math.max(
                                  0,
                                  received - payment
                                );
                                setChange(changeAmount);
                              } else {
                                setChange(0);
                              }
                            }}
                            placeholder="0,00"
                            className="pl-10 text-lg h-12"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-4 rounded-lg bg-green-50 border border-green-200">
                        <span className="text-green-800 font-medium">
                          Troco
                        </span>
                        <span className="text-xl font-bold text-green-900">
                          R$ {change.toFixed(2)}
                        </span>
                      </div>

                      {cashReceived &&
                        parseFloat(cashReceived) > 0 &&
                        paymentAmount &&
                        parseFloat(cashReceived) < parseFloat(paymentAmount) && (
                          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 flex-shrink-0" />
                              <span>
                                O valor recebido é menor que o valor do pagamento.
                              </span>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                ) : selectedPaymentMethod ? (
                  <div className="bg-muted rounded-xl p-5 h-full flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="mb-3 p-3 bg-background rounded-full">
                      {(() => {
                        const method = [
                          { label: "Cartão Débito", value: "debit", icon: CreditCard },
                          { label: "Cartão Crédito", value: "credit", icon: CreditCard },
                          { label: "PIX", value: "pix", icon: QrCode },
                        ].find((m) => m.value === selectedPaymentMethod);

                        return method ? (
                          <method.icon className="h-8 w-8 text-primary" />
                        ) : null;
                      })()}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      Pagamento com {selectedPaymentMethod === "debit" ? "Cartão Débito" : 
                                   selectedPaymentMethod === "credit" ? "Cartão Crédito" : "PIX"}
                    </h3>
                    <p className="text-muted-foreground">
                      O valor do pagamento é{" "}
                      <span className="font-bold">R$ {parseFloat(paymentAmount || "0").toFixed(2)}</span>
                      . Confirme os dados e clique em "Registrar Pagamento" para concluir.
                    </p>
                  </div>
                ) : (
                  <div className="bg-muted rounded-xl p-5 h-full flex items-center justify-center text-center animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-3">
                      <Wallet className="h-10 w-10 text-muted-foreground mx-auto" />
                      <h3 className="text-lg font-medium">
                        Selecione uma forma de pagamento
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Escolha uma das opções ao lado para prosseguir com o
                        pagamento.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Valor do Pagamento
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    R$
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPaymentAmount(value);
                      
                      // Recalculate change if cash payment
                      if (selectedPaymentMethod === "cash" && cashReceived && value) {
                        const received = parseFloat(cashReceived);
                        const payment = parseFloat(value);
                        const changeAmount = Math.max(0, received - payment);
                        setChange(changeAmount);
                      }
                    }}
                    placeholder="0,00"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPaymentDialogOpen(false);
                    setSelectedPaymentMethod("");
                    setPaymentAmount("");
                    setCashReceived("");
                    setChange(0);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleFichaPayment}
                  disabled={
                    !paymentAmount || 
                    parseFloat(paymentAmount) <= 0 ||
                    !selectedPaymentMethod ||
                    (selectedPaymentMethod === "cash" && 
                     (!cashReceived || 
                      parseFloat(cashReceived) < parseFloat(paymentAmount || "0")))
                  }
                >
                  Registrar Pagamento
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
                      className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
                        order.paymentMethod === "ficha_payment" 
                          ? "bg-green-50/80 hover:bg-green-100/80" 
                          : ""
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="font-mono text-sm text-gray-600">
                          #{order.id.slice(0, 8)}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        {order.paymentMethod === "ficha_payment" ? (
                          <div className="text-sm text-gray-700">
                            Entrada de Valores
                          </div>
                        ) : (
                          <>
                            <div className="text-sm text-gray-700">
                              {order.items.length} item
                              {order.items.length !== 1 ? "s" : ""}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-xs">
                              {order.items
                                .map((item) => item.product.name)
                                .join(", ")}
                            </div>
                          </>
                        )}
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
                          className={`${getStatusInfo(order.status).color
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

      {/* Modal de Presets de Produtos */}
      <CustomerPresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        customerId={customer.id}
        customerName={customer.name}
      />
    </div>
  );
}
