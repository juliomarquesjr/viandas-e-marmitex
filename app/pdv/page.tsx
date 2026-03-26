"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { CalculatorModal } from "../components/CalculatorModal";
import { ReceiptModal } from "../components/ReceiptModal";
import { useToast } from "../components/Toast";
import { WeightInputModal } from "../components/WeightInputModal";
import { Kbd } from "../components/ui/kbd";
import { useBarcodeScanner } from "./hooks/useBarcodeScanner";
import { useCart } from "./hooks/useCart";
import { useCustomer } from "./hooks/useCustomer";
import { useDiscount } from "./hooks/useDiscount";
import { usePDVActions } from "./hooks/usePDVActions";
import { usePDVUtils } from "./hooks/usePDVUtils";
import { useProducts } from "./hooks/useProducts";

import { CartSidebar } from "./components/CartSidebar";
import { DateModal } from "./components/DateModal";
import { DiscountModal } from "./components/DiscountModal";
import { PaymentModal } from "./components/PaymentModal";
import { PDVHeader } from "./components/PDVHeader";
import { ProductCatalog } from "./components/ProductCatalog";

export default function PDVPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [isRemoveItemConfirmOpen, setRemoveItemConfirmOpen] = useState(false);
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null);
  const [isClearCartConfirmOpen, setClearCartConfirmOpen] = useState(false);

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

  // --- Carrinho ---
  const cartHook = useCart(canAddProductToCart, audioRef, inputRef, setQuery);

  // --- Desconto ---
  const discountHook = useDiscount(cartHook.subtotal, showToast);

  // Total calculado aqui para evitar dependência circular
  const total = Math.max(0, cartHook.subtotal - discountHook.discountAmount);

  // --- Cliente ---
  const customerHook = useCustomer(cartHook.mergeCartItems, canAddProductToPreset);

  // --- Reset ---
  const onReset = useCallback(() => {
    customerHook.handleRemoveCustomer();
    setQuery("");
    inputRef.current?.focus();
  }, [customerHook.handleRemoveCustomer]);

  const requestRemoveCartItem = useCallback((index: number) => {
    setPendingRemoveIndex(index);
    setRemoveItemConfirmOpen(true);
  }, []);

  const handleConfirmRemoveCartItem = useCallback(() => {
    if (pendingRemoveIndex === null) return;

    cartHook.setCart((prev) => prev.filter((_, idx) => idx !== pendingRemoveIndex));
    cartHook.setSelectedIndex(null);
    setPendingRemoveIndex(null);
    setRemoveItemConfirmOpen(false);
  }, [pendingRemoveIndex, cartHook.setCart, cartHook.setSelectedIndex]);

  const handleRemoveItemDialogChange = useCallback((open: boolean) => {
    setRemoveItemConfirmOpen(open);
    if (!open) {
      setPendingRemoveIndex(null);
    }
  }, []);

  // --- Ações (pagamento, finalização, nova venda) ---
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

  // --- Atalhos de teclado ---
  usePDVUtils({
    inputRef,
    audioRef,
    setQuery,
    calculatorOpen,
    cartLength: cartHook.cart.length,
    selectedIndex: cartHook.selectedIndex,
    setSelectedIndex: cartHook.setSelectedIndex,
    setCart: cartHook.setCart,
    requestRemoveCartItem,
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

  function handleNewSale() {
    if (cartHook.cart.length > 0) {
      actionsHook.setNewSaleConfirmOpen(true);
    } else {
      actionsHook.resetPDVAndRefreshProducts();
    }
  }

  function handleClosePayment() {
    actionsHook.setPaymentOpen(false);
    actionsHook.setCashReceived("");
    actionsHook.setChange(0);
  }

  function handleRequestClearCart() {
    setClearCartConfirmOpen(true);
  }

  function handleConfirmClearCart() {
    cartHook.clearCart();
    setClearCartConfirmOpen(false);
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground grid grid-rows-[auto_minmax(0,1fr)]">
      <audio ref={audioRef} src="/audio/beep.mp3" preload="auto" />

      {/* Header */}
      <PDVHeader
        session={session}
        customSaleDate={actionsHook.customSaleDate}
        formatDisplayDate={actionsHook.formatDisplayDate}
        cartLength={cartHook.cart.length}
        onNewSale={handleNewSale}
        onCalculatorOpen={() => setCalculatorOpen(true)}
        onDateModalOpen={() => actionsHook.setDateModalOpen(true)}
      />

      {/* Layout principal */}
      <main className="grid min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] gap-3 p-3 overflow-hidden h-[calc(100vh-3.5rem)] supports-[height:100dvh]:h-[calc(100dvh-3.5rem)]">
        {/* Catálogo de produtos */}
        <ProductCatalog
          inputRef={inputRef}
          query={query}
          setQuery={setQuery}
          products={products}
          loadingProducts={loadingProducts}
          canAddProductToCart={canAddProductToCart}
          onAddProduct={cartHook.handleAddProductToCart}
        />

        {/* Carrinho */}
        <CartSidebar
          cart={cartHook.cart}
          setCart={cartHook.setCart}
          selectedIndex={cartHook.selectedIndex}
          setSelectedIndex={(i: number) => cartHook.setSelectedIndex(i)}
          onRequestClearCart={handleRequestClearCart}
          subtotal={cartHook.subtotal}
          discountAmount={discountHook.discountAmount}
          discount={discountHook.discount}
          total={total}
          selectedCustomer={customerHook.selectedCustomer}
          presetProductsLoaded={customerHook.presetProductsLoaded}
          onSelectCustomer={customerHook.handleSelectCustomer}
          onRemoveCustomer={customerHook.handleRemoveCustomer}
          onPaymentOpen={() => actionsHook.setPaymentOpen(true)}
          onDiscountOpen={() => discountHook.setDiscountOpen(true)}
          onRequestRemoveItem={requestRemoveCartItem}
        />
      </main>

      {/* Hint de atalhos — visível quando carrinho vazio */}
      {cartHook.cart.length === 0 && (
        <div className="fixed bottom-3 right-3 z-10 flex flex-col gap-1 bg-white/90 border border-slate-200 rounded-xl px-3 py-2.5 shadow-md text-xs text-muted-foreground backdrop-blur-sm">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">
            Atalhos
          </span>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5"><Kbd>F2</Kbd> Pagamento</span>
            <span className="flex items-center gap-1.5"><Kbd>F3</Kbd> Cliente</span>
            <span className="flex items-center gap-1.5"><Kbd>F4</Kbd> Desconto</span>
            <span className="flex items-center gap-1.5"><Kbd>F9</Kbd> Nova venda</span>
            <span className="flex items-center gap-1.5"><Kbd>Del</Kbd> Remover item</span>
          </div>
        </div>
      )}

      {/* Modais */}
      <PaymentModal
        open={actionsHook.isPaymentOpen}
        onOpenChange={actionsHook.setPaymentOpen}
        total={total}
        selectedPayment={actionsHook.selectedPayment}
        setSelectedPayment={actionsHook.setSelectedPayment}
        cashReceived={actionsHook.cashReceived}
        setCashReceived={actionsHook.setCashReceived}
        change={actionsHook.change}
        setChange={actionsHook.setChange}
        isFinalizing={actionsHook.isFinalizing}
        cartLength={cartHook.cart.length}
        selectedCustomer={customerHook.selectedCustomer}
        onFinalize={actionsHook.handleFinalizePayment}
        onClose={handleClosePayment}
      />

      <DiscountModal
        open={discountHook.isDiscountOpen}
        onOpenChange={discountHook.setDiscountOpen}
        subtotal={cartHook.subtotal}
        discountType={discountHook.discountType}
        discountValue={discountHook.discountValue}
        discountInputValue={discountHook.discountInputValue}
        setDiscountType={discountHook.setDiscountType}
        setDiscountValue={discountHook.setDiscountValue}
        setDiscountInputValue={discountHook.setDiscountInputValue}
        applyDiscount={discountHook.applyDiscount}
        removeDiscount={discountHook.removeDiscount}
      />

      {session?.user?.role === "admin" && (
        <DateModal
          open={actionsHook.isDateModalOpen}
          onOpenChange={actionsHook.setDateModalOpen}
          customSaleDate={actionsHook.customSaleDate}
          setCustomSaleDate={actionsHook.setCustomSaleDate}
          getTodayDate={actionsHook.getTodayDate}
          formatDisplayDate={actionsHook.formatDisplayDate}
        />
      )}

      <ConfirmDialog
        open={actionsHook.isNewSaleConfirmOpen}
        onOpenChange={actionsHook.setNewSaleConfirmOpen}
        title="Iniciar nova venda?"
        description="Há itens no carrinho. Deseja descartá-los e iniciar uma nova venda?"
        onConfirm={() => {
          actionsHook.setNewSaleConfirmOpen(false);
          actionsHook.resetPDVAndRefreshProducts();
        }}
        confirmText="Nova venda"
        cancelText="Cancelar"
      />

      <ConfirmDialog
        open={customerHook.isChangeCustomerConfirmOpen}
        onOpenChange={customerHook.setChangeCustomerConfirmOpen}
        title="Alterar cliente da venda?"
        description="Já existe um cliente selecionado para esta venda. Deseja substituí-lo?"
        onConfirm={customerHook.handleConfirmCustomerChange}
        confirmText="Alterar cliente"
        cancelText="Manter atual"
      />

      <DeleteConfirmDialog
        open={isRemoveItemConfirmOpen}
        onOpenChange={handleRemoveItemDialogChange}
        title="Remover item do carrinho?"
        description="Deseja remover o item selecionado do carrinho?"
        onConfirm={handleConfirmRemoveCartItem}
        confirmText="Excluir"
        cancelText="Cancelar"
      />

      <DeleteConfirmDialog
        open={isClearCartConfirmOpen}
        onOpenChange={setClearCartConfirmOpen}
        title="Limpar carrinho?"
        description="Deseja remover todos os itens do carrinho?"
        onConfirm={handleConfirmClearCart}
        confirmText="Limpar carrinho"
        cancelText="Cancelar"
      />

      <ReceiptModal
        open={actionsHook.isReceiptModalOpen}
        onOpenChange={actionsHook.setReceiptModalOpen}
        orderId={actionsHook.lastOrderId}
      />

      <CalculatorModal open={calculatorOpen} onOpenChange={setCalculatorOpen} />

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
