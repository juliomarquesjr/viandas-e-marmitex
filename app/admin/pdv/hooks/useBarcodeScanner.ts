import { isCompleteBarcode } from "@/lib/pdv/productSearch";
import {
  canSatisfyStock,
  totalQtyInCartForProduct,
} from "@/lib/pdv/stockQuantity";
import { useEffect, useRef } from "react";
import type { CartItem, Customer, Product } from "../types";

interface UseBarcodeScannerProps {
  query: string;
  products: Product[];
  cart: CartItem[];
  handleSelectCustomer: (customer: Customer) => void;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number | null>>;
  playBeepSound: () => void;
  /** Marca o produto lido para o painel de conferência do catálogo. */
  markLastAdded: (productId: string) => void;
  clearQueryField: () => void;
  validateBarcode: (code: string) => boolean;
  showErrorToast: (message: string) => void;
}

export function useBarcodeScanner({
  query,
  products,
  cart,
  handleSelectCustomer,
  setCart,
  setSelectedIndex,
  playBeepSound,
  markLastAdded,
  clearQueryField,
  validateBarcode,
  showErrorToast,
}: UseBarcodeScannerProps): void {
  // Guarda o último código já consumido. Sem isso qualquer re-render reprocessa
  // a mesma leitura e o produto entra no carrinho indefinidamente.
  const handledCodeRef = useRef<string | null>(null);

  useEffect(() => {
    const trimmedQuery = query.trim();

    // Busca por nome permanece no campo; só código de barras é consumido aqui.
    if (!isCompleteBarcode(trimmedQuery)) {
      handledCodeRef.current = null;
      return;
    }
    if (handledCodeRef.current === trimmedQuery) return;
    handledCodeRef.current = trimmedQuery;

    // Produto casado na lista carregada vence o prefixo — aceita EAN-13 real
    // (789..., 8..., 9...) e não só os códigos gerados internamente (5-7).
    const product = products.find((p) => p.barcode === trimmedQuery);

    if (!product && /^[1-3]/.test(trimmedQuery)) {
      const fetchCustomerByBarcode = async () => {
        try {
          const response = await fetch(
            `/api/customers?q=${encodeURIComponent(trimmedQuery)}`
          );
          if (!response.ok) throw new Error("Failed to fetch customer");
          const result = await response.json();
          const customer = result.data.find(
            (c: Customer) => c.barcode === trimmedQuery
          );

          if (customer) {
            handleSelectCustomer(customer);
            playBeepSound();
          } else {
            showErrorToast("Cliente não encontrado com este código de barras");
          }
        } catch (error) {
          console.error("Error fetching customer by barcode:", error);
          showErrorToast("Erro ao buscar cliente");
        } finally {
          clearQueryField();
        }
      };

      fetchCustomerByBarcode();
      return;
    }

    if (product) {
      // Estoque conferido fora do updater: efeito colateral dentro dele roda
      // duas vezes em StrictMode e duplicaria o toast.
      const totalInCart = totalQtyInCartForProduct(cart, product.id);
      if (!canSatisfyStock(product, totalInCart + 1)) {
        showErrorToast(`Estoque insuficiente para ${product.name}`);
        clearQueryField();
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
      markLastAdded(product.id);
      playBeepSound();
      clearQueryField();
      return;
    }

    if (/^[5-7]/.test(trimmedQuery)) {
      showErrorToast("Produto não encontrado com este código de barras");
      if (validateBarcode(trimmedQuery)) clearQueryField();
    }
  }, [
    query,
    products,
    cart,
    handleSelectCustomer,
    setCart,
    setSelectedIndex,
    playBeepSound,
    markLastAdded,
    clearQueryField,
    validateBarcode,
    showErrorToast,
  ]);
}
