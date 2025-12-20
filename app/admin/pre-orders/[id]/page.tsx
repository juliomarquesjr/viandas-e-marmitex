"use client";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { useRouter } from "next/navigation";
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
  pricePerKgCents?: number;
  active: boolean;
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
  deliveryFeeCents: number;
  totalCents: number;
  notes: string | null;
  items: PreOrderItem[];
};

export default function PreOrderFormPage({ params }: { params: Promise<{ id?: string }> }) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [preOrder, setPreOrder] = useState<PreOrder>({
    customerId: null,
    subtotalCents: 0,
    discountCents: 0,
    deliveryFeeCents: 0,
    totalCents: 0,
    notes: null,
    items: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Carregar clientes e produtos
  useEffect(() => {
    const loadData = async () => {
      try {
        // Carregar clientes
        const customersResponse = await fetch("/api/customers");
        const customersData = await customersResponse.json();
        setCustomers(customersData.data || []);

        // Carregar produtos ativos (apenas com valor unitário)
        const productsResponse = await fetch("/api/products?status=active");
        const productsData = await productsResponse.json();
        // Filtrar apenas produtos ativos com valor unitário (excluir produtos por peso e desabilitados)
        const unitPriceProducts = (productsData.data || []).filter((product: Product) => {
          // Excluir produtos desabilitados
          if (!product.active) {
            return false;
          }
          const hasUnitPrice = product.priceCents && product.priceCents > 0;
          const hasWeightPrice = product.pricePerKgCents && product.pricePerKgCents > 0;
          return hasUnitPrice && !hasWeightPrice;
        });
        setProducts(unitPriceProducts);

        // Se estamos editando um pré-pedido existente
        const resolvedParams = await params;
        if (resolvedParams.id) {
          const preOrderResponse = await fetch(`/api/pre-orders/${resolvedParams.id}`);
          const preOrderData = await preOrderResponse.json();
          setPreOrder(preOrderData);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [params]);

  // Atualizar totais quando os itens mudarem
  useEffect(() => {
    const subtotal = preOrder.items.reduce(
      (sum, item) => sum + item.quantity * item.priceCents,
      0
    );
    const total = subtotal - preOrder.discountCents + preOrder.deliveryFeeCents;
    
    setPreOrder(prev => ({
      ...prev,
      subtotalCents: subtotal,
      totalCents: total
    }));
  }, [preOrder.items, preOrder.discountCents, preOrder.deliveryFeeCents]);

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
        // Validar que o produto tem valor unitário válido
        if (product && (!product.priceCents || product.priceCents <= 0)) {
          alert("Este produto não pode ser adicionado. Apenas produtos com valor unitário são permitidos.");
          return prev;
        }
        if (product && product.pricePerKgCents && product.pricePerKgCents > 0) {
          alert("Produtos por peso não podem ser adicionados a pré-pedidos.");
          return prev;
        }
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
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preOrder),
      });

      if (!response.ok) {
        throw new Error("Failed to save pre-order");
      }

      router.push("/admin/pre-orders");
      router.refresh();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">
          {preOrder.id ? "Editar Pré-Pedido" : "Novo Pré-Pedido"}
        </h1>
        <Button 
          variant="outline" 
          onClick={() => router.push("/admin/pre-orders")}
        >
          Voltar
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cliente */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="customer">Cliente</Label>
            <select
              id="customer"
              value={preOrder.customerId || ""}
              onChange={(e) => handleCustomerChange(e.target.value || null)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Selecione um cliente (opcional)</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.phone}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Itens do Pré-Pedido */}
        <div className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Itens do Pré-Pedido</h2>
            <Button type="button" onClick={handleAddItem} variant="outline">
              Adicionar Item
            </Button>
          </div>

          {preOrder.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum item adicionado. Clique em "Adicionar Item" para começar.
            </div>
          ) : (
            <div className="space-y-4">
              {preOrder.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-end border-b pb-4">
                  <div className="col-span-5">
                    <Label>Produto</Label>
                    <select
                      value={item.productId}
                      onChange={(e) => handleItemChange(index, "productId", e.target.value)}
                      className="w-full p-2 border rounded-md"
                      required
                    >
                      <option value="">Selecione um produto</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                      required
                    />
                  </div>
                  
                  <div className="col-span-3">
                    <Label>Preço Unitário</Label>
                    <Input
                      type="text"
                      value={formatCurrency(item.priceCents)}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Label>Subtotal</Label>
                    <Input
                      type="text"
                      value={formatCurrency(item.quantity * item.priceCents)}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  
                  <div className="col-span-12 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Valores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label htmlFor="discount">Desconto (R$)</Label>
            <Input
              id="discount"
              type="number"
              min="0"
              step="0.01"
              value={preOrder.discountCents / 100}
              onChange={(e) => setPreOrder(prev => ({
                ...prev,
                discountCents: Math.round(parseFloat(e.target.value || "0") * 100)
              }))}
            />
          </div>
          
          <div>
            <Label htmlFor="deliveryFee">Taxa de Entrega (R$)</Label>
            <Input
              id="deliveryFee"
              type="number"
              min="0"
              step="0.01"
              value={preOrder.deliveryFeeCents / 100}
              onChange={(e) => setPreOrder(prev => ({
                ...prev,
                deliveryFeeCents: Math.round(parseFloat(e.target.value || "0") * 100)
              }))}
            />
          </div>
          
          <div>
            <Label>Total</Label>
            <Input
              type="text"
              value={formatCurrency(preOrder.totalCents)}
              readOnly
              className="bg-muted font-bold"
            />
          </div>
        </div>

        {/* Observações */}
        <div>
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            value={preOrder.notes || ""}
            onChange={(e) => setPreOrder(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Adicione observações sobre este pré-pedido..."
          />
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/pre-orders")}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || preOrder.items.length === 0}>
            {saving ? "Salvando..." : "Salvar Pré-Pedido"}
          </Button>
        </div>
      </form>
    </div>
  );
}