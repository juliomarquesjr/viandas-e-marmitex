"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Kbd } from "../components/ui/kbd";
import { HelpCircle, Search, CreditCard, Percent, User, Plus, Minus, Trash2, CircleDollarSign, QrCode, Wallet, ChefHat, Maximize2, RefreshCcw, ClipboardList, Boxes, ShoppingCart, LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { useSession, signOut } from "next-auth/react";
import { Clock } from "../components/ui/clock";

type CartItem = { id: string; name: string; price: number; qty: number };
type Customer = { id: string; name: string };

export default function PDVPage() {
  const { data: session } = useSession();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isPaymentOpen, setPaymentOpen] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isCustomerOpen, setCustomerOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDiscountOpen, setDiscountOpen] = useState(false);
  const [discount, setDiscount] = useState<{ type: "percent" | "amount"; value: number } | null>(null);
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [isNewSaleConfirmOpen, setNewSaleConfirmOpen] = useState(false);
  const demoDataEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA === "true";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  const addMockItem = useCallback(() => {
    const id = Math.random().toString(36).slice(2, 8);
    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => i.name.toLowerCase().includes(query.toLowerCase()));
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], qty: updated[existingIndex].qty + 1 };
        setSelectedIndex(existingIndex);
        return updated;
      }
      const item: CartItem = {
        id,
        name: query ? query : `Produto ${prev.length + 1}`,
        price: 9.9,
        qty: 1,
      };
      setSelectedIndex(prev.length);
      return [...prev, item];
    });
      setQuery("");
    inputRef.current?.focus();
  }, [query]);

  const handleGlobalKeys = useCallback((e: KeyboardEvent) => {
    const isCtrlK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";
    if (isCtrlK) {
      e.preventDefault();
      inputRef.current?.focus();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
      e.preventDefault();
      setCustomerOpen(true);
      setTimeout(() => {
        const el = document.getElementById("customer-search-input");
        (el as HTMLInputElement | null)?.focus();
      }, 0);
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
      setCustomerOpen(true);
      setTimeout(() => {
        const el = document.getElementById("customer-search-input");
        (el as HTMLInputElement | null)?.focus();
      }, 0);
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
        prev.map((it, idx) => (idx === selectedIndex ? { ...it, qty: it.qty + 1 } : it))
      );
      return;
    }
    if ((e.key === "-" || e.key === "_") && selectedIndex !== null) {
      setCart((prev) =>
        prev
          .map((it, idx) => (idx === selectedIndex ? { ...it, qty: Math.max(1, it.qty - 1) } : it))
          .filter((it) => it.qty > 0)
      );
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((idx) => {
        const next = idx === null ? 0 : Math.min((idx ?? -1) + 1, cart.length - 1);
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
  }, [cart.length, selectedIndex]);

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
  const total = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);

  const finalizeSale = useCallback(() => {
    setCart([]);
    setSelectedIndex(null);
    setQuery("");
    setDiscount(null);
    setDiscountValue(0);
    setSelectedPayment(null);
    setPaymentOpen(false);
    inputRef.current?.focus();
  }, []);

  const handleFinalizePayment = useCallback(() => {
    if (!selectedPayment || cart.length === 0) return;
    // Para "Ficha do Cliente" é obrigatório ter cliente selecionado
    if (selectedPayment === "Ficha do Cliente" && !selectedCustomer) {
      setCustomerOpen(true);
      setTimeout(() => {
        const el = document.getElementById("customer-search-input");
        (el as HTMLInputElement | null)?.focus();
      }, 0);
      return;
    }
    // Demais formas: segue sem obrigar cliente
    finalizeSale();
  }, [selectedPayment, cart.length, selectedCustomer, finalizeSale]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground grid grid-rows-[auto_1fr]">
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
              <div className="text-sm text-muted-foreground">Ponto de Venda</div>
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
              onClick={() => setCustomerOpen(true)}
              aria-label="Selecionar cliente (F3)"
              title="Selecionar cliente (F3)"
            >
              <User className="h-4 w-4" /> Cliente (F3)
            </Button>
            <Button variant="outline" className="h-9 gap-2" onClick={() => setHelpOpen(true)}>
              <HelpCircle className="h-4 w-4" /> Ajuda (F1)
            </Button>
            <Button variant="outline" className="h-9 gap-2" onClick={toggleFullscreen}>
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
              onKeyDown={(e) => {
                if (e.key === "Enter") addMockItem();
              }}
              placeholder="Código de barras, nome ou SKU (Enter para adicionar)"
              className="pl-9"
            />
            </div>
            <Button onClick={addMockItem} className="gap-2"><Plus className="h-4 w-4" />Adicionar</Button>
            <Dialog open={isHelpOpen} onOpenChange={setHelpOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Atalhos de Teclado</DialogTitle>
                  <DialogDescription>Otimize sua operação sem tirar as mãos do teclado.</DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                  <div className="flex items-center justify-between"><span>F1 Ajuda</span><span><Kbd>F1</Kbd></span></div>
                  <div className="flex items-center justify-between"><span>Busca</span><span><Kbd>Ctrl</Kbd>+<Kbd>K</Kbd></span></div>
                  <div className="flex items-center justify-between"><span>Pagamento</span><span><Kbd>F2</Kbd></span></div>
                  <div className="flex items-center justify-between"><span>Desconto</span><span><Kbd>F4</Kbd></span></div>
                  <div className="flex items-center justify-between"><span>Nova venda</span><span><Kbd>F9</Kbd></span></div>
                  <div className="flex items-center justify-between"><span>Navegar carrinho</span><span><Kbd>↑</Kbd>/<Kbd>↓</Kbd></span></div>
                  <div className="flex items-center justify-between"><span>Quantidade +/−</span><span><Kbd>+</Kbd>/<Kbd>−</Kbd></span></div>
                  <div className="flex items-center justify-between"><span>Remover item</span><span><Kbd>Del</Kbd></span></div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="mt-2 flex items-center gap-3 text-lg font-semibold text-foreground">
            <Boxes className="h-5 w-5 text-primary" />
            <span>Produtos</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => {
              const hasImage = i % 3 !== 0; // demo: alguns com imagem, outros sem
              const imgSrc = hasImage ? `https://picsum.photos/seed/viandas-${i}/160/160` : "/product-placeholder.svg";
              return (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(`Produto ${i + 1}`);
                    addMockItem();
                  }}
                  className="group flex items-center gap-4 rounded-xl border border-border bg-card p-3 text-left shadow-sm transition hover:bg-accent hover:shadow-md"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgSrc}
                    alt={`Produto ${i + 1}`}
                    className="h-24 w-24 flex-shrink-0 rounded-md object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold">Produto {i + 1}</div>
                        <div className="text-sm text-muted-foreground">Clique para adicionar</div>
                      </div>
                      <div className="whitespace-nowrap rounded-full bg-white/80 px-3 py-1 text-sm shadow-sm">R$ 9,90</div>
                    </div>
                  </div>
              </button>
              );
            })}
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
          {selectedCustomer && (
            <div className="-mt-1 text-xs text-muted-foreground">Cliente: <span className="text-foreground font-medium">{selectedCustomer.name}</span></div>
          )}

          <div className="space-y-1 overflow-auto pr-2">
            {cart.length === 0 && (
              <div className="grid place-items-center rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                <div>Seu carrinho está vazio. Pesquise acima e pressione Enter para adicionar.</div>
              </div>
            )}
            {cart.map((item, idx) => (
              <div
                key={item.id}
                className={
                  "grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-md border p-2 " +
                  (idx === selectedIndex ? "border-primary ring-1 ring-primary/40" : "border-transparent")
                }
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="truncate">
                  <div className="text-sm font-medium leading-tight">{item.name}</div>
                  <div className="text-xs text-muted-foreground">R$ {item.price.toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setCart((prev) => prev.map((it, i) => (i === idx ? { ...it, qty: Math.max(1, it.qty - 1) } : it)))} className="h-8 w-8 p-0"><Minus className="h-4 w-4" /></Button>
                  <div className="w-8 text-center text-sm">{item.qty}</div>
                  <Button variant="outline" onClick={() => setCart((prev) => prev.map((it, i) => (i === idx ? { ...it, qty: it.qty + 1 } : it)))} className="h-8 w-8 p-0"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    aria-label={`Remover ${item.name}`}
                    onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm font-medium">R$ {(item.qty * item.price).toFixed(2)}</div>
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
                  Desconto {discount.type === "percent" ? `(${Math.max(0, Math.min(100, discount.value)).toFixed(0)}%)` : ""}
                </span>
                <span className="text-primary">− R$ {discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Total</span>
              <span className="text-base font-semibold">R$ {total.toFixed(2)}</span>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 gap-2" onClick={() => setPaymentOpen(true)} disabled={cart.length === 0}>
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

          <Dialog open={isPaymentOpen} onOpenChange={setPaymentOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pagamento</DialogTitle>
                <DialogDescription>
                  Selecione o método de pagamento{selectedCustomer ? ` para ${selectedCustomer.name}` : ""}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Dinheiro", icon: CircleDollarSign },
                  { label: "Cartão Débito", icon: CreditCard },
                  { label: "Cartão Crédito", icon: CreditCard },
                  { label: "PIX", icon: QrCode },
                  { label: "Ficha do Cliente", icon: ClipboardList },
                ].map((m) => (
                  <Button
                    key={m.label}
                    variant={selectedPayment === m.label ? "default" : "outline"}
                    className="h-12"
                    onClick={() => setSelectedPayment(m.label)}
                  >
                    <m.icon className="mr-2 h-4 w-4" /> {m.label}
                  </Button>
                ))}
              </div>
              {selectedPayment === "Ficha do Cliente" && (
                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                  {selectedCustomer ? (
                    <span>
                      Esta venda será lançada na ficha de <span className="font-medium">{selectedCustomer.name}</span>.
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Nenhum cliente selecionado.</span>
                  )}
                  {!selectedCustomer && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCustomerOpen(true);
                        setTimeout(() => {
                          const el = document.getElementById("customer-search-input");
                          (el as HTMLInputElement | null)?.focus();
                        }, 0);
                      }}
                    >
                      Selecionar cliente
                    </Button>
                  )}
                </div>
              )}
              <div className="mt-4 text-right">
                <Button
                  className="h-11 gap-2"
                  disabled={
                    !selectedPayment ||
                    cart.length === 0 ||
                    (selectedPayment === "Ficha do Cliente" && !selectedCustomer)
                  }
                  onClick={handleFinalizePayment}
                >
                  <Wallet className="h-4 w-4" /> Finalizar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Confirmar nova venda (descartar itens) */}
          <Dialog open={isNewSaleConfirmOpen} onOpenChange={setNewSaleConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Iniciar nova venda?</DialogTitle>
                <DialogDescription>
                  Há itens no carrinho. Deseja descartá-los e iniciar uma nova venda?
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setNewSaleConfirmOpen(false)}>Cancelar</Button>
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

          {/* Prompt de cliente removido para pagamentos não "Ficha do Cliente" */}

          {/* Seleção de cliente */}
          <Dialog open={isCustomerOpen} onOpenChange={setCustomerOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Selecionar cliente</DialogTitle>
                <DialogDescription>Busque por nome. Pressione Enter para confirmar.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <Input
                  id="customer-search-input"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Nome do cliente (Ctrl+L / F3)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customerQuery.trim()) {
                      // Em produção, aqui deveríamos escolher um resultado da lista (API)
                      if (!demoDataEnabled) return;
                      setSelectedCustomer({ id: crypto.randomUUID(), name: customerQuery.trim() });
                      setCustomerOpen(false);
                      setCustomerQuery("");
                    }
                  }}
                />
                {demoDataEnabled ? (
                  <div className="text-xs text-muted-foreground">
                    Modo demo ativo: Enter confirma o texto como cliente.
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Conecte a busca de clientes à API (ex.: GET /customers?query=).
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCustomerOpen(false)}>Cancelar</Button>
                  <Button
                    onClick={() => {
                      if (!customerQuery.trim()) return;
                      if (!demoDataEnabled) return;
                      setSelectedCustomer({ id: crypto.randomUUID(), name: customerQuery.trim() });
                      setCustomerOpen(false);
                      setCustomerQuery("");
                    }}
                  >
                    Selecionar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Desconto */}
          <Dialog open={isDiscountOpen} onOpenChange={setDiscountOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Desconto</DialogTitle>
                <DialogDescription>Defina um desconto por percentual (%) ou valor (R$).</DialogDescription>
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
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value || "0"))}
                    placeholder={discountType === "percent" ? "Ex.: 10 (para 10%)" : "Ex.: 5.00"}
                  />
                  {discountType === "percent" ? (
                    <span className="text-xs text-muted-foreground">0% a 100% sobre o subtotal.</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Até R$ {subtotal.toFixed(2)}.</span>
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
                    <Button variant="outline" onClick={() => setDiscountOpen(false)}>Cancelar</Button>
                    <Button
                      onClick={() => {
                        const safeValue = Math.max(0, discountValue || 0);
                        if (discountType === "percent") {
                          setDiscount({ type: "percent", value: Math.min(100, safeValue) });
                        } else {
                          setDiscount({ type: "amount", value: Math.min(subtotal, safeValue) });
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
        </aside>
      </main>
    </div>
  );
}


