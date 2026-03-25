"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ChartLoading } from "../../components/ChartLoading";
import type { SalesPoint, StatusTotals } from "../types";

function shortCurrency(value: number): string {
    if (value >= 1000) return `${(value / 1000).toFixed(1).replace(".", ",")}k`;
    return String(Math.round(value));
}

type StatusTooltipProps = {
    active?: boolean;
    payload?: { dataKey: string; value: number; color: string }[];
    label?: string;
    formatCurrency: (value: number) => string;
};

function StatusTooltip({ active, payload, label, formatCurrency }: StatusTooltipProps) {
    if (!active || !payload?.length) return null;

    const labelMap: Record<string, string> = {
        confirmed: "Confirmadas",
        pending: "Pendentes",
    };

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-md text-sm">
            <p className="font-medium text-slate-700 mb-2">{label}</p>
            {payload.map((entry) => (
                <div key={entry.dataKey} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-500">{labelMap[entry.dataKey] ?? entry.dataKey}:</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(entry.value)}</span>
                </div>
            ))}
        </div>
    );
}

type StatusComparisonCardProps = {
    loading: boolean;
    error: string | null;
    chartData: SalesPoint[];
    totalsByStatus: StatusTotals;
    formatCurrency: (value: number) => string;
};

export function StatusComparisonCard({
    loading,
    error,
    chartData,
    totalsByStatus,
    formatCurrency,
}: StatusComparisonCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-col gap-3">
                <div className="space-y-0.5">
                    <CardTitle>Status das Vendas</CardTitle>
                    <p className="text-sm text-slate-500">Comparação entre vendas pendentes e confirmadas</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                        <span className="text-slate-600">
                            Confirmadas: <strong className="text-slate-800">{formatCurrency(totalsByStatus.confirmed)}</strong>
                        </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                        <span className="text-slate-600">
                            Pendentes: <strong className="text-slate-800">{formatCurrency(totalsByStatus.pending)}</strong>
                        </span>
                    </span>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="h-72 w-full">
                    {loading ? (
                        <ChartLoading />
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis
                                    dataKey="day"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={shortCurrency}
                                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                                    width={50}
                                />
                                <Tooltip
                                    content={<StatusTooltip formatCurrency={formatCurrency} />}
                                    cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
                                />
                                <Bar dataKey="confirmed" name="Confirmadas" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="pending" name="Pendentes" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
