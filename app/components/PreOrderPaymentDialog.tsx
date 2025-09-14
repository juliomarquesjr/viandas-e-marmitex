"use client";

import { Button } from "@/app/components/ui/button";
import {
    CardContent,
    CardDescription,
    CardTitle
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { motion } from "framer-motion";
import {
    AlertCircle,
    Banknote,
    CreditCard,
    Package,
    QrCode,
    Receipt,
    Tag,
    User,
    Wallet,
    X
} from "lucide-react";
import { useEffect, useState } from "react";

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
  onConfirm: (paymentMethod: string, discountCents: number) => void;
};

export function PreOrderPaymentDialog({ 
  open, 
  onOpenChange, 
  preOrder,
  onConfirm 
}: PreOrderPaymentDialogProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [change, setChange] = useState(0);
  const [localDiscountCents, setLocalDiscountCents] = useState(preOrder.discountCents);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedPaymentMethod("");
      setCashReceived("");
      setChange(0);
      setLocalDiscountCents(preOrder.discountCents);
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
    const value = e.target.value;
    
    // Allow only numbers, comma, and decimal point
    const cleanValue = value.replace(/[^\d,.]/g, '');
    
    // Ensure only one decimal separator
    let formattedValue = cleanValue;
    const commaCount = (cleanValue.match(/,/g) || []).length;
    const dotCount = (cleanValue.match(/\./g) || []).length;
    
    if (commaCount > 1 || dotCount > 1) {
      return; // Don't update if multiple separators
    }
    
    // Handle both comma and dot as decimal separators
    if (commaCount === 1 || dotCount === 1) {
      const parts = cleanValue.split(/[,\.]/);
      if (parts[1] && parts[1].length > 2) {
        // Limit to 2 decimal places
        formattedValue = parts[0] + (commaCount ? ',' : '.') + parts[1].substring(0, 2);
      }
    }
    
    // Convert to number for validation
    const numericValue = parseFloat(formattedValue.replace(',', '.')) || 0;
    const maxDiscount = preOrder.subtotalCents / 100;
    const discountCents = Math.round(Math.min(numericValue, maxDiscount) * 100);
    
    setLocalDiscountCents(discountCents);
    e.target.value = formattedValue;
  };

  const handleConfirm = () => {
    // Validate cash payment if selected
    if (selectedPaymentMethod === "cash") {
      const received = parseFloat(cashReceived || "0");
      const total = preOrder.totalCents / 100;
      
      if (received < total) {
        alert("O valor recebido deve ser maior ou igual ao valor total.");
        return;
      }
    }
    
    onConfirm(selectedPaymentMethod, localDiscountCents);
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
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-3xl bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2ZmZiIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-10"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-md">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                Converter em Venda
              </CardTitle>
              <CardDescription className="text-orange-100 text-xs mt-0.5">
                Selecione a forma de pagamento e confirme a conversão
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left Column - Order Summary */}
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="p-1.5 bg-orange-100 rounded-md">
                    <Receipt className="h-4 w-4 text-orange-600" />
                  </div>
                  <h3 className="text-base font-semibold text-orange-900">Resumo do Pedido</h3>
                </div>
                
                {/* Customer Info */}
                {preOrder.customer && (
                  <div className="mb-4 p-3 bg-white rounded-lg border border-orange-200">
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
                
                {/* Items */}
                <div className="space-y-2.5 mb-4">
                  <h4 className="font-medium text-orange-800 flex items-center gap-1.5 text-sm">
                    <Package className="h-3.5 w-3.5" />
                    Itens do Pedido
                  </h4>
                  <div className="space-y-1.5">
                    {preOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-2 bg-white rounded-md border border-orange-100 text-sm">
                        <div>
                          <div className="font-medium text-orange-900">{item.product.name}</div>
                          <div className="text-xs text-orange-600">
                            {item.quantity} x {formatCurrency(item.priceCents)}
                          </div>
                        </div>
                        <div className="font-medium text-orange-900">
                          {formatCurrency(item.quantity * item.priceCents)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Totals */}
                <div className="bg-white rounded-lg p-3 border border-orange-200">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-orange-700">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(preOrder.subtotalCents)}</span>
                    </div>
                    
                    {localDiscountCents > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-orange-700">Desconto:</span>
                        <span className="font-medium text-red-600">
                          -{formatCurrency(localDiscountCents)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-base font-bold pt-2 border-t border-orange-200">
                      <span className="text-orange-900">Total:</span>
                      <span className="text-orange-900">{formatCurrency(preOrder.subtotalCents - localDiscountCents)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Column - Payment Options and Details */}
              <div>
                {/* Discount Input */}
                <div className="mb-4">
                  <Label className="text-xs font-semibold text-gray-900 mb-1 block flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-amber-600" />
                    Desconto (R$)
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      defaultValue={(localDiscountCents / 100).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                      onChange={handleDiscountChange}
                      className="pl-8 py-1.5 rounded-md border-gray-300 focus:border-amber-500 focus:ring-amber-500/20 shadow-sm transition-all text-sm"
                      placeholder="0,00"
                    />
                    <div className="absolute left-2 top-1/2 transform -translate-y-1/2 p-1 bg-amber-100 rounded-md">
                      <Tag className="h-3.5 w-3.5 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Desconto aplicado ao valor total
                  </p>
                </div>
                
                {/* Payment Methods */}
                <div className="mb-4">
                  <Label className="text-xs font-semibold text-gray-900 mb-2 block flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                    Forma de Pagamento
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <Button
                          key={method.value}
                          variant={
                            selectedPaymentMethod === method.value ? "default" : "outline"
                          }
                          className={`h-16 flex flex-col items-center justify-center gap-1.5 py-2 rounded-lg transition-all duration-200 ${
                            selectedPaymentMethod === method.value 
                              ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg" 
                              : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm"
                          }`}
                          onClick={() => {
                            setSelectedPaymentMethod(method.value);
                            // Reset cash fields when changing payment method
                            if (method.value !== "cash") {
                              setCashReceived("");
                              setChange(0);
                            }
                          }}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-xs font-medium">{method.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Payment Details (appears to the right when a method is selected) */}
                {selectedPaymentMethod === "cash" && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                      <Banknote className="h-4 w-4 text-blue-600" />
                      Pagamento em Dinheiro
                    </h4>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-2 bg-white rounded-md border border-blue-200">
                        <span className="text-blue-800 font-medium text-sm">
                          Valor Total
                        </span>
                        <span className="text-base font-bold text-blue-900">
                          {formatCurrency(preOrder.subtotalCents - localDiscountCents)}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label
                          htmlFor="cashReceived"
                          className="text-xs font-medium text-blue-900"
                        >
                          Valor Recebido (R$)
                        </label>
                        <div className="relative">
                          <Input
                            id="cashReceived"
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={cashReceived}
                            onChange={(e) => {
                              const value = e.target.value;
                              setCashReceived(value);

                              // Calculate change
                              if (value && !isNaN(parseFloat(value))) {
                                const received = parseFloat(value);
                                const total = (preOrder.subtotalCents - localDiscountCents) / 100;
                                const changeAmount = Math.max(
                                  0,
                                  received - total
                                );
                                setChange(changeAmount);
                              } else {
                                setChange(0);
                              }
                            }}
                            placeholder="0,00"
                            className="pl-8 text-sm h-9 rounded-md border-blue-300 focus:border-blue-500 focus:ring-blue-500/20"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-2 rounded-md bg-green-100 border border-green-200">
                        <span className="text-green-800 font-medium flex items-center gap-1 text-sm">
                          <QrCode className="h-3.5 w-3.5" />
                          Troco
                        </span>
                        <span className="text-base font-bold text-green-900">
                          {formatCurrency(change * 100)}
                        </span>
                      </div>

                      {cashReceived &&
                        parseFloat(cashReceived) > 0 &&
                        (parseFloat(cashReceived) < ((preOrder.subtotalCents - localDiscountCents) / 100)) && (
                          <div className="rounded-md bg-red-50 p-2 text-xs text-red-700 border border-red-200 flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>
                              Valor recebido insuficiente
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                )}
                
                {/* Ficha do Cliente Info */}
                {selectedPaymentMethod === "ficha_payment" && preOrder.customer && (
                  <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h4 className="text-base font-semibold mb-2.5 flex items-center gap-1.5">
                      <User className="h-4 w-4 text-indigo-600" />
                      Ficha do Cliente
                    </h4>
                    <div className="p-3 bg-white rounded-lg border border-indigo-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-indigo-100 rounded-md">
                          <User className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div>
                          <div className="font-medium text-indigo-900 text-sm">{preOrder.customer.name}</div>
                          <div className="text-indigo-700 text-xs">{preOrder.customer.phone}</div>
                        </div>
                      </div>
                      <p className="text-indigo-800 text-xs">
                        Esta venda será lançada na ficha do cliente. Confirme os dados e clique em "Confirmar" para concluir.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Other Payment Methods Info */}
                {selectedPaymentMethod && selectedPaymentMethod !== "cash" && selectedPaymentMethod !== "ficha_payment" && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="text-center">
                      <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 border border-gray-200">
                        {(() => {
                          const method = paymentMethods.find((m) => m.value === selectedPaymentMethod);
                          const Icon = method?.icon || Wallet;
                          return <Icon className="h-5 w-5 text-gray-600" />;
                        })()} 
                      </div>
                      <h4 className="text-base font-semibold mb-1.5">
                        {paymentMethods.find(m => m.value === selectedPaymentMethod)?.label}
                      </h4>
                      <div className="p-3 bg-white rounded-lg border border-gray-200 inline-block">
                        <p className="text-gray-700 text-sm">
                          O valor total é <span className="font-bold">{formatCurrency(preOrder.subtotalCents - localDiscountCents)}</span>
                        </p>
                      </div>
                      <p className="text-gray-600 text-xs mt-2">
                        Confirme os dados e clique em "Confirmar" para concluir.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg border-gray-300 hover:bg-gray-100 text-gray-700 text-sm font-medium transition-all"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleConfirm}
              disabled={!selectedPaymentMethod}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all"
            >
              Confirmar
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
