"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ChartLoading } from "../../components/ChartLoading";
import { RangeSelector } from "./RangeSelector";
import type { RangeOption, SalesPoint, StatusTotals } from "../types";

type StatusComparisonCardProps = {
    loading: boolean;
    error: string | null;
    chartData: SalesPoint[];
    totalsByStatus: StatusTotals;
    rangeOptions: RangeOption[];
    currentRange: number;
    onRangeChange: (value: number) => void;
    formatCurrency: (value: number) => string;
};

export function StatusComparisonCard({
    loading,
    error,
    chartData,
    totalsByStatus,
    rangeOptions,
    currentRange,
    onRangeChange,
    formatCurrency,
}: StatusComparisonCardProps) {
    return (
        <Card className="relative overflow-hidden border border-slate-200/40 bg-white/98 shadow-sm hover:shadow-md transition-all duration-300 h-[600px] flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/80 to-green-50/40" />
            <CardHeader className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-bold text-slate-800">Status das Vendas</CardTitle>
                    <p className="text-sm text-slate-600">Comparação entre vendas pendentes e confirmadas</p>
                </div>
                <RangeSelector options={rangeOptions} currentValue={currentRange} onSelect={onRangeChange} />
            </CardHeader>
            <CardContent className="relative space-y-6 flex-1 flex flex-col">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg bg-gradient-to-r from-orange-50 to-orange-100 p-4 border border-orange-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-orange-700">Pendentes</p>
                                <p className="text-xl font-bold text-orange-900">{formatCurrency(totalsByStatus.pending)}</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-orange-400 flex items-center justify-center shadow-sm">
                                <div className="h-3 w-3 rounded-full bg-white" />
                            </div>
                        </div>
                    </div>
                    <div className="rounded-lg bg-gradient-to-r from-green-50 to-green-100 p-4 border border-green-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-700">Confirmadas</p>
                                <p className="text-xl font-bold text-green-900">{formatCurrency(totalsByStatus.confirmed)}</p>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-green-400 flex items-center justify-center shadow-sm">
                                <div className="h-3 w-3 rounded-full bg-white" />
                            </div>
                        </div>
                    </div>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex-1 w-full min-h-0">
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
                                    cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                                    formatter={(value: number) => formatCurrency(Number(value))}
                                    labelStyle={{ color: "#0f172a", fontWeight: 500 }}
                                />
                                <Legend formatter={(value: string) => (value === "pending" ? "Pendentes" : "Confirmadas")} />
                                <Bar dataKey="pending" name="Pendentes" fill="#F97316" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="confirmed" name="Confirmadas" fill="#22C55E" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
