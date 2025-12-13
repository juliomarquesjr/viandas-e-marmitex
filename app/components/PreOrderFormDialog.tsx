"use client";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/app/components/ui/dialog";
import { motion } from "framer-motion";
import {
  FileText,
  Loader2,
  Package,
  Plus,
  ShoppingCart,
  Tag,
  User,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "./Toast";
import { CustomerSelectorDialog } from "./CustomerSelectorDialog";

type Customer = {
  id: string;
  name: string;
  phone?: string;
};

type Product = {
  id: string;
  name: string;
  priceCents: number;
  pricePerKgCents?: number;
  barcode?: string;
  imageUrl?: string;
  active: boolean;
  category?: {
    id: string;
    name: string;
  };
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
  discountCents: number;
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
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [preOrder, setPreOrder] = useState<PreOrder>({
    customerId: null,
    subtotalCents: 0,
    discountCents: 0,
    totalCents: 0,
    notes: null,
    items: [],
  });
  const [discountInput, setDiscountInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);

  // Carregar clientes e produtos
  useEffect(() => {
    const loadData = async () => {
      if (!open) return;
      
      try {
        setLoading(true);
        
        // Carregar clientes e ordenar alfabeticamente
        const customersResponse = await fetch("/api/customers");
        if (!customersResponse.ok) {
          throw new Error(`Failed to fetch customers: ${customersResponse.status}`);
        }
        const customersData = await customersResponse.json();
        const sortedCustomers = (customersData.data || []).sort((a: Customer, b: Customer) => 
          a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
        );
        setCustomers(sortedCustomers);

        // Carregar produtos ativos
        const productsResponse = await fetch("/api/products?active=true", {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
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
          
          // Carregar desconto e inicializar input
          const discountCents = preOrderData.discountCents || 0;
          setDiscountInput((discountCents / 100).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }));
          
          setPreOrder({
            ...preOrderData,
            discountCents,
            items: processedItems
          });
        } else {
          // Resetar para um novo pré-pedido
          setPreOrder({
            customerId: null,
            subtotalCents: 0,
            discountCents: 0,
            totalCents: 0,
            notes: null,
            items: [],
          });
          setDiscountInput("");
        }
      } catch (error) {
        console.error("Error loading data:", error);
        // Mesmo em caso de erro, resetamos o formulário para um novo pré-pedido
        setPreOrder({
          customerId: null,
          subtotalCents: 0,
          discountCents: 0,
          totalCents: 0,
          notes: null,
          items: [],
        });
        setDiscountInput("");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, preOrderId]);

  // Atualizar totais quando os itens ou desconto mudarem
  useEffect(() => {
    const subtotal = preOrder.items.reduce(
      (sum, item) => sum + item.quantity * item.priceCents,
      0
    );
    const total = subtotal - preOrder.discountCents;
    
    setPreOrder(prev => ({
      ...prev,
      subtotalCents: subtotal,
      totalCents: total
    }));
  }, [preOrder.items, preOrder.discountCents]);

  const handleCustomerChange = (customerId: string | null) => {
    setPreOrder(prev => ({ ...prev, customerId }));
  };

  const handleCustomerSelect = (customer: Customer) => {
    setPreOrder(prev => ({ ...prev, customerId: customer.id }));
    setShowCustomerDialog(false);
  };

  // Filtrar produtos por busca
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.barcode?.includes(searchQuery) ||
    product.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Adicionar produto ao pré-pedido
  const handleAddProduct = (product: Product) => {
    const existingItem = preOrder.items.find(item => item.productId === product.id);
    
    if (existingItem) {
      // Se o produto já existe, incrementa a quantidade
      setPreOrder(prev => {
        const newItems = prev.items.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
        return { ...prev, items: newItems };
      });
      showToast(`${product.name} adicionado (quantidade: ${existingItem.quantity + 1})`, "success");
    } else {
      // Adiciona novo item
      setPreOrder(prev => ({
        ...prev,
        items: [
          ...prev.items,
          {
            productId: product.id,
            quantity: 1,
            priceCents: product.priceCents
          }
        ]
      }));
      showToast(`${product.name} adicionado`, "success");
    }
    
    setSearchQuery(""); // Limpar busca
  };

  // Atualizar quantidade do item
  const handleItemQuantityChange = (index: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(index);
      return;
    }
    setPreOrder(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        quantity
      };
      return { ...prev, items: newItems };
    });
  };

  // Remover item do pré-pedido
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
      
      // Adicionar campos obrigatórios do banco de dados
      const preOrderToSend = {
        ...(preOrder.id && { id: preOrder.id }), // Incluir ID apenas se estiver editando
        customerId: preOrder.customerId,
        items: itemsToSend,
        notes: preOrder.notes,
        discountCents: preOrder.discountCents || 0,
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

  // Handle discount input change and convert to cents
  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Aplicar máscara monetária para valor
    let value = e.target.value;
    
    // Remove tudo que não é dígito
    value = value.replace(/\D/g, '');
    
    // Converte para número (centavos)
    let numValue = parseInt(value || '0');
    
    // Converte centavos para reais
    let realValue = numValue / 100;
    
    // Formata como moeda brasileira
    let formattedValue = realValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    });
    
    // Remove o símbolo R$ para exibir apenas o valor
    formattedValue = formattedValue.replace('R$\u00A0', '');
    
    // Update the input state
    setDiscountInput(formattedValue);
    
    // Convert to number for validation
    const maxDiscount = preOrder.subtotalCents;
    const discountCents = Math.round(Math.min(realValue * 100, maxDiscount));
    
    setPreOrder(prev => ({
      ...prev,
      discountCents
    }));
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
                {preOrder.customerId ? (
                  <div className="relative">
                    {(() => {
                      const selectedCustomer = customers.find(c => c.id === preOrder.customerId);
                      return (
                        <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 bg-white shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                              <User className="h-6 w-6 text-orange-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-base">{selectedCustomer?.name || "Cliente selecionado"}</div>
                              <div className="text-sm text-gray-600">
                                {selectedCustomer?.phone || "Telefone não informado"}
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCustomerChange(null)}
                            disabled={saving}
                            className="h-10 w-10 rounded-full text-gray-600 hover:text-red-600 hover:bg-red-50"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCustomerDialog(true)}
                    disabled={saving}
                    className="w-full justify-start text-left h-14 text-base pl-4 pr-4 py-3 rounded-xl border border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-all"
                  >
                    <User className="mr-3 h-5 w-5 text-orange-600" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900">Selecionar cliente (opcional)</div>
                      <div className="text-sm text-gray-500">Buscar por nome, telefone ou email</div>
                    </div>
                  </Button>
                )}
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
                  onClick={() => setShowProductModal(true)} 
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-sm transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Produtos
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
                    {preOrder.items.map((item, index) => {
                      const product = products.find(p => p.id === item.productId);
                      return (
                        <div key={item.id || index} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors">
                          {/* Imagem do produto (se disponível) */}
                          <div className="h-12 w-12 flex-shrink-0 bg-gray-100 flex items-center justify-center overflow-hidden rounded-lg border border-gray-200">
                            {product?.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  target.parentElement!.innerHTML = `
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package h-6 w-6 text-gray-300">
                                      <path d="M12 22l-8-4V6L12 2l8 4v12l-8 4z"/>
                                      <path d="M12 2v20"/>
                                      <path d="M4 6l8 4 8-4"/>
                                    </svg>
                                  `;
                                }}
                              />
                            ) : (
                              <Package className="h-6 w-6 text-gray-300" />
                            )}
                          </div>
                          
                          {/* Informações do produto */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{product?.name || "Produto não encontrado"}</div>
                            <div className="text-sm text-gray-500">
                              {formatCurrency(item.priceCents)} x {item.quantity}
                            </div>
                          </div>
                          
                          {/* Quantidade */}
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-gray-600">Qtd:</label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemQuantityChange(index, parseInt(e.target.value) || 1)}
                              className="w-20 py-2 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all text-center"
                              disabled={saving}
                            />
                          </div>
                          
                          {/* Botão remover */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            disabled={saving}
                            className="h-10 w-10 p-0 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Valores Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <Tag className="h-4 w-4 text-orange-600" />
                <h3 className="text-base font-semibold text-orange-800">Valores</h3>
              </div>
              <div className="h-px bg-gradient-to-r from-orange-100 via-orange-300 to-orange-100"></div>
              
              <div className="space-y-4 mt-4">
                {/* Subtotal */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                  <span className="text-base font-semibold text-gray-900">
                    {formatCurrency(preOrder.subtotalCents)}
                  </span>
                </div>

                {/* Desconto */}
                <div className="space-y-2">
                  <Label htmlFor="discount" className="text-sm font-medium text-gray-700">
                    Desconto (R$)
                  </Label>
                  <Input
                    id="discount"
                    type="text"
                    value={discountInput}
                    onChange={handleDiscountChange}
                    placeholder="0,00"
                    className="w-full pl-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all"
                    disabled={saving}
                  />
                  {preOrder.discountCents > 0 && (
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200">
                      <span className="text-sm font-medium text-red-700">Desconto aplicado:</span>
                      <span className="text-base font-semibold text-red-900">
                        -{formatCurrency(preOrder.discountCents)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-orange-800">Total:</span>
                    <div className="text-2xl font-bold text-orange-900">
                      {formatCurrency(preOrder.totalCents)}
                    </div>
                  </div>
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
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                preOrder.id ? "Atualizar Pré-Pedido" : "Criar Pré-Pedido"
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Modal de seleção de produtos */}
      {showProductModal && (
        <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden p-0 flex flex-col">
            <DialogTitle className="sr-only">Selecionar Produtos</DialogTitle>
            
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
              <div className="relative p-6 flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-3 text-xl font-bold text-gray-900">
                    <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
                      <Package className="h-5 w-5 text-orange-600" />
                    </div>
                    Selecionar Produtos
                  </h2>
                  <p className="text-sm text-gray-600 mt-2 ml-13">
                    Adicione produtos ao pré-pedido
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowProductModal(false)}
                  className="h-12 w-12 rounded-full bg-white/60 hover:bg-white shadow-md border border-gray-200 text-gray-600 hover:text-gray-800 transition-all hover:scale-105"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
              
              {/* Barra de busca */}
              <div className="relative px-6 pb-6">
                <div className="relative">
                  <Input
                    placeholder="Buscar produtos por nome, código ou categoria..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Package className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
                  <p className="mt-4 text-gray-600 text-lg">Carregando produtos...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => {
                        handleAddProduct(product);
                      }}
                      className="group flex items-center gap-3 rounded-lg border border-gray-200 p-3 bg-white transition-all duration-200 hover:border-orange-400 hover:shadow-md hover:scale-[1.01]"
                    >
                      {/* Imagem do produto */}
                      <div className="h-16 w-16 flex-shrink-0 bg-gray-100 flex items-center justify-center overflow-hidden rounded-md border border-gray-200">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              target.parentElement!.innerHTML = `
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package h-8 w-8 text-gray-300">
                                  <path d="M12 22l-8-4V6L12 2l8 4v12l-8 4z"/>
                                  <path d="M12 2v20"/>
                                  <path d="M4 6l8 4 8-4"/>
                                </svg>
                              `;
                            }}
                          />
                        ) : (
                          <Package className="h-8 w-8 text-gray-300" />
                        )}
                      </div>
                      
                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-gray-900 line-clamp-1 group-hover:text-orange-700 transition-colors mb-1">
                          {product.name}
                        </h3>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-green-600">
                              {product.pricePerKgCents && product.pricePerKgCents > 0 ? (
                                <>{formatCurrency(product.pricePerKgCents)}/kg</>
                              ) : (
                                <>{formatCurrency(product.priceCents)}</>
                              )}
                            </span>
                            {product.pricePerKgCents && product.pricePerKgCents > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                Por Quilo
                              </span>
                            )}
                          </div>
                          <div className="h-8 w-8 rounded-md bg-orange-500 flex items-center justify-center shadow-sm group-hover:bg-orange-600 group-hover:shadow transition-all">
                            <Plus className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t bg-gray-50/50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowProductModal(false)}
                    className="px-6 py-2 border-gray-300 hover:bg-gray-100 text-gray-700"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de seleção de clientes */}
      <CustomerSelectorDialog
        isOpen={showCustomerDialog}
        onOpenChange={setShowCustomerDialog}
        onSelect={handleCustomerSelect}
        selectedCustomer={customers.find(c => c.id === preOrder.customerId) || null}
      />
    </div>
  );
}