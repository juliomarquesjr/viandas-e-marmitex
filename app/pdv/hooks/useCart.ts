import { useCallback, useMemo, useState } from "react";
import type { CartItem, Product } from "../types";

export function useCart(
  canAddProductToCart: (product: Product) => boolean,
  audioRef: React.RefObject<HTMLAudioElement | null>,
  inputRef: React.RefObject<HTMLInputElement | null>,
  setQuery: (q: string) => void
) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);

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
      if (!canAddProductToCart(product)) {
        console.log(`Produto ${product.name} não pode ser adicionado - estoque insuficiente`);
        return;
      }

      if (product.pricePerKgCents && product.pricePerKgCents > 0) {
        setPendingProduct(product);
        setIsWeightModalOpen(true);
        return;
      }

      setCart((prev) => {
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
        return [...prev, item];
      });

      playBeepSound();
      clearQueryField();
    },
    [canAddProductToCart, playBeepSound, clearQueryField] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleAddWeightBasedProduct = useCallback(
    (weightKg: number) => {
      if (!pendingProduct) return;

      const pricePerKg = pendingProduct.pricePerKgCents! / 100;
      const totalPrice = pricePerKg * weightKg;

      setCart((prev) => {
        const item: CartItem = {
          id: pendingProduct.id,
          name: pendingProduct.name,
          price: totalPrice,
          qty: 1,
          weightKg,
          isWeightBased: true,
        };
        setSelectedIndex(prev.length);
        return [...prev, item];
      });

      setIsWeightModalOpen(false);
      setPendingProduct(null);
      playBeepSound();
      clearQueryField();
    },
    [pendingProduct, playBeepSound, clearQueryField] // eslint-disable-line react-hooks/exhaustive-deps
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

  const mergeCartItems = useCallback((newItems: CartItem[]) => {
    setCart((prevCart) => {
      const updatedCart = [...prevCart];
      newItems.forEach((newItem) => {
        const existingIndex = updatedCart.findIndex(
          (item) => item.id === newItem.id
        );
        if (existingIndex >= 0) {
          updatedCart[existingIndex].qty += newItem.qty;
        } else {
          updatedCart.push(newItem);
        }
      });
      return updatedCart;
    });
  }, []);

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
