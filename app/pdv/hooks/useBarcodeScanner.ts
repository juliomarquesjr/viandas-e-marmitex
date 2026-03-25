import { useEffect } from "react";
import type { CartItem, Customer, Product } from "../types";

interface UseBarcodeScannerProps {
  query: string;
  products: Product[];
  canAddProductToCart: (product: Product) => boolean;
  handleSelectCustomer: (customer: Customer) => void;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number | null>>;
  playBeepSound: () => void;
  clearQueryField: () => void;
  validateBarcode: (code: string) => boolean;
  showErrorToast: (message: string) => void;
}

export function useBarcodeScanner({
  query,
  products,
  canAddProductToCart,
  handleSelectCustomer,
  setCart,
  setSelectedIndex,
  playBeepSound,
  clearQueryField,
  validateBarcode,
  showErrorToast,
}: UseBarcodeScannerProps): void {
  useEffect(() => {
    if (query.trim() === "") return;

    const trimmedQuery = query.trim();
    if (trimmedQuery.length !== 13) return;

    const isCustomerBarcode = /^[1-3]/.test(trimmedQuery);
    if (isCustomerBarcode) {
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
            clearQueryField();
          } else {
            showErrorToast("Cliente não encontrado com este código de barras");
            if (validateBarcode(trimmedQuery)) clearQueryField();
          }
        } catch (error) {
          console.error("Error fetching customer by barcode:", error);
          showErrorToast("Erro ao buscar cliente");
          if (validateBarcode(trimmedQuery)) clearQueryField();
        }
      };

      fetchCustomerByBarcode();
      return;
    }

    const isProductBarcode = /^[5-7]/.test(trimmedQuery);
    if (isProductBarcode) {
      const product = products.find(
        (p) => p.barcode && p.barcode === trimmedQuery
      );

      if (product) {
        if (canAddProductToCart(product)) {
          setCart((prev) => {
            const existingIndex = prev.findIndex(
              (item) => item.id === product.id
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
            };
            setSelectedIndex(prev.length);
            return [...prev, item];
          });

          playBeepSound();
          clearQueryField();
        } else {
          showErrorToast(
            `Produto ${product.name} não pode ser adicionado - estoque insuficiente`
          );
          if (validateBarcode(trimmedQuery)) clearQueryField();
        }
      } else {
        showErrorToast("Produto não encontrado com este código de barras");
        if (validateBarcode(trimmedQuery)) clearQueryField();
      }
    }
  }, [
    query,
    products,
    canAddProductToCart,
    handleSelectCustomer,
    setCart,
    setSelectedIndex,
    playBeepSound,
    clearQueryField,
    validateBarcode,
    showErrorToast,
  ]);
}
