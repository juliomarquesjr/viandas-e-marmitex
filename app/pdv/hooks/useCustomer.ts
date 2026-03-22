import { useCallback, useState } from "react";
import type { CartItem, Customer, Product } from "../types";

export function useCustomer(
  mergeCartItems: (items: CartItem[]) => void,
  canAddProductToPreset: (product: Product, quantity: number) => boolean
) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [pendingCustomer, setPendingCustomer] = useState<Customer | null>(null);
  const [presetProductsLoaded, setPresetProductsLoaded] = useState(false);
  const [isChangeCustomerConfirmOpen, setChangeCustomerConfirmOpen] =
    useState(false);

  const loadCustomerPresets = useCallback(
    async (customerId: string) => {
      try {
        const response = await fetch(`/api/customers/${customerId}/presets`);
        if (response.ok) {
          const result = await response.json();
          const presets = result.data || [];

          if (presets.length > 0) {
            const newItems: CartItem[] = [];

            presets.forEach((preset: any) => {
              const product = preset.product;
              if (product && product.active) {
                if (canAddProductToPreset(product, preset.quantity)) {
                  newItems.push({
                    id: product.id,
                    name: product.name,
                    price: product.priceCents / 100,
                    qty: preset.quantity,
                  });
                }
              }
            });

            if (newItems.length > 0) {
              mergeCartItems(newItems);
              setPresetProductsLoaded(true);
            } else {
              setPresetProductsLoaded(false);
            }
          } else {
            setPresetProductsLoaded(false);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar presets do cliente:", error);
        setPresetProductsLoaded(false);
      }
    },
    [canAddProductToPreset, mergeCartItems]
  );

  const handleSelectCustomer = useCallback(
    (customer: Customer) => {
      if (selectedCustomer && selectedCustomer.id !== customer.id) {
        setPendingCustomer(customer);
        setChangeCustomerConfirmOpen(true);
      } else {
        setSelectedCustomer(customer);
        loadCustomerPresets(customer.id);
      }
    },
    [selectedCustomer, loadCustomerPresets]
  );

  const handleConfirmCustomerChange = useCallback(() => {
    if (pendingCustomer) {
      setSelectedCustomer(pendingCustomer);
      setPendingCustomer(null);
      loadCustomerPresets(pendingCustomer.id);
    }
    setChangeCustomerConfirmOpen(false);
  }, [pendingCustomer, loadCustomerPresets]);

  const handleCancelCustomerChange = useCallback(() => {
    setPendingCustomer(null);
    setChangeCustomerConfirmOpen(false);
  }, []);

  const handleRemoveCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setPresetProductsLoaded(false);
  }, []);

  return {
    selectedCustomer,
    presetProductsLoaded,
    isChangeCustomerConfirmOpen,
    setChangeCustomerConfirmOpen,
    handleSelectCustomer,
    handleConfirmCustomerChange,
    handleCancelCustomerChange,
    handleRemoveCustomer,
  };
}
