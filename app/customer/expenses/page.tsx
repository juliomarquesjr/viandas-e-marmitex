"use client";

import { Card, CardContent } from "@/app/components/ui/card";
import { BalanceCard } from "../components/BalanceCard";
import { ExpenseList } from "../components/ExpenseList";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import { useEffect, useState } from "react";
import { Calendar, Filter, Loader2 } from "lucide-react";

interface ExpensesData {
  balanceCents: number;
  totalPending: number;
  totalPayments: number;
  pendingOrders: any[];
  fichaPayments: any[];
}

export default function CustomerExpensesPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ExpensesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filtering, setFiltering] = useState(false);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`/api/customer/expenses?${params.toString()}`);
      if (!response.ok) throw new Error('Erro ao carregar ficha');

      const expensesData = await response.json();
      setData(expensesData);
    } catch (err) {
      setError('Erro ao carregar dados da ficha');
      console.error(err);
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleFilter = () => {
    setFiltering(true);
    loadExpenses();
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setFiltering(true);
    loadExpenses();
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Minha Ficha</h1>
        <p className="text-gray-600">Acompanhe seus gastos e pagamentos</p>
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

      {/* Saldo devedor */}
      {data && (
        <>
          <BalanceCard
            balanceCents={data.balanceCents}
            totalPending={data.totalPending}
            totalPayments={data.totalPayments}
          />

          {/* Lista de gastos */}
          <ExpenseList
            pendingOrders={data.pendingOrders}
            fichaPayments={data.fichaPayments}
          />
        </>
      )}
    </div>
  );
}

