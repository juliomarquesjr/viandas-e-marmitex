"use client";

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
    MoreHorizontal,
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
import { useEffect, useRef, useState } from "react";
// Importar o componente de modal
import { PreOrderFormDialog } from "@/app/components/PreOrderFormDialog";
import { PreOrderPaymentDialog } from "@/app/components/PreOrderPaymentDialog";
import { useToast } from "@/app/components/Toast";

// Menu de opções por pré-pedido
function PreOrderActionsMenu({
  onEdit,
  onDelete,
  onPrint,
  onConvert,
}: {
  onEdit: () => void;
  onDelete: () => void;
  onPrint: () => void;
  onConvert: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
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

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 p-0"
        aria-label="Ações do pré-pedido"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
      </Button>
      {open && (
        <div 
          role="menu"
          className="absolute right-0 z-50 mt-2 w-48 bg-background border border-border rounded-lg shadow-lg py-1 animate-fade-in min-w-max sm:right-0 -right-4"
        >
          <button
            role="menuitem"
            className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors duration-150"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            <Package className="h-4 w-4 mr-2 text-blue-500" />
            Editar
          </button>
          
          <button
            role="menuitem"
            className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors duration-150"
            onClick={() => {
              setOpen(false);
              onPrint();
            }}
          >
            <Printer className="h-4 w-4 mr-2 text-blue-500" />
            Imprimir recibo
          </button>
          
          <button
            role="menuitem"
            className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors duration-150"
            onClick={() => {
              setOpen(false);
              onConvert();
            }}
          >
            <Receipt className="h-4 w-4 mr-2 text-blue-500" />
            Converter em venda
          </button>
          
          <div className="border-t border-border my-1"></div>
          
          <button
            role="menuitem"
            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
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

// Add this type for product summary
type ProductSummary = {
  productId: string;
  productName: string;
  totalQuantity: number;
};

// Adicionar este tipo
type PaymentMethodType = {
  value: string;
  label: string;
};

export default function AdminPreOrdersPage() {
  const { showToast } = useToast();
  const [preOrders, setPreOrders] = useState<PreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
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
  
  // State for dropdown menu
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdownId(null);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

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
  
  // Remove or comment out this effect to prevent automatic loading based on filters
  /*
  useEffect(() => {
    loadPreOrders();
  }, [filters.dateRange]);
  */
  
  // Add this effect to load all pre-orders when the component mounts
  useEffect(() => {
    loadPreOrders();
  }, []);
  
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
    // Remove automatic reload when filters change
    // loadPreOrders();
  };

  const formatCurrency = (cents: number | null) => {
    if (cents === null || cents === undefined) return "N/A";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  // Add this function to calculate product summary
  const calculateProductSummary = (): ProductSummary[] => {
    const productMap: { [key: string]: ProductSummary } = {};

    preOrders.forEach(preOrder => {
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

    // Convert to array and sort by quantity (descending)
    return Object.values(productMap).sort((a, b) => b.totalQuantity - a.totalQuantity);
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
  const handleConfirmConversion = async (paymentMethod: string, discountCents: number, cashReceived?: number, change?: number) => {
    if (!selectedPreOrder) return;
    
    setIsConverting(true);
    
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
      
      // Prepare data for conversion
      const conversionData: any = {
        preOrderId: selectedPreOrder.id,
        paymentMethod: apiPaymentMethod
      };
      
      // Add cash payment details if applicable
      if (apiPaymentMethod === "cash" && cashReceived !== undefined && change !== undefined) {
        conversionData.cashReceived = cashReceived;
        conversionData.change = change;
      }
      
      // Convert pre-order to order
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

      // Close the payment dialog
      setIsPaymentDialogOpen(false);
      setSelectedPreOrder(null);
      
      // Recarregar a lista de pré-pedidos
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

      {/* Resumo de Produtos */}
      <AnimatedCard>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            Resumo de Produtos nos Pré-Pedidos
          </CardTitle>
          <CardDescription>
            Quantidade total de cada produto em todos os pré-pedidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {preOrders.length === 0 ? (
            <div className="text-center py-6">
              <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum produto encontrado nos pré-pedidos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {calculateProductSummary().map((product, index) => (
                <div 
                  key={product.productId}
                  className="flex flex-col items-center justify-center p-3 bg-accent rounded-lg border border-border hover:shadow-sm transition-shadow"
                >
                  <div className="text-lg font-bold text-primary mb-1">{product.totalQuantity}</div>
                  <div className="text-xs font-medium text-center text-foreground leading-tight">
                    {product.productName}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    #{index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
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
            <div className="overflow-x-auto" style={{ overflow: 'visible' }}>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
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
                      Descrição
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
                          <div className="text-sm text-foreground max-w-xs truncate">
                            {preOrder.notes || "-"}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="text-sm text-foreground">
                            {formatDate(preOrder.createdAt)}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <PreOrderActionsMenu
                            onEdit={() => openEditPreOrderDialog(preOrder.id)}
                            onDelete={() => deletePreOrder(preOrder.id)}
                            onPrint={() => printThermalReceipt(preOrder.id)}
                            onConvert={() => convertToOrder(preOrder)}
                          />
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
          isConverting={isConverting}
        />
      )}
    </div>
  );
}