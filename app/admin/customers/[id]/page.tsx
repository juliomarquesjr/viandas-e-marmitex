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
  MapPin,
  Package,
  Phone,
  Plus,
  Printer,
  QrCode,
  Receipt,
  Trash2,
  User,
  Wallet
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CustomerPresetModal } from "../../../components/CustomerPresetModal";
import { PDFGeneratorComponent } from "../../../components/PDFGenerator";
import { useToast } from "../../../components/Toast";
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
  subtotalCents: number;
  discountCents: number;
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
  type?: string; // Adicionado para identificar ficha payments
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
  const { showToast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    pendingAmount: 0,
    totalOrders: 0,
    balanceAmount: 0, // Saldo devedor
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [change, setChange] = useState(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");

  // Estados para filtro de pedidos
  const [orderFilter, setOrderFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [filteredStats, setFilteredStats] = useState({
    pendingAmount: 0,
    totalOrders: 0,
  });

  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [paginatedOrders, setPaginatedOrders] = useState<Order[]>([]);

  const loadCustomer = async () => {
    try {
      setLoading(true);

      // Carregar dados do cliente
      const customerResponse = await fetch(`/api/customers/${params.id}`);
      if (!customerResponse.ok) throw new Error("Failed to fetch customer");
      const customerData = await customerResponse.json();
      setCustomer(customerData);

      // Carregar histórico de pedidos (excluindo ficha payments) - sem limitação de paginação
      const ordersResponse = await fetch(`/api/orders?customerId=${params.id}&size=1000`);
      if (!ordersResponse.ok) throw new Error("Failed to fetch orders");
      const ordersData = await ordersResponse.json();

      // Carregar histórico de pagamentos de ficha
      const fichaPaymentsResponse = await fetch(`/api/ficha-payments?customerId=${params.id}`);
      if (!fichaPaymentsResponse.ok) throw new Error("Failed to fetch ficha payments");
      const fichaPaymentsData = await fichaPaymentsResponse.json();

      // Debug logging
      console.log('Orders data:', ordersData.data);
      console.log('Orders data length:', ordersData.data?.length);
      console.log('Ficha payments data:', fichaPaymentsData.fichaPayments);
      console.log('Ficha payments data length:', fichaPaymentsData.fichaPayments?.length);

      // Combinar pedidos e pagamentos de ficha
      const allTransactions = [
        ...ordersData.data,
        ...fichaPaymentsData.fichaPayments.map((payment: any) => ({
          ...payment,
          items: [], // Pagamentos de ficha não têm itens
          subtotalCents: payment.totalCents,
          discountCents: 0,
          deliveryFeeCents: 0,
          status: 'confirmed', // Pagamentos de ficha são sempre confirmados
          type: 'ficha_payment' // Adicionar tipo para identificação
        }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      console.log('All transactions:', allTransactions);
      console.log('All transactions length:', allTransactions.length);
      console.log('Date range of transactions:', {
        earliest: allTransactions.length > 0 ? new Date(Math.min(...allTransactions.map(t => new Date(t.createdAt).getTime()))).toISOString() : 'N/A',
        latest: allTransactions.length > 0 ? new Date(Math.max(...allTransactions.map(t => new Date(t.createdAt).getTime()))).toISOString() : 'N/A'
      });

      setOrders(allTransactions);

      // Calcular estatísticas
      calculateStats(ordersData.data, fichaPaymentsData.balanceCents);
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

    // Total de pedidos
    const totalOrders = ordersData.length;

    setStats({
      pendingAmount,
      totalOrders,
      balanceAmount: balanceCents, // Saldo devedor
    });
  };

  // Função para filtrar pedidos por período
  const filterOrdersByPeriod = (orders: Order[], filterType: string) => {
    if (filterType === "all") return orders;

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (filterType) {
      case "current-month":
        // Início do mês atual (dia 1, 00:00:00)
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        // Fim do mês atual (último dia, 23:59:59)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case "previous-month":
        // Início do mês anterior (dia 1, 00:00:00)
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        // Fim do mês anterior (último dia, 23:59:59)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case "custom":
        if (!customStartDate || !customEndDate) return orders;
        // Início do dia selecionado (00:00:00)
        startDate = new Date(customStartDate + "T00:00:00.000");
        // Fim do dia selecionado (23:59:59)
        endDate = new Date(customEndDate + "T23:59:59.999");
        break;
      default:
        return orders;
    }

    console.log('Filter period:', {
      filterType,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalOrders: orders.length
    });

    const filtered = orders.filter((order) => {
      // Ensure the order has a createdAt field
      if (!order.createdAt) return false;

      const orderDate = new Date(order.createdAt);

      // Normalizar as datas para comparação (remover milissegundos)
      const orderTime = orderDate.getTime();
      const startTime = startDate.getTime();
      const endTime = endDate.getTime();

      const isInRange = orderTime >= startTime && orderTime <= endTime;

      // Debug log for first few orders
      if (orders.indexOf(order) < 5) {
        console.log('Order filter check:', {
          orderId: order.id.slice(0, 8),
          orderDate: orderDate.toISOString(),
          orderTime,
          startTime,
          endTime,
          isInRange
        });
      }

      return isInRange;
    });

    console.log(`Filtered ${filtered.length} orders from ${orders.length} total`);
    return filtered;
  };

  // Função para alterar o filtro
  const handleFilterChange = (newFilter: string) => {
    setOrderFilter(newFilter);
    // Reset custom dates when changing from custom filter
    if (newFilter !== "custom") {
      setCustomStartDate("");
      setCustomEndDate("");
    }
  };

  // Aplicar filtros aos pedidos
  useEffect(() => {
    const filtered = filterOrdersByPeriod(orders, orderFilter);
    console.log('Filtered orders:', filtered); // Debug logging
    setFilteredOrders(filtered);

    // Reset para primeira página quando filtros mudarem
    setCurrentPage(1);

    // Calcular estatísticas dos pedidos filtrados
    const pendingAmount = filtered
      .filter((order) => order.status === "pending")
      .reduce((sum, order) => sum + order.totalCents, 0);

    // Contar apenas pedidos regulares, não incluir pagamentos de ficha
    const totalOrders = filtered.filter(order =>
      !(order.type === "ficha_payment" || order.paymentMethod === "ficha_payment")
    ).length;

    setFilteredStats({
      pendingAmount,
      totalOrders,
    });
  }, [orders, orderFilter, customStartDate, customEndDate]);

  // Aplicar paginação aos pedidos filtrados
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filteredOrders.slice(startIndex, endIndex);
    setPaginatedOrders(paginated);
  }, [filteredOrders, currentPage, itemsPerPage]);

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
    // Find the order to determine if it's a ficha payment
    const orderToDelete = orders.find(order => order.id === orderId);
    const isFichaPayment = orderToDelete?.type === "ficha_payment" || orderToDelete?.paymentMethod === "ficha_payment";

    const confirmationMessage = isFichaPayment
      ? "Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita."
      : "Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.";

    if (!confirm(confirmationMessage)) {
      return;
    }

    try {
      // Use the appropriate API endpoint based on order type
      const endpoint = isFichaPayment ? `/api/ficha-payments?id=${orderId}` : `/api/orders?id=${orderId}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete order");
      }

      // Remover o pedido da lista
      setOrders((prev) => prev.filter((order) => order.id !== orderId));

      // Se for um pagamento de ficha, recarregar os dados para atualizar o saldo devedor
      if (isFichaPayment) {
        loadCustomer();
      } else {
        // Para vendas normais, apenas recalcular as estatísticas locais
        calculateStats(orders.filter((order) => order.id !== orderId), stats.balanceAmount);
      }

      showToast(isFichaPayment ? "Pagamento excluído com sucesso!" : "Venda excluída com sucesso!", "success");
    } catch (error) {
      console.error("Error deleting order:", error);
      showToast(`Erro ao excluir: ${(error as Error).message || "Por favor, tente novamente."}`, "error");
    }
  };

  // Função para gerar e baixar o código de barras
  const downloadBarcode = async () => {
    if (!customer || !customer.barcode) {
      showToast("Este cliente não possui um código de barras definido.", "warning");
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
          showToast("Não foi possível gerar o código de barras.", "error");
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
            a.download = `barcode-${customer.name.replace(/\s+/g, "-")}-${customer.barcode
              }.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        });
      };

      img.onerror = () => {
        showToast("Erro ao gerar o código de barras.", "error");
      };

      // Iniciar o carregamento da imagem
      img.src = barcodeUrl;
    } catch (error) {
      showToast("Erro ao gerar o código de barras.", "error");
      console.error(error);
    }
  };

  // Função para registrar pagamento de ficha
  const handleFichaPayment = async () => {
    if (!customer || !paymentAmount || !selectedPaymentMethod) return;

    try {
      setIsProcessingPayment(true);
      const amountCents = Math.round(parseFloat(paymentAmount) * 100);

      if (amountCents <= 0) {
        showToast("Por favor, informe um valor válido.", "error");
        setIsProcessingPayment(false);
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

      // Mostrar toast de sucesso
      showToast(`Pagamento de ${formatCurrency(amountCents)} registrado com sucesso!`, "success");
    } catch (error) {
      console.error("Error creating ficha payment:", error);
      showToast("Erro ao registrar pagamento. Por favor, tente novamente.", "error");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Function to generate and open the customer report
  const generateReport = () => {
    if (!customer || !reportStartDate || !reportEndDate) {
      showToast("Por favor, preencha todas as datas para gerar o relatório.", "warning");
      return;
    }

    if (new Date(reportStartDate) > new Date(reportEndDate)) {
      showToast("A data inicial não pode ser maior que a data final.", "error");
      return;
    }

    // Debug log to trace the dates being sent
    console.log('generateReport - Sending dates:', {
      customerId: customer.id,
      startDate: reportStartDate,
      endDate: reportEndDate
    });

    // Build the report URL - ensure dates are properly encoded
    const reportUrl = `/print/customer-report?customerId=${customer.id}&startDate=${encodeURIComponent(reportStartDate)}&endDate=${encodeURIComponent(reportEndDate)}`;

    console.log('generateReport - Report URL:', reportUrl);

    // Open in new tab
    window.open(reportUrl, '_blank');

    // Close the dialog
    setIsReportDialogOpen(false);
    // Keep the dates for the next time user opens the dialog
  };

  // Function to generate and open the thermal customer report
  const generateThermalReport = () => {
    if (!customer || !reportStartDate || !reportEndDate) {
      showToast("Por favor, preencha todas as datas para gerar o relatório.", "warning");
      return;
    }

    if (new Date(reportStartDate) > new Date(reportEndDate)) {
      showToast("A data inicial não pode ser maior que a data final.", "error");
      return;
    }

    // Build the thermal report URL - ensure dates are properly encoded
    const thermalReportUrl = `/print/customer-report-thermal?customerId=${customer.id}&startDate=${encodeURIComponent(reportStartDate)}&endDate=${encodeURIComponent(reportEndDate)}`;

    // Open in new tab
    window.open(thermalReportUrl, '_blank');

    // Close the dialog
    setIsReportDialogOpen(false);
    // Keep the dates for the next time user opens the dialog
  };

  // Function to send closing report by email
  const sendClosingReportByEmail = async () => {
    if (!customer || !reportStartDate || !reportEndDate) {
      showToast("Por favor, preencha todas as datas para gerar o relatório.", "warning");
      return;
    }

    if (new Date(reportStartDate) > new Date(reportEndDate)) {
      showToast("A data inicial não pode ser maior que a data final.", "error");
      return;
    }

    if (!customer.email) {
      showToast("Cliente não possui email cadastrado.", "error");
      return;
    }

    try {
      showToast("Enviando relatório por email...", "info");

      const response = await fetch(`/api/customers/${customer.id}/send-closing-report?startDate=${encodeURIComponent(reportStartDate)}&endDate=${encodeURIComponent(reportEndDate)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        showToast(`Relatório enviado para ${customer.email}`, "success");
        setIsReportDialogOpen(false);
      } else {
        showToast(result.error || "Erro ao enviar relatório", "error");
      }
    } catch (error) {
      showToast("Erro ao enviar relatório por email", "error");
    }
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

  // Reset payment processing state when dialog closes
  useEffect(() => {
    if (!isPaymentDialogOpen) {
      setIsProcessingPayment(false);
    }
  }, [isPaymentDialogOpen]);

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
      {/* Informações do Cliente - Redesigned */}
      <div className="bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 backdrop-blur-sm border border-white/40 shadow-xl rounded-2xl overflow-hidden">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b border-white/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.back()}
                className="h-10 w-10 rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                  <User className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1">
                  <Badge
                    variant={customer.active ? "default" : "outline"}
                    className={`text-xs px-2 py-0.5 rounded-full shadow-sm ${customer.active
                      ? "bg-green-500 text-white border-green-600"
                      : "bg-gray-100 text-gray-600 border-gray-300"
                      }`}
                  >
                    {customer.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {customer.name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Cliente desde {formatDate(customer.createdAt).split(' ')[0]}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-4">
          {/* Informações Compactas em Linha */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Contato */}
            <div className="p-3 bg-white/70 rounded-xl border border-white/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-lg bg-green-100 flex items-center justify-center">
                  <Phone className="h-3 w-3 text-green-600" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900">Contato</h4>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Telefone</p>
                  <p className="text-sm font-semibold text-gray-900">{customer.phone}</p>
                </div>
                {customer.email && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Email</p>
                    <p className="text-sm font-semibold text-gray-900 truncate" title={customer.email}>{customer.email}</p>
                  </div>
                )}
                {customer.doc && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Documento</p>
                    <p className="text-sm font-semibold text-gray-900">{customer.doc}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Código de Barras */}
            <div className="p-3 bg-white/70 rounded-xl border border-white/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-lg bg-orange-100 flex items-center justify-center">
                  <BarcodeIcon className="h-3 w-3 text-orange-600" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900">Identificação</h4>
              </div>
              {customer.barcode ? (
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Código de Barras</p>
                    <p className="text-sm font-semibold text-gray-900 font-mono">{customer.barcode}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadBarcode}
                    className="h-7 px-2 text-xs rounded-lg hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-all duration-200 w-full"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center py-4">
                  <p className="text-xs text-gray-500">Sem código cadastrado</p>
                </div>
              )}
            </div>

            {/* Endereço */}
            <div className="p-3 bg-white/70 rounded-xl border border-white/50 md:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-lg bg-red-100 flex items-center justify-center">
                  <MapPin className="h-3 w-3 text-red-600" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900">Endereço</h4>
              </div>
              {customer.address ? (
                <div>
                  <div className="text-xs text-gray-700 leading-relaxed space-y-1">
                    <p className="font-medium">
                      {customer.address.street}, {customer.address.number}
                      {customer.address.complement && ` - ${customer.address.complement}`}
                    </p>
                    <p>
                      {customer.address.neighborhood}, {customer.address.city} - {customer.address.state}
                    </p>
                    <p className="text-gray-600">CEP: {customer.address.zip}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-4">
                  <p className="text-xs text-gray-500">Sem endereço cadastrado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Estatísticas e Ações */}
      <div className="bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 backdrop-blur-sm border border-white/40 shadow-xl rounded-2xl overflow-hidden">
        {/* Header da Seção */}
        <div className="bg-gradient-to-r from-slate-100/80 via-slate-50/60 to-transparent p-4 border-b border-white/30">
          <h3 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Resumo e Ações
          </h3>
          <p className="text-sm text-gray-600 mt-1">Estatísticas financeiras e opções disponíveis</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Compras Pendentes */}
            <div className="group relative bg-gradient-to-br from-amber-50/80 to-amber-100/60 backdrop-blur-sm border border-amber-200/50 rounded-xl p-3 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 to-amber-600/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative space-y-2">
                {/* Primeira linha - Título com ícone */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Clock className="h-2.5 w-2.5 text-amber-600" />
                    </div>
                    <p className="text-xs font-semibold text-amber-700">
                      Compras Realizadas
                    </p>
                  </div>
                  <div className="h-6 w-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-3 w-3 text-amber-600" />
                  </div>
                </div>
                {/* Segunda linha - Filtro e valor */}
                <div className="space-y-1">
                  {orderFilter !== 'all' && (
                    <p className="text-xs text-amber-600/80">
                      {orderFilter === 'current-month' ? 'Mês Atual' :
                        orderFilter === 'previous-month' ? 'Mês Anterior' : 'Período Filtrado'}
                    </p>
                  )}
                  <p className="text-lg font-bold text-amber-900">
                    {formatCurrency(filteredStats.pendingAmount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Total de Pedidos */}
            <div className="group relative bg-gradient-to-br from-purple-50/80 to-purple-100/60 backdrop-blur-sm border border-purple-200/50 rounded-xl p-3 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/5 to-purple-600/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative space-y-2">
                {/* Primeira linha - Título com ícone */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Receipt className="h-2.5 w-2.5 text-purple-600" />
                    </div>
                    <p className="text-xs font-semibold text-purple-700">
                      Total de Pedidos
                    </p>
                  </div>
                  <div className="h-6 w-6 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Receipt className="h-3 w-3 text-purple-600" />
                  </div>
                </div>
                {/* Segunda linha - Filtro e valor */}
                <div className="space-y-1">
                  {orderFilter !== 'all' && (
                    <p className="text-xs text-purple-600/80">
                      {orderFilter === 'current-month' ? 'Mês Atual' :
                        orderFilter === 'previous-month' ? 'Mês Anterior' : 'Período Filtrado'}
                    </p>
                  )}
                  <p className="text-lg font-bold text-purple-900">
                    {filteredStats.totalOrders}
                  </p>
                </div>
              </div>
            </div>

            {/* Saldo Devedor/Crédito */}
            <div className={`group relative backdrop-blur-sm border rounded-xl p-3 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] ${stats.balanceAmount > 0
              ? 'bg-gradient-to-br from-red-50/80 to-red-100/60 border-red-200/50'
              : 'bg-gradient-to-br from-green-50/80 to-green-100/60 border-green-200/50'
              }`}>
              <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${stats.balanceAmount > 0
                ? 'bg-gradient-to-br from-red-400/5 to-red-600/5'
                : 'bg-gradient-to-br from-green-400/5 to-green-600/5'
                }`} />
              <div className="relative space-y-2">
                {/* Primeira linha - Título com ícone */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-5 w-5 rounded-lg flex items-center justify-center ${stats.balanceAmount > 0
                      ? 'bg-red-500/20'
                      : 'bg-green-500/20'
                      }`}>
                      <Wallet className={`h-2.5 w-2.5 ${stats.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'
                        }`} />
                    </div>
                    <p className={`text-xs font-semibold ${stats.balanceAmount > 0 ? 'text-red-700' : 'text-green-700'
                      }`}>
                      {stats.balanceAmount > 0 ? 'Saldo Devedor' : 'Crédito Disponível'}
                    </p>
                  </div>
                  <div className={`h-6 w-6 rounded-lg flex items-center justify-center ${stats.balanceAmount > 0
                    ? 'bg-red-500/10'
                    : 'bg-green-500/10'
                    }`}>
                    <Wallet className={`h-3 w-3 ${stats.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'
                      }`} />
                  </div>
                </div>
                {/* Segunda linha - Filtro e valor */}
                <div className="space-y-1">
                  <p className={`text-xs ${stats.balanceAmount > 0 ? 'text-red-600/80' : 'text-green-600/80'
                    }`}>
                    Histórico Completo
                  </p>
                  <p className={`text-lg font-bold ${stats.balanceAmount > 0 ? 'text-red-900' : 'text-green-900'
                    }`}>
                    {formatCurrency(Math.abs(stats.balanceAmount))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="border-t border-white/30 pt-6">
            <div className="flex flex-wrap justify-end gap-3">
              {/* Botão de Preset */}
              <button
                onClick={() => setIsPresetModalOpen(true)}
                className="group relative px-4 py-2.5 bg-white hover:bg-gray-50 border-2 border-green-200 hover:border-green-300 rounded-lg transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-md bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <Package className="h-3 w-3 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-green-700 group-hover:text-green-800">Presets de Produtos</p>
                    <p className="text-xs text-green-600/80 group-hover:text-green-700">Configurar favoritos</p>
                  </div>
                </div>
              </button>

              {/* Botão de Relatório */}
              <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
                <DialogTrigger asChild>
                  <button className="group relative px-4 py-2.5 bg-white hover:bg-gray-50 border-2 border-blue-200 hover:border-blue-300 rounded-lg transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-md bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <FileText className="h-3 w-3 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-blue-700 group-hover:text-blue-800">Relatório de Fechamento</p>
                        <p className="text-xs text-blue-600/80 group-hover:text-blue-700">Gerar relatório</p>
                      </div>
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md mx-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Printer className="h-5 w-5" />
                      Relatório de Fechamento
                    </DialogTitle>
                    <DialogDescription>
                      Gere um relatório imprimível com o consumo e saldo do cliente por período. Escolha entre impressão completa ou térmica.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 p-1">
                    <div className="grid gap-4">
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
                          className="w-full"
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
                          className="w-full"
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
                      <div className="space-y-3 pt-4">
                        {/* Primeira linha: Cancelar e Impressão Térmica */}
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsReportDialogOpen(false);
                            }}
                            className="h-10"
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={generateThermalReport}
                            disabled={!reportStartDate || !reportEndDate}
                            variant="outline"
                            className="h-10 border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300"
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Térmica
                          </Button>
                        </div>

                        {/* Segunda linha: Relatório Completo */}
                        <Button
                          onClick={generateReport}
                          disabled={!reportStartDate || !reportEndDate}
                          className="w-full h-10 bg-blue-600 hover:bg-blue-700"
                        >
                          <Printer className="h-4 w-4 mr-2" />
                          Relatório Completo
                        </Button>

                        {/* Terceira linha: Envio por Email */}
                        {customer?.email ? (
                          <PDFGeneratorComponent
                            customerId={customer.id}
                            startDate={reportStartDate || ''}
                            endDate={reportEndDate || ''}
                            customerName={customer.name}
                            showSendButton={true}
                            onSendEmail={() => {
                              showToast("Relatório com PDF enviado por email!", "success");
                              setIsReportDialogOpen(false);
                            }}
                          />
                        ) : (
                          <div className="w-full h-10 flex items-center justify-center bg-gray-100 rounded-md border border-gray-200">
                            <span className="text-sm text-gray-500 font-medium">
                              📧 Cliente sem email cadastrado
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Botão de Pagamento - Principal */}
              <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <button className="group relative px-5 py-2.5 bg-primary hover:bg-primary/90 border-2 border-primary/20 hover:border-primary/40 rounded-lg transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-md bg-white/20 flex items-center justify-center">
                        <Plus className="h-3 w-3 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-white">Adicionar Pagamento</p>
                        <p className="text-xs text-white/90">Registrar na ficha</p>
                      </div>
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  {/* Loading Overlay */}
                  {isProcessingPayment && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center">
                      <div className="text-center bg-white rounded-lg p-8 shadow-xl">
                        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                        <p className="mt-4 text-lg font-semibold text-primary">Processando pagamento...</p>
                        <p className="text-sm text-gray-600 mt-1">Por favor, aguarde</p>
                      </div>
                    </div>
                  )}
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
                            disabled={isProcessingPayment}
                            className="h-20 flex flex-col items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            onClick={() => {
                              if (!isProcessingPayment) {
                                setSelectedPaymentMethod(method.value);
                                // Reset cash fields when changing payment method
                                if (method.value !== "cash") {
                                  setCashReceived("");
                                  setChange(0);
                                }
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
                                  disabled={isProcessingPayment}
                                  onChange={(e) => {
                                    if (!isProcessingPayment) {
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
                                    }
                                  }}
                                  placeholder="0,00"
                                  className="pl-10 text-lg h-12 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          disabled={isProcessingPayment}
                          onChange={(e) => {
                            if (!isProcessingPayment) {
                              const value = e.target.value;
                              setPaymentAmount(value);

                              // Recalculate change if cash payment
                              if (selectedPaymentMethod === "cash" && cashReceived && value) {
                                const received = parseFloat(cashReceived);
                                const payment = parseFloat(value);
                                const changeAmount = Math.max(0, received - payment);
                                setChange(changeAmount);
                              }
                            }
                          }}
                          placeholder="0,00"
                          className="pl-10 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        disabled={isProcessingPayment}
                        onClick={() => {
                          if (!isProcessingPayment) {
                            setIsPaymentDialogOpen(false);
                            setSelectedPaymentMethod("");
                            setPaymentAmount("");
                            setCashReceived("");
                            setChange(0);
                          }
                        }}
                        className="disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleFichaPayment}
                        disabled={
                          isProcessingPayment ||
                          !paymentAmount ||
                          (parseFloat(paymentAmount) <= 0) ||
                          !selectedPaymentMethod ||
                          (selectedPaymentMethod === "cash" &&
                            (!cashReceived ||
                              (parseFloat(cashReceived) < parseFloat(paymentAmount || "0"))))
                        }
                        className="disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessingPayment ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></div>
                            Processando...
                          </>
                        ) : (
                          "Registrar Pagamento"
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Compras */}
      <Card className="bg-white/80 backdrop-blur-sm border-white/30 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Histórico de Compras
              </CardTitle>
              <CardDescription>
                Exibindo {paginatedOrders.length} de {filteredOrders.length} compra{filteredOrders.length !== 1 ? "s" : ""}
                {filteredOrders.length !== orders.filter(order => !(order.type === "ficha_payment" || order.paymentMethod === "ficha_payment")).length &&
                  ` (${orders.filter(order => !(order.type === "ficha_payment" || order.paymentMethod === "ficha_payment")).length} total)`
                }
                {orderFilter !== "all" && (
                  <span className="text-blue-600 ml-2">
                    • Filtro ativo: {orderFilter === "current-month" ? "Mês Atual" :
                      orderFilter === "previous-month" ? "Mês Anterior" : "Personalizado"}
                  </span>
                )}
              </CardDescription>
            </div>

            {/* Filtros */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Filtrar por:</label>
                <select
                  value={orderFilter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="all">Todos os Pedidos</option>
                  <option value="current-month">Mês Atual</option>
                  <option value="previous-month">Mês Anterior</option>
                  <option value="custom">Filtro Personalizado</option>
                </select>
              </div>

              {orderFilter !== "all" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange("all")}
                  className="text-xs h-8 px-3"
                >
                  Limpar Filtros
                </Button>
              )}

              {orderFilter === "custom" && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="text-sm w-36"
                    placeholder="Data inicial"
                  />
                  <span className="text-gray-500 text-sm">até</span>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="text-sm w-36"
                    placeholder="Data final"
                  />
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length > 0 ? (
            <div className="space-y-4">
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
                    {paginatedOrders.map((order) => (
                      <tr
                        key={order.id}
                        className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${order.type === "ficha_payment" || order.paymentMethod === "ficha_payment"
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
                          {/* Debug information - remove this in production */}
                          {/* <div className="text-xs text-gray-500">
                          Type: {order.type || 'N/A'}, PaymentMethod: {order.paymentMethod || 'N/A'}
                        </div> */}
                          {order.type === "ficha_payment" || order.paymentMethod === "ficha_payment" ? (
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
                          {order.discountCents > 0 && (
                            <div className="text-xs text-red-600 font-medium">
                              Desconto: -{formatCurrency(order.discountCents)}
                            </div>
                          )}
                          {order.subtotalCents > 0 && order.discountCents > 0 && (
                            <div className="text-xs text-gray-500">
                              Subtotal: {formatCurrency(order.subtotalCents)}
                            </div>
                          )}
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

              {/* Controles de Paginação */}
              {filteredOrders.length > itemsPerPage && (
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>
                      Página {currentPage} de {Math.ceil(filteredOrders.length / itemsPerPage)}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span>
                      {filteredOrders.length} item{filteredOrders.length !== 1 ? "s" : ""} total
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="h-8 px-3"
                    >
                      Anterior
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.ceil(filteredOrders.length / itemsPerPage) }, (_, i) => i + 1)
                        .filter(page => {
                          // Mostrar apenas algumas páginas ao redor da atual
                          const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
                          if (totalPages <= 7) return true;
                          if (page === 1 || page === totalPages) return true;
                          if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                          return false;
                        })
                        .map((page, index, array) => (
                          <div key={page} className="flex items-center">
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="px-2 text-gray-400">...</span>
                            )}
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="h-8 w-8 p-0"
                            >
                              {page}
                            </Button>
                          </div>
                        ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredOrders.length / itemsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(filteredOrders.length / itemsPerPage)}
                      className="h-8 px-3"
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {orders.length === 0 ? "Nenhuma compra registrada" : "Nenhuma compra encontrada"}
              </h3>
              <p className="text-gray-600">
                {orders.length === 0
                  ? "Este cliente ainda não realizou nenhuma compra."
                  : "Nenhuma compra encontrada para o período selecionado."
                }
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
