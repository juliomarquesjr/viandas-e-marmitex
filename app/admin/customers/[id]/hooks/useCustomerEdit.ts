"use client";

import { useMemo, useState } from "react";
import { useToast } from "../../../../components/Toast";
import { Customer } from "../types";

/**
 * Edição do cliente a partir da própria ficha.
 *
 * Antes o `CustomerFormDialog` só era montado na listagem, então corrigir um
 * telefone exigia voltar, procurar o cliente e abrir o menu de três pontos —
 * a tela mais específica do cliente era a única que não o editava.
 */
export function useCustomerEdit(customer: Customer | null, onSaved: () => void) {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const initialFormData = useMemo(() => {
    const address = customer?.address ?? {};
    return {
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      doc: customer?.doc ?? "",
      barcode: customer?.barcode ?? "",
      password: "",
      street: address.street ?? "",
      number: address.number ?? "",
      complement: address.complement ?? "",
      neighborhood: address.neighborhood ?? "",
      city: address.city ?? "",
      state: address.state ?? "",
      zip: address.zip ?? "",
      active: customer?.active ?? true,
      imageUrl: customer?.imageUrl ?? "",
    };
  }, [customer]);

  const handleSubmit = async (
    event: React.FormEvent,
    formData: typeof initialFormData
  ) => {
    event.preventDefault();
    if (!customer) return;

    if (!formData.name.trim()) {
      showToast("Informe o nome do cliente.", "error");
      return;
    }
    if (!formData.phone.trim()) {
      showToast("Informe o telefone do cliente.", "error");
      return;
    }

    const address = {
      street: formData.street,
      number: formData.number,
      complement: formData.complement,
      neighborhood: formData.neighborhood,
      city: formData.city,
      state: formData.state,
      zip: formData.zip,
    };

    const payload: Record<string, unknown> = {
      id: customer.id,
      name: formData.name,
      phone: formData.phone,
      email: formData.email?.trim() || null,
      doc: formData.doc || undefined,
      barcode: formData.barcode || undefined,
      address: Object.values(address).some(Boolean) ? address : undefined,
      active: formData.active,
      imageUrl: formData.imageUrl || null,
    };

    if (formData.password?.trim()) payload.password = formData.password.trim();

    try {
      const response = await fetch("/api/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Falha ao atualizar cliente");
      }

      setIsOpen(false);
      onSaved();
      showToast("Cadastro atualizado.", "success");
    } catch (error) {
      showToast(
        `Não foi possível salvar: ${(error as Error).message}`,
        "error"
      );
    }
  };

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    initialFormData,
    handleSubmit,
  };
}
