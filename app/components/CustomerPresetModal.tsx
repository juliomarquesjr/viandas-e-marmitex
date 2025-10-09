"use client";

import {
    Check,
    Edit3,
    Package,
    Plus,
    Save,
    Trash2,
    X
} from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "./Toast";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
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

  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPreset, setEditingPreset] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const [showProductList, setShowProductList] = useState(false);

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
      const response = await fetch("/api/products?active=true", {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
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

  // Filtrar produtos baseado na busca (busca em tempo real)
  const filteredProducts = availableProducts.filter(product => {
    if (!searchQuery.trim()) return false; // Só mostra produtos quando há busca
    
    const query = searchQuery.toLowerCase().trim();
    return (
      product.name.toLowerCase().includes(query) ||
      (product.barcode && product.barcode.includes(query))
    );
  });

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
    setSearchQuery("");
    
    showToast(`✅ ${product.name} adicionado ao preset com sucesso!`, "success");
  };

  // Função para selecionar produto e fechar a lista
  const selectProduct = (productId: string) => {
    setSelectedProductId(productId);
    setSearchQuery(""); // Limpa a busca para fechar a lista
    setShowProductList(false); // Fecha a lista de produtos
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
    setSelectedProductId("");
    setQuantity(1);
    setSearchQuery("");
    setEditingPreset(null);
    setEditQuantity(1);
    setShowProductList(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
          <div className="relative p-6 flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-600" />
                Preset de Produtos
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Configure produtos para {customerName}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-12 w-12 rounded-full bg-white/60 hover:bg-white shadow-md border border-gray-200 text-gray-600 hover:text-gray-800 transition-all hover:scale-105"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="text-center py-8">Carregando presets...</div>
          ) : (
            <>
              {/* Lista de presets atuais */}
              {presets.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Produtos configurados ({presets.length})
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllPresets}
                      disabled={saving}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Limpar
                    </Button>
                  </div>
                  
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {presets.map((preset) => (
                      <div
                        key={preset.productId}
                        className="flex items-center justify-between p-2 border rounded bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{preset.product.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatPrice(preset.product.priceCents)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {/* Edição de quantidade */}
                          {editingPreset === preset.productId ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="1"
                                max="99"
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                                className="w-12 h-6 text-xs text-center"
                              />
                              <Button
                                size="sm"
                                onClick={() => saveEditQuantity(preset.productId)}
                                disabled={editQuantity <= 0}
                                className="h-6 w-6 p-0"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Badge variant="subtle" className="text-xs h-5 px-1">
                                {preset.quantity}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditQuantity(preset)}
                                title="Editar quantidade"
                                className="h-6 w-6 p-0"
                              >
                                <Edit3 className="h-3 w-3" />
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
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum produto configurado</p>
                </div>
              )}

              {/* Formulário para adicionar produto */}
              <div className="space-y-3 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
                <div className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  <span className="text-base font-semibold text-primary">Adicionar Produto</span>
                </div>
                
                {/* Campo de busca */}
                <div className="relative">
                  <Input
                    placeholder="Digite o nome, código de barras ou descrição do produto..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowProductList(e.target.value.trim().length > 0);
                      if (e.target.value.trim().length === 0) {
                        setSelectedProductId('');
                      }
                    }}
                    className="w-full pr-8 h-9 border-primary/30 focus:border-primary"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedProductId('');
                        setShowProductList(false);
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Lista de resultados da busca */}
                {showProductList && searchQuery.trim() && (
                  <div className="max-h-32 overflow-y-auto border rounded bg-background">
                    {filteredProducts.length > 0 ? (
                      <div className="space-y-1 p-1">
                        {filteredProducts.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => selectProduct(product.id)}
                            className={`w-full p-2 text-left hover:bg-muted/50 transition-colors rounded text-xs ${
                              selectedProductId === product.id 
                                ? 'bg-primary/10 border-l-2 border-l-primary' 
                                : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{product.name}</div>
                                <div className="text-muted-foreground">
                                  {formatPrice(product.priceCents)}
                                  {product.barcode && ` • ${product.barcode}`}
                                </div>
                              </div>
                              {selectedProductId === product.id && (
                                <Check className="h-3 w-3 text-primary flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        Nenhum produto encontrado
                      </div>
                    )}
                  </div>
                )}

                {/* Produto selecionado e quantidade */}
                {selectedProductId && (
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-primary/30 shadow-sm">
                    {(() => {
                      const selectedProduct = availableProducts.find(p => p.id === selectedProductId);
                      return selectedProduct ? (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate text-primary">{selectedProduct.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatPrice(selectedProduct.priceCents)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-muted-foreground">Qtd:</label>
                            <Input
                              type="number"
                              min="1"
                              max="99"
                              value={quantity}
                              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                              className="w-14 h-7 text-xs text-center border-primary/30"
                            />
                          </div>
                          <Button
                            onClick={addProductToPreset}
                            disabled={quantity <= 0}
                            size="sm"
                            className="h-7 px-3 text-xs bg-primary hover:bg-primary/90"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Adicionar
                          </Button>
                        </>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* Instruções quando não há busca */}
                {!searchQuery.trim() && !selectedProductId && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Digite acima para buscar produtos</p>
                    <p className="text-xs text-muted-foreground">Busque por nome, código de barras ou descrição</p>
                  </div>
                )}
              </div>

            </>
          )}
        </div>

        {/* Rodapé fixo */}
        {presets.length > 0 && (
          <div className="border-t border-gray-200 p-6 bg-gray-50/50">
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="px-6 py-3 rounded-xl border-gray-300 hover:bg-gray-100 text-gray-700 font-medium transition-all"
              >
                Cancelar
              </Button>
              <Button
                onClick={savePresets}
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                    Salvando...
                  </span>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Presets
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
