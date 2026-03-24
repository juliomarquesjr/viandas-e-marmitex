"use client";

import { Check, Loader2, Minus, Package, Plus, Save, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "./Toast";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type Product = {
  id: string;
  name: string;
  priceCents: number;
  pricePerKgCents?: number;
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

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(priceCents / 100);
}

export function CustomerPresetModal({
  isOpen,
  onClose,
  customerId,
  customerName,
}: CustomerPresetModalProps) {
  const { showToast } = useToast();
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // Map: productId → quantity (qty > 0 = in preset)
  const [productQty, setProductQty] = useState<Map<string, number>>(new Map());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [presetsRes, productsRes] = await Promise.all([
        fetch(`/api/customers/${customerId}/presets`),
        fetch("/api/products?active=true", { cache: "no-store", headers: { "Cache-Control": "no-cache" } }),
      ]);

      const initialQty = new Map<string, number>();

      if (presetsRes.ok) {
        const result = await presetsRes.json();
        const presets: CustomerPreset[] = result.data || [];
        presets.forEach((p) => initialQty.set(p.productId, p.quantity));
      }

      if (productsRes.ok) {
        const result = await productsRes.json();
        setAvailableProducts(result.data || []);
      }

      setProductQty(initialQty);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    } else {
      setSearchQuery("");
      setProductQty(new Map());
    }
  }, [isOpen, customerId]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return availableProducts;
    return availableProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q))
    );
  }, [availableProducts, searchQuery]);

  const selectedProducts = useMemo(
    () => availableProducts.filter((p) => (productQty.get(p.id) ?? 0) > 0),
    [availableProducts, productQty]
  );

  const setQty = (productId: string, qty: number) => {
    setProductQty((prev) => {
      const next = new Map(prev);
      if (qty <= 0) next.delete(productId);
      else next.set(productId, qty);
      return next;
    });
  };

  const increment = (productId: string) => {
    const current = productQty.get(productId) ?? 0;
    setQty(productId, Math.min(current + 1, 99));
  };

  const decrement = (productId: string) => {
    const current = productQty.get(productId) ?? 0;
    setQty(productId, current - 1);
  };

  const savePresets = async () => {
    try {
      setSaving(true);
      const presets = Array.from(productQty.entries()).map(([productId, quantity]) => ({
        productId,
        quantity,
      }));

      const response = await fetch(`/api/customers/${customerId}/presets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presets }),
      });

      if (response.ok) {
        showToast(`${presets.length} produto(s) salvos no preset com sucesso!`, "success");
        onClose();
      } else {
        const error = await response.json();
        showToast(`Erro ao salvar presets: ${error.error}`, "error");
      }
    } catch {
      showToast("Erro inesperado ao salvar presets.", "error");
    } finally {
      setSaving(false);
    }
  };

  const clearAll = () => {
    setProductQty(new Map());
  };

  const selectedCount = selectedProducts.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader>
          <DialogTitle>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{
                background: "var(--modal-header-icon-bg)",
                outline: "1px solid var(--modal-header-icon-ring)",
              }}
            >
              <Package className="h-5 w-5 text-primary" />
            </div>
            Preset de Produtos
          </DialogTitle>
          <DialogDescription>
            Configure os produtos padrão para <strong>{customerName}</strong> — escolha e ajuste as quantidades
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Catálogo de produtos (esquerda) ── */}
          <div className="flex flex-col flex-1 border-r border-slate-100 overflow-hidden">
            {/* Barra de busca */}
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar produto por nome ou código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Lista de produtos */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Carregando produtos...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                  <Package className="h-8 w-8 opacity-40" />
                  <p className="text-sm">Nenhum produto encontrado</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {filteredProducts.map((product) => {
                    const qty = productQty.get(product.id) ?? 0;
                    const isKg = !!(product.pricePerKgCents && product.pricePerKgCents > 0);
                    const isSelected = qty > 0;

                    return (
                      <div
                        key={product.id}
                        className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                          isSelected
                            ? "bg-primary/5 border-l-2 border-l-primary"
                            : "hover:bg-slate-50 border-l-2 border-l-transparent"
                        }`}
                      >
                        {/* Avatar / imagem */}
                        <div className="h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <Package className="h-4 w-4 text-slate-300" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSelected ? "text-primary" : "text-slate-800"}`}>
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500">
                              {isKg
                                ? `${formatPrice(product.pricePerKgCents!)}/kg`
                                : formatPrice(product.priceCents)}
                            </span>
                            {isKg && (
                              <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                                Por kg
                              </span>
                            )}
                            {product.barcode && (
                              <span className="text-[10px] text-slate-400">{product.barcode}</span>
                            )}
                          </div>
                        </div>

                        {/* Stepper */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isSelected ? (
                            <>
                              <button
                                onClick={() => decrement(product.id)}
                                className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center text-sm font-bold text-primary tabular-nums">
                                {qty}
                              </span>
                              <button
                                onClick={() => increment(product.id)}
                                className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setQty(product.id, 1)}
                              className="h-7 w-7 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-400">
                {filteredProducts.length} produto{filteredProducts.length !== 1 ? "s" : ""} disponível{filteredProducts.length !== 1 ? "s" : ""}
                {searchQuery && ` · filtrando por "${searchQuery}"`}
              </p>
            </div>
          </div>

          {/* ── Painel de configurados (direita) ── */}
          <div className="w-56 flex flex-col bg-slate-50/40 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Configurados
              </span>
              {selectedCount > 0 && (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: "var(--modal-header-icon-bg)",
                    color: "var(--modal-header-text)",
                  }}
                >
                  {selectedCount}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {selectedCount === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center text-slate-400 gap-2">
                  <Package className="h-7 w-7 opacity-30" />
                  <p className="text-xs leading-snug">
                    Clique em <Plus className="inline h-3 w-3" /> ao lado de um produto para adicioná-lo
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {selectedProducts.map((product) => {
                    const qty = productQty.get(product.id)!;
                    return (
                      <div key={product.id} className="px-4 py-3 flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 leading-snug truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {qty}× {formatPrice(product.priceCents)}
                          </p>
                        </div>
                        <button
                          onClick={() => setQty(product.id, 0)}
                          className="flex-shrink-0 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedCount > 0 && (
              <div className="px-4 py-2 border-t border-slate-100">
                <button
                  onClick={clearAll}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Limpar tudo
                </button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <p className="text-xs text-slate-400">
            {selectedCount > 0
              ? `${selectedCount} produto${selectedCount !== 1 ? "s" : ""} no preset`
              : "Nenhum produto selecionado"}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={savePresets} disabled={saving || selectedCount === 0}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Preset
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
