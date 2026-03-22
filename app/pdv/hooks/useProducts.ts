import { useCallback, useState } from "react";
import type { Product } from "../types";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

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

  const canAddProductToCart = useCallback((product: Product): boolean => {
    if (!product.stockEnabled) return true;
    if (product.stock === undefined) return false;
    return product.stock > 0;
  }, []);

  const canAddProductToPreset = useCallback(
    (product: Product, quantity: number): boolean => {
      if (!product.stockEnabled) return true;
      if (product.stock === undefined) return false;
      return product.stock >= quantity;
    },
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
    canAddProductToCart,
    canAddProductToPreset,
    formatPriceToReais,
  };
}
