"use client";

import {
  ArrowLeft,
  Banknote,
  Barcode as BarcodeIcon,
  Calculator,
  Calendar,
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
  Wallet,
  X,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { BudgetModal } from "../../../components/BudgetModal";
import { CustomerPresetModal } from "../../../components/CustomerPresetModal";
import { DeleteConfirmDialog } from "../../../components/DeleteConfirmDialog";
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
  DialogTitle,
  DialogTrigger
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { PageHeader } from "../../components/layout/PageHeader";
import { EmptyState } from "../../components/data-display/EmptyState";
import { DataTable } from "../../components/data-display/DataTable";
import { cn } from "@/lib/utils";

// Componente Switch inline
interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const Switch = ({ checked = false, onCheckedChange, disabled = false, className, id, ...props }: SwitchProps) => {
  const handleClick = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={handleClick}
      id={id}
      className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-blue-600" : "bg-gray-200"
        } ${className || ""}`}
      {...props}
    >
      <span
        className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${checked ? "translate-x-5" : "translate-x-0"
          }`}
      />
    </button>
  );
};

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
    priceCents: number;
    weightKg?: number | null;
    product: {
      id: string;
      name: string;
      pricePerKgCents?: number | null;
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
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [change, setChange] = useState(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentDate, setPaymentDate] = useState("");
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [showDebtBalance, setShowDebtBalance] = useState(true);
  const [showPeriodBalance, setShowPeriodBalance] = useState(true);
  const [showPaymentsTotal, setShowPaymentsTotal] = useState(true);

  // Estados para filtro de pedidos
  const [orderFilter, setOrderFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<{ id: string, isFichaPayment: boolean } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const openDeleteDialog = (orderId: string) => {
    // Find the order to determine if it's a ficha payment
    const order = orders.find(o => o.id === orderId);
    const isFichaPayment = order?.type === "ficha_payment" || order?.paymentMethod === "ficha_payment";

    setOrderToDelete({ id: orderId, isFichaPayment });
    setDeleteDialogOpen(true);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;

    setIsDeleting(true);
    try {
      // Use the appropriate API endpoint based on order type
      const endpoint = orderToDelete.isFichaPayment
        ? `/api/ficha-payments?id=${orderToDelete.id}`
        : `/api/orders?id=${orderToDelete.id}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete order");
      }

      // Remover o pedido da lista
      setOrders((prev) => prev.filter((order) => order.id !== orderToDelete.id));

      // Se for um pagamento de ficha, recarregar os dados para atualizar o saldo devedor
      if (orderToDelete.isFichaPayment) {
        loadCustomer();
      } else {
        // Para vendas normais, apenas recalcular as estatísticas locais
        calculateStats(orders.filter((order) => order.id !== orderToDelete.id), stats.balanceAmount);
      }

      setDeleteDialogOpen(false);
      setOrderToDelete(null);
      showToast(orderToDelete.isFichaPayment ? "Pagamento excluído com sucesso!" : "Venda excluída com sucesso!", "success");
    } catch (error) {
      console.error("Error deleting order:", error);
      showToast(`Erro ao excluir: ${(error as Error).message || "Por favor, tente novamente."}`, "error");
    } finally {
      setIsDeleting(false);
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

      // Adicionar data de pagamento se fornecida
      if (paymentDate) {
        paymentData.paymentDate = paymentDate;
      }

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
      setPaymentDate("");
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
    const reportUrl = `/print/customer-report?customerId=${customer.id}&startDate=${encodeURIComponent(reportStartDate)}&endDate=${encodeURIComponent(reportEndDate)}&showDebtBalance=${showDebtBalance}&showPeriodBalance=${showPeriodBalance}&showPaymentsTotal=${showPaymentsTotal}`;

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
    const thermalReportUrl = `/print/customer-report-thermal?customerId=${customer.id}&startDate=${encodeURIComponent(reportStartDate)}&endDate=${encodeURIComponent(reportEndDate)}&showDebtBalance=${showDebtBalance}&showPeriodBalance=${showPeriodBalance}&showPaymentsTotal=${showPaymentsTotal}`;

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
    <div className="space-y-6">
      {/* PageHeader com Breadcrumb */}
      <PageHeader
        title={customer.name}
        description="Detalhes do cliente e histórico de compras"
        icon={User}
        breadcrumb={[
          { label: "Clientes", href: "/admin/customers" },
          { label: customer.name }
        ]}
        actions={
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />


      {/* ── Perfil do cliente ─────────────────────────────────────── */}
      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {/* Faixa de avatar + nome */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 px-6 py-5 border-b border-slate-100">
            <div className="relative shrink-0">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow">
                <User className="h-7 w-7 text-white" />
              </div>
              <span
                className={cn(
                  "absolute -bottom-1 -right-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ring-2 ring-white",
                  customer.active
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-400 text-white"
                )}
              >
                {customer.active ? "Ativo" : "Inativo"}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-slate-900 truncate">{customer.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Cliente desde {new Date(customer.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </div>

            {/* Mini-ações rápidas no cabeçalho */}
            <div className="flex items-center gap-2 shrink-0">
              {customer.barcode && (
                <Button variant="outline" size="sm" onClick={downloadBarcode} className="gap-1.5 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Código de Barras
                </Button>
              )}
            </div>
          </div>

          {/* Grid de informações */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            {/* Contato */}
            <div className="px-6 py-4 space-y-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> Contato
              </p>
              <p className="text-sm font-medium text-slate-900">{customer.phone}</p>
              {customer.email ? (
                <p className="text-xs text-slate-500 truncate" title={customer.email}>{customer.email}</p>
              ) : (
                <p className="text-xs text-slate-400 italic">Sem email</p>
              )}
              {customer.doc && (
                <p className="text-xs text-slate-500">Doc: {customer.doc}</p>
              )}
            </div>

            {/* Endereço */}
            <div className="px-6 py-4 space-y-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> Endereço
              </p>
              {customer.address?.street ? (
                <div className="text-sm text-slate-700 space-y-0.5">
                  <p className="font-medium">
                    {customer.address.street}
                    {customer.address.number ? `, ${customer.address.number}` : ""}
                    {customer.address.complement ? ` - ${customer.address.complement}` : ""}
                  </p>
                  {(customer.address.neighborhood || customer.address.city) && (
                    <p className="text-slate-500 text-xs">
                      {[customer.address.neighborhood, customer.address.city, customer.address.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {customer.address.zip && (
                    <p className="text-slate-400 text-xs">CEP: {customer.address.zip}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Sem endereço cadastrado</p>
              )}
            </div>

            {/* Identificação */}
            <div className="px-6 py-4 space-y-2">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <BarcodeIcon className="h-3 w-3" /> Identificação
              </p>
              {customer.barcode ? (
                <p className="text-sm font-mono text-slate-800 bg-slate-50 rounded px-2 py-1 border border-slate-200 inline-block">
                  {customer.barcode}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">Sem código de barras</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Métricas + Ações ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Métricas */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Compras Pendentes */}
          <Card className="border-amber-200 bg-amber-50/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Compras Pendentes</p>
                <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
              </div>
              {orderFilter !== "all" && (
                <p className="text-[10px] text-amber-600/80 font-medium mb-1">
                  {orderFilter === "current-month" ? "Mês Atual" : orderFilter === "previous-month" ? "Mês Anterior" : "Período Filtrado"}
                </p>
              )}
              <p className="text-2xl font-bold text-amber-900">{formatCurrency(filteredStats.pendingAmount)}</p>
            </CardContent>
          </Card>

          {/* Total de Pedidos */}
          <Card className="border-purple-200 bg-purple-50/60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Total de Pedidos</p>
                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Receipt className="h-4 w-4 text-purple-600" />
                </div>
              </div>
              {orderFilter !== "all" && (
                <p className="text-[10px] text-purple-600/80 font-medium mb-1">
                  {orderFilter === "current-month" ? "Mês Atual" : orderFilter === "previous-month" ? "Mês Anterior" : "Período Filtrado"}
                </p>
              )}
              <p className="text-2xl font-bold text-purple-900">{filteredStats.totalOrders}</p>
            </CardContent>
          </Card>

          {/* Saldo */}
          <Card className={cn(
            "border",
            stats.balanceAmount > 0
              ? "border-red-200 bg-red-50/60"
              : "border-emerald-200 bg-emerald-50/60"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className={cn(
                  "text-xs font-semibold uppercase tracking-wide",
                  stats.balanceAmount > 0 ? "text-red-700" : "text-emerald-700"
                )}>
                  {stats.balanceAmount > 0 ? "Saldo Devedor" : "Crédito"}
                </p>
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center",
                  stats.balanceAmount > 0 ? "bg-red-100" : "bg-emerald-100"
                )}>
                  <Wallet className={cn("h-4 w-4", stats.balanceAmount > 0 ? "text-red-600" : "text-emerald-600")} />
                </div>
              </div>
              <p className="text-[10px] font-medium mb-1 text-slate-500">Histórico completo</p>
              <p className={cn(
                "text-2xl font-bold",
                stats.balanceAmount > 0 ? "text-red-900" : "text-emerald-900"
              )}>
                {formatCurrency(Math.abs(stats.balanceAmount))}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Ações */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-slate-700">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {/* Adicionar Pagamento */}
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full justify-start gap-3 h-10" size="sm">
                  <div className="h-6 w-6 rounded-md bg-white/20 flex items-center justify-center shrink-0">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold leading-tight">Adicionar Pagamento</p>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
                <DialogTitle className="sr-only">Adicionar Pagamento à Ficha</DialogTitle>

                {/* Loading Overlay */}
                {isProcessingPayment && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl">
                    <div className="text-center">
                      <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
                      <p className="mt-4 text-lg font-semibold text-orange-600">Processando pagamento...</p>
                      <p className="text-sm text-gray-600 mt-1">Por favor, aguarde</p>
                    </div>
                  </div>
                )}

                {/* Header */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 relative">
                  <div className="relative p-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-orange-600" />
                        Adicionar Pagamento à Ficha
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Registre um pagamento para reduzir o saldo devedor do cliente
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setIsPaymentDialogOpen(false);
                        setSelectedPaymentMethod("");
                        setPaymentAmount("");
                        setCashReceived("");
                        setChange(0);
                        setPaymentDate("");
                      }}
                      disabled={isProcessingPayment}
                      className="h-10 w-10 rounded-full bg-white/60 hover:bg-white border border-gray-200 disabled:opacity-50"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Valor do Pagamento</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={paymentAmount}
                          disabled={isProcessingPayment}
                          onChange={(e) => { if (!isProcessingPayment) setPaymentAmount(e.target.value); }}
                          placeholder="0,00"
                          className="pl-10 text-lg h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Data do Pagamento</label>
                      <div className="relative mt-1">
                        <Input
                          type="date"
                          value={paymentDate}
                          disabled={isProcessingPayment}
                          onChange={(e) => { if (!isProcessingPayment) setPaymentDate(e.target.value); }}
                          max={new Date().toISOString().split("T")[0]}
                          className="text-lg h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Deixe a data em branco para usar a data atual</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Formas de Pagamento</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Dinheiro", value: "cash", icon: Banknote },
                          { label: "Cartão Débito", value: "debit", icon: CreditCard },
                          { label: "Cartão Crédito", value: "credit", icon: CreditCard },
                          { label: "PIX", value: "pix", icon: QrCode },
                        ].map((method) => {
                          const Icon = method.icon;
                          return (
                            <Button
                              key={method.value}
                              variant={selectedPaymentMethod === method.value ? "default" : "outline"}
                              disabled={isProcessingPayment}
                              className="h-20 flex flex-col items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                              onClick={() => { if (!isProcessingPayment) setSelectedPaymentMethod(method.value); }}
                            >
                              <Icon className="h-6 w-6" />
                              <span className="text-sm font-medium">{method.label}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="transition-all duration-300 ease-in-out">
                      {selectedPaymentMethod ? (
                        <div className="bg-muted rounded-xl p-5 h-full flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-right-4 duration-300">
                          <div className="mb-3 p-3 bg-background rounded-full">
                            {(() => {
                              const method = [
                                { label: "Dinheiro", value: "cash", icon: Banknote },
                                { label: "Cartão Débito", value: "debit", icon: CreditCard },
                                { label: "Cartão Crédito", value: "credit", icon: CreditCard },
                                { label: "PIX", value: "pix", icon: QrCode },
                              ].find((m) => m.value === selectedPaymentMethod);
                              const Icon = method?.icon;
                              return Icon ? <Icon className="h-8 w-8 text-primary" /> : null;
                            })()}
                          </div>
                          <h3 className="text-lg font-semibold mb-2">
                            Pagamento com {selectedPaymentMethod === "cash" ? "Dinheiro" : selectedPaymentMethod === "debit" ? "Cartão Débito" : selectedPaymentMethod === "credit" ? "Cartão Crédito" : "PIX"}
                          </h3>
                          <p className="text-muted-foreground">
                            O valor do pagamento é{" "}
                            <span className="font-bold">R$ {parseFloat(paymentAmount || "0").toFixed(2)}</span>.
                            Confirme os dados e clique em &quot;Registrar Pagamento&quot; para concluir.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-muted rounded-xl p-5 h-full flex items-center justify-center text-center animate-in fade-in slide-in-from-right-4 duration-300">
                          <div className="space-y-3">
                            <Wallet className="h-10 w-10 text-muted-foreground mx-auto" />
                            <h3 className="text-lg font-medium">Selecione uma forma de pagamento</h3>
                            <p className="text-sm text-muted-foreground">Escolha uma das opções ao lado para prosseguir com o pagamento.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rodapé */}
                <div className="border-t border-gray-200 p-6 bg-gray-50/50">
                  <div className="flex justify-end gap-3">
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
                          setPaymentDate("");
                        }
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleFichaPayment}
                      disabled={isProcessingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0 || !selectedPaymentMethod}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      {isProcessingPayment ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                          Processando...
                        </span>
                      ) : (
                        "Registrar Pagamento"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Gerar Orçamento */}
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-3 h-10 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
              onClick={() => setIsBudgetModalOpen(true)}
            >
              <div className="h-6 w-6 rounded-md bg-purple-100 flex items-center justify-center shrink-0">
                <Calculator className="h-3.5 w-3.5 text-purple-600" />
              </div>
              <p className="text-xs font-semibold leading-tight">Gerar Orçamento</p>
            </Button>

            {/* Presets de Produtos */}
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-3 h-10 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
              onClick={() => setIsPresetModalOpen(true)}
            >
              <div className="h-6 w-6 rounded-md bg-emerald-100 flex items-center justify-center shrink-0">
                <Package className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <p className="text-xs font-semibold leading-tight">Presets de Produtos</p>
            </Button>

            {/* Relatório de Fechamento */}
            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-3 h-10 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                >
                  <div className="h-6 w-6 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <p className="text-xs font-semibold leading-tight">Relatório de Fechamento</p>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-hidden p-0 flex flex-col">
                <DialogTitle className="sr-only">Relatório de Fechamento</DialogTitle>

                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200">
                  <div className="p-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Printer className="h-5 w-5 text-orange-600" />
                        Relatório de Fechamento
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Gere um relatório imprimível com o consumo e saldo do cliente por período
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsReportDialogOpen(false)}
                      className="h-10 w-10 rounded-full bg-white/60 hover:bg-white border border-gray-200"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <label htmlFor="startDate" className="text-sm font-medium">Data Inicial</label>
                      <Input id="startDate" type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} max={reportEndDate || undefined} className="w-full" />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="endDate" className="text-sm font-medium">Data Final</label>
                      <Input id="endDate" type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} min={reportStartDate || undefined} className="w-full" />
                    </div>

                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h3 className="text-sm font-semibold text-blue-800">Opções de Impressão</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <label htmlFor="showDebtBalance" className="text-sm font-medium text-gray-700">Mostrar Saldo Devedor</label>
                            <p className="text-xs text-gray-500">Exibe o saldo devedor total do cliente</p>
                          </div>
                          <Switch id="showDebtBalance" checked={showDebtBalance} onCheckedChange={setShowDebtBalance} />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <label htmlFor="showPeriodBalance" className="text-sm font-medium text-gray-700">Mostrar Saldo do Período</label>
                            <p className="text-xs text-gray-500">Exibe o saldo pendente no período selecionado</p>
                          </div>
                          <Switch id="showPeriodBalance" checked={showPeriodBalance} onCheckedChange={setShowPeriodBalance} />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <label htmlFor="showPaymentsTotal" className="text-sm font-medium text-gray-700">Mostrar Total de Pagamentos</label>
                            <p className="text-xs text-gray-500">Exibe o total de pagamentos realizados no período</p>
                          </div>
                          <Switch id="showPaymentsTotal" checked={showPaymentsTotal} onCheckedChange={setShowPaymentsTotal} />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Período pré-definido:</span>
                      <Button variant="outline" size="sm" onClick={() => setDefaultDates()} className="text-xs">Últimos 30 dias</Button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 p-6 bg-gray-50/50">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={generateThermalReport} disabled={!reportStartDate || !reportEndDate} variant="outline" className="rounded-xl border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300 disabled:opacity-50">
                        <Printer className="h-4 w-4 mr-2" />Térmica
                      </Button>
                      <Button onClick={generateReport} disabled={!reportStartDate || !reportEndDate} className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                        <Printer className="h-4 w-4 mr-2" />Completo
                      </Button>
                    </div>
                    {customer?.email ? (
                      <PDFGeneratorComponent
                        customerId={customer.id}
                        startDate={reportStartDate || ""}
                        endDate={reportEndDate || ""}
                        customerName={customer.name}
                        showSendButton={true}
                        onSendEmail={() => {
                          showToast("Relatório com PDF enviado por email!", "success");
                          setIsReportDialogOpen(false);
                        }}
                      />
                    ) : (
                      <div className="w-full py-3 flex items-center justify-center bg-gray-100 rounded-xl border border-gray-200">
                        <span className="text-sm text-gray-500 font-medium">📧 Cliente sem email cadastrado</span>
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* ── Histórico de Compras ──────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-slate-500" />
                Histórico de Compras
              </CardTitle>
              <CardDescription className="mt-0.5">
                Exibindo {paginatedOrders.length} de {filteredOrders.length} registro{filteredOrders.length !== 1 ? "s" : ""}
                {filteredOrders.length !== orders.filter(o => !(o.type === "ficha_payment" || o.paymentMethod === "ficha_payment")).length &&
                  ` (${orders.filter(o => !(o.type === "ficha_payment" || o.paymentMethod === "ficha_payment")).length} total)`
                }
                {orderFilter !== "all" && (
                  <span className="text-primary ml-2">
                    • {orderFilter === "current-month" ? "Mês Atual" : orderFilter === "previous-month" ? "Mês Anterior" : "Personalizado"}
                  </span>
                )}
              </CardDescription>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={orderFilter}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">Todos os Pedidos</option>
                <option value="current-month">Mês Atual</option>
                <option value="previous-month">Mês Anterior</option>
                <option value="custom">Personalizado</option>
              </select>

              {orderFilter === "custom" && (
                <>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-36 text-sm"
                  />
                  <span className="text-slate-400 text-sm">até</span>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-36 text-sm"
                  />
                </>
              )}

              {orderFilter !== "all" && (
                <Button variant="outline" size="sm" onClick={() => handleFilterChange("all")} className="text-xs">
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredOrders.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-slate-100 bg-slate-50/60">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pedido</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Itens</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pagamento</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedOrders.map((order) => {
                      const isFichaPayment = order.type === "ficha_payment" || order.paymentMethod === "ficha_payment";
                      return (
                        <tr
                          key={order.id}
                          className={cn(
                            "hover:bg-slate-50/70 transition-colors",
                            isFichaPayment ? "bg-emerald-50/40" : ""
                          )}
                        >
                          {/* Pedido */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              #{order.id.slice(0, 8)}
                            </span>
                          </td>

                          {/* Itens */}
                          <td className="py-3.5 px-4 max-w-[260px]">
                            {isFichaPayment ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                                  <Wallet className="h-3 w-3" />Entrada de Valores
                                </span>
                              </div>
                            ) : (
                              <div>
                                <p className="text-slate-700 font-medium text-xs mb-0.5">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                                <div className="space-y-0.5">
                                  {order.items.map((item, idx) => (
                                    <p key={idx} className="text-xs text-slate-400 truncate">
                                      {item.weightKg && Number(item.weightKg) > 0
                                        ? `${Number(item.weightKg).toFixed(3)} kg × ${item.product.name}`
                                        : `${item.quantity}× ${item.product.name}`}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Valor */}
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-900">{formatCurrency(order.totalCents)}</p>
                            {order.discountCents > 0 && (
                              <p className="text-xs text-red-500">-{formatCurrency(order.discountCents)}</p>
                            )}
                          </td>

                          {/* Pagamento */}
                          <td className="py-3.5 px-4 text-center">
                            {(() => {
                              const Icon = getPaymentMethodIcon(order.paymentMethod);
                              const label = getPaymentMethodLabel(order.paymentMethod);
                              return Icon ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <Icon className="h-4 w-4 text-slate-500" />
                                  <span className="text-[10px] text-slate-400">{label}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500">{label}</span>
                              );
                            })()}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                              getStatusInfo(order.status).color
                            )}>
                              {getStatusInfo(order.status).label}
                            </span>
                          </td>

                          {/* Data */}
                          <td className="py-3.5 px-4">
                            <p className="text-xs text-slate-600 whitespace-nowrap">{formatDate(order.createdAt)}</p>
                          </td>

                          {/* Ações */}
                          <td className="py-3.5 px-4 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(order.id)}
                              className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {filteredOrders.length > itemsPerPage && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500">
                    Página {currentPage} de {Math.ceil(filteredOrders.length / itemsPerPage)} · {filteredOrders.length} registros
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="h-7 px-2.5 text-xs">
                      Anterior
                    </Button>
                    {Array.from({ length: Math.ceil(filteredOrders.length / itemsPerPage) }, (_, i) => i + 1)
                      .filter(page => {
                        const total = Math.ceil(filteredOrders.length / itemsPerPage);
                        if (total <= 7) return true;
                        if (page === 1 || page === total) return true;
                        if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                        return false;
                      })
                      .map((page, index, arr) => (
                        <div key={page} className="flex items-center">
                          {index > 0 && arr[index - 1] !== page - 1 && <span className="px-1 text-slate-400 text-xs">…</span>}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="h-7 w-7 p-0 text-xs"
                          >
                            {page}
                          </Button>
                        </div>
                      ))}
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredOrders.length / itemsPerPage), prev + 1))} disabled={currentPage === Math.ceil(filteredOrders.length / itemsPerPage)} className="h-7 px-2.5 text-xs">
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-700 mb-1">
                {orders.length === 0 ? "Nenhuma compra registrada" : "Nenhuma compra encontrada"}
              </h3>
              <p className="text-xs text-slate-500">
                {orders.length === 0
                  ? "Este cliente ainda não realizou nenhuma compra."
                  : "Nenhuma compra encontrada para o período selecionado."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      {customer && (
        <BudgetModal
          isOpen={isBudgetModalOpen}
          onClose={() => setIsBudgetModalOpen(false)}
          customerId={customer.id}
          customerName={customer.name}
        />
      )}

      {customer && (
        <CustomerPresetModal
          isOpen={isPresetModalOpen}
          onClose={() => setIsPresetModalOpen(false)}
          customerId={customer.id}
          customerName={customer.name}
        />
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Confirmar Exclusão"
        description={
          orderToDelete?.isFichaPayment
            ? "Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita."
            : "Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita."
        }
        onConfirm={confirmDeleteOrder}
        confirmText="Excluir"
        cancelText="Cancelar"
        isLoading={isDeleting}
      />
    </div>
  );
}
