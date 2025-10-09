"use client";

import { Button } from "@/app/components/ui/button";
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
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onOpenChange(false);
          }
        }}
      >
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl bg-white shadow-2xl rounded-2xl border border-gray-200 flex flex-col overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 p-6 relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-orange-600" />
                  {preOrderId ? "Editar Pré-Pedido" : "Novo Pré-Pedido"}
                </h2>
                <p className="text-gray-600 mt-1 text-sm">Carregando informações...</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-12 w-12 rounded-full bg-white/60 hover:bg-white shadow-md border border-gray-200 text-gray-600 hover:text-gray-800 transition-all hover:scale-105"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
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
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl max-h-[95vh] overflow-hidden bg-white shadow-2xl rounded-2xl border border-gray-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading Overlay durante salvamento */}
        {saving && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
              <p className="mt-4 text-lg font-semibold text-orange-600">Salvando pré-pedido...</p>
              <p className="text-sm text-gray-600 mt-1">Por favor, aguarde</p>
            </div>
          </div>
        )}
        
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 p-6 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-orange-600" />
                {preOrder.id ? "Editar Pré-Pedido" : "Novo Pré-Pedido"}
              </h2>
              <p className="text-gray-600 mt-1 text-sm">
                {preOrder.id ? "Atualize as informações do pré-pedido" : "Preencha os dados para criar um novo pré-pedido"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="h-12 w-12 rounded-full bg-white/60 hover:bg-white shadow-md border border-gray-200 text-gray-600 hover:text-gray-800 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
        
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cliente Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <User className="h-4 w-4 text-orange-600" />
                <h3 className="text-base font-semibold text-orange-800">Cliente</h3>
              </div>
              <div className="h-px bg-gradient-to-r from-orange-100 via-orange-300 to-orange-100"></div>
              
              <div className="space-y-2 mt-4">
                <label className="text-sm font-medium text-gray-700">Cliente (opcional)</label>
                <div className="relative">
                  <select
                    value={preOrder.customerId || ""}
                    onChange={(e) => handleCustomerChange(e.target.value || null)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 focus:outline-none shadow-sm transition-all appearance-none bg-white"
                    disabled={saving}
                  >
                    <option value="">Venda avulsa (opcional)</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} - {customer.phone}
                      </option>
                    ))}
                  </select>
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Itens do Pré-Pedido */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-orange-600" />
                  <h3 className="text-base font-semibold text-orange-800">
                    Itens ({preOrder.items.length})
                  </h3>
                </div>
                <Button 
                  type="button" 
                  onClick={handleAddItem} 
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-sm transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Item
                </Button>
              </div>
              <div className="h-px bg-gradient-to-r from-orange-100 via-orange-300 to-orange-100"></div>
              
              <div className="space-y-3 mt-4">
                {preOrder.items.length === 0 ? (
                  <div className="text-center py-8 bg-orange-50 rounded-xl border border-orange-200">
                    <Package className="h-12 w-12 text-orange-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Nenhum item adicionado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {preOrder.items.map((item, index) => (
                      <div key={item.id || index} className="grid grid-cols-12 gap-3 items-center p-4 border border-gray-200 rounded-xl bg-white">
                        <div className="col-span-7">
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Produto</label>
                          <div className="relative">
                            <select
                              value={item.productId}
                              onChange={(e) => handleItemChange(index, "productId", e.target.value)}
                              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 focus:outline-none shadow-sm transition-all appearance-none bg-white"
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
                            <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                        
                        <div className="col-span-4">
                          <label className="text-xs font-medium text-gray-600 mb-1 block">Quantidade</label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                            className="w-full py-2 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all"
                            required
                            disabled={saving}
                          />
                        </div>
                        
                        <div className="col-span-1 flex justify-end items-end pb-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            disabled={saving}
                            className="h-8 w-8 p-0 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Valores Section - Apenas Total */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <Tag className="h-4 w-4 text-orange-600" />
                <h3 className="text-base font-semibold text-orange-800">Total</h3>
              </div>
              <div className="h-px bg-gradient-to-r from-orange-100 via-orange-300 to-orange-100"></div>
              
              <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 mt-4">
                <div className="text-2xl font-bold text-orange-900">
                  {formatCurrency(preOrder.totalCents)}
                </div>
              </div>
            </div>

            {/* Observações Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <FileText className="h-4 w-4 text-orange-600" />
                <h3 className="text-base font-semibold text-orange-800">Observações</h3>
              </div>
              <div className="h-px bg-gradient-to-r from-orange-100 via-orange-300 to-orange-100"></div>
              
              <div className="relative mt-4">
                <Textarea
                  value={preOrder.notes || ""}
                  onChange={(e) => setPreOrder(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observações adicionais sobre o pré-pedido..."
                  className="w-full pl-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 min-h-[100px] shadow-sm transition-all"
                  disabled={saving}
                />
                <FileText className="absolute right-3 bottom-3 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </form>
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50/50">
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="px-6 py-3 rounded-xl border-gray-300 hover:bg-gray-100 text-gray-700 font-medium transition-all disabled:opacity-50"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              onClick={handleSubmit}
              disabled={saving || preOrder.items.length === 0}
              className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                  Salvando...
                </span>
              ) : (
                preOrder.id ? "Atualizar Pré-Pedido" : "Criar Pré-Pedido"
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}