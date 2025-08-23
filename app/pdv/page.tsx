"use client";

import {
  AlertCircle,
  Boxes,
  ChefHat,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  HelpCircle,
  Image as ImageIcon,
  LogOut,
  Maximize2,
  Minus,
  Percent,
  Plus,
  QrCode,
  RefreshCcw,
  Search,
  ShoppingCart,
  Trash2,
  User,
  Wallet,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { CustomerSelector } from "../components/CustomerSelector";
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

type CartItem = { id: string; name: string; price: number; qty: number };
type Customer = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  barcode?: string;
};
type Product = {
  id: string;
  name: string;
  priceCents: number;
  barcode?: string;
  imageUrl?: string;
  active: boolean;
  productType: "sellable" | "addon";
  stockEnabled?: boolean;
  stock?: number;
};

// New type for payment data
type PaymentData = {
  method: string;
  cashReceived?: number;
  change?: number;
};

export default function PDVPage() {
  const [isFinalizing, setIsFinalizing] = useState(false);
  const { data: session } = useSession();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isPaymentOpen, setPaymentOpen] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isDiscountOpen, setDiscountOpen] = useState(false);
  const [discount, setDiscount] = useState<{
    type: "percent" | "amount";
    value: number;
  } | null>(null);
  const [discountType, setDiscountType] = useState<"percent" | "amount">(
    "percent"
  );
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [isNewSaleConfirmOpen, setNewSaleConfirmOpen] = useState(false);
  const [isChangeCustomerConfirmOpen, setChangeCustomerConfirmOpen] =
    useState(false);
  const [pendingCustomer, setPendingCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cashReceived, setCashReceived] = useState<string>("");
  const [change, setChange] = useState<number>(0);
  const demoDataEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA === "true";

  // Função para reproduzir som
  const playBeepSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .catch((e) => console.log("Erro ao reproduzir som:", e));
    }
  }, []);

  const handleSelectCustomer = (customer: Customer) => {
    // Se já houver um cliente selecionado, mostrar confirmação antes de trocar
    if (selectedCustomer && selectedCustomer.id !== customer.id) {
      setPendingCustomer(customer);
      setChangeCustomerConfirmOpen(true);
    } else {
      setSelectedCustomer(customer);
    }
  };

  const handleConfirmCustomerChange = () => {
    if (pendingCustomer) {
      setSelectedCustomer(pendingCustomer);
      setPendingCustomer(null);
    }
    setChangeCustomerConfirmOpen(false);
  };

  const handleCancelCustomerChange = () => {
    setPendingCustomer(null);
    setChangeCustomerConfirmOpen(false);
  };

  useEffect(() => {
    if (query.trim() !== "") {
      // Verificar se é um código de barras de cliente (começa com 1, 2 ou 3)
      const isCustomerBarcode = /^[1-3]/.test(query.trim());

      if (isCustomerBarcode) {
        // Procurar cliente pelo código de barras
        const fetchCustomerByBarcode = async () => {
          try {
            const response = await fetch(
              `/api/customers?q=${encodeURIComponent(query.trim())}`
            );
            if (!response.ok) throw new Error("Failed to fetch customer");
            const result = await response.json();
            const customer = result.data.find(
              (c: Customer) => c.barcode === query.trim()
            );

            if (customer) {
              // Selecionar cliente automaticamente (irá mostrar confirmação se necessário)
              handleSelectCustomer(customer);
              playBeepSound();
              setQuery("");
              inputRef.current?.focus();
            }
          } catch (error) {
            console.error("Error fetching customer by barcode:", error);
          }
        };

        fetchCustomerByBarcode();
        return;
      }

      // Verificar se é um código de barras de produto (começa com 5, 6 ou 7)
      const isProductBarcode = /^[5-7]/.test(query.trim());

      if (isProductBarcode) {
        // Procurar produto somente pelo código de barras completo
        const product = products.find(
          (p) => p.barcode && p.barcode === query.trim()
        );

        if (product) {
          // Adicionar produto ao carrinho automaticamente
          setCart((prev) => {
            const existingIndex = prev.findIndex(
              (item) => item.id === product.id
            );
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                qty: updated[existingIndex].qty + 1,
              };
              setSelectedIndex(existingIndex);
              return updated;
            }
            const item: CartItem = {
              id: product.id,
              name: product.name,
              price: product.priceCents / 100,
              qty: 1,
            };
            setSelectedIndex(prev.length);
            return [...prev, item];
          });
          // Reproduzir som de beep
          playBeepSound();
          setQuery("");
          inputRef.current?.focus();
        }
      }
    }
  }, [query, products, playBeepSound, handleSelectCustomer, selectedCustomer]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const response = await fetch("/api/products?size=100&status=active");
      if (!response.ok) throw new Error("Failed to fetch products");
      const result = await response.json();
      setProducts(result.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  const handleGlobalKeys = useCallback(
    (e: KeyboardEvent) => {
      const isCtrlK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";
      if (isCtrlK) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (e.key === "F1") {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (e.key === "F2") {
        e.preventDefault();
        if (cart.length === 0) return;
        setPaymentOpen(true);
        return;
      }
      if (e.key === "F4") {
        e.preventDefault();
        if (cart.length === 0) return;
        setDiscountOpen(true);
        return;
      }
      if (e.key === "F3") {
        e.preventDefault();
        // Disparar evento personalizado para o CustomerSelector
        window.dispatchEvent(new CustomEvent("openCustomerSelector"));
        return;
      }
      if (e.key === "F11") {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen().catch(() => {});
        }
        return;
      }
      if (e.key === "Delete" && selectedIndex !== null) {
        setCart((prev) => prev.filter((_, idx) => idx !== selectedIndex));
        setSelectedIndex(null);
        return;
      }
      if ((e.key === "+" || e.key === "=") && selectedIndex !== null) {
        setCart((prev) =>
          prev.map((it, idx) =>
            idx === selectedIndex ? { ...it, qty: it.qty + 1 } : it
          )
        );
        return;
      }
      if ((e.key === "-" || e.key === "_") && selectedIndex !== null) {
        setCart((prev) =>
          prev
            .map((it, idx) =>
              idx === selectedIndex
                ? { ...it, qty: Math.max(1, it.qty - 1) }
                : it
            )
            .filter((it) => it.qty > 0)
        );
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((idx) => {
          const next =
            idx === null ? 0 : Math.min((idx ?? -1) + 1, cart.length - 1);
          return cart.length ? next : null;
        });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((idx) => {
          const next = idx === null ? 0 : Math.max((idx ?? 0) - 1, 0);
          return cart.length ? next : null;
        });
        return;
      }
      if (e.key === "F9") {
        e.preventDefault();
        if (cart.length > 0) {
          setNewSaleConfirmOpen(true);
        } else {
          setCart([]);
          setSelectedIndex(null);
          setQuery("");
          setDiscount(null);
          setDiscountValue(0);
          setSelectedPayment(null);
          setSelectedCustomer(null);
          setPaymentOpen(false);
          setDiscountOpen(false);
          inputRef.current?.focus();
        }
        return;
      }
    },
    [cart.length, selectedIndex]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, [handleGlobalKeys]);

  const subtotal = useMemo(
    () => cart.reduce((sum, it) => sum + it.price * it.qty, 0),
    [cart]
  );
  const discountAmount = useMemo(() => {
    if (!discount) return 0;
    if (discount.type === "percent") {
      const pct = Math.max(0, Math.min(100, discount.value));
      return (pct / 100) * subtotal;
    }
    return Math.min(Math.max(0, discount.value), subtotal);
  }, [discount, subtotal]);
  const total = useMemo(
    () => Math.max(0, subtotal - discountAmount),
    [subtotal, discountAmount]
  );

  const finalizeSale = useCallback(async () => {
    setIsFinalizing(true);
    // Registrar a venda na API
    try {
      const items = cart.map((item) => ({
        productId: item.id,
        quantity: item.qty,
        priceCents: Math.round(item.price * 100),
      }));

      const subtotalCents = Math.round(subtotal * 100);
      const discountCents = Math.round(discountAmount * 100);
      const totalCents = Math.round(total * 100);

      // Prepare payment data
      const paymentData: any = {
        customerId: selectedCustomer?.id || null,
        items,
        subtotalCents,
        discountCents,
        totalCents,
        paymentMethod:
          selectedPayment?.toLowerCase().replace(/\s+/g, "") || null,
      };

      // Add cash payment data if applicable
      if (selectedPayment === "Dinheiro" && cashReceived) {
        paymentData.cashReceivedCents = Math.round(
          parseFloat(cashReceived) * 100
        );
        paymentData.changeCents = Math.round(change * 100);
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        throw new Error("Failed to create order");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      // Mesmo que ocorra um erro, continuamos com o fluxo normal
    }

    // Resetar o estado do PDV
    setCart([]);
    setSelectedIndex(null);
    setQuery("");
    setDiscount(null);
    setDiscountValue(0);
    setSelectedPayment(null);
    setPaymentOpen(false);
    setCashReceived("");
    setChange(0);
    inputRef.current?.focus();
    setIsFinalizing(false);
  }, [
    cart,
    subtotal,
    discountAmount,
    total,
    selectedCustomer,
    selectedPayment,
    cashReceived,
    change,
  ]);

  const handleFinalizePayment = useCallback(() => {
    if (!selectedPayment || cart.length === 0) return;
    // Para "Ficha do Cliente" é obrigatório ter cliente selecionado
    if (selectedPayment === "Ficha do Cliente" && !selectedCustomer) {
      // O componente CustomerSelector já trata isso
      return;
    }
    // Demais formas: segue sem obrigar cliente
    finalizeSale();
  }, [selectedPayment, cart.length, selectedCustomer, finalizeSale]);

  const handleRemoveCustomer = () => {
    setSelectedCustomer(null);
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground grid grid-rows-[auto_1fr]">
      {/* Elemento de áudio para o som de beep */}
      <audio ref={audioRef} src="/audio/beep.mp3" preload="auto" />

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/20 bg-white/80 backdrop-blur-xl p-6 shadow-lg">
        <div className="flex items-center gap-6">
          {/* Logo and Brand */}
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
              <ChefHat className="h-7 w-7 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Viandas & Marmitex
              </div>
              <div className="text-sm text-muted-foreground">
                Ponto de Venda
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* User Info */}
          {session?.user && (
            <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/80 border border-white/30 backdrop-blur-sm shadow-sm">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900">
                  {session.user.name}
                </span>
                <span className="text-xs text-gray-500 capitalize">
                  {session.user.role === "admin" ? "Administrador" : "PDV"}
                </span>
              </div>
            </div>
          )}

          {/* Clock */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-white/80 border border-white/30 backdrop-blur-sm shadow-sm">
            <Clock />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
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
              onClick={() => setHelpOpen(true)}
            >
              <HelpCircle className="h-4 w-4" /> Ajuda (F1)
            </Button>
            <Button
              variant="outline"
              className="h-9 gap-2"
              onClick={toggleFullscreen}
            >
              <Maximize2 className="h-4 w-4" /> Tela cheia (F11)
            </Button>
            <Button
              className="h-9 gap-2"
              onClick={() => {
                if (cart.length > 0) setNewSaleConfirmOpen(true);
                else {
                  setCart([]);
                  setSelectedIndex(null);
                  setQuery("");
                  setDiscount(null);
                  setDiscountValue(0);
                  setSelectedPayment(null);
                  setSelectedCustomer(null);
                  setPaymentOpen(false);
                  setDiscountOpen(false);
                  inputRef.current?.focus();
                }
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
      <main className="grid lg:grid-cols-[2fr_1fr] gap-4 p-4">
        <section className="space-y-4">
          <div className="flex items-center gap-3 text-lg font-semibold text-foreground">
            <Search className="h-5 w-5 text-primary" />
            <span>Pesquisa</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Código de barras"
                className="pl-9"
              />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3 text-lg font-semibold text-foreground">
            <Boxes className="h-5 w-5 text-primary" />
            <span>Produtos</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-6">
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
                {/* Produtos Vendáveis */}
                {products.filter((p) => p.productType === "sellable").length >
                  0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-foreground">
                      Produtos Vendáveis
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      {products
                        .filter((p) => p.productType === "sellable")
                        .map((product) => {
                          const hasImage = product.imageUrl; // usar imagem real se disponível
                          const imgSrc = hasImage
                            ? product.imageUrl
                            : "/product-placeholder.svg";
                          const price = product.priceCents / 100; // converter centavos para reais

                          return (
                            <button
                              key={product.id}
                              onClick={() => {
                                // Adicionar produto ao carrinho
                                setCart((prev) => {
                                  const existingIndex = prev.findIndex(
                                    (item) => item.id === product.id
                                  );
                                  if (existingIndex >= 0) {
                                    const updated = [...prev];
                                    updated[existingIndex] = {
                                      ...updated[existingIndex],
                                      qty: updated[existingIndex].qty + 1,
                                    };
                                    setSelectedIndex(existingIndex);
                                    return updated;
                                  }
                                  const item: CartItem = {
                                    id: product.id,
                                    name: product.name,
                                    price,
                                    qty: 1,
                                  };
                                  setSelectedIndex(prev.length);
                                  return [...prev, item];
                                });
                                // Reproduzir som de beep
                                playBeepSound();
                                setQuery("");
                                inputRef.current?.focus();
                              }}
                              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition hover:bg-accent hover:shadow-md"
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
                                      // Se a imagem falhar, mostrar o placeholder
                                      const target =
                                        e.target as HTMLImageElement;
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
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="truncate text-base font-semibold">
                                      {product.name}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {product.barcode
                                        ? `Cód: ${product.barcode}`
                                        : "Sem código"}
                                    </div>
                                    {product.stockEnabled && product.stock !== undefined && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Estoque: {product.stock} unid.
                                      </div>
                                    )}
                                  </div>
                                  <div className="whitespace-nowrap rounded-full bg-white/80 px-3 py-1 text-sm shadow-sm">
                                    R$ {price.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Adicionais */}
                {products.filter((p) => p.productType === "addon").length >
                  0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-foreground">
                      Adicionais
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      {products
                        .filter((p) => p.productType === "addon")
                        .map((product) => {
                          const hasImage = product.imageUrl; // usar imagem real se disponível
                          const imgSrc = hasImage
                            ? product.imageUrl
                            : "/product-placeholder.svg";
                          const price = product.priceCents / 100; // converter centavos para reais

                          return (
                            <button
                              key={product.id}
                              onClick={() => {
                                // Adicionar produto ao carrinho
                                setCart((prev) => {
                                  const existingIndex = prev.findIndex(
                                    (item) => item.id === product.id
                                  );
                                  if (existingIndex >= 0) {
                                    const updated = [...prev];
                                    updated[existingIndex] = {
                                      ...updated[existingIndex],
                                      qty: updated[existingIndex].qty + 1,
                                    };
                                    setSelectedIndex(existingIndex);
                                    return updated;
                                  }
                                  const item: CartItem = {
                                    id: product.id,
                                    name: product.name,
                                    price,
                                    qty: 1,
                                  };
                                  setSelectedIndex(prev.length);
                                  return [...prev, item];
                                });
                                // Reproduzir som de beep
                                playBeepSound();
                                setQuery("");
                                inputRef.current?.focus();
                              }}
                              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition hover:bg-accent hover:shadow-md"
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
                                      // Se a imagem falhar, mostrar o placeholder
                                      const target =
                                        e.target as HTMLImageElement;
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
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="truncate text-base font-semibold">
                                      {product.name}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {product.barcode
                                        ? `Cód: ${product.barcode}`
                                        : "Sem código"}
                                    </div>
                                    {product.stockEnabled && product.stock !== undefined && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Estoque: {product.stock} unid.
                                      </div>
                                    )}
                                  </div>
                                  <div className="whitespace-nowrap rounded-full bg-white/80 px-3 py-1 text-sm shadow-sm">
                                    R$ {price.toFixed(2)}
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

        <aside className="grid grid-rows-[auto_1fr_auto] gap-3 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-md bg-primary/5 px-2 py-1 text-sm font-medium">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span>Carrinho</span>
            </div>
            <Badge variant="subtle">Itens: {cart.length}</Badge>
          </div>

          <CustomerSelector
            onSelect={handleSelectCustomer}
            selectedCustomer={selectedCustomer}
            onRemove={handleRemoveCustomer}
          />

          <div className="space-y-1 overflow-auto pr-2">
            {cart.length === 0 && (
              <div className="grid place-items-center rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                <div>
                  Seu carrinho está vazio. Informe o código de barras para
                  adicionar produtos automaticamente.
                </div>
              </div>
            )}
            {cart.map((item, idx) => (
              <div
                key={item.id}
                className={
                  "grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-md border p-2 " +
                  (idx === selectedIndex
                    ? "border-primary ring-1 ring-primary/40"
                    : "border-transparent")
                }
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="truncate">
                  <div className="text-sm font-medium leading-tight">
                    {item.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    R$ {item.price.toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCart((prev) =>
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
                      setCart((prev) =>
                        prev.map((it, i) =>
                          i === idx ? { ...it, qty: it.qty + 1 } : it
                        )
                      )
                    }
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    aria-label={`Remover ${item.name}`}
                    onClick={() =>
                      setCart((prev) => prev.filter((_, i) => i !== idx))
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
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && discount && (
              <div className="flex items-center justify-between text-sm">
                <span>
                  Desconto{" "}
                  {discount.type === "percent"
                    ? `(${Math.max(0, Math.min(100, discount.value)).toFixed(
                        0
                      )}%)`
                    : ""}
                </span>
                <span className="text-primary">
                  − R$ {discountAmount.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Total</span>
              <span className="text-base font-semibold">
                R$ {total.toFixed(2)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-2"
                onClick={() => setPaymentOpen(true)}
                disabled={cart.length === 0}
              >
                <CreditCard className="h-4 w-4" /> Pagamento (F2)
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2 bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900"
                onClick={() => setDiscountOpen(true)}
                disabled={cart.length === 0}
              >
                <Percent className="h-4 w-4" /> Desconto (F4)
              </Button>
            </div>
          </div>

          <Dialog
            open={isPaymentOpen}
            onOpenChange={(open) => {
              setPaymentOpen(open);
              if (!open) {
                // Reset cash payment fields when closing dialog
                setCashReceived("");
                setChange(0);
              }
            }}
          >
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl">Pagamento</DialogTitle>
                <DialogDescription>
                  Selecione o método de pagamento
                  {selectedCustomer ? ` para ${selectedCustomer.name}` : ""}.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Formas de pagamento */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Formas de Pagamento
                  </h3>
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
                        variant={
                          selectedPayment === m.label ? "default" : "outline"
                        }
                        className="h-20 flex flex-col items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-md"
                        onClick={() => {
                          setSelectedPayment(m.label);
                          // Reset cash fields when changing payment method
                          if (m.label !== "Dinheiro") {
                            setCashReceived("");
                            setChange(0);
                          }
                        }}
                      >
                        <m.icon className="h-6 w-6" />
                        <span className="text-sm font-medium">{m.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Detalhes do pagamento */}
                <div className="transition-all duration-300 ease-in-out">
                  {selectedPayment === "Dinheiro" ? (
                    <div className="bg-muted rounded-xl p-5 h-full animate-in fade-in slide-in-from-right-4 duration-300">
                      <h3 className="text-lg font-semibold mb-4">
                        Pagamento em Dinheiro
                      </h3>

                      <div className="space-y-5">
                        <div className="flex justify-between items-center p-4 bg-background rounded-lg">
                          <span className="text-muted-foreground">
                            Total da Compra
                          </span>
                          <span className="text-xl font-bold">
                            R$ {total.toFixed(2)}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="cashReceived"
                            className="text-sm font-medium"
                          >
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
                              value={cashReceived}
                              onChange={(e) => {
                                const value = e.target.value;
                                setCashReceived(value);

                                // Calculate change
                                if (value && !isNaN(parseFloat(value))) {
                                  const received = parseFloat(value);
                                  const changeAmount = Math.max(
                                    0,
                                    received - total
                                  );
                                  setChange(changeAmount);
                                } else {
                                  setChange(0);
                                }
                              }}
                              placeholder="0,00"
                              className="pl-10 text-lg h-12"
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center p-4 rounded-lg bg-green-50 border border-green-200">
                          <span className="text-green-800 font-medium">
                            Troco
                          </span>
                          <span className="text-xl font-bold text-green-900">
                            R$ {change.toFixed(2)}
                          </span>
                        </div>

                        {cashReceived &&
                          parseFloat(cashReceived) > 0 &&
                          parseFloat(cashReceived) < total && (
                            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <span>
                                  O valor recebido é menor que o total da
                                  compra.
                                </span>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  ) : selectedPayment === "Ficha do Cliente" ? (
                    <div className="bg-blue-50 rounded-xl p-5 h-full border border-blue-200 animate-in fade-in slide-in-from-right-4 duration-300">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <ClipboardList className="h-5 w-5" />
                        Ficha do Cliente
                      </h3>
                      <div className="text-sm text-blue-800">
                        {selectedCustomer ? (
                          <div className="space-y-3">
                            <p>
                              Esta venda será lançada na ficha de{" "}
                              <span className="font-bold">
                                {selectedCustomer.name}
                              </span>
                              .
                            </p>
                            <div className="p-3 bg-blue-100 rounded-lg">
                              <p className="font-medium">
                                Informações do Cliente:
                              </p>
                              <p className="mt-1">{selectedCustomer.phone}</p>
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
                  ) : selectedPayment ? (
                    <div className="bg-muted rounded-xl p-5 h-full flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="mb-3 p-3 bg-background rounded-full">
                        {(() => {
                          const method = [
                            { label: "Cartão Débito", icon: CreditCard },
                            { label: "Cartão Crédito", icon: CreditCard },
                            { label: "PIX", icon: QrCode },
                          ].find((m) => m.label === selectedPayment);

                          return method ? (
                            <method.icon className="h-8 w-8 text-primary" />
                          ) : null;
                        })()}
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        Pagamento com {selectedPayment}
                      </h3>
                      <p className="text-muted-foreground">
                        O total da compra é{" "}
                        <span className="font-bold">R$ {total.toFixed(2)}</span>
                        . Clique em "Finalizar" para concluir a venda.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-muted rounded-xl p-5 h-full flex items-center justify-center text-center animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="space-y-3">
                        <Wallet className="h-10 w-10 text-muted-foreground mx-auto" />
                        <h3 className="text-lg font-medium">
                          Selecione uma forma de pagamento
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Escolha uma das opções ao lado para prosseguir com o
                          pagamento.
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
                    setPaymentOpen(false);
                    setCashReceived("");
                    setChange(0);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 gap-2"
                  disabled={
                    isFinalizing ||
                    !selectedPayment ||
                    cart.length === 0 ||
                    (selectedPayment === "Ficha do Cliente" &&
                      !selectedCustomer) ||
                    (selectedPayment === "Dinheiro" &&
                      (!cashReceived || parseFloat(cashReceived) < total))
                  }
                  onClick={handleFinalizePayment}
                >
                  {isFinalizing ? (
                    <svg
                      className="animate-spin h-4 w-4 mr-2 text-white"
                      viewBox="0 0 24 24"
                    >
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
                  {isFinalizing ? "Finalizando..." : "Finalizar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Confirmar nova venda (descartar itens) */}
          <Dialog
            open={isNewSaleConfirmOpen}
            onOpenChange={setNewSaleConfirmOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Iniciar nova venda?</DialogTitle>
                <DialogDescription>
                  Há itens no carrinho. Deseja descartá-los e iniciar uma nova
                  venda?
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setNewSaleConfirmOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    setNewSaleConfirmOpen(false);
                    setCart([]);
                    setSelectedIndex(null);
                    setQuery("");
                    setDiscount(null);
                    setDiscountValue(0);
                    setSelectedPayment(null);
                    setSelectedCustomer(null);
                    setPaymentOpen(false);
                    setDiscountOpen(false);
                    inputRef.current?.focus();
                  }}
                >
                  Nova venda
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Desconto */}
          <Dialog open={isDiscountOpen} onOpenChange={setDiscountOpen}>
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
                    variant={discountType === "percent" ? "default" : "outline"}
                    onClick={() => setDiscountType("percent")}
                    className="h-9"
                  >
                    Percentual (%)
                  </Button>
                  <Button
                    variant={discountType === "amount" ? "default" : "outline"}
                    onClick={() => setDiscountType("amount")}
                    className="h-9"
                  >
                    Valor (R$)
                  </Button>
                </div>
                <div className="grid gap-1">
                  <Input
                    type="number"
                    inputMode="decimal"
                    step={discountType === "percent" ? 1 : 0.01}
                    min={0}
                    max={discountType === "percent" ? 100 : undefined}
                    value={Number.isNaN(discountValue) ? 0 : discountValue}
                    onChange={(e) =>
                      setDiscountValue(parseFloat(e.target.value || "0"))
                    }
                    placeholder={
                      discountType === "percent"
                        ? "Ex.: 10 (para 10%)"
                        : "Ex.: 5.00"
                    }
                  />
                  {discountType === "percent" ? (
                    <span className="text-xs text-muted-foreground">
                      0% a 100% sobre o subtotal.
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Até R$ {subtotal.toFixed(2)}.
                    </span>
                  )}
                </div>
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDiscount(null);
                      setDiscountValue(0);
                    }}
                  >
                    Remover desconto
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setDiscountOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => {
                        const safeValue = Math.max(0, discountValue || 0);
                        if (discountType === "percent") {
                          setDiscount({
                            type: "percent",
                            value: Math.min(100, safeValue),
                          });
                        } else {
                          setDiscount({
                            type: "amount",
                            value: Math.min(subtotal, safeValue),
                          });
                        }
                        setDiscountOpen(false);
                      }}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Confirmar alteração de cliente */}
          <ConfirmDialog
            open={isChangeCustomerConfirmOpen}
            onOpenChange={setChangeCustomerConfirmOpen}
            title="Alterar cliente da venda?"
            description="Já existe um cliente selecionado para esta venda. Deseja substituí-lo?"
            onConfirm={handleConfirmCustomerChange}
            confirmText="Alterar cliente"
            cancelText="Manter atual"
          />
        </aside>
      </main>
    </div>
  );
}
