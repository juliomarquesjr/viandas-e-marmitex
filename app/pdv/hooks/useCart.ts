import {
  canSatisfyStock,
  totalQtyInCartForProduct,
} from "@/lib/pdv/stockQuantity";
import { useCallback, useMemo, useState } from "react";
import type { CartItem, Product } from "../types";

function notifyStockBlocked(
  onStockBlocked: ((message: string) => void) | undefined,
  message: string
) {
  if (!onStockBlocked) return;
  queueMicrotask(() => onStockBlocked(message));
}

export function useCart(
  products: Product[],
  onStockBlocked: ((message: string) => void) | undefined,
  audioRef: React.RefObject<HTMLAudioElement | null>,
  inputRef: React.RefObject<HTMLInputElement | null>,
  setQuery: (q: string) => void
) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);

  const productById = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const subtotal = useMemo(
    () => cart.reduce((sum, it) => sum + it.price * it.qty, 0),
    [cart]
  );

  const playBeepSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((e) => console.log("Erro ao reproduzir som:", e));
    }
  }, [audioRef]);

  const clearQueryField = useCallback(() => {
    setQuery("");
    inputRef.current?.focus();
  }, [setQuery, inputRef]);

  const handleAddProductToCart = useCallback(
    (product: Product) => {
      if (product.pricePerKgCents && product.pricePerKgCents > 0) {
        const total = totalQtyInCartForProduct(cart, product.id);
        if (!canSatisfyStock(product, total + 1)) {
          notifyStockBlocked(
            onStockBlocked,
            `Estoque insuficiente para ${product.name}`
          );
          return;
        }
        setPendingProduct(product);
        setIsWeightModalOpen(true);
        return;
      }

      let didAddUnit = false;
      setCart((prev) => {
        const total = totalQtyInCartForProduct(prev, product.id);
        if (!canSatisfyStock(product, total + 1)) {
          notifyStockBlocked(
            onStockBlocked,
            `Estoque insuficiente para ${product.name}`
          );
          return prev;
        }

        const existingIndex = prev.findIndex(
          (item) => item.id === product.id && !item.isWeightBased
        );
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            qty: updated[existingIndex].qty + 1,
          };
          setSelectedIndex(existingIndex);
          didAddUnit = true;
          return updated;
        }
        const item: CartItem = {
          id: product.id,
          name: product.name,
          price: product.priceCents / 100,
          qty: 1,
          isWeightBased: false,
        };
        setSelectedIndex(prev.length);
        didAddUnit = true;
        return [...prev, item];
      });

      if (didAddUnit) {
        playBeepSound();
        clearQueryField();
      }
    },
    [cart, onStockBlocked, playBeepSound, clearQueryField]
  );

  const handleAddWeightBasedProduct = useCallback(
    (weightKg: number) => {
      if (!pendingProduct) return;

      let didAdd = false;
      setCart((prev) => {
        const total = totalQtyInCartForProduct(prev, pendingProduct.id);
        if (!canSatisfyStock(pendingProduct, total + 1)) {
          notifyStockBlocked(
            onStockBlocked,
            `Estoque insuficiente para ${pendingProduct.name}`
          );
          return prev;
        }

        const pricePerKg = pendingProduct.pricePerKgCents! / 100;
        const totalPrice = pricePerKg * weightKg;

        const item: CartItem = {
          id: pendingProduct.id,
          name: pendingProduct.name,
          price: totalPrice,
          qty: 1,
          weightKg,
          isWeightBased: true,
        };
        setSelectedIndex(prev.length);
        didAdd = true;
        return [...prev, item];
      });

      if (didAdd) {
        setIsWeightModalOpen(false);
        setPendingProduct(null);
        playBeepSound();
        clearQueryField();
      }
    },
    [pendingProduct, onStockBlocked, playBeepSound, clearQueryField]
  );

  const removeCartItem = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
    setSelectedIndex(null);
  }, []);

  const incrementQty = useCallback((index: number) => {
    setCart((prev) =>
      prev.map((it, idx) =>
        idx === index ? { ...it, qty: it.qty + 1 } : it
      )
    );
  }, []);

  const decrementQty = useCallback((index: number) => {
    setCart((prev) =>
      prev
        .map((it, idx) =>
          idx === index ? { ...it, qty: Math.max(1, it.qty - 1) } : it
        )
        .filter((it) => it.qty > 0)
    );
  }, []);

  const mergeCartItems = useCallback(
    (newItems: CartItem[]) => {
      setCart((prevCart) => {
        let updatedCart = [...prevCart];
        for (const newItem of newItems) {
          const product = productById.get(newItem.id);
          const currentTotal = totalQtyInCartForProduct(updatedCart, newItem.id);
          const desired = currentTotal + newItem.qty;
          if (product && !canSatisfyStock(product, desired)) {
            notifyStockBlocked(
              onStockBlocked,
              `Estoque insuficiente para ${product.name} (incluindo itens do cliente)`
            );
            continue;
          }
          const existingIndex = updatedCart.findIndex(
            (item) => item.id === newItem.id && !item.isWeightBased
          );
          if (existingIndex >= 0) {
            const copy = [...updatedCart];
            copy[existingIndex] = {
              ...copy[existingIndex],
              qty: copy[existingIndex].qty + newItem.qty,
            };
            updatedCart = copy;
          } else {
            updatedCart = [...updatedCart, newItem];
          }
        }
        return updatedCart;
      });
    },
    [productById, onStockBlocked]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedIndex(null);
  }, []);

  return {
    cart,
    setCart,
    selectedIndex,
    setSelectedIndex,
    pendingProduct,
    setPendingProduct,
    isWeightModalOpen,
    setIsWeightModalOpen,
    handleAddProductToCart,
    handleAddWeightBasedProduct,
    removeCartItem,
    incrementQty,
    decrementQty,
    mergeCartItems,
    clearCart,
    subtotal,
    playBeepSound,
  };
}
