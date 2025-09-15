"use client";

import { Button } from "@/app/components/ui/button";
import {
    CardContent,
    CardDescription,
    CardTitle
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { motion } from "framer-motion";
import {
    FileText,
    Package,
    Plus,
    ShoppingCart,
    Tag,
    User,
    X
} from "lucide-react";
import { useEffect, useState } from "react";

type Customer = {
  id: string;
  name: string;
  phone: string;
};

type Product = {
  id: string;
  name: string;
  priceCents: number;
};

type PreOrderItem = {
  id?: string;
  productId: string;
  quantity: number;
  priceCents: number;
  product?: Product;
};

type PreOrder = {
  id?: string;
  customerId: string | null;
  subtotalCents: number;
  // Removido discountCents e deliveryFeeCents conforme solicitado
  totalCents: number;
  notes: string | null;
  items: PreOrderItem[];
};

type PreOrderFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preOrderId?: string;
  onPreOrderSaved?: () => void;
};

export function PreOrderFormDialog({ 
  open, 
  onOpenChange, 
  preOrderId,
  onPreOrderSaved 
}: PreOrderFormDialogProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [preOrder, setPreOrder] = useState<PreOrder>({
    customerId: null,
    subtotalCents: 0,
    totalCents: 0,
    notes: null,
    items: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Carregar clientes e produtos
  useEffect(() => {
    const loadData = async () => {
      if (!open) return;
      
      try {
        setLoading(true);
        
        // Carregar clientes
        const customersResponse = await fetch("/api/customers");
        if (!customersResponse.ok) {
          throw new Error(`Failed to fetch customers: ${customersResponse.status}`);
        }
        const customersData = await customersResponse.json();
        setCustomers(customersData.data || []);

        // Carregar produtos
        const productsResponse = await fetch("/api/products");
        if (!productsResponse.ok) {
          throw new Error(`Failed to fetch products: ${productsResponse.status}`);
        }
        const productsData = await productsResponse.json();
        setProducts(productsData.data || []);

        // Se estamos editando um pré-pedido existente
        if (preOrderId) {
          const preOrderResponse = await fetch(`/api/pre-orders?id=${preOrderId}`);
          if (!preOrderResponse.ok) {
            throw new Error(`Failed to fetch pre-order: ${preOrderResponse.status}`);
          }
          const preOrderData = await preOrderResponse.json();
          
          // Processar os itens para garantir que tenham a estrutura correta
          const processedItems = preOrderData.items.map((item: any) => ({
            id: item.id, // Preservar o ID do item para atualizações
            productId: item.productId,
            quantity: item.quantity,
            priceCents: item.priceCents
          }));
          
          // Remover campos não utilizados do objeto recebido
          const { discountCents, deliveryFeeCents, ...cleanPreOrderData } = preOrderData;
          
          setPreOrder({
            ...cleanPreOrderData,
            items: processedItems
          });
        } else {
          // Resetar para um novo pré-pedido
          setPreOrder({
            customerId: null,
            subtotalCents: 0,
            totalCents: 0,
            notes: null,
            items: [],
          });
        }
      } catch (error) {
        console.error("Error loading data:", error);
        // Mesmo em caso de erro, resetamos o formulário para um novo pré-pedido
        setPreOrder({
          customerId: null,
          subtotalCents: 0,
          totalCents: 0,
          notes: null,
          items: [],
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, preOrderId]);

  // Atualizar totais quando os itens mudarem
  useEffect(() => {
    const subtotal = preOrder.items.reduce(
      (sum, item) => sum + item.quantity * item.priceCents,
      0
    );
    // Total é igual ao subtotal já que não temos desconto nem taxa de entrega
    const total = subtotal;
    
    setPreOrder(prev => ({
      ...prev,
      subtotalCents: subtotal,
      totalCents: total
    }));
  }, [preOrder.items]);

  const handleCustomerChange = (customerId: string | null) => {
    setPreOrder(prev => ({ ...prev, customerId }));
  };

  const handleAddItem = () => {
    setPreOrder(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: "",
          quantity: 1,
          priceCents: 0,
        }
      ]
    }));
  };

  const handleItemChange = (index: number, field: string, value: string | number) => {
    setPreOrder(prev => {
      const newItems = [...prev.items];
      if (field === "productId") {
        // Quando o produto muda, atualizar o preço
        const product = products.find(p => p.id === value);
        newItems[index] = {
          ...newItems[index],
          productId: value as string,
          priceCents: product ? product.priceCents : 0
        };
      } else {
        newItems[index] = {
          ...newItems[index],
          [field]: value
        };
      }
      return { ...prev, items: newItems };
    });
  };

  const handleRemoveItem = (index: number) => {
    setPreOrder(prev => {
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      return { ...prev, items: newItems };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const method = preOrder.id ? "PUT" : "POST";
      const url = "/api/pre-orders";
      
      // Preparar os dados dos itens para envio
      const itemsToSend = preOrder.items.map(item => ({
        ...(item.id && { id: item.id }), // Incluir ID do item se existir (para atualizações)
        productId: item.productId,
        quantity: item.quantity,
        priceCents: item.priceCents
      }));
      
      // Adicionar campos obrigatórios do banco de dados com valores padrão
      const preOrderToSend = {
        ...(preOrder.id && { id: preOrder.id }), // Incluir ID apenas se estiver editando
        customerId: preOrder.customerId,
        items: itemsToSend,
        notes: preOrder.notes,
        discountCents: 0,      // Valor padrão
        deliveryFeeCents: 0    // Valor padrão
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preOrderToSend),
      });

      if (!response.ok) {
        throw new Error("Failed to save pre-order");
      }

      onOpenChange(false);
      if (onPreOrderSaved) {
        onPreOrderSaved();
      }
    } catch (error) {
      console.error("Error saving pre-order:", error);
      alert("Erro ao salvar pré-pedido. Por favor, tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (cents: number | null) => {
    if (cents === null || cents === undefined) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  // Don't render anything if the dialog is not open
  if (!open) {
    return null;
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={(e) => {
          // Close modal when clicking on the backdrop (outside the modal content)
          if (e.target === e.currentTarget) {
            onOpenChange(false);
          }
        }}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-3xl bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col overflow-hidden relative"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
        >
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-3 relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2ZmZiIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-10"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-white/20 rounded-md">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-white">
                    {preOrderId ? "Editar Pré-Pedido" : "Novo Pré-Pedido"}
                  </CardTitle>
                  <CardDescription className="text-orange-100 text-xs">
                    Carregando informações...
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-7 w-7 rounded-full text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-2 text-sm font-semibold text-orange-600">Carregando...</p>
              <p className="text-xs text-gray-600 mt-1">Por favor, aguarde</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => {
        // Close modal when clicking on the backdrop (outside the modal content)
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-3xl bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        {/* Loading Overlay durante salvamento */}
        {saving && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-4 text-lg font-semibold text-orange-600">Salvando pré-pedido...</p>
              <p className="text-sm text-gray-600 mt-1">Por favor, aguarde</p>
            </div>
          </div>
        )}
        
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-3 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2ZmZiIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-10"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-white/20 rounded-md">
                <ShoppingCart className="h-4 w-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white">
                  {preOrder.id ? "Editar Pré-Pedido" : "Novo Pré-Pedido"}
                </CardTitle>
                <CardDescription className="text-orange-100 text-xs">
                  {preOrder.id
                    ? "Atualize as informações"
                    : "Preencha os dados"}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="h-7 w-7 rounded-full text-white hover:bg-white/20 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <CardContent className="p-3">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Cliente Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 bg-orange-100 rounded">
                    <User className="h-3.5 w-3.5 text-orange-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-orange-900">
                    Cliente
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <div className="relative">
                    <select
                      value={preOrder.customerId || ""}
                      onChange={(e) => handleCustomerChange(e.target.value || null)}
                      className="w-full pl-8 pr-4 py-1.5 rounded border border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 focus:outline-none shadow-sm transition-all appearance-none bg-white text-sm"
                      disabled={saving}
                    >
                      <option value="">Venda avulsa (opcional)</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} - {customer.phone}
                        </option>
                      ))}
                    </select>
                    <User className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  </div>

                </div>
              </div>

              {/* Itens do Pré-Pedido */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="p-1 bg-orange-100 rounded">
                      <Package className="h-3.5 w-3.5 text-orange-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-orange-900">
                      Itens ({preOrder.items.length})
                    </h3>
                  </div>
                  <Button 
                    type="button" 
                    onClick={handleAddItem} 
                    variant="outline"
                    disabled={saving}
                    className="flex items-center gap-1 px-2 py-1 border-orange-200 hover:bg-orange-50 text-orange-700 rounded text-xs"
                  >
                    <Plus className="h-3 w-3" />
                    Adicionar
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {preOrder.items.length === 0 ? (
                    <div className="text-center py-4 bg-orange-50 rounded border border-orange-200">
                      <Package className="h-8 w-8 text-orange-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-500">
                        Nenhum item adicionado
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {preOrder.items.map((item, index) => (
                        <div key={item.id || index} className="grid grid-cols-12 gap-2 items-center p-2 border border-orange-200 rounded bg-orange-50">
                          <div className="col-span-8">
                            <select
                              value={item.productId}
                              onChange={(e) => handleItemChange(index, "productId", e.target.value)}
                              className="w-full pl-7 pr-4 py-1.5 rounded border border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 focus:outline-none shadow-sm transition-all appearance-none bg-white text-sm"
                              required
                              disabled={saving}
                            >
                              <option value="">Selecione um produto</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="col-span-3">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                              className="w-full py-1.5 rounded border border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all text-sm"
                              required
                              disabled={saving}
                            />
                          </div>
                          
                          <div className="col-span-1 flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                              disabled={saving}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Valores Section - Apenas Total */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 bg-orange-100 rounded">
                    <Tag className="h-3.5 w-3.5 text-orange-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-orange-900">
                    Total
                  </h3>
                </div>
                
                <div className="text-lg font-bold text-orange-900">
                  {formatCurrency(preOrder.totalCents)}
                </div>
              </div>

              {/* Observações Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <div className="p-1 bg-orange-100 rounded">
                    <FileText className="h-3.5 w-3.5 text-orange-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-orange-900">
                    Observações
                  </h3>
                </div>
                
                <div className="relative">
                  <Textarea
                    value={preOrder.notes || ""}
                    onChange={(e) => setPreOrder(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Observações..."
                    className="w-full pl-2 py-1.5 rounded border border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 min-h-[60px] shadow-sm transition-all text-sm"
                    disabled={saving}
                  />
                </div>
              </div>
            </form>
          </CardContent>
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-200 px-3 py-2.5 bg-gray-50">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="px-2.5 py-1.5 rounded border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-medium transition-all disabled:opacity-50"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              onClick={handleSubmit}
              disabled={saving || preOrder.items.length === 0}
              className="px-2.5 py-1.5 rounded bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-medium shadow hover:shadow-md transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-1"></div>
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}