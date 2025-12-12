"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/customer-auth";
import { Calendar, Package, ShoppingCart } from "lucide-react";

interface PreOrderItem {
  quantity: number;
  priceCents: number;
  product: {
    id: string;
    name: string;
    imageUrl?: string | null;
  };
}

interface PreOrder {
  id: string;
  totalCents: number;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  notes?: string | null;
  createdAt: string;
  items: PreOrderItem[];
}

interface PreOrderCardProps {
  preOrder: PreOrder;
}

export function PreOrderCard({ preOrder }: PreOrderCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-orange-500" />
              Pré-Pedido
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(preOrder.createdAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-orange-600">
              {formatCurrency(preOrder.totalCents)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Itens */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Itens
            </h4>
            <div className="space-y-2">
              {preOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {item.quantity}x {item.product.name}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(item.priceCents * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Detalhes financeiros */}
          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span>{formatCurrency(preOrder.subtotalCents)}</span>
            </div>
            {preOrder.discountCents > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Desconto:</span>
                <span>-{formatCurrency(preOrder.discountCents)}</span>
              </div>
            )}
            {preOrder.deliveryFeeCents > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Taxa de entrega:</span>
                <span>{formatCurrency(preOrder.deliveryFeeCents)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-2 border-t">
              <span>Total:</span>
              <span className="text-orange-600">{formatCurrency(preOrder.totalCents)}</span>
            </div>
          </div>

          {/* Notas */}
          {preOrder.notes && (
            <div className="border-t pt-3">
              <p className="text-sm text-gray-600 italic">
                <strong>Observações:</strong> {preOrder.notes}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

