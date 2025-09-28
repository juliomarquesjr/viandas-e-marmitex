"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ChartLoading } from "../../components/ChartLoading";
import { RangeSelector } from "./RangeSelector";
import type { RangeOption, SalesPoint } from "../types";

type SalesOverPeriodCardProps = {
    loading: boolean;
    error: string | null;
    totalSales: number;
    chartData: SalesPoint[];
    rangeOptions: RangeOption[];
    currentRange: number;
    onRangeChange: (value: number) => void;
    formatCurrency: (value: number) => string;
};

export function SalesOverPeriodCard({
    loading,
    error,
    totalSales,
    chartData,
    rangeOptions,
    currentRange,
    onRangeChange,
    formatCurrency,
}: SalesOverPeriodCardProps) {
    return (
        <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle className="text-xl text-slate-900">Vendas por período</CardTitle>
                <RangeSelector options={rangeOptions} currentValue={currentRange} onSelect={onRangeChange} />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="text-sm text-slate-600">
                    Total do período selecionado:
                    <span className="ml-1 font-semibold text-slate-900">{formatCurrency(totalSales)}</span>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="h-80 w-full">
                    {loading ? (
                        <ChartLoading />
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value: number) => formatCurrency(value).replace("R$", "").trim()}
                                />
                                <Tooltip
                                    cursor={{ fill: "rgba(148, 163, 184, 0.15)" }}
                                    formatter={(value: number) => formatCurrency(Number(value))}
                                    labelStyle={{ color: "#0f172a", fontWeight: 500 }}
                                />
                                <Bar dataKey="total" fill="#6366F1" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
