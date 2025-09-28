"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ChartLoading } from "../../components/ChartLoading";
import { RangeSelector } from "./RangeSelector";
import type { RangeOption } from "../types";

type DistributionEntry = {
    name: string;
    value: number;
    method?: string;
};

type SalesDistributionCardProps = {
    loading: boolean;
    productSalesData: DistributionEntry[];
    paymentMethodData: DistributionEntry[];
    totalProductSales: number;
    totalPaymentSales: number;
    rangeOptions: RangeOption[];
    currentRange: number;
    onRangeChange: (value: number) => void;
    formatCurrency: (value: number) => string;
};

const PIE_COLORS = ["#6366F1", "#F97316", "#22C55E", "#0EA5E9", "#A855F7", "#F43F5E", "#FACC15", "#14B8A6"];

export function SalesDistributionCard({
    loading,
    productSalesData,
    paymentMethodData,
    totalProductSales,
    totalPaymentSales,
    rangeOptions,
    currentRange,
    onRangeChange,
    formatCurrency,
}: SalesDistributionCardProps) {
    return (
        <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-xl text-slate-900">Distribuição das vendas</CardTitle>
                    <p className="text-xs text-slate-500">
                        Analise os produtos mais vendidos e os meios de pagamento preferidos.
                    </p>
                </div>
                <RangeSelector options={rangeOptions} currentValue={currentRange} onSelect={onRangeChange} />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-8 lg:grid-cols-2">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-slate-600">
                            <span>Vendas por produto</span>
                            <span className="font-semibold text-slate-900">{formatCurrency(totalProductSales)}</span>
                        </div>
                        <div className="h-80 w-full">
                            {loading ? (
                                <ChartLoading variant="pie" />
                            ) : productSalesData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Tooltip
                                            formatter={(value) => formatCurrency(Number(value))}
                                            cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                                        />
                                        <Legend />
                                        <Pie
                                            data={productSalesData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={4}
                                        >
                                            {productSalesData.map((entry, index) => (
                                                <Cell
                                                    key={`product-pie-${entry.name}-${index}`}
                                                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                                    Sem dados no período selecionado.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-slate-600">
                            <span>Formas de pagamento</span>
                            <span className="font-semibold text-slate-900">{formatCurrency(totalPaymentSales)}</span>
                        </div>
                        <div className="h-80 w-full">
                            {loading ? (
                                <ChartLoading variant="pie" />
                            ) : paymentMethodData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Tooltip
                                            formatter={(value) => formatCurrency(Number(value))}
                                            cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                                        />
                                        <Legend />
                                        <Pie
                                            data={paymentMethodData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={4}
                                        >
                                            {paymentMethodData.map((entry, index) => (
                                                <Cell
                                                    key={`payment-pie-${entry.method ?? entry.name}-${index}`}
                                                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                                    Sem dados no período selecionado.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
