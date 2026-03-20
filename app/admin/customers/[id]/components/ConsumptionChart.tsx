"use client";

import { useMemo } from "react";
import { TrendingUp, BarChart2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Order } from "../types";

interface ConsumptionChartProps {
  orders: Order[];
}

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function buildLast7Days(orders: Order[]) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const days: { date: string; label: string; valueCents: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    days.push({
      date: dateStr,
      label: DAY_NAMES[d.getDay()],
      valueCents: 0,
    });
  }

  // Filtra apenas pedidos reais (exclui ficha_payment)
  const realOrders = orders.filter(
    (o) => o.type !== "ficha_payment" && o.paymentMethod !== "ficha_payment"
  );

  for (const order of realOrders) {
    const orderDate = order.createdAt.split("T")[0];
    const dayEntry = days.find((d) => d.date === orderDate);
    if (dayEntry) {
      dayEntry.valueCents += order.totalCents;
    }
  }

  return days;
}

const formatCurrencyCompact = (cents: number) => {
  const value = cents / 100;
  if (value >= 1000) return `R$${(value / 1000).toFixed(1)}k`;
  return `R$${value.toFixed(0)}`;
};

const formatCurrencyFull = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2">
        <p className="text-xs font-semibold text-slate-700 mb-0.5">{label}</p>
        <p className="text-sm font-bold text-primary">
          {formatCurrencyFull(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export function ConsumptionChart({ orders }: ConsumptionChartProps) {
  const data = useMemo(() => buildLast7Days(orders), [orders]);

  const totalCents = data.reduce((sum, d) => sum + d.valueCents, 0);
  const hasData = totalCents > 0;

  // Índice do dia com maior valor (para destaque)
  const maxIdx = data.reduce((maxI, d, i, arr) => (d.valueCents > arr[maxI].valueCents ? i : maxI), 0);

  return (
    <Card className="border-slate-200 shadow-sm rounded-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Consumo — Últimos 7 Dias
          </CardTitle>
          {hasData && (
            <span className="text-xs text-slate-500 font-medium">
              Total:{" "}
              <span className="text-slate-800 font-semibold">
                {formatCurrencyFull(totalCents)}
              </span>
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatCurrencyCompact}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc", radius: 4 }} />
              <Bar dataKey="valueCents" radius={[5, 5, 0, 0]}>
                {data.map((_, index) => (
                  <Cell
                    key={index}
                    fill={index === maxIdx && hasData ? "#ea580c" : "#fed7aa"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] text-slate-400">
            <BarChart2 className="h-10 w-10 mb-2 text-slate-200" />
            <p className="text-sm font-medium">Sem pedidos nos últimos 7 dias</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
