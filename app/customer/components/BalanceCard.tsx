"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { formatCurrency } from "@/lib/customer-auth";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";

interface BalanceCardProps {
  balanceCents: number;
  totalPending: number;
  totalPayments: number;
}

export function BalanceCard({ balanceCents, totalPending, totalPayments }: BalanceCardProps) {
  const isPositive = balanceCents >= 0;
  
  return (
    <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <Wallet className="h-5 w-5" />
          Saldo devedor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${isPositive ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(Math.abs(balanceCents))}
            </span>
            {isPositive ? (
              <TrendingUp className="h-5 w-5 text-red-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-green-500" />
            )}
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Compras pendentes:</span>
              <span className="font-semibold">{formatCurrency(totalPending)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pagamentos realizados:</span>
              <span className="font-semibold text-green-600">{formatCurrency(totalPayments)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

