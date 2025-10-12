"use client";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Banknote,
  CreditCard,
  Package,
  QrCode,
  Receipt,
  User,
  Wallet,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "./Toast";

// Define the PreOrder type to match the one used in the page
type PreOrder = {
  id: string;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  notes: string | null;
  createdAt: string;
  customerId: string | null;
  customer: {
    id: string;
    name: string;
    phone: string;
  } | null;
  items: {
    id: string;
    quantity: number;
    priceCents: number;
    product: {
      id: string;
      name: string;
    };
  }[];
};

type PaymentMethod = {
  label: string;
  value: string;
  icon: React.ElementType;
};

type PreOrderPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preOrder: PreOrder;
  onConfirm: (paymentMethod: string, discountCents: number, cashReceived?: number, change?: number) => void;
  isConverting?: boolean;
};

export function PreOrderPaymentDialog({ 
  open, 
  onOpenChange, 
  preOrder,
  onConfirm,
  isConverting = false
}: PreOrderPaymentDialogProps) {
  const { showToast } = useToast();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [change, setChange] = useState(0);
  const [localDiscountCents, setLocalDiscountCents] = useState(preOrder.discountCents);
  const [discountInput, setDiscountInput] = useState("");

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedPaymentMethod("");
      setCashReceived("");
      setChange(0);
      setLocalDiscountCents(preOrder.discountCents);
      setDiscountInput((preOrder.discountCents / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }));
    }
  }, [open, preOrder.discountCents]);

  // Payment methods - ficha_payment is only available if preOrder has a customer
  const paymentMethods: PaymentMethod[] = [
    { label: "Dinheiro", value: "cash", icon: Banknote },
    { label: "Cartão Débito", value: "debit", icon: CreditCard },
    { label: "Cartão Crédito", value: "credit", icon: CreditCard },
    { label: "PIX", value: "pix", icon: QrCode },
    ...(preOrder.customerId ? [{ label: "Ficha do Cliente", value: "ficha_payment", icon: User }] : [])
  ];

  const formatCurrency = (cents: number | null) => {
    if (cents === null || cents === undefined) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  // Handle discount input change and convert to cents
  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Aplicar máscara monetária para valor
    let value = e.target.value;
    
    // Remove tudo que não é dígito
    value = value.replace(/\D/g, '');
    
    // Converte para número (centavos)
    let numValue = parseInt(value || '0');
    
    // Converte centavos para reais
    let realValue = numValue / 100;
    
    // Formata como moeda brasileira
    let formattedValue = realValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    });
    
    // Remove o símbolo R$ para exibir apenas o valor
    formattedValue = formattedValue.replace('R$\u00A0', '');
    
    // Update the input state
    setDiscountInput(formattedValue);
    
    // Convert to number for validation
    const maxDiscount = preOrder.subtotalCents / 100;
    const discountCents = Math.round(Math.min(realValue, maxDiscount) * 100);
    
    setLocalDiscountCents(discountCents);
  };

  const handleConfirm = () => {
    // Validate cash payment if selected
    if (selectedPaymentMethod === "cash") {
      const received = parseFloat((cashReceived || "0").replace(',', '.'));
      const total = (preOrder.subtotalCents - localDiscountCents) / 100;
      
      if (received < total) {
        showToast("O valor recebido deve ser maior ou igual ao valor total.", "error");
        return;
      }
    }
    
    // Pass cash payment details when confirming
    onConfirm(
      selectedPaymentMethod, 
      localDiscountCents,
      selectedPaymentMethod === "cash" ? parseFloat((cashReceived || "0").replace(',', '.')) : undefined,
      selectedPaymentMethod === "cash" ? change : undefined
    );
  };

  // Don't render anything if the dialog is not open
  if (!open) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => {
        // Close modal when clicking on the backdrop (outside the modal content)
        if (e.target === e.currentTarget && !isConverting) {
          onOpenChange(false);
        }
      }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-3xl bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        {/* Loading Overlay */}
        {isConverting && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-4 text-lg font-semibold text-orange-600">Convertendo em venda...</p>
              <p className="text-sm text-gray-600 mt-1">Por favor, aguarde</p>
            </div>
          </div>
        )}
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
          <div className="relative p-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-orange-600" />
                Converter em Venda
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Selecione a forma de pagamento e confirme a conversão
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => !isConverting && onOpenChange(false)}
              disabled={isConverting}
              className="h-12 w-12 rounded-full bg-white/60 hover:bg-white shadow-md border border-gray-200 text-gray-600 hover:text-gray-800 transition-all hover:scale-105 disabled:opacity-50"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Resumo do Pedido - Compacto no topo */}
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-orange-100 rounded-md">
                <Receipt className="h-4 w-4 text-orange-600" />
              </div>
              <h3 className="text-base font-semibold text-orange-900">Resumo do Pedido</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              {/* Customer Info */}
              {preOrder.customer && (
                <div className="p-3 bg-white rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-orange-100 rounded-md">
                      <User className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-medium text-orange-900 text-sm">{preOrder.customer.name}</div>
                      <div className="text-orange-700 text-xs">{preOrder.customer.phone}</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Items Summary */}
              <div className="p-3 bg-white rounded-lg border border-orange-200">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-orange-100 rounded-md">
                    <Package className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <div className="font-medium text-orange-900 text-sm">
                      {preOrder.items.length} item{preOrder.items.length !== 1 ? "s" : ""}
                    </div>
                    <div className="text-orange-700 text-xs">
                      {preOrder.items.map(item => item.product.name).join(", ").substring(0, 30)}
                      {preOrder.items.map(item => item.product.name).join(", ").length > 30 ? "..." : ""}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Total */}
              <div className="p-3 bg-white rounded-lg border border-orange-200">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-orange-100 rounded-md">
                    <Wallet className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-orange-700 text-xs">Valor Total</div>
                    <div className="font-bold text-orange-900 text-base">
                      {formatCurrency(preOrder.subtotalCents - localDiscountCents)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Desconto - Integrado no resumo */}
            <div className="pt-3 border-t border-orange-200">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-orange-800 whitespace-nowrap">
                  Desconto:
                </label>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-600 text-sm">
                    R$
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    disabled={isConverting}
                    value={discountInput}
                    onChange={handleDiscountChange}
                    placeholder="0,00"
                    className="pl-9 h-9 bg-white border-orange-200 focus:border-orange-400 focus:ring-orange-400/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Formas de pagamento */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Formas de Pagamento
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method) => (
                  <Button
                    key={method.value}
                    variant={
                      selectedPaymentMethod === method.value ? "default" : "outline"
                    }
                    disabled={isConverting}
                    className="h-20 flex flex-col items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    onClick={() => {
                      if (!isConverting) {
                        setSelectedPaymentMethod(method.value);
                        // Reset cash fields when changing payment method
                        if (method.value !== "cash") {
                          setCashReceived("");
                          setChange(0);
                        }
                      }
                    }}
                  >
                    <method.icon className="h-6 w-6" />
                    <span className="text-sm font-medium">{method.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Detalhes do pagamento */}
            <div className="transition-all duration-300 ease-in-out">
              {selectedPaymentMethod === "cash" ? (
                <div className="bg-blue-50 rounded-xl p-5 h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                  <h4 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-blue-600" />
                    Pagamento em Dinheiro
                  </h4>

                  <div className="space-y-3 flex-1">
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-blue-200">
                      <span className="text-blue-800 font-medium text-sm">
                        Valor Total
                      </span>
                      <span className="text-lg font-bold text-blue-900">
                        {formatCurrency(preOrder.subtotalCents - localDiscountCents)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="cashReceived"
                        className="text-sm font-medium text-blue-900"
                      >
                        Valor Recebido (R$)
                      </label>
                      <div className="relative">
                        <Input
                          id="cashReceived"
                          type="text"
                          inputMode="decimal"
                          disabled={isConverting}
                          value={cashReceived}
                          onChange={(e) => {
                            // Aplicar máscara monetária para valor
                            let value = e.target.value;
                            
                            // Remove tudo que não é dígito
                            value = value.replace(/\D/g, '');
                            
                            // Converte para número (centavos)
                            let numValue = parseInt(value || '0');
                            
                            // Converte centavos para reais
                            let realValue = numValue / 100;
                            
                            // Formata como moeda brasileira
                            let formattedValue = realValue.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              minimumFractionDigits: 2
                            });
                            
                            // Remove o símbolo R$ para exibir apenas o valor
                            formattedValue = formattedValue.replace('R$\u00A0', '');
                            
                            setCashReceived(formattedValue);
                            e.target.value = formattedValue;

                            // Calculate change
                            if (formattedValue) {
                              const numericValue = parseFloat(formattedValue.replace(',', '.') || "0");
                              const total = (preOrder.subtotalCents - localDiscountCents) / 100;
                              const changeAmount = Math.max(
                                0,
                                numericValue - total
                              );
                              setChange(changeAmount);
                            } else {
                              setChange(0);
                            }
                          }}
                          placeholder="0,00"
                          className="text-base h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-3 rounded-lg bg-green-100 border border-green-200">
                      <span className="text-green-800 font-medium flex items-center gap-2 text-sm">
                        <Wallet className="h-4 w-4" />
                        Troco
                      </span>
                      <span className="text-lg font-bold text-green-900">
                        {formatCurrency(change * 100)}
                      </span>
                    </div>

                    {cashReceived &&
                      parseFloat(cashReceived.replace(',', '.')) > 0 &&
                      (parseFloat(cashReceived.replace(',', '.')) < ((preOrder.subtotalCents - localDiscountCents) / 100)) && (
                        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          <span>
                            Valor recebido insuficiente
                          </span>
                        </div>
                      )}
                  </div>
                </div>
              ) : selectedPaymentMethod === "ficha_payment" && preOrder.customer ? (
                <div className="bg-indigo-50 rounded-xl p-5 h-full flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="mb-3 p-3 bg-background rounded-full">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Ficha do Cliente
                  </h3>
                  <div className="p-3 bg-white rounded-lg border border-indigo-200 mb-3">
                    <div className="font-medium text-indigo-900">{preOrder.customer.name}</div>
                    <div className="text-indigo-700 text-sm">{preOrder.customer.phone}</div>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    O valor de <span className="font-bold">{formatCurrency(preOrder.subtotalCents - localDiscountCents)}</span> será lançado na ficha do cliente. Confirme os dados e clique em "Confirmar" para concluir.
                  </p>
                </div>
              ) : selectedPaymentMethod ? (
                <div className="bg-muted rounded-xl p-5 h-full flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="mb-3 p-3 bg-background rounded-full">
                    {(() => {
                      const method = paymentMethods.find((m) => m.value === selectedPaymentMethod);
                      return method ? (
                        <method.icon className="h-8 w-8 text-primary" />
                      ) : null;
                    })()}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Pagamento com {
                      selectedPaymentMethod === "debit" ? "Cartão Débito" :
                        selectedPaymentMethod === "credit" ? "Cartão Crédito" : "PIX"
                    }
                  </h3>
                  <p className="text-muted-foreground">
                    O valor do pagamento é{" "}
                    <span className="font-bold">{formatCurrency(preOrder.subtotalCents - localDiscountCents)}</span>
                    . Confirme os dados e clique em "Confirmar" para concluir.
                  </p>
                </div>
              ) : (
                <div className="bg-muted rounded-xl p-5 h-full flex items-center justify-center text-center animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-3">
                    <Wallet className="h-10 w-10 text-muted-foreground mx-auto" />
                    <h3 className="text-lg font-medium">
                      Selecione uma forma de pagamento
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Escolha uma das opções ao lado para prosseguir com o
                      pagamento.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Rodapé */}
        <div className="border-t border-gray-200 p-6 bg-gray-50/50">
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => !isConverting && onOpenChange(false)}
              disabled={isConverting}
              className="px-6 py-3 rounded-xl border-gray-300 hover:bg-gray-100 text-gray-700 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleConfirm}
              disabled={!selectedPaymentMethod || isConverting}
              className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConverting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                  Convertendo...
                </span>
              ) : (
                "Confirmar"
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
