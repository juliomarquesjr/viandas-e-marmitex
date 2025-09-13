"use client";

import { Button } from "@/app/components/ui/button";
import {
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { motion } from "framer-motion";
import {
    Check,
    FileText,
    Package,
    Plus,
    ShoppingCart,
    Tag,
    User,
    X,
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
          
          // Remover campos não utilizados do objeto recebido
          const { discountCents, deliveryFeeCents, ...cleanPreOrderData } = preOrderData;
          
          setPreOrder(cleanPreOrderData);
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
      const url = preOrder.id ? `/api/pre-orders/${preOrder.id}` : "/api/pre-orders";
      
      // Adicionar campos obrigatórios do banco de dados com valores padrão
      const preOrderToSend = {
        ...preOrder,
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
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl max-h-[95vh] overflow-hidden bg-white shadow-2xl rounded-2xl border border-gray-200 flex flex-col"
        >
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  {preOrderId ? "Editar Pré-Pedido" : "Novo Pré-Pedido"}
                </CardTitle>
                <CardDescription className="text-gray-600 mt-1 text-sm">
                  Carregando informações...
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-10 w-10 rounded-full hover:bg-white/50 text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-4 text-muted-foreground">Carregando...</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl max-h-[95vh] overflow-hidden bg-white shadow-2xl rounded-2xl border border-gray-200 flex flex-col"
      >
        {/* Header with gradient and shadow */}
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 sticky top-0 z-20 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-orange-600" />
                {preOrder.id ? "Editar Pré-Pedido" : "Novo Pré-Pedido"}
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1 text-sm">
                {preOrder.id
                  ? "Atualize as informações do pré-pedido"
                  : "Preencha os dados para cadastrar um novo pré-pedido"}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-10 w-10 rounded-full hover:bg-white/50 text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Cliente Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2">
                  <User className="h-4 w-4 text-orange-600" />
                  <h3 className="text-base font-semibold text-orange-800">
                    Informações do Cliente
                  </h3>
                </div>
                <div className="mt-3 h-px bg-gradient-to-r from-orange-100 via-orange-300 to-orange-100"></div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="customer"
                      className="text-sm font-medium text-gray-700"
                    >
                      Cliente
                    </Label>
                    <div className="relative">
                      <select
                        id="customer"
                        value={preOrder.customerId || ""}
                        onChange={(e) => handleCustomerChange(e.target.value || null)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 focus:outline-none shadow-sm transition-all appearance-none bg-white"
                      >
                        <option value="">Selecione um cliente (opcional)</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} - {customer.phone}
                          </option>
                        ))}
                      </select>
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Itens do Pré-Pedido */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 mt-6">
                  <Package className="h-4 w-4 text-orange-600" />
                  <h3 className="text-base font-semibold text-orange-800">
                    Itens do Pré-Pedido
                  </h3>
                </div>
                <div className="mt-3 h-px bg-gradient-to-r from-orange-100 via-orange-300 to-orange-100"></div>
                
                <div className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-medium text-gray-900">Produtos Selecionados</h4>
                    <Button 
                      type="button" 
                      onClick={handleAddItem} 
                      variant="outline"
                      className="flex items-center gap-2 px-4 py-2 border-orange-200 hover:bg-orange-50 text-orange-700 rounded-xl"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar Item
                    </Button>
                  </div>
                  
                  {preOrder.items.length === 0 ? (
                    <div className="text-center py-8 bg-orange-50 rounded-xl border border-orange-200">
                      <Package className="h-12 w-12 text-orange-400 mx-auto mb-3" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        Nenhum item adicionado
                      </h4>
                      <p className="text-sm text-gray-500 mb-4">
                        Clique em "Adicionar Item" para começar a adicionar produtos ao pré-pedido
                      </p>
                      <Button 
                        type="button" 
                        onClick={handleAddItem} 
                        variant="outline"
                        className="bg-orange-600 hover:bg-orange-700 border-orange-700 text-white hover:text-white px-4 py-2 rounded-xl"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Item
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {preOrder.items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-4 items-end p-4 border border-orange-200 rounded-xl bg-orange-50">
                          <div className="col-span-12 md:col-span-5">
                            <Label className="text-sm font-medium text-gray-700">
                              Produto
                            </Label>
                            <div className="relative mt-1">
                              <select
                                value={item.productId}
                                onChange={(e) => handleItemChange(index, "productId", e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 focus:outline-none shadow-sm transition-all appearance-none bg-white"
                                required
                              >
                                <option value="">Selecione um produto</option>
                                {products.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.name}
                                  </option>
                                ))}
                              </select>
                              <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                          
                          <div className="col-span-6 md:col-span-2">
                            <Label className="text-sm font-medium text-gray-700">
                              Quantidade
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                              className="py-3 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all mt-1"
                              required
                            />
                          </div>
                          
                          <div className="col-span-6 md:col-span-3">
                            <Label className="text-sm font-medium text-gray-700">
                              Preço Unitário
                            </Label>
                            <Input
                              type="text"
                              value={formatCurrency(item.priceCents)}
                              readOnly
                              className="py-3 rounded-xl border-gray-200 bg-muted shadow-sm transition-all mt-1"
                            />
                          </div>
                          
                          <div className="col-span-12 md:col-span-2 flex items-end">
                            <div className="w-full">
                              <Label className="text-sm font-medium text-gray-700">
                                Subtotal
                              </Label>
                              <Input
                                type="text"
                                value={formatCurrency(item.quantity * item.priceCents)}
                                readOnly
                                className="py-3 rounded-xl border-gray-200 bg-muted font-bold shadow-sm transition-all mt-1"
                              />
                            </div>
                          </div>
                          
                          <div className="col-span-12 flex justify-end mt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                              className="flex items-center gap-2 border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 rounded-xl"
                            >
                              <X className="h-4 w-4" />
                              Remover
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Valores Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 mt-6">
                  <Tag className="h-4 w-4 text-orange-600" />
                  <h3 className="text-base font-semibold text-orange-800">
                    Valores
                  </h3>
                </div>
                <div className="mt-3 h-px bg-gradient-to-r from-orange-100 via-orange-300 to-orange-100"></div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Subtotal
                    </Label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={formatCurrency(preOrder.subtotalCents)}
                        readOnly
                        className="pl-10 py-3 rounded-xl border-gray-200 bg-muted shadow-sm transition-all"
                      />
                      <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Total
                    </Label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={formatCurrency(preOrder.totalCents)}
                        readOnly
                        className="pl-10 py-3 rounded-xl border-gray-200 bg-muted font-bold shadow-sm transition-all"
                      />
                      <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Observações Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 mt-6">
                  <FileText className="h-4 w-4 text-orange-600" />
                  <h3 className="text-base font-semibold text-orange-800">
                    Observações
                  </h3>
                </div>
                <div className="mt-3 h-px bg-gradient-to-r from-orange-100 via-orange-300 to-orange-100"></div>
                
                <div className="space-y-2 mt-4">
                  <Label
                    htmlFor="notes"
                    className="text-sm font-medium text-gray-700"
                  >
                    Observações
                  </Label>
                  <div className="relative">
                    <Textarea
                      id="notes"
                      value={preOrder.notes || ""}
                      onChange={(e) => setPreOrder(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Adicione observações sobre este pré-pedido..."
                      className="pl-4 py-3 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 min-h-[120px] shadow-sm transition-all"
                    />
                    <FileText className="absolute right-3 bottom-3 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </div>
        
        {/* Footer with actions */}
        <div className="sticky bottom-0 z-20 bg-gray-50/50 border-t border-gray-200 px-6 py-6">
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="px-6 py-3 rounded-xl border-gray-300 hover:bg-gray-100 text-gray-700 font-medium transition-all"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              onClick={handleSubmit}
              disabled={saving || preOrder.items.length === 0}
              className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-lg hover:shadow-xl transition-all"
            >
              {saving ? "Salvando..." : "Salvar Pré-Pedido"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}