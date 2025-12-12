"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/customer-auth";
import { Calendar, Package, Receipt } from "lucide-react";

interface Order {
  id: string;
  totalCents: number;
  createdAt: string;
  status: string;
  items?: Array<{
    quantity: number;
    product: {
      name: string;
    };
  }>;
}

interface ExpenseListProps {
  pendingOrders: Order[];
  fichaPayments: Array<{
    id: string;
    totalCents: number;
    createdAt: string;
  }>;
}

export function ExpenseList({ pendingOrders, fichaPayments }: ExpenseListProps) {
  return (
    <div className="space-y-6">
      {/* Compras Pendentes */}
      {pendingOrders.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-500" />
            Compras Pendentes
          </h3>
          <div className="space-y-3">
            {pendingOrders.map((order) => (
              <Card key={order.id} className="border-orange-200">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-semibold">
                      {formatCurrency(order.totalCents)}
                    </CardTitle>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                </CardHeader>
                {order.items && order.items.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="text-sm text-gray-600 space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx}>
                          {item.quantity}x {item.product.name}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pagamentos de Ficha */}
      {fichaPayments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-green-500" />
            Histórico de Pagamentos
          </h3>
          <div className="space-y-3">
            {fichaPayments.map((payment) => (
              <Card key={payment.id} className="border-green-200 bg-green-50/50">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-semibold text-green-700">
                      {formatCurrency(payment.totalCents)}
                    </CardTitle>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(payment.createdAt)}
                    </span>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {pendingOrders.length === 0 && fichaPayments.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Nenhuma transação encontrada
          </CardContent>
        </Card>
      )}
    </div>
  );
}

