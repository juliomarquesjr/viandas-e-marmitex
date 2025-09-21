"use client";

import { Button } from "@/app/components/ui/button";
import {
    Banknote,
    CreditCard,
    IdCard,
    QrCode,
    Receipt,
    User,
    X,
} from "lucide-react";

interface Order {
  id: string;
  status: string;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  paymentMethod: string | null;
  cashReceivedCents: number | null;
  changeCents: number | null;
  createdAt: string;
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
}

interface SalesAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  allOrders: Order[];
  totalOrders: number;
  filters: {
    dateRange: {
      start: string;
      end: string;
    };
  };
}

export function SalesAnalysisModal({
  isOpen,
  onClose,
  allOrders,
  totalOrders,
  filters,
}: SalesAnalysisModalProps) {
  const formatCurrency = (cents: number | null) => {
    if (cents === null || cents === undefined) return "N/A";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Análise Detalhada das Vendas
              </h2>
              <p className="text-gray-600 mt-1">
                Desagregação completa com explicações de cada categoria
              </p>
            </div>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Resumo Geral */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Resumo Geral
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-blue-600">Total de Vendas</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(
                    allOrders.reduce((sum, order) => sum + order.totalCents, 0)
                  )}
                </p>
                <p className="text-sm text-blue-700">
                  {totalOrders} venda{totalOrders !== 1 ? "s" : ""}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-600">Período Analisado</p>
                <p className="text-lg font-semibold text-blue-900">
                  {filters.dateRange.start === filters.dateRange.end
                    ? new Date(filters.dateRange.start).toLocaleDateString("pt-BR")
                    : `${new Date(filters.dateRange.start).toLocaleDateString("pt-BR")} - ${new Date(filters.dateRange.end).toLocaleDateString("pt-BR")}`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Categorias de Vendas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Categorias de Vendas</h3>
            
            {/* Vendas Avulsas */}
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-start gap-3">
                <User className="h-6 w-6 text-orange-600 mt-1" />
                <div className="flex-1">
                  <h4 className="font-semibold text-orange-800 text-lg">Vendas Avulsas</h4>
                  <p className="text-2xl font-bold text-orange-900 mt-1">
                    {formatCurrency(
                      allOrders
                        .filter((order) => order.customer === null)
                        .reduce((sum, order) => sum + order.totalCents, 0)
                    )}
                  </p>
                  <p className="text-sm text-orange-700">
                    {allOrders.filter((order) => order.customer === null).length} venda{allOrders.filter((order) => order.customer === null).length !== 1 ? "s" : ""}
                  </p>
                  <div className="mt-2 p-3 bg-orange-100 rounded text-sm text-orange-800">
                    <strong>O que são:</strong> Vendas realizadas sem cliente cadastrado no sistema. 
                    Geralmente são clientes ocasionais ou que preferem não se cadastrar.
                  </div>
                </div>
              </div>
            </div>

            {/* Vendas com Ficha */}
            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex items-start gap-3">
                <IdCard className="h-6 w-6 text-indigo-600 mt-1" />
                <div className="flex-1">
                  <h4 className="font-semibold text-indigo-800 text-lg">Vendas com Ficha</h4>
                  <p className="text-2xl font-bold text-indigo-900 mt-1">
                    {formatCurrency(
                      allOrders
                        .filter((order) => order.paymentMethod === "invoice")
                        .reduce((sum, order) => sum + order.totalCents, 0)
                    )}
                  </p>
                  <p className="text-sm text-indigo-700">
                    {allOrders.filter((order) => order.paymentMethod === "invoice").length} venda{allOrders.filter((order) => order.paymentMethod === "invoice").length !== 1 ? "s" : ""}
                  </p>
                  <div className="mt-2 p-3 bg-indigo-100 rounded text-sm text-indigo-800">
                    <strong>O que são:</strong> Vendas de clientes cadastrados que optaram por pagar via ficha. 
                    Essas vendas ficam pendentes até o pagamento ser efetivado.
                  </div>
                </div>
              </div>
            </div>

            {/* Outras Vendas */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start gap-3">
                <CreditCard className="h-6 w-6 text-green-600 mt-1" />
                <div className="flex-1">
                  <h4 className="font-semibold text-green-800 text-lg">Outras Vendas</h4>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {formatCurrency(
                      allOrders
                        .filter((order) => order.customer !== null && order.paymentMethod !== "invoice")
                        .reduce((sum, order) => sum + order.totalCents, 0)
                    )}
                  </p>
                  <p className="text-sm text-green-700">
                    {allOrders.filter((order) => order.customer !== null && order.paymentMethod !== "invoice").length} venda{allOrders.filter((order) => order.customer !== null && order.paymentMethod !== "invoice").length !== 1 ? "s" : ""}
                  </p>
                  <div className="mt-2 p-3 bg-green-100 rounded text-sm text-green-800">
                    <strong>O que são:</strong> Vendas de clientes cadastrados que pagaram com outros métodos 
                    (dinheiro, cartão, PIX). Essas vendas são confirmadas imediatamente.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detalhamento por Método de Pagamento */}
          {allOrders.filter((order) => order.customer !== null && order.paymentMethod !== "invoice").length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Detalhamento das Outras Vendas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(() => {
                  const outrasVendas = allOrders.filter((order) => order.customer !== null && order.paymentMethod !== "invoice");
                  const porMetodo = outrasVendas.reduce((acc, order) => {
                    const metodo = order.paymentMethod || 'null';
                    if (!acc[metodo]) {
                      acc[metodo] = { count: 0, value: 0, orders: [] };
                    }
                    acc[metodo].count++;
                    acc[metodo].value += order.totalCents;
                    acc[metodo].orders.push(order);
                    return acc;
                  }, {} as Record<string, { count: number; value: number; orders: any[] }>);

                  return Object.entries(porMetodo).map(([metodo, data]) => {
                    const metodoLabel = {
                      'cash': 'Dinheiro',
                      'credit': 'Cartão de Crédito',
                      'debit': 'Cartão de Débito',
                      'pix': 'PIX',
                      'null': 'Não especificado'
                    }[metodo] || metodo;

                    return (
                      <div key={metodo} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          {metodo === 'cash' && <Banknote className="h-5 w-5 text-green-600" />}
                          {metodo === 'credit' && <CreditCard className="h-5 w-5 text-blue-600" />}
                          {metodo === 'debit' && <CreditCard className="h-5 w-5 text-purple-600" />}
                          {metodo === 'pix' && <QrCode className="h-5 w-5 text-indigo-600" />}
                          {!['cash', 'credit', 'debit', 'pix'].includes(metodo) && <CreditCard className="h-5 w-5 text-gray-600" />}
                          <span className="font-semibold text-gray-800">{metodoLabel}</span>
                        </div>
                        <p className="text-xl font-bold text-gray-900">
                          {formatCurrency(data.value)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {data.count} venda{data.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Verificação Matemática */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Verificação Matemática</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Vendas Avulsas:</span>
                <span className="font-medium">
                  {formatCurrency(
                    allOrders
                      .filter((order) => order.customer === null)
                      .reduce((sum, order) => sum + order.totalCents, 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Vendas com Ficha:</span>
                <span className="font-medium">
                  {formatCurrency(
                    allOrders
                      .filter((order) => order.paymentMethod === "invoice")
                      .reduce((sum, order) => sum + order.totalCents, 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Outras Vendas:</span>
                <span className="font-medium">
                  {formatCurrency(
                    allOrders
                      .filter((order) => order.customer !== null && order.paymentMethod !== "invoice")
                      .reduce((sum, order) => sum + order.totalCents, 0)
                  )}
                </span>
              </div>
              <div className="border-t border-gray-300 pt-2 flex justify-between font-semibold">
                <span>Total:</span>
                <span>
                  {formatCurrency(
                    allOrders.reduce((sum, order) => sum + order.totalCents, 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex justify-end">
            <Button
              onClick={onClose}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
