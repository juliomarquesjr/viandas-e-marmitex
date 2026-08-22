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
  inputRef: React.RefObject<HTMLInputElement | null>
) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  // Alimenta o painel de conferência do catálogo. O leitor de código de barras
  // escreve aqui também, por isso markLastAdded sai no retorno do hook.
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
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

  // Só devolve o foco ao campo: a busca por nome permanece para o operador
  // somar unidades. Quem limpa o campo é o leitor de código de barras.
  const focusQueryField = useCallback(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  const handleAddProductToCart = useCallback(
    (product: Product) => {
      const totalInCart = totalQtyInCartForProduct(cart, product.id);
      if (!canSatisfyStock(product, totalInCart + 1)) {
        notifyStockBlocked(
          onStockBlocked,
          `Estoque insuficiente para ${product.name}`
        );
        return;
      }

      if (product.pricePerKgCents && product.pricePerKgCents > 0) {
        setPendingProduct(product);
        setIsWeightModalOpen(true);
        return;
      }

      const existingIndex = cart.findIndex(
        (item) => item.id === product.id && !item.isWeightBased
      );

      setCart((prev) => {
        const index = prev.findIndex(
          (item) => item.id === product.id && !item.isWeightBased
        );
        if (index >= 0) {
          return prev.map((item, i) =>
            i === index ? { ...item, qty: item.qty + 1 } : item
          );
        }
        const item: CartItem = {
          id: product.id,
          name: product.name,
          price: product.priceCents / 100,
          qty: 1,
          isWeightBased: false,
        };
        return [...prev, item];
      });

      setSelectedIndex(existingIndex >= 0 ? existingIndex : cart.length);
      setLastAddedId(product.id);
      playBeepSound();
      focusQueryField();
    },
    [cart, onStockBlocked, playBeepSound, focusQueryField]
  );

  const handleAddWeightBasedProduct = useCallback(
    (weightKg: number) => {
      if (!pendingProduct) return;

      const totalInCart = totalQtyInCartForProduct(cart, pendingProduct.id);
      if (!canSatisfyStock(pendingProduct, totalInCart + 1)) {
        notifyStockBlocked(
          onStockBlocked,
          `Estoque insuficiente para ${pendingProduct.name}`
        );
        return;
      }

      const pricePerKg = pendingProduct.pricePerKgCents! / 100;
      const item: CartItem = {
        id: pendingProduct.id,
        name: pendingProduct.name,
        price: pricePerKg * weightKg,
        qty: 1,
        weightKg,
        isWeightBased: true,
      };

      setCart((prev) => [...prev, item]);
      setSelectedIndex(cart.length);
      setLastAddedId(pendingProduct.id);
      setIsWeightModalOpen(false);
      setPendingProduct(null);
      playBeepSound();
      focusQueryField();
    },
    [cart, pendingProduct, onStockBlocked, playBeepSound, focusQueryField]
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
        let merged: string | null = null;
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
          merged = newItem.id;
        }
        // Mesmo motivo do notifyStockBlocked: efeito colateral direto dentro do
        // updater roda duas vezes em StrictMode.
        if (merged) {
          const id = merged;
          queueMicrotask(() => setLastAddedId(id));
        }
        return updatedCart;
      });
    },
    [productById, onStockBlocked]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedIndex(null);
    setLastAddedId(null);
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
    lastAddedId,
    markLastAdded: setLastAddedId,
  };
}
