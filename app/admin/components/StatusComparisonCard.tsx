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
        <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-xl text-slate-900">Pendentes vs. confirmadas</CardTitle>
                    <p className="text-xs text-slate-500">Confirmadas exibem valores sem contabilizar entradas.</p>
                </div>
                <RangeSelector options={rangeOptions} currentValue={currentRange} onSelect={onRangeChange} />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <span>
                        Pendentes:
                        <span className="ml-1 font-semibold text-slate-900">{formatCurrency(totalsByStatus.pending)}</span>
                    </span>
                    <span>
                        Confirmadas:
                        <span className="ml-1 font-semibold text-slate-900">{formatCurrency(totalsByStatus.confirmed)}</span>
                    </span>
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
