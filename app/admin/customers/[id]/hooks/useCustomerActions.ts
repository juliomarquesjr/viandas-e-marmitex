import { useState } from "react";
import { Customer } from "../types";
import { useToast } from "../../../../components/Toast";

export function useCustomerActions(
  customer: Customer | null,
  onActionSuccess: () => void,
  onOrderDeleted: (orderId: string, isFichaPayment: boolean) => void
) {
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const confirmDeleteOrder = async (orderId: string, isFichaPayment: boolean) => {
    setIsDeleting(true);
    try {
      const endpoint = isFichaPayment
        ? `/api/ficha-payments?id=${orderId}`
        : `/api/orders?id=${orderId}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete order");
      }

      onOrderDeleted(orderId, isFichaPayment);
      showToast(isFichaPayment ? "Pagamento excluído com sucesso!" : "Venda excluída com sucesso!", "success");
    } catch (error) {
      console.error("Error deleting order:", error);
      showToast(`Erro ao excluir: ${(error as Error).message || "Por favor, tente novamente."}`, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFichaPayment = async (
    paymentAmount: string,
    selectedPaymentMethod: string,
    paymentDate: string,
    cashReceived: string
  ) => {
    if (!customer || !paymentAmount || !selectedPaymentMethod) return false;

    try {
      setIsProcessingPayment(true);
      const amountCents = Math.round(parseFloat(paymentAmount) * 100);

      if (amountCents <= 0) {
        showToast("Por favor, informe um valor válido.", "error");
        return false;
      }

      const paymentData: any = {
        customerId: customer.id,
        amountCents,
        paymentMethod: selectedPaymentMethod,
      };

      if (paymentDate) {
        paymentData.paymentDate = paymentDate;
      }

      if (selectedPaymentMethod === "cash" && cashReceived) {
        const cashReceivedCents = Math.round(parseFloat(cashReceived) * 100);
        const changeCents = Math.max(0, cashReceivedCents - amountCents);
        paymentData.cashReceivedCents = cashReceivedCents;
        paymentData.changeCents = changeCents;
      }

      const response = await fetch("/api/ficha-payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) throw new Error("Failed to create ficha payment");

      onActionSuccess();
      showToast(`Pagamento de R$ ${(amountCents / 100).toFixed(2).replace('.', ',')} registrado com sucesso!`, "success");
      return true;
    } catch (error) {
      console.error("Error creating ficha payment:", error);
      showToast("Erro ao registrar pagamento. Por favor, tente novamente.", "error");
      return false;
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const downloadBarcode = async () => {
    if (!customer || !customer.barcode) {
      showToast("Este cliente não possui um código de barras definido.", "warning");
      return;
    }

    try {
      const barcodeUrl = `https://barcodeapi.org/api/code128/${customer.barcode}`;
      const img = new Image();
      img.crossOrigin = "Anonymous";

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          showToast("Não foi possível gerar o código de barras.", "error");
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `barcode-${customer.name.replace(/\s+/g, "-")}-${customer.barcode}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        });
      };

      img.onerror = () => {
        showToast("Erro ao gerar o código de barras.", "error");
      };

      img.src = barcodeUrl;
    } catch (error) {
      showToast("Erro ao gerar o código de barras.", "error");
      console.error(error);
    }
  };

  return {
    isDeleting,
    isProcessingPayment,
    confirmDeleteOrder,
    handleFichaPayment,
    downloadBarcode,
  };
}
