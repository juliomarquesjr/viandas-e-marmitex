"use client";

import { Card, CardContent } from "@/app/components/ui/card";
import { PreOrderCard } from "../components/PreOrderCard";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import { useEffect, useState } from "react";
import { Calendar, Filter, Loader2, Package } from "lucide-react";

interface PreOrder {
  id: string;
  totalCents: number;
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  notes?: string | null;
  createdAt: string;
  items: Array<{
    quantity: number;
    priceCents: number;
    product: {
      id: string;
      name: string;
      imageUrl?: string | null;
    };
  }>;
}

export default function CustomerPreOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [preOrders, setPreOrders] = useState<PreOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filtering, setFiltering] = useState(false);

  const loadPreOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/customer/pre-orders?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar pré-pedidos');

      const data = await response.json();
      setPreOrders(data.data || []);
    } catch (err) {
      setError('Erro ao carregar pré-pedidos');
      console.error(err);
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  };

  useEffect(() => {
    loadPreOrders();
  }, []);

  const handleFilter = () => {
    setFiltering(true);
    loadPreOrders();
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setFiltering(true);
    loadPreOrders();
  };

  if (loading && preOrders.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Meus Pré-Pedidos</h1>
        <p className="text-gray-600">Acompanhe todos os seus pré-pedidos solicitados</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data Inicial
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="endDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data Final
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleFilter}
                disabled={filtering}
                className="gap-2 bg-orange-500 hover:bg-orange-600"
              >
                {filtering ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Filter className="h-4 w-4" />
                )}
                Filtrar
              </Button>
              {(startDate || endDate) && (
                <Button
                  onClick={handleClearFilter}
                  variant="outline"
                  disabled={filtering}
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8 text-center text-red-700">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Lista de pré-pedidos */}
      {preOrders.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {preOrders.map((preOrder) => (
            <PreOrderCard key={preOrder.id} preOrder={preOrder} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">
              Nenhum pré-pedido encontrado
            </p>
            <p className="text-gray-400 text-sm mt-2">
              {startDate || endDate
                ? 'Tente ajustar os filtros de data'
                : 'Você ainda não possui pré-pedidos'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

