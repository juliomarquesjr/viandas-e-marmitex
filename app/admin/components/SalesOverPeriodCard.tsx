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
        <Card className="relative overflow-hidden border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5" />
            <CardHeader className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-bold text-slate-900">Vendas por período</CardTitle>
                    <p className="text-sm text-slate-600">Evolução das vendas ao longo do tempo</p>
                </div>
                <RangeSelector options={rangeOptions} currentValue={currentRange} onSelect={onRangeChange} />
            </CardHeader>
            <CardContent className="relative space-y-6">
                <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border border-blue-100">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-600">Total do período</p>
                        <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalSales)}</p>
                    </div>
                    <div className="text-right text-sm text-slate-500">
                        <p>Últimos {currentRange} dias</p>
                        <p className="text-xs">Média diária: {formatCurrency(totalSales / currentRange)}</p>
                    </div>
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
