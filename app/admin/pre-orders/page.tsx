"use client";

import { SalesFilter } from "@/app/components/sales/SalesFilter";
import { AnimatedCard } from "@/app/components/ui/animated-card";
import { Button } from "@/app/components/ui/button";
import {
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/app/components/ui/card";
import { motion } from "framer-motion";
import {
    Package,
    Printer,
    Receipt,
    ShoppingCart,
    Trash2,
    User,
    X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
// Importar o componente de modal
import { PreOrderFormDialog } from "@/app/components/PreOrderFormDialog";
import { PreOrderPaymentDialog } from "@/app/components/PreOrderPaymentDialog";

type PreOrder = {
  id: string;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  notes: string | null;
  createdAt: string;
  customerId: string | null;
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

// Adicionar este tipo
type PaymentMethodType = {
  value: string;
  label: string;
};

export default function AdminPreOrdersPage() {
  const [preOrders, setPreOrders] = useState<PreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    searchTerm: "",
    dateRange: { start: "", end: "" }
  });
  
  // Estados para o modal
  const [isPreOrderDialogOpen, setIsPreOrderDialogOpen] = useState(false);
  const [editingPreOrderId, setEditingPreOrderId] = useState<string | null>(null);
  
  // States for the payment modal
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedPreOrder, setSelectedPreOrder] = useState<PreOrder | null>(null);
  
  // Hook para ler parâmetros da URL
  const router = useRouter();
  
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
  }, [filters.dateRange]);

  // useEffect para verificar parâmetros da URL
  useEffect(() => {
    // Verificar se há parâmetro para abrir o modal automaticamente
    const params = new URLSearchParams(window.location.search);
    const openModal = params.get('openModal');
    if (openModal === 'true') {
      // Remover o parâmetro da URL para evitar reabertura
      const url = new URL(window.location.href);
      url.searchParams.delete('openModal');
      window.history.replaceState({}, '', url.toString());
      
      // Abrir o modal após um pequeno delay para garantir que o componente foi montado
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

  const deletePreOrder = async (preOrderId: string) => {
    if (
      !confirm(
        "Tem certeza que deseja excluir este pré-pedido? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/pre-orders?id=${preOrderId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete pre-order");
      }

      // Remover o pré-pedido da lista
      setPreOrders((prev) => prev.filter((preOrder) => preOrder.id !== preOrderId));
    } catch (error) {
      console.error("Error deleting pre-order:", error);
      alert("Erro ao excluir pré-pedido. Por favor, tente novamente.");
    }
  };

  // Função para imprimir recibo térmico
  const printThermalReceipt = (preOrderId: string) => {
    const receiptUrl = `/print/pre-order-thermal?preOrderId=${preOrderId}`;
    window.open(receiptUrl, '_blank');
  };

  // Função para converter pré-pedido em venda
  const convertToOrder = async (preOrder: PreOrder) => {
    // Open the payment dialog instead of using prompt
    setSelectedPreOrder(preOrder);
    setIsPaymentDialogOpen(true);
  };

  // Função para confirmar a conversão com forma de pagamento
  const handleConfirmConversion = async (paymentMethod: string, discountCents: number) => {
    if (!selectedPreOrder) return;
    
    try {
      // Map payment method labels to API values
      const paymentMethodMap: { [key: string]: string } = {
        "cash": "cash",
        "debit": "debit",
        "credit": "credit",
        "pix": "pix",
        "ficha_payment": "invoice"
      };
      
      const apiPaymentMethod = paymentMethodMap[paymentMethod] || paymentMethod;
      
      // If there's a discount change, we need to update the pre-order first
      if (discountCents !== selectedPreOrder.discountCents) {
        // Update the pre-order with the new discount
        const updateResponse = await fetch(`/api/pre-orders/${selectedPreOrder.id}`, {
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
      
      // Convert pre-order to order
      const response = await fetch('/api/pre-orders?convert=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preOrderId: selectedPreOrder.id,
          paymentMethod: apiPaymentMethod
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to convert pre-order to order');
      }

      // Close the payment dialog
      setIsPaymentDialogOpen(false);
      setSelectedPreOrder(null);
      
      // Recarregar a lista de pré-pedidos
      loadPreOrders();
      
      alert('Pré-pedido convertido em venda com sucesso!');
    } catch (error) {
      console.error("Error converting pre-order to order:", error);
      alert("Erro ao converter pré-pedido em venda. Por favor, tente novamente.");
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

  // Funções para abrir o modal
  const openNewPreOrderDialog = () => {
    setEditingPreOrderId(null);
    setIsPreOrderDialogOpen(true);
  };

  const openEditPreOrderDialog = (preOrderId: string) => {
    setEditingPreOrderId(preOrderId);
    setIsPreOrderDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Gerenciamento de Pré-Pedidos
          </h1>
          <p className="text-muted-foreground">Acompanhe todos os pré-pedidos cadastrados</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={openNewPreOrderDialog}>
          Novo Pré-Pedido
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnimatedCard delay={0.1}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">
                  Total de Pré-Pedidos
                </p>
                <p className="text-3xl font-bold text-blue-900">
                  {preOrders.length}
                </p>
              </div>
              <ShoppingCart className="h-12 w-12 text-blue-600" />
            </div>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard delay={0.2}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">
                  Valor Total
                </p>
                <p className="text-3xl font-bold text-green-900">
                  {formatCurrency(
                    preOrders.reduce((sum, preOrder) => sum + preOrder.totalCents, 0)
                  )}
                </p>
              </div>
              <Receipt className="h-12 w-12 text-green-600" />
            </div>
          </CardContent>
        </AnimatedCard>

        <AnimatedCard delay={0.3}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">
                  Com Desconto
                </p>
                <p className="text-3xl font-bold text-amber-900">
                  {preOrders.filter((preOrder) => preOrder.discountCents > 0).length}
                </p>
              </div>
              <Package className="h-12 w-12 text-amber-600" />
            </div>
          </CardContent>
        </AnimatedCard>
      </div>

      {/* Barra de Busca e Filtros */}
      <AnimatedCard>
        <SalesFilter onFilterChange={handleFilterChange} />
      </AnimatedCard>

      {/* Tabela de Pré-Pedidos */}
      <AnimatedCard>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">
            Lista de Pré-Pedidos
          </CardTitle>
          <CardDescription>
            {preOrders.length} pré-pedido{preOrders.length !== 1 ? "s" : ""} encontrado
            {preOrders.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-4 text-muted-foreground">Carregando pré-pedidos...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Erro ao carregar pré-pedidos
              </h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button
                onClick={loadPreOrders}
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
                      Pré-Pedido
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
                      Data
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preOrders.map((preOrder, index) => {
                    return (
                      <motion.tr
                        key={preOrder.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-b border-border hover:bg-accent/50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="font-mono text-sm text-muted-foreground">
                            #{preOrder.id.slice(0, 8)}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          {preOrder.customer ? (
                            <Link 
                              href={`/admin/customers/${preOrder.customer.id}`}
                              className="flex items-center gap-3 hover:bg-accent p-2 rounded-lg transition-colors"
                            >
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium text-foreground text-sm hover:text-primary transition-colors">
                                  {preOrder.customer.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {preOrder.customer.phone}
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
                            {preOrder.items.length} item
                            {preOrder.items.length !== 1 ? "s" : ""}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-xs">
                            {preOrder.items
                              .map((item) => item.product.name)
                              .join(", ")}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-bold text-foreground">
                            {formatCurrency(preOrder.totalCents)}
                          </div>
                          {preOrder.discountCents > 0 && (
                            <div className="text-xs text-red-600 font-medium">
                              -{formatCurrency(preOrder.discountCents)}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <div className="text-sm text-foreground">
                            {formatDate(preOrder.createdAt)}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {/* Botão de Editar */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditPreOrderDialog(preOrder.id)}
                              className="h-9 w-9 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-border"
                              title="Editar pré-pedido"
                            >
                              <Package className="h-4 w-4" />
                            </Button>
                            
                            {/* Botão de Imprimir Recibo */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => printThermalReceipt(preOrder.id)}
                              className="h-9 w-9 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-border"
                              title="Imprimir recibo térmico"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            
                            {/* Botão de Converter em Venda */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => convertToOrder(preOrder)}
                              className="h-9 w-9 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 border-border"
                              title="Converter em venda"
                            >
                              <Receipt className="h-4 w-4" />
                            </Button>
                            
                            {/* Botão de Excluir */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deletePreOrder(preOrder.id)}
                              className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-border"
                              title="Excluir pré-pedido"
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

              {preOrders.length === 0 && (
                <div className="text-center py-12">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Nenhum pré-pedido encontrado
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {filters.dateRange.start || filters.dateRange.end
                      ? "Tente ajustar os filtros de busca"
                      : "Ainda não há pré-pedidos registrados"}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </AnimatedCard>
      
      {/* Modal de Pré-Pedido */}
      <PreOrderFormDialog 
        open={isPreOrderDialogOpen} 
        onOpenChange={setIsPreOrderDialogOpen}
        preOrderId={editingPreOrderId || undefined}
        onPreOrderSaved={loadPreOrders}
      />
      
      {/* Modal de Pagamento */}
      {selectedPreOrder && (
        <PreOrderPaymentDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          preOrder={selectedPreOrder}
          onConfirm={handleConfirmConversion}
        />
      )}
    </div>
  );
}