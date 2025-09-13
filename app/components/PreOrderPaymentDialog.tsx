"use client";

import { Button } from "@/app/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { motion } from "framer-motion";
import {
  Banknote,
  CreditCard,
  QrCode,
  Wallet,
  X,
  User,
  Tag,
  AlertCircle
} from "lucide-react";
import { useState, useEffect } from "react";

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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl max-h-[95vh] overflow-hidden bg-white shadow-2xl rounded-2xl border border-gray-200 flex flex-col"
      >
        {/* Header with gradient and shadow */}
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 sticky top-0 z-20 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-orange-600" />
                Converter Pré-Pedido em Venda
              </CardTitle>
              <CardDescription className="text-gray-600 mt-1 text-sm">
                Selecione a forma de pagamento e confirme a conversão
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-10 w-10 rounded-full hover:bg-white/50 text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Order Summary */}
              <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                <h3 className="text-lg font-semibold text-orange-800 mb-4">
                  Resumo do Pré-Pedido
                </h3>
                
                {/* Customer Info */}
                {preOrder.customer && (
                  <div className="mb-4 p-3 bg-white rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-orange-600" />
                      <span className="font-medium text-orange-900">
                        {preOrder.customer.name}
                      </span>
                    </div>
                    <div className="text-sm text-orange-700 mt-1">
                      {preOrder.customer.phone}
                    </div>
                  </div>
                )}
                
                {/* Items */}
                <div className="space-y-3 mb-4">
                  <h4 className="font-medium text-orange-900">Itens:</h4>
                  {preOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-white rounded-lg border border-orange-100">
                      <div>
                        <div className="font-medium text-sm">{item.product.name}</div>
                        <div className="text-xs text-orange-700">
                          {item.quantity} x {formatCurrency(item.priceCents)}
                        </div>
                      </div>
                      <div className="font-medium">
                        {formatCurrency(item.quantity * item.priceCents)}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-700">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(preOrder.subtotalCents)}</span>
                  </div>
                  
                  {localDiscountCents > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-orange-700">Desconto:</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(localDiscountCents)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-orange-200">
                    <span className="text-orange-900">Total:</span>
                    <span className="text-orange-900">{formatCurrency(preOrder.subtotalCents - localDiscountCents)}</span>
                  </div>
                </div>
              </div>
              
              {/* Payment Options */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Forma de Pagamento
                </h3>
                
                {/* Discount Input */}
                <div className="mb-6">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Desconto (R$)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max={preOrder.subtotalCents / 100}
                      step="0.01"
                      value={localDiscountCents / 100}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value || "0");
                        const maxDiscount = preOrder.subtotalCents / 100;
                        const discountCents = Math.round(Math.min(value, maxDiscount) * 100);
                        setLocalDiscountCents(discountCents);
                      }}
                      className="pl-10 py-3 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm transition-all"
                    />
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Desconto aplicado ao valor total do pedido
                  </p>
                </div>
                
                {/* Payment Methods */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <Button
                        key={method.value}
                        variant={
                          selectedPaymentMethod === method.value ? "default" : "outline"
                        }
                        className="h-20 flex flex-col items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-md bg-white border-gray-200"
                        onClick={() => {
                          setSelectedPaymentMethod(method.value);
                          // Reset cash fields when changing payment method
                          if (method.value !== "cash") {
                            setCashReceived("");
                            setChange(0);
                          }
                        }}
                      >
                        <Icon className="h-6 w-6" />
                        <span className="text-sm font-medium">{method.label}</span>
                      </Button>
                    );
                  })}
                </div>
                
                {/* Cash Payment Details */}
                {selectedPaymentMethod === "cash" && (
                  <div className="bg-muted rounded-xl p-5 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h4 className="text-lg font-semibold mb-4">
                      Pagamento em Dinheiro
                    </h4>

                    <div className="space-y-5">
                      <div className="flex justify-between items-center p-4 bg-background rounded-lg">
                        <span className="text-muted-foreground">
                          Valor Total
                        </span>
                        <span className="text-xl font-bold">
                          {formatCurrency(preOrder.subtotalCents - localDiscountCents)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="cashReceived"
                          className="text-sm font-medium"
                        >
                          Valor Recebido
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                            R$
                          </span>
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
                            className="pl-10 text-lg h-12"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-4 rounded-lg bg-green-50 border border-green-200">
                        <span className="text-green-800 font-medium">
                          Troco
                        </span>
                        <span className="text-xl font-bold text-green-900">
                          {formatCurrency(change * 100)}
                        </span>
                      </div>

                      {cashReceived &&
                        parseFloat(cashReceived) > 0 &&
                        (parseFloat(cashReceived) < ((preOrder.subtotalCents - localDiscountCents) / 100)) && (
                          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 flex-shrink-0" />
                              <span>
                                O valor recebido é menor que o valor total.
                              </span>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                )}
                
                {/* Ficha do Cliente Info */}
                {selectedPaymentMethod === "ficha_payment" && preOrder.customer && (
                  <div className="bg-blue-50 rounded-xl p-5 h-full border border-blue-200 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Ficha do Cliente
                    </h4>
                    <div className="text-sm text-blue-800">
                      <div className="space-y-3">
                        <p>
                          Esta venda será lançada na ficha de{" "}
                          <span className="font-bold">
                            {preOrder.customer.name}
                          </span>
                          .
                        </p>
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <p className="font-medium">
                            Informações do Cliente:
                          </p>
                          <p className="mt-1">{preOrder.customer.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Other Payment Methods Info */}
                {selectedPaymentMethod && selectedPaymentMethod !== "cash" && selectedPaymentMethod !== "ficha_payment" && (
                  <div className="bg-muted rounded-xl p-5 h-full flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="mb-3 p-3 bg-background rounded-full">
                      {(() => {
                        const method = paymentMethods.find((m) => m.value === selectedPaymentMethod);
                        const Icon = method?.icon || Wallet;
                        return <Icon className="h-8 w-8 text-primary" />;
                      })()} 
                    </div>
                    <h4 className="text-lg font-semibold mb-2">
                      {paymentMethods.find(m => m.value === selectedPaymentMethod)?.label}
                    </h4>
                    <p className="text-muted-foreground">
                      O valor total é{" "}
                      <span className="font-bold">{formatCurrency(preOrder.subtotalCents - localDiscountCents)}</span>
                      . Confirme os dados e clique em "Confirmar Conversão" para concluir.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </div>
        
        {/* Footer with actions */}
        <div className="sticky bottom-0 z-20 bg-gray-50/50 border-t border-gray-200 px-6 py-6">
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="px-6 py-3 rounded-xl border-gray-300 hover:bg-gray-100 text-gray-700 font-medium transition-all"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleConfirm}
              disabled={!selectedPaymentMethod}
              className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-lg hover:shadow-xl transition-all"
            >
              Confirmar Conversão
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}