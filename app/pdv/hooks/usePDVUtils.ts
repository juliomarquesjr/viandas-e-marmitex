import {
  canSatisfyStock,
  totalQtyInCartForProduct,
} from "@/lib/pdv/stockQuantity";
import { useCallback, useEffect } from "react";
import type { CartItem, Product } from "../types";

interface UsePDVUtilsProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  setQuery: (q: string) => void;
  calculatorOpen: boolean;
  cart: CartItem[];
  cartLength: number;
  selectedIndex: number | null;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  products: Product[];
  requestRemoveCartItem: (index: number) => void;
  setPaymentOpen: (open: boolean) => void;
  setDiscountOpen: (open: boolean) => void;
  setNewSaleConfirmOpen: (open: boolean) => void;
  resetPDVAndRefreshProducts: () => Promise<void>;
  showErrorToast: (message: string) => void;
}

export function usePDVUtils({
  inputRef,
  audioRef,
  setQuery,
  calculatorOpen,
  cart,
  cartLength,
  selectedIndex,
  setSelectedIndex,
  setCart,
  products,
  requestRemoveCartItem,
  setPaymentOpen,
  setDiscountOpen,
  setNewSaleConfirmOpen,
  resetPDVAndRefreshProducts,
  showErrorToast,
}: UsePDVUtilsProps) {
  const playBeepSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .catch((e) => console.log("Erro ao reproduzir som:", e));
    }
  }, [audioRef]);

  const clearQueryField = useCallback(() => {
    setQuery("");
    inputRef.current?.focus();
  }, [setQuery, inputRef]);

  const validateBarcode = useCallback((code: string): boolean => {
    if (code.length !== 13) return false;
    return /^\d{13}$/.test(code);
  }, []);

  const handleGlobalKeys = useCallback(
    (e: KeyboardEvent) => {
      const isCtrlK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";

      if (calculatorOpen) {
        return;
      }

      if (isCtrlK) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      if (e.key === "F2") {
        e.preventDefault();
        if (cartLength === 0) return;
        setPaymentOpen(true);
        return;
      }
      if (e.key === "F4") {
        e.preventDefault();
        if (cartLength === 0) return;
        setDiscountOpen(true);
        return;
      }
      if (e.key === "F3") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("openCustomerSelector"));
        return;
      }
      if (e.key === "Delete" && selectedIndex !== null) {
        requestRemoveCartItem(selectedIndex);
        return;
      }
      if ((e.key === "+" || e.key === "=") && selectedIndex !== null) {
        const line = cart[selectedIndex];
        if (!line || line.isWeightBased) return;
        const product = products.find((p) => p.id === line.id);
        if (!product) return;
        setCart((prev) => {
          const total = totalQtyInCartForProduct(prev, line.id);
          if (!canSatisfyStock(product, total + 1)) {
            queueMicrotask(() =>
              showErrorToast(`Estoque insuficiente para ${product.name}`)
            );
            return prev;
          }
          return prev.map((it, idx) =>
            idx === selectedIndex ? { ...it, qty: it.qty + 1 } : it
          );
        });
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
            idx === null ? 0 : Math.min((idx ?? -1) + 1, cartLength - 1);
          return cartLength ? next : null;
        });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((idx) => {
          const next = idx === null ? 0 : Math.max((idx ?? 0) - 1, 0);
          return cartLength ? next : null;
        });
        return;
      }
      if (e.key === "F9") {
        e.preventDefault();
        if (cartLength > 0) {
          setNewSaleConfirmOpen(true);
        } else {
          resetPDVAndRefreshProducts();
        }
        return;
      }
    },
    [
      calculatorOpen,
      cart,
      cartLength,
      selectedIndex,
      setCart,
      products,
      requestRemoveCartItem,
      setSelectedIndex,
      setPaymentOpen,
      setDiscountOpen,
      setNewSaleConfirmOpen,
      resetPDVAndRefreshProducts,
      showErrorToast,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, [handleGlobalKeys]);

  return {
    playBeepSound,
    clearQueryField,
    validateBarcode,
  };
}
