"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ChartLoading } from "../../components/ChartLoading";

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
    formatCurrency: (value: number) => string;
};

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#0ea5e9", "#8b5cf6", "#64748b"];

type DonutLegendProps = {
    data: DistributionEntry[];
    total: number;
    formatCurrency: (value: number) => string;
};

function DonutLegend({ data, total, formatCurrency }: DonutLegendProps) {
    return (
        <ul className="mt-3 space-y-1.5">
            {data.map((entry, i) => {
                const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0.0";
                return (
                    <li key={i} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 min-w-0">
                            <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                            />
                            <span className="text-slate-600 truncate">{entry.name}</span>
                        </span>
                        <span className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-slate-400 text-xs">{pct}%</span>
                            <span className="font-medium text-slate-800">{formatCurrency(entry.value)}</span>
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}

type DonutSectionProps = {
    title: string;
    subtitle: string;
    total: number;
    data: DistributionEntry[];
    loading: boolean;
    formatCurrency: (value: number) => string;
    keyPrefix: string;
};

function DonutSection({ title, subtitle, total, data, loading, formatCurrency, keyPrefix }: DonutSectionProps) {
    return (
        <div className="space-y-1">
            <div className="mb-3">
                <p className="text-sm font-semibold text-slate-700">{title}</p>
                <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
            <div className="h-52 w-full">
                {loading ? (
                    <ChartLoading variant="pie" />
                ) : data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Tooltip
                                formatter={(value) => formatCurrency(Number(value))}
                                contentStyle={{
                                    borderRadius: "8px",
                                    border: "1px solid #e2e8f0",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                                    fontSize: "13px",
                                }}
                            />
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={90}
                                paddingAngle={3}
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`${keyPrefix}-${entry.name}-${index}`}
                                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                                    />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        Sem dados no período selecionado.
                    </div>
                )}
            </div>
            {data.length > 0 && (
                <DonutLegend data={data} total={total} formatCurrency={formatCurrency} />
            )}
        </div>
    );
}

export function SalesDistributionCard({
    loading,
    productSalesData,
    paymentMethodData,
    totalProductSales,
    totalPaymentSales,
    formatCurrency,
}: SalesDistributionCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Distribuição das Vendas</CardTitle>
                <p className="text-sm text-slate-500">Análise por produtos e formas de pagamento</p>
            </CardHeader>
            <CardContent>
                <div className="grid gap-8 lg:grid-cols-2">
                    <DonutSection
                        title="Vendas por Produto"
                        subtitle={`${productSalesData.length} produtos — total ${formatCurrency(totalProductSales)}`}
                        total={totalProductSales}
                        data={productSalesData}
                        loading={loading}
                        formatCurrency={formatCurrency}
                        keyPrefix="product"
                    />
                    <DonutSection
                        title="Formas de Pagamento"
                        subtitle={`${paymentMethodData.length} métodos — total ${formatCurrency(totalPaymentSales)}`}
                        total={totalPaymentSales}
                        data={paymentMethodData}
                        loading={loading}
                        formatCurrency={formatCurrency}
                        keyPrefix="payment"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
