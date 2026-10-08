import { useCallback, useState } from "react";
import type { CartItem, Customer } from "../types";

interface UsePDVActionsProps {
  cart: CartItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  selectedCustomer: Customer | null;
  session: any;
  fetchProducts: () => Promise<void>;
  clearCart: () => void;
  resetDiscount: () => void;
  setDiscountOpen: (open: boolean) => void;
  onReset: () => void;
  playBeepSound: () => void;
}

export function usePDVActions({
  cart,
  subtotal,
  discountAmount,
  total,
  selectedCustomer,
  session,
  fetchProducts,
  clearCart,
  resetDiscount,
  setDiscountOpen,
  onReset,
  playBeepSound,
}: UsePDVActionsProps) {
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [isReceiptModalOpen, setReceiptModalOpen] = useState(false);
  const [isPaymentOpen, setPaymentOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [cashReceived, setCashReceived] = useState<string>("");
  const [change, setChange] = useState<number>(0);
  const [isNewSaleConfirmOpen, setNewSaleConfirmOpen] = useState(false);
  const [isDateModalOpen, setDateModalOpen] = useState(false);
  const [customSaleDate, setCustomSaleDate] = useState<string>("");

  const getTodayDate = useCallback(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  }, []);

  const formatDisplayDate = useCallback((dateStr: string) => {
    if (!dateStr) return "Hoje";
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("pt-BR");
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  const resetPDVAndRefreshProducts = useCallback(async () => {
    clearCart();
    setSelectedPayment(null);
    setPaymentOpen(false);
    setDiscountOpen(false);
    setCashReceived("");
    setChange(0);
    setCustomSaleDate("");
    setLastOrderId(null);
    setReceiptModalOpen(false);
    resetDiscount();

    await fetchProducts();

    onReset();
  }, [clearCart, resetDiscount, setDiscountOpen, fetchProducts, onReset]);

  const finalizeSale = useCallback(async () => {
    setIsFinalizing(true);
    let saleSuccess = false;
    let createdOrderId: string | null = null;

    try {
      const items = cart.map((item) => ({
        productId: item.id,
        quantity: item.qty,
        priceCents: Math.round(item.price * 100),
        weightKg: item.weightKg || undefined,
      }));

      const subtotalCents = Math.round(subtotal * 100);
      const discountCents = Math.round(discountAmount * 100);
      const totalCents = Math.round(total * 100);

      const paymentMethodMap: { [key: string]: string } = {
        Dinheiro: "cash",
        "Cartão Crédito": "credit",
        "Cartão Débito": "debit",
        PIX: "pix",
        "Ficha do Cliente": "invoice",
      };

      const paymentData: any = {
        customerId: selectedCustomer?.id || null,
        items,
        subtotalCents,
        discountCents,
        totalCents,
        paymentMethod: selectedPayment
          ? paymentMethodMap[selectedPayment] || null
          : null,
      };

      if (selectedPayment === "Dinheiro" && cashReceived) {
        paymentData.cashReceivedCents = Math.round(
          parseFloat(cashReceived) * 100
        );
        paymentData.changeCents = Math.round(change * 100);
      }

      if (session?.user?.role === "admin" && customSaleDate) {
        paymentData.customSaleDate = customSaleDate;
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) throw new Error("Failed to create order");

      const createdOrder = await response.json();
      createdOrderId = createdOrder.id;
      saleSuccess = true;
    } catch (error) {
      console.error("Error creating order:", error);
    }

    await resetPDVAndRefreshProducts();

    setIsFinalizing(false);

    if (saleSuccess && createdOrderId) {
      playBeepSound();
      setLastOrderId(createdOrderId);
      setReceiptModalOpen(true);
      console.log("Venda finalizada com sucesso!");
    }
  }, [
    cart,
    subtotal,
    discountAmount,
    total,
    selectedCustomer,
    selectedPayment,
    cashReceived,
    change,
    resetPDVAndRefreshProducts,
    playBeepSound,
    session?.user?.role,
    customSaleDate,
  ]);

  const handleFinalizePayment = useCallback(() => {
    if (!selectedPayment || cart.length === 0) return;
    if (selectedPayment === "Ficha do Cliente" && !selectedCustomer) return;
    finalizeSale();
  }, [selectedPayment, cart.length, selectedCustomer, finalizeSale]);

  return {
    isFinalizing,
    lastOrderId,
    isReceiptModalOpen,
    setReceiptModalOpen,
    isPaymentOpen,
    setPaymentOpen,
    selectedPayment,
    setSelectedPayment,
    cashReceived,
    setCashReceived,
    change,
    setChange,
    isNewSaleConfirmOpen,
    setNewSaleConfirmOpen,
    isDateModalOpen,
    setDateModalOpen,
    customSaleDate,
    setCustomSaleDate,
    getTodayDate,
    formatDisplayDate,
    toggleFullscreen,
    resetPDVAndRefreshProducts,
    finalizeSale,
    handleFinalizePayment,
  };
}
