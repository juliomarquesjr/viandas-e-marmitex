"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Badge } from "@/app/components/ui/badge";
import {
  Package,
  X,
} from "lucide-react";

type OrderItem = {
  id: string;
  quantity: number;
  priceCents: number;
  weightKg?: number | null;
  product: {
    id: string;
    name: string;
    pricePerKgCents?: number | null;
  };
};

type Order = {
  id: string;
  status: string;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  paymentMethod: string | null;
  createdAt: string;
  items: OrderItem[];
};

interface OrderSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

export function OrderSummaryModal({
  open,
  onOpenChange,
  order,
}: OrderSummaryModalProps) {
  if (!order) return null;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
        <DialogTitle className="sr-only">Resumo da Compra</DialogTitle>
        
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
          <div className="relative p-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Resumo da Compra
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Detalhes dos itens da venda
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-12 w-12 rounded-full bg-white/60 hover:bg-white shadow-md border border-gray-200 text-gray-600 hover:text-gray-800 transition-all hover:scale-105"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm mb-2">
                      {item.product.name}
                    </h3>
                    <div className="space-y-1">
                      {item.weightKg && Number(item.weightKg) > 0 ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Por Quilo
                            </Badge>
                            <span className="text-sm text-gray-700">
                              {Number(item.weightKg).toFixed(3)} kg
                            </span>
                            {item.product.pricePerKgCents && (
                              <span className="text-sm text-gray-500">
                                × {formatCurrency(item.product.pricePerKgCents)}/kg
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-semibold text-gray-900">
                            Total: {formatCurrency(item.priceCents * item.quantity)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700">
                              {item.quantity}x
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatCurrency(item.priceCents)} cada
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-gray-900">
                            Total: {formatCurrency(item.priceCents * item.quantity)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Resumo financeiro */}
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(order.subtotalCents)}
              </span>
            </div>
            {order.discountCents > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Desconto:</span>
                <span className="font-semibold text-red-600">
                  -{formatCurrency(order.discountCents)}
                </span>
              </div>
            )}
            {order.deliveryFeeCents > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Taxa de Entrega:</span>
                <span className="font-semibold text-gray-900">
                  +{formatCurrency(order.deliveryFeeCents)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
              <span className="text-gray-900">Total:</span>
              <span className="text-blue-600">
                {formatCurrency(order.totalCents)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

