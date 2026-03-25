"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ChartLoading } from "../../components/ChartLoading";
import type { SalesPoint } from "../types";

type CustomTooltipProps = {
    active?: boolean;
    payload?: { dataKey: string; value: number; color: string }[];
    label?: string;
    formatCurrency: (value: number) => string;
};

function CustomTooltip({ active, payload, label, formatCurrency }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;

    const labelMap: Record<string, string> = {
        total: "Total",
        confirmed: "Confirmado",
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

function shortCurrency(value: number): string {
    if (value >= 1000) return `${(value / 1000).toFixed(1).replace(".", ",")}k`;
    return String(Math.round(value));
}

type SalesOverPeriodCardProps = {
    loading: boolean;
    error: string | null;
    chartData: SalesPoint[];
    formatCurrency: (value: number) => string;
};

export function SalesOverPeriodCard({
    loading,
    error,
    chartData,
    formatCurrency,
}: SalesOverPeriodCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-0.5">
                    <CardTitle>Vendas por período</CardTitle>
                    <p className="text-sm text-slate-500">Evolução das vendas ao longo do tempo</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                        <span className="text-slate-600">Total</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <span className="text-slate-600">Confirmado</span>
                    </span>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="h-80 w-full">
                    {loading ? (
                        <ChartLoading />
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="confirmedGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis
                                    dataKey="day"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={shortCurrency}
                                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                                    width={55}
                                />
                                <Tooltip
                                    content={<CustomTooltip formatCurrency={formatCurrency} />}
                                    cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    fill="url(#totalGradient)"
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 0 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="confirmed"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fill="url(#confirmedGradient)"
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 0 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
