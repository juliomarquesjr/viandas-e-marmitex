import { useCallback, useState } from "react";
import type { ToastType } from "../../components/Toast";
import type { DiscountState } from "../types";

export function useDiscount(
  subtotal: number,
  showToast: (message: string, type?: ToastType) => void
) {
  const [discount, setDiscount] = useState<DiscountState>(null);
  const [discountType, setDiscountType] = useState<"percent" | "amount">(
    "amount"
  );
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountInputValue, setDiscountInputValue] = useState<string>("");
  const [isDiscountOpen, setDiscountOpen] = useState(false);

  const discountAmount = (() => {
    if (!discount) return 0;
    if (discount.type === "percent") {
      const pct = Math.max(0, Math.min(100, discount.value));
      return (pct / 100) * subtotal;
    }
    return Math.min(Math.max(0, discount.value), subtotal);
  })();

  const applyDiscount = useCallback(() => {
    const safeValue = Math.max(0, discountValue || 0);
    if (discountType === "percent") {
      setDiscount({ type: "percent", value: Math.min(100, safeValue) });
      showToast(
        `Desconto de ${Math.min(100, safeValue)}% aplicado!`,
        "success"
      );
    } else {
      setDiscount({ type: "amount", value: Math.min(subtotal, safeValue) });
      const formattedValue = safeValue.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      showToast(`Desconto de ${formattedValue} aplicado!`, "success");
    }
    setDiscountOpen(false);
  }, [discountType, discountValue, subtotal, showToast]);

  const removeDiscount = useCallback(() => {
    setDiscount(null);
    setDiscountValue(0);
    setDiscountInputValue("");
  }, []);

  const resetDiscount = useCallback(() => {
    setDiscount(null);
    setDiscountValue(0);
    setDiscountInputValue("");
    setDiscountType("amount");
  }, []);

  return {
    discount,
    discountAmount,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    discountInputValue,
    setDiscountInputValue,
    isDiscountOpen,
    setDiscountOpen,
    applyDiscount,
    removeDiscount,
    resetDiscount,
  };
}
