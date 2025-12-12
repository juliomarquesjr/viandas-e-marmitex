"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { BalanceCard } from "../components/BalanceCard";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/customer-auth";
import { CreditCard, Package, ShoppingCart, TrendingUp } from "lucide-react";
import Link from "next/link";

interface DashboardData {
  balanceCents: number;
  totalPending: number;
  totalPayments: number;
  preOrdersCount: number;
  lastOrder?: {
    id: string;
    totalCents: number;
    createdAt: string;
  };
}

export default function CustomerDashboardPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Carregar dados de expenses (ficha)
        const expensesResponse = await fetch('/api/customer/expenses');
        const expensesData = await expensesResponse.json();
        
        // Carregar pré-pedidos
        const preOrdersResponse = await fetch('/api/customer/pre-orders');
        const preOrdersData = await preOrdersResponse.json();
        
        // Carregar última compra (primeira pendente)
        const lastOrder = expensesData.pendingOrders?.[0] || null;
        
        setData({
          balanceCents: expensesData.balanceCents || 0,
          totalPending: expensesData.totalPending || 0,
          totalPayments: expensesData.totalPayments || 0,
          preOrdersCount: preOrdersData.total || 0,
          lastOrder: lastOrder ? {
            id: lastOrder.id,
            totalCents: lastOrder.totalCents,
            createdAt: lastOrder.createdAt
          } : undefined
        });
      } catch (err) {
        setError('Erro ao carregar dados do dashboard');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      loadDashboardData();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8 text-center text-red-700">
            {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bem-vindo, {session?.user?.name}!
        </h1>
        <p className="text-gray-600">
          Aqui está um resumo da sua conta
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Saldo devedor */}
        {data && (
          <div className="md:col-span-2 lg:col-span-3">
            <BalanceCard
              balanceCents={data.balanceCents}
              totalPending={data.totalPending}
              totalPayments={data.totalPayments}
            />
          </div>
        )}

        {/* Total de pré-pedidos */}
        <Link href="/customer/pre-orders">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-700">
                <ShoppingCart className="h-5 w-5 text-orange-500" />
                Pré-Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {data?.preOrdersCount || 0}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Total de pré-pedidos
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Última compra */}
        <Link href="/customer/expenses">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-700">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Última Compra
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.lastOrder ? (
                <>
                  <div className="text-3xl font-bold text-blue-600">
                    {formatCurrency(data.lastOrder.totalCents)}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {formatDate(data.lastOrder.createdAt)}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-gray-400">
                    R$ 0,00
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Nenhuma compra ainda
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Ações rápidas */}
        <Link href="/customer/profile">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-700">
                <Package className="h-5 w-5 text-green-500" />
                Meu Perfil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Editar informações pessoais
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <Link href="/customer/expenses">
          <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-orange-200 hover:border-orange-400">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-orange-500" />
                Ver Minha Ficha Completa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Visualize todas as suas compras pendentes e histórico de pagamentos
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/customer/pre-orders">
          <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-orange-200 hover:border-orange-400">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-orange-500" />
                Ver Meus Pré-Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Acompanhe todos os seus pré-pedidos solicitados
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

