"use client";

import {
    Calculator,
    AlertCircle,
    Boxes,
    Calendar,
    ChefHat,
    CircleDollarSign,
    ClipboardList,
    CreditCard,
    Image as ImageIcon,
    LogOut,
    Minus,
    Percent,
    Plus,
    QrCode,
    RefreshCcw,
    Search,
    Settings,
    ShoppingCart,
    Trash2,
    User,
    Wallet
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { CalculatorModal } from "../components/CalculatorModal";
import { CustomerSelector } from "../components/CustomerSelector";
import { ReceiptModal } from "../components/ReceiptModal";
import { useToast } from "../components/Toast";
import { WeightInputModal } from "../components/WeightInputModal";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Clock } from "../components/ui/clock";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { useBarcodeScanner } from "./hooks/useBarcodeScanner";
import { useCart } from "./hooks/useCart";
import { useCustomer } from "./hooks/useCustomer";
import { useDiscount } from "./hooks/useDiscount";
import { usePDVActions } from "./hooks/usePDVActions";
import { usePDVUtils } from "./hooks/usePDVUtils";
import { useProducts } from "./hooks/useProducts";

export default function PDVPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  // Refs criados na página e compartilhados entre hooks
  const inputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const showErrorToast = useCallback(
    (message: string) => showToast(message, "error"),
    [showToast]
  );

  // --- Produtos ---
  const {
    products,
    loadingProducts,
    fetchProducts,
    canAddProductToCart,
    canAddProductToPreset,
    formatPriceToReais,
  } = useProducts();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // --- Carrinho (usa audioRef e inputRef diretamente) ---
  const cartHook = useCart(canAddProductToCart, audioRef, inputRef, setQuery);

  // --- Desconto ---
  const discountHook = useDiscount(cartHook.subtotal, showToast);

  // Total calculado na página (evita dependência circular)
  const total = Math.max(0, cartHook.subtotal - discountHook.discountAmount);

  // --- Cliente ---
  const customerHook = useCustomer(cartHook.mergeCartItems, canAddProductToPreset);

  // --- Ações (reset PDV, finalizar venda, pagamento) ---
  const onReset = useCallback(() => {
    customerHook.handleRemoveCustomer();
    setQuery("");
    inputRef.current?.focus();
  }, [customerHook.handleRemoveCustomer]);

  const actionsHook = usePDVActions({
    cart: cartHook.cart,
    subtotal: cartHook.subtotal,
    discountAmount: discountHook.discountAmount,
    total,
    selectedCustomer: customerHook.selectedCustomer,
    session,
    fetchProducts,
    clearCart: cartHook.clearCart,
    resetDiscount: discountHook.resetDiscount,
    setDiscountOpen: discountHook.setDiscountOpen,
    onReset,
    playBeepSound: cartHook.playBeepSound,
  });

  // --- Utils (atalhos de teclado) ---
  usePDVUtils({
    inputRef,
    audioRef,
    setQuery,
    calculatorOpen,
    cartLength: cartHook.cart.length,
    selectedIndex: cartHook.selectedIndex,
    setSelectedIndex: cartHook.setSelectedIndex,
    setCart: cartHook.setCart,
    setPaymentOpen: actionsHook.setPaymentOpen,
    setDiscountOpen: discountHook.setDiscountOpen,
    setNewSaleConfirmOpen: actionsHook.setNewSaleConfirmOpen,
    resetPDVAndRefreshProducts: actionsHook.resetPDVAndRefreshProducts,
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // --- Barcode Scanner ---
  useBarcodeScanner({
    query,
    products,
    canAddProductToCart,
    handleSelectCustomer: customerHook.handleSelectCustomer,
    setCart: cartHook.setCart,
    setSelectedIndex: cartHook.setSelectedIndex,
    playBeepSound: cartHook.playBeepSound,
    clearQueryField: () => {
      setQuery("");
      inputRef.current?.focus();
    },
    validateBarcode: (code: string) => /^\d{13}$/.test(code),
    showErrorToast,
  });

  return (
    <div className="min-h-screen w-full bg-background text-foreground grid grid-rows-[auto_1fr]">
      {/* Elemento de áudio para o som de beep */}
      <audio ref={audioRef} src="/audio/beep.mp3" preload="auto" />

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/20 bg-white/80 backdrop-blur-xl p-6 shadow-lg">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
              <ChefHat className="h-7 w-7 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Comida Caseira
              </div>
              <div className="text-sm text-muted-foreground">Ponto de Venda</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {session?.user && (
            <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/80 border border-white/30 backdrop-blur-sm shadow-sm">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "Usuário"}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900">{session.user.name}</span>
                <span className="text-xs text-gray-500 capitalize">
                  {session.user.role === "admin" ? "Administrador" : "PDV"}
                </span>
              </div>
            </div>
          )}

          <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/80 border border-white/30 backdrop-blur-sm shadow-sm">
            <Clock />
          </div>

          <div className="flex items-center gap-2">
            {session?.user?.role === "admin" && (
              <Button
                variant="outline"
                className="h-9 gap-2"
                onClick={() => (window.location.href = "/admin")}
                aria-label="Voltar ao admin"
                title="Voltar ao admin"
              >
                <Settings className="h-4 w-4" /> Admin
              </Button>
            )}

            <Button
              variant="outline"
              className="h-9 gap-2"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("openCustomerSelector"))
              }
              aria-label="Selecionar cliente (F3)"
              title="Selecionar cliente (F3)"
            >
              <User className="h-4 w-4" /> Cliente (F3)
            </Button>

            <Button
              variant="outline"
              className="h-9 gap-2"
              onClick={() => setCalculatorOpen(true)}
              aria-label="Abrir calculadora"
              title="Abrir calculadora"
            >
              <Calculator className="h-4 w-4" /> Calculadora
            </Button>

            {session?.user?.role === "admin" && (
              <Button
                variant="outline"
                className="h-9 gap-2"
                onClick={() => actionsHook.setDateModalOpen(true)}
                aria-label="Alterar data da venda"
                title="Alterar data da venda"
              >
                <Calendar className="h-4 w-4" />{" "}
                {actionsHook.formatDisplayDate(actionsHook.customSaleDate)}
              </Button>
            )}

            <Button
              className="h-9 gap-2"
              onClick={() => {
                if (cartHook.cart.length > 0)
                  actionsHook.setNewSaleConfirmOpen(true);
                else actionsHook.resetPDVAndRefreshProducts();
              }}
            >
              <RefreshCcw className="h-4 w-4" /> Nova venda (F9)
            </Button>
            <Button
              variant="outline"
              className="h-9 gap-2"
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
            >
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="grid lg:grid-cols-[2fr_1fr] gap-4 p-4 h-[calc(100vh-120px)]">
        {/* Seção de Produtos */}
        <section className="flex flex-col space-y-4 min-h-0">
          <div className="flex items-center gap-3 text-lg font-semibold text-foreground flex-shrink-0">
            <Search className="h-5 w-5 text-primary" />
            <span>Pesquisa</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Código de barras (13 dígitos)"
                className="pl-9"
                maxLength={13}
              />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3 text-lg font-semibold text-foreground flex-shrink-0">
            <Boxes className="h-5 w-5 text-primary" />
            <span>Produtos</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-6 overflow-y-auto flex-1 pr-2">
            {loadingProducts ? (
              Array.from({ length: 3 }).map((_, groupIndex) => (
                <div key={groupIndex} className="space-y-3">
                  <div className="h-6 w-32 rounded bg-gray-200 animate-pulse"></div>
                  <div className="grid grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="group flex items-center gap-4 rounded-xl border border-border bg-card p-3 text-left shadow-sm animate-pulse"
                      >
                        <div className="h-24 w-24 flex-shrink-0 rounded-md bg-gray-200" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="h-4 w-24 rounded bg-gray-200 mb-2"></div>
                              <div className="h-3 w-32 rounded bg-gray-200"></div>
                            </div>
                            <div className="h-6 w-16 rounded-full bg-gray-200"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : products.length === 0 ? (
              <div className="grid place-items-center rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                <div>Nenhum produto cadastrado.</div>
              </div>
            ) : (
              <>
                {products.filter((p) => p.productType === "sellable").length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-foreground">Produtos Vendáveis</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {products
                        .filter((p) => p.productType === "sellable")
                        .map((product) => {
                          const hasImage = product.imageUrl;
                          const imgSrc = hasImage ? product.imageUrl : "/product-placeholder.svg";
                          const price = product.priceCents / 100;
                          return (
                            <button
                              key={product.id}
                              onClick={() => cartHook.handleAddProductToCart(product)}
                              disabled={!canAddProductToCart(product)}
                              className={`group flex items-center gap-4 rounded-xl border p-3 text-left shadow-sm transition-all duration-200 ${
                                canAddProductToCart(product)
                                  ? "border-border bg-card hover:bg-accent hover:shadow-lg hover:scale-[1.02] hover:border-primary/30 cursor-pointer"
                                  : "border-red-200 bg-red-50 cursor-not-allowed opacity-60"
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <div className="h-24 w-24 flex-shrink-0 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                                {hasImage ? (
                                  <img
                                    src={imgSrc}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = "none";
                                      target.parentElement!.innerHTML =
                                        '<div class="h-24 w-24 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image h-8 w-8 text-gray-400"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>';
                                    }}
                                  />
                                ) : (
                                  <ImageIcon className="h-8 w-8 text-gray-400" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col gap-2">
                                  <div className="min-w-0">
                                    <div className="text-base font-semibold leading-tight line-clamp-2 min-h-[2.5rem]">
                                      {product.name}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <div className="whitespace-nowrap rounded-full bg-white/80 px-3 py-1 text-sm shadow-sm font-medium">
                                          {product.pricePerKgCents && product.pricePerKgCents > 0 ? (
                                            <>R$ {(product.pricePerKgCents / 100).toFixed(2)}/kg</>
                                          ) : (
                                            <>R$ {price.toFixed(2)}</>
                                          )}
                                        </div>
                                        {product.pricePerKgCents && product.pricePerKgCents > 0 && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                            Por Quilo
                                          </span>
                                        )}
                                      </div>
                                      {product.stockEnabled && product.stock !== undefined && (
                                        <div className={`text-xs ${product.stock > 0 ? "text-muted-foreground" : "text-red-600 font-medium"}`}>
                                          Estoque: {product.stock} unid.
                                          {product.stock === 0 && (
                                            <span className="ml-1 text-red-500">• Esgotado</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {!canAddProductToCart(product) && (
                                      <div className="flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                                        <AlertCircle className="h-3 w-3" />
                                        Indisponível
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {products.filter((p) => p.productType === "addon").length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-foreground">Adicionais</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {products
                        .filter((p) => p.productType === "addon")
                        .map((product) => {
                          const hasImage = product.imageUrl;
                          const imgSrc = hasImage ? product.imageUrl : "/product-placeholder.svg";
                          const price = product.priceCents / 100;
                          return (
                            <button
                              key={product.id}
                              onClick={() => cartHook.handleAddProductToCart(product)}
                              disabled={!canAddProductToCart(product)}
                              className={`group flex items-center gap-4 rounded-xl border p-3 text-left shadow-sm transition-all duration-200 ${
                                canAddProductToCart(product)
                                  ? "border-border bg-card hover:bg-accent hover:shadow-lg hover:scale-[1.02] hover:border-primary/30 cursor-pointer"
                                  : "border-red-200 bg-red-50 cursor-not-allowed opacity-60"
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <div className="h-24 w-24 flex-shrink-0 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                                {hasImage ? (
                                  <img
                                    src={imgSrc}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = "none";
                                      target.parentElement!.innerHTML =
                                        '<div class="h-24 w-24 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image h-8 w-8 text-gray-400"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>';
                                    }}
                                  />
                                ) : (
                                  <ImageIcon className="h-8 w-8 text-gray-400" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col gap-2">
                                  <div className="min-w-0">
                                    <div className="text-base font-semibold leading-tight line-clamp-2 min-h-[2.5rem]">
                                      {product.name}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <div className="whitespace-nowrap rounded-full bg-white/80 px-3 py-1 text-sm shadow-sm font-medium">
                                          {product.pricePerKgCents && product.pricePerKgCents > 0 ? (
                                            <>R$ {(product.pricePerKgCents / 100).toFixed(2)}/kg</>
                                          ) : (
                                            <>R$ {price.toFixed(2)}</>
                                          )}
                                        </div>
                                        {product.pricePerKgCents && product.pricePerKgCents > 0 && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                            Por Quilo
                                          </span>
                                        )}
                                      </div>
                                      {product.stockEnabled && product.stock !== undefined && (
                                        <div className={`text-xs ${product.stock > 0 ? "text-muted-foreground" : "text-red-600 font-medium"}`}>
                                          Estoque: {product.stock} unid.
                                          {product.stock === 0 && (
                                            <span className="ml-1 text-red-500">• Esgotado</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {!canAddProductToCart(product) && (
                                      <div className="flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                                        <AlertCircle className="h-3 w-3" />
                                        Indisponível
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Sidebar do Carrinho */}
        <aside className="grid grid-rows-[auto_1fr_auto] gap-3 rounded-lg border border-border bg-card p-3 h-full">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-md bg-primary/5 px-2 py-1 text-sm font-medium">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span>Carrinho</span>
            </div>
            <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-200">
              Itens: {cartHook.cart.length}
            </Badge>
          </div>

          <CustomerSelector
            onSelect={customerHook.handleSelectCustomer}
            selectedCustomer={customerHook.selectedCustomer}
            onRemove={customerHook.handleRemoveCustomer}
            presetProductsLoaded={customerHook.presetProductsLoaded}
          />

          <div className="space-y-1 overflow-y-auto pr-2 max-h-[400px]">
            {cartHook.cart.length === 0 && (
              <div className="grid place-items-center rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                <div>
                  Seu carrinho está vazio. Informe o código de barras para
                  adicionar produtos automaticamente.
                </div>
              </div>
            )}
            {cartHook.cart.map((item, idx) => (
              <div
                key={item.id}
                className={
                  "grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-md border p-2 " +
                  (idx === cartHook.selectedIndex
                    ? "border-primary ring-1 ring-primary/40"
                    : "border-transparent")
                }
                onMouseEnter={() => cartHook.setSelectedIndex(idx)}
              >
                <div className="truncate">
                  <div className="text-sm font-medium leading-tight">{item.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.isWeightBased && item.weightKg ? (
                      <>
                        {item.weightKg.toFixed(3)} kg × R${" "}
                        {(item.price / item.weightKg).toFixed(2)}/kg
                      </>
                    ) : (
                      <>R$ {item.price.toFixed(2)}</>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!item.isWeightBased ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() =>
                          cartHook.setCart((prev) =>
                            prev.map((it, i) =>
                              i === idx
                                ? { ...it, qty: Math.max(1, it.qty - 1) }
                                : it
                            )
                          )
                        }
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="w-8 text-center text-sm">{item.qty}</div>
                      <Button
                        variant="outline"
                        onClick={() =>
                          cartHook.setCart((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, qty: it.qty + 1 } : it
                            )
                          )
                        }
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <div className="w-8 text-center text-sm text-muted-foreground">
                      {item.weightKg?.toFixed(3)} kg
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    aria-label={`Remover ${item.name}`}
                    onClick={() =>
                      cartHook.setCart((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm font-medium">
                  R$ {(item.qty * item.price).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-2 border-t pt-3">
            <div className="flex items-center justify-between text-sm">
              <span>Subtotal</span>
              <span>R$ {cartHook.subtotal.toFixed(2)}</span>
            </div>
            {discountHook.discountAmount > 0 && discountHook.discount && (
              <div className="flex items-center justify-between text-sm">
                <span>
                  Desconto{" "}
                  {discountHook.discount.type === "percent"
                    ? `(${Math.max(0, Math.min(100, discountHook.discount.value)).toFixed(0)}%)`
                    : ""}
                </span>
                <span className="text-primary">
                  − R$ {discountHook.discountAmount.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Total</span>
              <span className="text-base font-semibold">R$ {total.toFixed(2)}</span>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-2"
                onClick={() => actionsHook.setPaymentOpen(true)}
                disabled={cartHook.cart.length === 0}
              >
                <CreditCard className="h-4 w-4" /> Pagamento (F2)
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2 bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900"
                onClick={() => discountHook.setDiscountOpen(true)}
                disabled={cartHook.cart.length === 0}
              >
                <Percent className="h-4 w-4" /> Desconto (F4)
              </Button>
            </div>
          </div>

          {/* Dialog de Pagamento */}
          <Dialog
            open={actionsHook.isPaymentOpen}
            onOpenChange={(open) => {
              actionsHook.setPaymentOpen(open);
              if (!open) {
                actionsHook.setCashReceived("");
                actionsHook.setChange(0);
              }
            }}
          >
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl">Pagamento</DialogTitle>
                <DialogDescription>
                  Selecione o método de pagamento
                  {customerHook.selectedCustomer
                    ? ` para ${customerHook.selectedCustomer.name}`
                    : ""}
                  .
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Formas de Pagamento</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Dinheiro", icon: CircleDollarSign },
                      { label: "Cartão Débito", icon: CreditCard },
                      { label: "Cartão Crédito", icon: CreditCard },
                      { label: "PIX", icon: QrCode },
                      { label: "Ficha do Cliente", icon: ClipboardList },
                    ].map((m) => (
                      <Button
                        key={m.label}
                        variant={actionsHook.selectedPayment === m.label ? "default" : "outline"}
                        className="h-20 flex flex-col items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-md"
                        onClick={() => {
                          actionsHook.setSelectedPayment(m.label);
                          if (m.label !== "Dinheiro") {
                            actionsHook.setCashReceived("");
                            actionsHook.setChange(0);
                          }
                        }}
                      >
                        <m.icon className="h-6 w-6" />
                        <span className="text-sm font-medium">{m.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="transition-all duration-300 ease-in-out">
                  {actionsHook.selectedPayment === "Dinheiro" ? (
                    <div className="bg-muted rounded-xl p-5 h-full animate-in fade-in slide-in-from-right-4 duration-300">
                      <h3 className="text-lg font-semibold mb-4">Pagamento em Dinheiro</h3>
                      <div className="space-y-5">
                        <div className="flex justify-between items-center p-4 bg-background rounded-lg">
                          <span className="text-muted-foreground">Total da Compra</span>
                          <span className="text-xl font-bold">R$ {total.toFixed(2)}</span>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="cashReceived" className="text-sm font-medium">
                            Valor Recebido
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                              R$
                            </span>
                            <Input
                              id="cashReceived"
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              value={actionsHook.cashReceived}
                              onChange={(e) => {
                                const value = e.target.value;
                                actionsHook.setCashReceived(value);
                                if (value && !isNaN(parseFloat(value))) {
                                  actionsHook.setChange(
                                    Math.max(0, parseFloat(value) - total)
                                  );
                                } else {
                                  actionsHook.setChange(0);
                                }
                              }}
                              placeholder="0,00"
                              className="pl-10 text-lg h-12"
                            />
                          </div>
                        </div>
                        <div className="flex justify-between items-center p-4 rounded-lg bg-green-50 border border-green-200">
                          <span className="text-green-800 font-medium">Troco</span>
                          <span className="text-xl font-bold text-green-900">
                            R$ {actionsHook.change.toFixed(2)}
                          </span>
                        </div>
                        {actionsHook.cashReceived &&
                          parseFloat(actionsHook.cashReceived) > 0 &&
                          parseFloat(actionsHook.cashReceived) < total && (
                            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span>O valor recebido é menor que o total da compra.</span>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  ) : actionsHook.selectedPayment === "Ficha do Cliente" ? (
                    <div className="bg-blue-50 rounded-xl p-5 h-full border border-blue-200 animate-in fade-in slide-in-from-right-4 duration-300">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <ClipboardList className="h-5 w-5" />
                        Ficha do Cliente
                      </h3>
                      <div className="text-sm text-blue-800">
                        {customerHook.selectedCustomer ? (
                          <div className="space-y-3">
                            <p>
                              Esta venda será lançada na ficha de{" "}
                              <span className="font-bold">
                                {customerHook.selectedCustomer.name}
                              </span>
                              .
                            </p>
                            <div className="p-3 bg-blue-100 rounded-lg">
                              <p className="font-medium">Informações do Cliente:</p>
                              <p className="mt-1">{customerHook.selectedCustomer.phone}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>Nenhum cliente selecionado.</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ) : actionsHook.selectedPayment ? (
                    <div className="bg-muted rounded-xl p-5 h-full flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="mb-3 p-3 bg-background rounded-full">
                        {(() => {
                          const method = [
                            { label: "Cartão Débito", icon: CreditCard },
                            { label: "Cartão Crédito", icon: CreditCard },
                            { label: "PIX", icon: QrCode },
                          ].find((m) => m.label === actionsHook.selectedPayment);
                          return method ? <method.icon className="h-8 w-8 text-primary" /> : null;
                        })()}
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        Pagamento com {actionsHook.selectedPayment}
                      </h3>
                      <p className="text-muted-foreground">
                        O total da compra é{" "}
                        <span className="font-bold">R$ {total.toFixed(2)}</span>. Clique em
                        "Finalizar" para concluir a venda.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-muted rounded-xl p-5 h-full flex items-center justify-center text-center animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="space-y-3">
                        <Wallet className="h-10 w-10 text-muted-foreground mx-auto" />
                        <h3 className="text-lg font-medium">Selecione uma forma de pagamento</h3>
                        <p className="text-sm text-muted-foreground">
                          Escolha uma das opções ao lado para prosseguir com o pagamento.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => {
                    actionsHook.setPaymentOpen(false);
                    actionsHook.setCashReceived("");
                    actionsHook.setChange(0);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 gap-2"
                  disabled={
                    actionsHook.isFinalizing ||
                    !actionsHook.selectedPayment ||
                    cartHook.cart.length === 0 ||
                    (actionsHook.selectedPayment === "Ficha do Cliente" &&
                      !customerHook.selectedCustomer) ||
                    (actionsHook.selectedPayment === "Dinheiro" &&
                      (!actionsHook.cashReceived ||
                        parseFloat(actionsHook.cashReceived) < total))
                  }
                  onClick={actionsHook.handleFinalizePayment}
                >
                  {actionsHook.isFinalizing ? (
                    <svg className="animate-spin h-4 w-4 mr-2 text-white" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                  {actionsHook.isFinalizing ? "Finalizando..." : "Finalizar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Confirmar nova venda */}
          <Dialog
            open={actionsHook.isNewSaleConfirmOpen}
            onOpenChange={actionsHook.setNewSaleConfirmOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Iniciar nova venda?</DialogTitle>
                <DialogDescription>
                  Há itens no carrinho. Deseja descartá-los e iniciar uma nova venda?
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => actionsHook.setNewSaleConfirmOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    actionsHook.setNewSaleConfirmOpen(false);
                    actionsHook.resetPDVAndRefreshProducts();
                  }}
                >
                  Nova venda
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog de Desconto */}
          <Dialog
            open={discountHook.isDiscountOpen}
            onOpenChange={discountHook.setDiscountOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Desconto</DialogTitle>
                <DialogDescription>
                  Defina um desconto por percentual (%) ou valor (R$).
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="flex gap-2">
                  <Button
                    variant={discountHook.discountType === "amount" ? "default" : "outline"}
                    onClick={() => {
                      discountHook.setDiscountType("amount");
                      discountHook.setDiscountValue(0);
                      discountHook.setDiscountInputValue("");
                    }}
                    className="h-9"
                  >
                    Valor (R$)
                  </Button>
                  <Button
                    variant={discountHook.discountType === "percent" ? "default" : "outline"}
                    onClick={() => {
                      discountHook.setDiscountType("percent");
                      discountHook.setDiscountValue(0);
                      discountHook.setDiscountInputValue("");
                    }}
                    className="h-9"
                  >
                    Percentual (%)
                  </Button>
                </div>
                <div className="grid gap-1">
                  <Input
                    type={discountHook.discountType === "percent" ? "number" : "text"}
                    inputMode={
                      discountHook.discountType === "percent" ? "numeric" : "decimal"
                    }
                    step={discountHook.discountType === "percent" ? 1 : 0.01}
                    min={0}
                    max={discountHook.discountType === "percent" ? 100 : undefined}
                    value={
                      discountHook.discountType === "percent"
                        ? Number.isNaN(discountHook.discountValue)
                          ? 0
                          : discountHook.discountValue
                        : discountHook.discountInputValue
                    }
                    onChange={(e) => {
                      if (discountHook.discountType === "percent") {
                        discountHook.setDiscountValue(
                          parseFloat(e.target.value || "0")
                        );
                      } else {
                        let value = e.target.value.replace(/\D/g, "");
                        let numValue = parseInt(value || "0");
                        let realValue = numValue / 100;
                        let formattedValue = realValue
                          .toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                            minimumFractionDigits: 2,
                          })
                          .replace("R$\u00A0", "");
                        discountHook.setDiscountInputValue(formattedValue);
                        discountHook.setDiscountValue(realValue);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        discountHook.applyDiscount();
                      }
                    }}
                    placeholder={
                      discountHook.discountType === "percent"
                        ? "Ex.: 10 (para 10%)"
                        : "Ex.: 5,00"
                    }
                  />
                  {discountHook.discountType === "percent" ? (
                    <span className="text-xs text-muted-foreground">
                      0% a 100% sobre o subtotal.
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Até R$ {cartHook.subtotal.toFixed(2)}.
                    </span>
                  )}
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={discountHook.removeDiscount}>
                    Remover desconto
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        discountHook.setDiscountOpen(false);
                        discountHook.setDiscountInputValue("");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={discountHook.applyDiscount}>Aplicar</Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Confirmar alteração de cliente */}
          <ConfirmDialog
            open={customerHook.isChangeCustomerConfirmOpen}
            onOpenChange={customerHook.setChangeCustomerConfirmOpen}
            title="Alterar cliente da venda?"
            description="Já existe um cliente selecionado para esta venda. Deseja substituí-lo?"
            onConfirm={customerHook.handleConfirmCustomerChange}
            confirmText="Alterar cliente"
            cancelText="Manter atual"
          />

          {/* Modal de Alteração de Data da Venda */}
          <Dialog
            open={actionsHook.isDateModalOpen}
            onOpenChange={actionsHook.setDateModalOpen}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Alterar Data da Venda
                </DialogTitle>
                <DialogDescription>
                  Selecione a data em que a venda foi realizada. Apenas datas passadas são
                  permitidas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data da Venda</label>
                  <Input
                    type="date"
                    value={actionsHook.customSaleDate || actionsHook.getTodayDate()}
                    onChange={(e) => actionsHook.setCustomSaleDate(e.target.value)}
                    max={actionsHook.getTodayDate()}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    {actionsHook.customSaleDate
                      ? `Data selecionada: ${actionsHook.formatDisplayDate(actionsHook.customSaleDate)}`
                      : "Usando data de hoje"}
                  </p>
                </div>
                {actionsHook.customSaleDate && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Atenção:</strong> Esta venda será registrada com a data{" "}
                      {actionsHook.formatDisplayDate(actionsHook.customSaleDate)}.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => actionsHook.setCustomSaleDate("")}
                  className="flex-1"
                >
                  Usar Hoje
                </Button>
                <Button
                  onClick={() => actionsHook.setDateModalOpen(false)}
                  className="flex-1"
                >
                  Confirmar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </aside>
      </main>

      {/* Modal de Recibo */}
      <ReceiptModal
        open={actionsHook.isReceiptModalOpen}
        onOpenChange={actionsHook.setReceiptModalOpen}
        orderId={actionsHook.lastOrderId}
      />

      <CalculatorModal open={calculatorOpen} onOpenChange={setCalculatorOpen} />

      {/* Modal de Peso */}
      {cartHook.pendingProduct && (
        <WeightInputModal
          open={cartHook.isWeightModalOpen}
          onClose={() => {
            cartHook.setIsWeightModalOpen(false);
            cartHook.setPendingProduct(null);
          }}
          onConfirm={cartHook.handleAddWeightBasedProduct}
          productName={cartHook.pendingProduct.name}
          pricePerKgCents={cartHook.pendingProduct.pricePerKgCents!}
          formatPriceToReais={formatPriceToReais}
        />
      )}
    </div>
  );
}
