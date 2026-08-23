"use client";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Badge } from "@/app/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  formatWeightKg,
  isWeightBasedProduct,
  weightPriceCents,
} from "@/lib/weight";
import {
  AlertTriangle,
  Check,
  Loader2,
  Package,
  Pencil,
  Plus,
  Scale,
  Search,
  ShoppingCart,
  Tag,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "./Toast";
import { CustomerSelectorDialog } from "./CustomerSelectorDialog";
import { WeightInputDialog } from "./WeightInputDialog";

// =============================================================================
// TIPOS
// =============================================================================

type Customer = {
  id: string;
  name: string;
  phone?: string;
};

type Product = {
  id: string;
  name: string;
  priceCents: number;
  pricePerKgCents?: number | null;
  barcode?: string;
  imageUrl?: string;
  active: boolean;
  stockEnabled?: boolean;
  stock?: number | null;
  category?: { id: string; name: string };
};

type PreOrderItem = {
  id?: string;
  productId: string;
  quantity: number;
  priceCents: number;
  /** Preenchido só em produtos vendidos por quilo. */
  weightKg?: number | null;
};

/** Produto aguardando o peso: index null = item novo, número = item em edição. */
type WeightTarget = { product: Product; index: number | null };

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

// =============================================================================
// HELPERS
// =============================================================================

function SectionDivider({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
      {action}
    </div>
  );
}

function formatCurrency(cents: number | null) {
  if (cents === null || cents === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

/** A partir daqui o produto ganha aviso âmbar de estoque acabando (igual ao PDV). */
const LOW_STOCK_THRESHOLD = 3;

/**
 * Unidades do produto já lançadas no pré-pedido. Item por quilo conta 1 por
 * linha, que é como a baixa de estoque acontece na conversão em venda.
 */
function unitsInPreOrder(items: PreOrderItem[], productId: string) {
  return items
    .filter((item) => item.productId === productId)
    .reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Leitura de estoque para exibição. O pré-pedido é pedido futuro: aqui só
 * avisamos — quem bloqueia de fato é a conversão em venda.
 */
function readStock(product: Product | undefined, items: PreOrderItem[]) {
  const controlled = !!product?.stockEnabled;
  const stock = product?.stock ?? null;
  const units = product ? unitsInPreOrder(items, product.id) : 0;

  return {
    controlled,
    stock,
    units,
    unknown: controlled && stock === null,
    out: controlled && stock === 0,
    low: controlled && stock !== null && stock > 0 && stock <= LOW_STOCK_THRESHOLD,
    exceeds: controlled && stock !== null && units > stock,
  };
}

function StockLine({
  tone,
  dot,
  children,
}: {
  tone: string;
  dot: string;
  children: React.ReactNode;
}) {
  return (
    <span className={`flex items-center gap-1.5 text-[11px] leading-none ${tone}`}>
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${dot}`} />
      {children}
    </span>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PreOrderFormDialog({
  open,
  onOpenChange,
  preOrderId,
  onPreOrderSaved,
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
  const [weightTarget, setWeightTarget] = useState<WeightTarget | null>(null);

  // ── Carregar dados ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const loadData = async () => {
      try {
        setLoading(true);

        const [customersRes, productsRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/products?status=active", { cache: "no-store", headers: { "Cache-Control": "no-cache" } }),
        ]);
        if (!customersRes.ok) throw new Error("Failed to fetch customers");
        if (!productsRes.ok) throw new Error("Failed to fetch products");

        const customersData = await customersRes.json();
        const productsData = await productsRes.json();

        setCustomers(
          (customersData.data || []).sort((a: Customer, b: Customer) =>
            a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
          )
        );
        setProducts(productsData.data || []);

        if (preOrderId) {
          const preOrderRes = await fetch(`/api/pre-orders?id=${preOrderId}`);
          if (!preOrderRes.ok) throw new Error("Failed to fetch pre-order");
          const preOrderData = await preOrderRes.json();

          const discountCents = preOrderData.discountCents || 0;
          setDiscountInput(
            (discountCents / 100).toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          );
          setPreOrder({
            ...preOrderData,
            discountCents,
            items: preOrderData.items.map((item: any) => ({
              id: item.id,
              productId: item.productId,
              quantity: item.quantity,
              priceCents: item.priceCents,
              // Chega como string (Decimal serializado pelo Prisma).
              weightKg: item.weightKg != null ? Number(item.weightKg) : null,
            })),
          });
        } else {
          setPreOrder({ customerId: null, subtotalCents: 0, discountCents: 0, totalCents: 0, notes: null, items: [] });
          setDiscountInput("");
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setPreOrder({ customerId: null, subtotalCents: 0, discountCents: 0, totalCents: 0, notes: null, items: [] });
        setDiscountInput("");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [open, preOrderId]);

  // ── Recalcular totais ───────────────────────────────────────────────────────
  useEffect(() => {
    const subtotal = preOrder.items.reduce((sum, item) => sum + item.quantity * item.priceCents, 0);
    setPreOrder((prev) => ({ ...prev, subtotalCents: subtotal, totalCents: subtotal - prev.discountCents }));
  }, [preOrder.items, preOrder.discountCents]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleCustomerSelect = (customer: Customer) => {
    setPreOrder((prev) => ({ ...prev, customerId: customer.id }));
    setShowCustomerDialog(false);
  };

  const filteredProducts = products.filter((p) => {
    if (!p.active) return false;
    // Produto por quilo não tem valor unitário: vale o preço por quilo.
    if (!isWeightBasedProduct(p) && (!p.priceCents || p.priceCents <= 0)) return false;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.barcode?.includes(q) ||
      p.category?.name.toLowerCase().includes(q)
    );
  });

  /** Confirma a adição; se passar do saldo, o toast vira aviso em vez de sucesso. */
  const notifyAdded = (
    product: Product,
    action: string,
    overStock: boolean,
    stock: number | null
  ) => {
    if (overStock) {
      showToast(
        `${product.name} — ${action}, acima do estoque (${stock} un. ${
          stock === 1 ? "disponível" : "disponíveis"
        })`,
        "warning"
      );
      return;
    }
    showToast(`${product.name} — ${action}`, "success");
  };

  const handleAddProduct = (product: Product) => {
    // Por quilo entra sempre como linha nova, com o peso informado na hora.
    if (isWeightBasedProduct(product)) {
      setWeightTarget({ product, index: null });
      return;
    }
    if (!product.priceCents || product.priceCents <= 0) {
      showToast("Produto sem valor unitário definido.", "error");
      return;
    }
    const stockAfter = readStock(product, preOrder.items);
    const overStock =
      stockAfter.controlled &&
      stockAfter.stock !== null &&
      stockAfter.units + 1 > stockAfter.stock;

    const existing = preOrder.items.find((item) => item.productId === product.id);
    if (existing) {
      setPreOrder((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        ),
      }));
    } else {
      setPreOrder((prev) => ({
        ...prev,
        items: [...prev.items, { productId: product.id, quantity: 1, priceCents: product.priceCents }],
      }));
    }

    notifyAdded(product, existing ? "quantidade atualizada" : "adicionado", overStock, stockAfter.stock);
    setSearchQuery("");
  };

  const handleConfirmWeight = (weightKg: number) => {
    if (!weightTarget) return;
    const { product, index } = weightTarget;
    const priceCents = weightPriceCents(product.pricePerKgCents ?? 0, weightKg);

    setPreOrder((prev) => {
      const items = [...prev.items];
      if (index !== null && items[index]) {
        items[index] = { ...items[index], quantity: 1, priceCents, weightKg };
      } else {
        items.push({ productId: product.id, quantity: 1, priceCents, weightKg });
      }
      return { ...prev, items };
    });

    if (index !== null) {
      showToast(`${product.name} — peso atualizado para ${formatWeightKg(weightKg)} kg`, "success");
    } else {
      const stockAfter = readStock(product, preOrder.items);
      notifyAdded(
        product,
        `${formatWeightKg(weightKg)} kg adicionado`,
        stockAfter.controlled &&
          stockAfter.stock !== null &&
          stockAfter.units + 1 > stockAfter.stock,
        stockAfter.stock
      );
    }
    setWeightTarget(null);
    setSearchQuery("");
  };

  const handleItemQuantityChange = (index: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(index);
      return;
    }
    setPreOrder((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], quantity };
      return { ...prev, items: newItems };
    });
  };

  const handleRemoveItem = (index: number) => {
    setPreOrder((prev) => {
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      return { ...prev, items: newItems };
    });
  };

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    const numValue = parseInt(digits || "0");
    const realValue = numValue / 100;
    const formatted = realValue.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    setDiscountInput(formatted);
    const discountCents = Math.round(Math.min(realValue * 100, preOrder.subtotalCents));
    setPreOrder((prev) => ({ ...prev, discountCents }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preOrder.items.length === 0) return;
    setSaving(true);
    try {
      const response = await fetch("/api/pre-orders", {
        method: preOrder.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(preOrder.id && { id: preOrder.id }),
          customerId: preOrder.customerId,
          notes: preOrder.notes,
          discountCents: preOrder.discountCents || 0,
          deliveryFeeCents: 0,
          items: preOrder.items.map((item) => ({
            ...(item.id && { id: item.id }),
            productId: item.productId,
            quantity: item.quantity,
            priceCents: item.priceCents,
            weightKg: item.weightKg ?? null,
          })),
        }),
      });
      if (!response.ok) throw new Error("Failed to save");
      onOpenChange(false);
      onPreOrderSaved?.();
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar pré-pedido. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === preOrder.customerId);

  // Produtos cujo total pedido passou do saldo: só avisa, quem trava é a conversão.
  const productsOverStock = Array.from(new Set(preOrder.items.map((i) => i.productId)))
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => !!p && readStock(p, preOrder.items).exceeds);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ════════════════════════════════════════════════════════════
          MODAL PRINCIPAL — CRIAÇÃO / EDIÇÃO
      ════════════════════════════════════════════════════════════ */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

          {/* ── HEADER ── */}
          <DialogHeader>
            <DialogTitle>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
              >
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              {preOrder.id ? "Editar Pré-Pedido" : "Novo Pré-Pedido"}
            </DialogTitle>
            <DialogDescription>
              {preOrder.id
                ? "Atualize os dados do pré-pedido abaixo"
                : "Preencha os dados para registrar um novo pré-pedido"}
            </DialogDescription>
          </DialogHeader>

          {/* ── CORPO ── */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-slate-500">Carregando informações...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* ── CLIENTE ── */}
                <SectionDivider label="Cliente" />

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Cliente{" "}
                    <span className="text-slate-300 font-normal normal-case tracking-normal">
                      — opcional
                    </span>
                  </Label>

                  {selectedCustomer ? (
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {selectedCustomer.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {selectedCustomer.phone || "Telefone não cadastrado"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreOrder((prev) => ({ ...prev, customerId: null }))}
                        disabled={saving}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCustomerDialog(true)}
                      disabled={saving}
                      className="w-full flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-left transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50"
                    >
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-slate-400" />
                      </div>
                      <span className="text-sm text-slate-500">Clique para selecionar um cliente</span>
                    </button>
                  )}
                </div>

                {/* ── ITENS ── */}
                <SectionDivider
                  label={`Itens do pedido${preOrder.items.length > 0 ? ` (${preOrder.items.length})` : ""}`}
                  action={
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowProductModal(true)}
                      disabled={saving}
                      className="h-6 text-xs px-2.5 gap-1 flex-shrink-0"
                    >
                      <Plus className="h-3 w-3" />
                      Adicionar produto
                    </Button>
                  }
                />

                {productsOverStock.length > 0 && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-amber-800">
                        {productsOverStock.length === 1
                          ? "1 produto acima do estoque disponível"
                          : `${productsOverStock.length} produtos acima do estoque disponível`}
                      </p>
                      <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                        O pré-pedido pode ser salvo normalmente, mas a conversão em venda
                        vai falhar enquanto o saldo não cobrir a quantidade pedida.
                      </p>
                    </div>
                  </div>
                )}

                {preOrder.items.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowProductModal(true)}
                    disabled={saving}
                    className="w-full flex flex-col items-center gap-2 py-8 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center transition-all hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
                  >
                    <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                      <Package className="h-5 w-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600">Nenhum produto adicionado</p>
                      <p className="text-xs text-slate-400 mt-0.5">Clique para buscar e adicionar produtos</p>
                    </div>
                  </button>
                ) : (
                  <div className="space-y-2">
                    {preOrder.items.map((item, index) => {
                      const product = products.find((p) => p.id === item.productId);
                      const itemWeightKg = item.weightKg != null ? Number(item.weightKg) : 0;
                      const isWeightItem = itemWeightKg > 0;
                      // Preço/kg do cadastro; se o produto sumiu, deduz do próprio item.
                      const itemPricePerKgCents = isWeightItem
                        ? Number(product?.pricePerKgCents ?? 0) ||
                          Math.round(item.priceCents / itemWeightKg)
                        : 0;
                      const stockInfo = readStock(product, preOrder.items);
                      // Um produto pode render várias linhas: avisa só na primeira.
                      const showStockWarning =
                        stockInfo.exceeds &&
                        preOrder.items.findIndex((i) => i.productId === item.productId) === index;
                      return (
                        <div
                          key={item.id || index}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:bg-slate-50 transition-colors"
                        >
                          {/* Thumbnail */}
                          <div className="h-9 w-9 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 ring-1 ring-slate-200">
                            {product?.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Package className="h-4 w-4 text-slate-300" />
                              </div>
                            )}
                          </div>

                          {/* Nome + preço */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">
                                {product?.name || "Produto não encontrado"}
                              </p>
                              {isWeightItem && (
                                <Badge variant="warning" size="sm" className="flex-shrink-0">
                                  Por quilo
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                              {isWeightItem
                                ? `${formatWeightKg(itemWeightKg)} kg × ${formatCurrency(itemPricePerKgCents)}/kg`
                                : `${formatCurrency(item.priceCents)}/un.`}
                            </p>
                            {showStockWarning && (
                              <span className="flex items-center gap-1 mt-1 text-[11px] font-medium text-amber-700">
                                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                <span className="tabular-nums">
                                  {stockInfo.units} un. pedidas · {stockInfo.stock} em estoque
                                </span>
                              </span>
                            )}
                          </div>

                          {/* Peso (por quilo) ou controles de quantidade */}
                          {isWeightItem ? (
                            <button
                              type="button"
                              onClick={() => product && setWeightTarget({ product, index })}
                              disabled={saving || !product}
                              title="Ajustar peso do item"
                              className="group/weight flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:border-amber-300 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                            >
                              <Scale className="h-3.5 w-3.5" />
                              <span className="tabular-nums">{formatWeightKg(itemWeightKg)} kg</span>
                              <Pencil className="h-3 w-3 opacity-50 transition-opacity group-hover/weight:opacity-100" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 p-0.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleItemQuantityChange(index, item.quantity - 1)}
                                disabled={saving || item.quantity <= 1}
                                className="h-6 w-6 flex items-center justify-center rounded-md text-slate-500 hover:text-primary hover:bg-primary/10 disabled:opacity-30 transition-colors"
                              >
                                <span className="text-xs font-bold leading-none">−</span>
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleItemQuantityChange(index, parseInt(e.target.value) || 1)}
                                className="w-9 h-6 text-center text-xs font-semibold text-slate-800 border-0 outline-none bg-transparent"
                                disabled={saving}
                              />
                              <button
                                type="button"
                                onClick={() => handleItemQuantityChange(index, item.quantity + 1)}
                                disabled={saving}
                                className="h-6 w-6 flex items-center justify-center rounded-md text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors"
                              >
                                <span className="text-xs font-bold leading-none">+</span>
                              </button>
                            </div>
                          )}

                          {/* Subtotal */}
                          <span className="text-sm font-semibold text-emerald-600 tabular-nums w-20 text-right flex-shrink-0">
                            {formatCurrency(item.priceCents * item.quantity)}
                          </span>

                          {/* Remover */}
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            disabled={saving}
                            className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── DESCONTO ── */}
                <SectionDivider label="Desconto" />

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Valor do desconto{" "}
                    <span className="text-slate-300 font-normal normal-case tracking-normal">
                      — opcional
                    </span>
                  </Label>
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                    <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-50 border-r border-slate-200 flex-shrink-0">
                      <Tag className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-500">R$</span>
                    </div>
                    <input
                      type="text"
                      value={discountInput}
                      onChange={handleDiscountChange}
                      placeholder="0,00"
                      disabled={saving || preOrder.subtotalCents === 0}
                      className="flex-1 px-3 py-3 text-xl font-bold text-slate-900 bg-white outline-none placeholder:text-slate-300 placeholder:font-normal placeholder:text-base disabled:cursor-not-allowed disabled:text-slate-400"
                    />
                  </div>
                </div>

                {/* ── RESUMO FINANCEIRO ── */}
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white divide-y divide-slate-100">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-slate-500">Subtotal</span>
                    <span className="text-sm font-medium text-slate-800 tabular-nums">
                      {formatCurrency(preOrder.subtotalCents)}
                    </span>
                  </div>
                  {preOrder.discountCents > 0 && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-slate-500">Desconto</span>
                      <span className="text-sm font-medium text-red-600 tabular-nums">
                        −{formatCurrency(preOrder.discountCents)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-4 py-4 bg-emerald-50">
                    <span className="text-sm font-semibold text-emerald-800 uppercase tracking-wide">
                      Total
                    </span>
                    <span className="text-2xl font-bold text-emerald-700 tabular-nums">
                      {formatCurrency(preOrder.totalCents)}
                    </span>
                  </div>
                </div>

                {/* ── OBSERVAÇÕES ── */}
                <SectionDivider label="Observações" />

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Observações{" "}
                    <span className="text-slate-300 font-normal normal-case tracking-normal">
                      — opcional
                    </span>
                  </Label>
                  <Textarea
                    value={preOrder.notes || ""}
                    onChange={(e) => setPreOrder((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Informações adicionais sobre o pré-pedido..."
                    className="min-h-[80px] resize-none rounded-xl border-slate-200"
                    disabled={saving}
                  />
                </div>

              </div>{/* fim scrollable */}

              {/* ── FOOTER ── */}
              <DialogFooter>
                <p className="text-xs text-slate-400">
                  {preOrder.items.length > 0
                    ? `${preOrder.items.length} ${preOrder.items.length === 1 ? "item" : "itens"} no pedido`
                    : "Adicione ao menos 1 item"}
                </p>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving || preOrder.items.length === 0}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : preOrder.id ? (
                      "Atualizar Pré-Pedido"
                    ) : (
                      "Criar Pré-Pedido"
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════
          MODAL DE SELEÇÃO DE PRODUTOS
      ════════════════════════════════════════════════════════════ */}
      {showProductModal && (
        <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
          <DialogContent
            /* Garante que o modal de produtos fique acima do modal principal */
            className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden z-[80]"
            overlayClassName="z-[79]"
          >
            {/* ── HEADER ── */}
            <DialogHeader>
              <DialogTitle>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                  style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
                >
                  <Package className="h-5 w-5 text-primary" />
                </div>
                Selecionar Produtos
              </DialogTitle>
              <DialogDescription>
                Clique em um produto para adicioná-lo ao pré-pedido — os itens por
                quilo pedem o peso antes de entrar
              </DialogDescription>

              {/* Campo de busca */}
              <div className="relative mt-3 mr-8">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Buscar por nome, código de barras ou categoria..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl border-slate-200 focus:border-primary"
                  autoFocus
                />
              </div>
            </DialogHeader>

            {/* ── GRID ── */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <Package className="h-6 w-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">Nenhum produto encontrado</p>
                  {searchQuery && (
                    <p className="text-xs text-slate-400 mt-1">
                      Tente outros termos de busca
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredProducts.map((product) => {
                    const weightBased = isWeightBasedProduct(product);
                    const cartLines = preOrder.items.filter((i) => i.productId === product.id);
                    const isInCart = cartLines.length > 0;
                    const cartQty = cartLines.reduce((sum, i) => sum + i.quantity, 0);
                    const cartWeightKg = cartLines.reduce(
                      (sum, i) => sum + (Number(i.weightKg) || 0),
                      0
                    );
                    const stockInfo = readStock(product, preOrder.items);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleAddProduct(product)}
                        className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:shadow-md ${
                          isInCart
                            ? "border-primary/30 bg-primary/5"
                            : "border-slate-200 bg-white hover:border-primary/40"
                        }`}
                      >
                        {/* Imagem */}
                        <div className="h-12 w-12 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 ring-1 ring-slate-200">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Package className="h-6 w-6 text-slate-300" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">
                            {product.name}
                          </p>
                          {product.category && (
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">
                              {product.category.name}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <p className="text-sm font-bold text-emerald-600 tabular-nums">
                              {weightBased
                                ? `${formatCurrency(Number(product.pricePerKgCents))}/kg`
                                : formatCurrency(product.priceCents)}
                            </p>
                            {weightBased && (
                              <Badge variant="warning" size="sm">
                                Por quilo
                              </Badge>
                            )}
                          </div>

                          {stockInfo.controlled && (
                            <div className="mt-1.5">
                              {stockInfo.unknown ? (
                                <StockLine tone="text-red-700 font-semibold" dot="bg-red-600">
                                  Estoque não informado
                                </StockLine>
                              ) : stockInfo.out ? (
                                <StockLine tone="text-red-700 font-semibold" dot="bg-red-600">
                                  Sem estoque
                                </StockLine>
                              ) : stockInfo.exceeds ? (
                                <StockLine tone="text-amber-700 font-semibold" dot="bg-amber-500">
                                  <span className="tabular-nums">
                                    {stockInfo.units} pedidas · {stockInfo.stock} em estoque
                                  </span>
                                </StockLine>
                              ) : stockInfo.low ? (
                                <StockLine tone="text-amber-700 font-semibold" dot="bg-amber-500">
                                  Últimas {stockInfo.stock} un.
                                </StockLine>
                              ) : (
                                <StockLine tone="text-slate-400" dot="bg-emerald-400">
                                  Estoque: {stockInfo.stock} un.
                                </StockLine>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Indicador */}
                        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                          <div
                            className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all ${
                              weightBased
                                ? "bg-amber-100 text-amber-700 group-hover:bg-amber-200"
                                : isInCart
                                ? "bg-primary/15 text-primary"
                                : "bg-primary text-white group-hover:bg-primary/90"
                            }`}
                          >
                            {weightBased ? (
                              <Scale className="h-3.5 w-3.5" />
                            ) : isInCart ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                          </div>
                          {isInCart && (
                            <span
                              className={`text-[10px] font-semibold tabular-nums whitespace-nowrap ${
                                weightBased ? "text-amber-700" : "text-primary"
                              }`}
                            >
                              {weightBased ? `${formatWeightKg(cartWeightKg)} kg` : `×${cartQty}`}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── FOOTER ── */}
            <DialogFooter>
              <p className="text-xs text-slate-400">
                {filteredProducts.length}{" "}
                {filteredProducts.length !== 1 ? "produtos encontrados" : "produto encontrado"}
                {preOrder.items.length > 0 && (
                  <span className="ml-2 text-primary font-medium">
                    · {preOrder.items.length} no carrinho
                  </span>
                )}
              </p>
              <Button variant="outline" onClick={() => setShowProductModal(false)}>
                Concluir seleção
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── SELETOR DE PESO (produtos por quilo) ── */}
      {weightTarget && (
        <WeightInputDialog
          open
          onOpenChange={(next) => {
            if (!next) setWeightTarget(null);
          }}
          productName={weightTarget.product.name}
          pricePerKgCents={Number(weightTarget.product.pricePerKgCents ?? 0)}
          initialWeightKg={
            weightTarget.index !== null
              ? Number(preOrder.items[weightTarget.index]?.weightKg ?? 0) || null
              : null
          }
          onConfirm={handleConfirmWeight}
        />
      )}

      {/* ── SELETOR DE CLIENTE ── */}
      <CustomerSelectorDialog
        isOpen={showCustomerDialog}
        onOpenChange={setShowCustomerDialog}
        onSelect={handleCustomerSelect}
        selectedCustomer={selectedCustomer || null}
      />
    </>
  );
}
