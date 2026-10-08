import { sortProductsByName } from "@/lib/pdv/productSearch";
import { canAddUnits } from "@/lib/pdv/stockQuantity";
import { useCallback, useState } from "react";
import type { CartItem, Product } from "../types";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const fetchProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);
      const response = await fetch("/api/products?size=100&status=active");
      if (!response.ok) throw new Error("Failed to fetch products");
      const result = await response.json();
      // A API ordena por createdAt (compartilhada com o admin); o PDV mostra
      // sempre em ordem alfabética.
      setProducts(sortProductsByName(result.data ?? []));
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const canAddProductUnits = useCallback(
    (product: Product, cart: CartItem[], additionalUnits: number) =>
      canAddUnits(product, cart, additionalUnits),
    []
  );

  const formatPriceToReais = useCallback((cents: number): string => {
    if (!cents || isNaN(cents) || cents <= 0) return "R$ 0,00";
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });
  }, []);

  return {
    products,
    loadingProducts,
    fetchProducts,
    canAddProductUnits,
    formatPriceToReais,
  };
}
