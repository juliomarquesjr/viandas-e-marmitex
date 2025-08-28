"use client";

import {
    Check,
    Edit3,
    Package,
    Plus,
    Save,
    ShoppingCart,
    Trash2,
    X
} from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "./Toast";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";

type Product = {
  id: string;
  name: string;
  priceCents: number;
  barcode?: string;
  imageUrl?: string;
  active: boolean;
};

type CustomerPreset = {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
};

type CustomerPresetModalProps = {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
};

export function CustomerPresetModal({ 
  isOpen, 
  onClose, 
  customerId, 
  customerName 
}: CustomerPresetModalProps) {
  const { showToast } = useToast();
  const [presets, setPresets] = useState<CustomerPreset[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPreset, setEditingPreset] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);

  // Buscar presets existentes
  const fetchPresets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/customers/${customerId}/presets`);
      if (response.ok) {
        const result = await response.json();
        setPresets(result.data || []);
      }
    } catch (error) {
      console.error("Erro ao buscar presets:", error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar produtos disponíveis
  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?active=true");
      if (response.ok) {
        const result = await response.json();
        setAvailableProducts(result.data || []);
      }
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPresets();
      fetchProducts();
    }
  }, [isOpen, customerId]);

  // Filtrar produtos baseado na busca
  const filteredProducts = availableProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.barcode && product.barcode.includes(searchQuery))
  );

  // Adicionar produto ao preset
  const addProductToPreset = () => {
    if (!selectedProductId || quantity <= 0) return;

    const product = availableProducts.find(p => p.id === selectedProductId);
    if (!product) return;

    // Verificar se o produto já está no preset
    if (presets.some(p => p.productId === selectedProductId)) {
      showToast("⚠️ Este produto já está configurado no preset!", "warning");
      return;
    }

    const newPreset: Omit<CustomerPreset, 'id'> = {
      productId: selectedProductId,
      quantity,
      product
    };

    setPresets([...presets, newPreset as CustomerPreset]);
    setSelectedProductId("");
    setQuantity(1);
    setShowAddForm(false);
  };

  // Iniciar edição de quantidade
  const startEditQuantity = (preset: CustomerPreset) => {
    setEditingPreset(preset.productId);
    setEditQuantity(preset.quantity);
  };

  // Salvar edição de quantidade
  const saveEditQuantity = (productId: string) => {
    if (editQuantity <= 0) return;
    
    setPresets(presets.map(p => 
      p.productId === productId 
        ? { ...p, quantity: editQuantity }
        : p
    ));
    setEditingPreset(null);
    setEditQuantity(1);
  };

  // Cancelar edição
  const cancelEdit = () => {
    setEditingPreset(null);
    setEditQuantity(1);
  };

  // Remover produto do preset
  const removeProductFromPreset = (productId: string) => {
    setPresets(presets.filter(p => p.productId !== productId));
  };

  // Salvar presets
  const savePresets = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/customers/${customerId}/presets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          presets: presets.map(p => ({
            productId: p.productId,
            quantity: p.quantity,
          })),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        showToast(`✅ ${presets.length} produto(s) configurado(s) com sucesso!`, "success");
        fetchPresets(); // Recarregar presets
      } else {
        const error = await response.json();
        showToast(`❌ Erro ao salvar presets: ${error.error}`, "error");
      }
    } catch (error) {
      console.error("Erro ao salvar presets:", error);
      showToast("❌ Erro inesperado ao salvar presets. Tente novamente.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Limpar todos os presets
  const clearAllPresets = async () => {
    // Usar toast de confirmação em vez de confirm nativo
    showToast("🔄 Removendo todos os presets...", "info");

    try {
      setSaving(true);
      const response = await fetch(`/api/customers/${customerId}/presets`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPresets([]);
        showToast("🗑️ Todos os presets foram removidos com sucesso!", "success");
      } else {
        const error = await response.json();
        showToast(`❌ Erro ao remover presets: ${error.error}`, "error");
      }
    } catch (error) {
      console.error("Erro ao remover presets:", error);
      showToast("❌ Erro inesperado ao remover presets. Tente novamente.", "error");
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (priceCents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(priceCents / 100);
  };

  const handleClose = () => {
    // Resetar estados ao fechar
    setShowAddForm(false);
    setSelectedProductId("");
    setQuantity(1);
    setSearchQuery("");
    setEditingPreset(null);
    setEditQuantity(1);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Preset de Produtos - {customerName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure produtos que serão adicionados automaticamente ao carrinho quando este cliente for selecionado no PDV.
          </p>

          {loading ? (
            <div className="text-center py-8">Carregando presets...</div>
          ) : (
            <>
              {/* Lista de presets atuais */}
              {presets.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Produtos configurados:</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllPresets}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Limpar todos
                    </Button>
                  </div>
                  
                  <div className="grid gap-3">
                    {presets.map((preset) => (
                      <div
                        key={preset.productId}
                        className="flex items-center justify-between p-4 border rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Package className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{preset.product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatPrice(preset.product.priceCents)}
                              {preset.product.barcode && ` • ${preset.product.barcode}`}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* Edição de quantidade */}
                          {editingPreset === preset.productId ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                                className="w-20"
                              />
                              <Button
                                size="sm"
                                onClick={() => saveEditQuantity(preset.productId)}
                                disabled={editQuantity <= 0}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Badge variant="subtle" className="text-sm">
                                Qtd: {preset.quantity}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditQuantity(preset)}
                                title="Editar quantidade"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          
                          {/* Botão remover */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProductFromPreset(preset.productId)}
                            disabled={saving}
                            title="Remover produto"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhum produto configurado</p>
                  <p className="text-sm">Clique em "Adicionar Produto" para começar</p>
                </div>
              )}

              {/* Formulário para adicionar produto */}
              {showAddForm ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>Adicionar Produto</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddForm(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Input
                        placeholder="Buscar produto por nome ou código de barras..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      
                      {searchQuery && (
                        <div className="max-h-48 overflow-y-auto border rounded-lg">
                          {filteredProducts.length > 0 ? (
                            filteredProducts.map((product) => (
                              <button
                                key={product.id}
                                onClick={() => setSelectedProductId(product.id)}
                                className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${
                                  selectedProductId === product.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                                }`}
                              >
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {formatPrice(product.priceCents)}
                                  {product.barcode && ` • ${product.barcode}`}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="p-3 text-sm text-muted-foreground">
                              Nenhum produto encontrado
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {selectedProductId && (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">quantidade</span>
                        </div>
                        
                        <Button
                          onClick={addProductToPreset}
                          disabled={!selectedProductId || quantity <= 0}
                          className="flex-1"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar ao Preset
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Button
                  onClick={() => setShowAddForm(true)}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Produto
                </Button>
              )}

              {/* Botões de ação */}
              {presets.length > 0 && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={savePresets}
                    disabled={saving}
                    className="flex-1"
                    size="lg"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Salvando..." : "Salvar Presets"}
                  </Button>
                </div>
              )}

              {/* Informações sobre o preset */}
              {presets.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <ShoppingCart className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Como funciona:</p>
                      <p>Quando este cliente for selecionado no PDV, os produtos configurados acima serão adicionados automaticamente ao carrinho.</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
