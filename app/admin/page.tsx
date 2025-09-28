"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

type RangeOption = {
    label: string;
    value: number;
};

type SalesPoint = {
    day: string;
    total: number;
    pending: number;
    confirmed: number;
};

type ApiOrderItem = {
    id: string;
    quantity: number;
    priceCents: number | null;
    product: {
        id: string;
        name: string | null;
    } | null;
};

type ApiOrder = {
    id: string;
    status: string;
    totalCents: number | null;
    createdAt: string;
    paymentMethod: string | null;
    items: ApiOrderItem[] | null;
};

const RANGE_OPTIONS: RangeOption[] = [
    { label: "7 dias", value: 7 },
    { label: "15 dias", value: 15 },
    { label: "20 dias", value: 20 },
    { label: "30 dias", value: 30 }
];

const MAX_HISTORY_DAYS = 30;
const CANCELLED_STATUSES = new Set(["cancelled", "canceled"]);

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
});

function formatDateParam(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function createDailySkeleton(totalDays: number, endDate: Date): { list: SalesPoint[]; index: Map<string, SalesPoint> } {
    const startDate = new Date(endDate);
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(endDate.getDate() - (totalDays - 1));

    const list: SalesPoint[] = [];
    const index = new Map<string, SalesPoint>();

    for (let i = 0; i < totalDays; i++) {
        const current = new Date(startDate);
        current.setDate(startDate.getDate() + i);
        current.setHours(0, 0, 0, 0);

        const key = formatDateParam(current);
        const entry: SalesPoint = {
            day: current.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
            total: 0,
            pending: 0,
            confirmed: 0,
        };

        list.push(entry);
        index.set(key, entry);
    }

    return { list, index };
}

function buildDailySummaries(orders: ApiOrder[], totalDays: number, endDate: Date): SalesPoint[] {
    const { list, index } = createDailySkeleton(totalDays, endDate);

    orders.forEach((order) => {
        if (!order || typeof order.totalCents !== "number" || !order.createdAt) {
            return;
        }

        const orderDate = new Date(order.createdAt);
        const key = formatDateParam(orderDate);
        const entry = index.get(key);

        if (!entry) {
            return;
        }

        const totalValue = order.totalCents / 100;
        entry.total += totalValue;

        if (order.status === "pending") {
            entry.pending += totalValue;
        } else if (!CANCELLED_STATUSES.has(order.status)) {
            entry.confirmed += totalValue;
        }
    });

    return list;
}

export default function AdminHome() {
    const [salesRange, setSalesRange] = useState<number>(7);
    const [statusRange, setStatusRange] = useState<number>(7);
    const [insightsRange, setInsightsRange] = useState<number>(7);
    const [orders, setOrders] = useState<ApiOrder[]>([]);
    const [dailyData, setDailyData] = useState<SalesPoint[]>(() => {
        const endDate = new Date();
        endDate.setHours(0, 0, 0, 0);
        return createDailySkeleton(MAX_HISTORY_DAYS, endDate).list;
    });
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            setError(null);

            const endDate = new Date();
            endDate.setHours(0, 0, 0, 0);
            const startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - (MAX_HISTORY_DAYS - 1));

            try {
                const params = new URLSearchParams({
                    page: "1",
                    size: "5000",
                    startDate: formatDateParam(startDate),
                    endDate: formatDateParam(endDate),
                });

                const response = await fetch(`/api/orders?${params.toString()}`, {
                    cache: "no-store",
                });

                if (!response.ok) {
                    throw new Error("Falha ao carregar vendas.");
                }

                const payload = await response.json();
                const ordersData = (Array.isArray(payload?.data) ? payload.data : []) as ApiOrder[];

                setOrders(ordersData);
                setDailyData(buildDailySummaries(ordersData, MAX_HISTORY_DAYS, endDate));
            } catch (fetchError) {
                const fallbackEndDate = new Date();
                fallbackEndDate.setHours(0, 0, 0, 0);
                setError(fetchError instanceof Error ? fetchError.message : "Não foi possível carregar as vendas.");
                setDailyData(buildDailySummaries([], MAX_HISTORY_DAYS, fallbackEndDate));
                setOrders([]);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    const salesChartData = useMemo(() => {
        if (dailyData.length === 0) {
            return [];
        }
        return dailyData.slice(Math.max(dailyData.length - salesRange, 0));
    }, [dailyData, salesRange]);

    const statusChartData = useMemo(() => {
        if (dailyData.length === 0) {
            return [];
        }
        return dailyData.slice(Math.max(dailyData.length - statusRange, 0));
    }, [dailyData, statusRange]);

    const totalSales = useMemo(() => {
        return salesChartData.reduce((sum, item) => sum + item.total, 0);
    }, [salesChartData]);

    const totalsByStatus = useMemo(() => {
        return statusChartData.reduce(
            (acc, item) => {
                acc.pending += item.pending;
                acc.confirmed += item.confirmed;
                return acc;
            },
            { pending: 0, confirmed: 0 }
        );
    }, [statusChartData]);

    const filteredOrders = useMemo(() => {
        if (orders.length === 0) {
            return [] as ApiOrder[];
        }

        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        const startDate = new Date(endDate);
        startDate.setHours(0, 0, 0, 0);
        startDate.setDate(startDate.getDate() - (insightsRange - 1));

        return orders.filter((order) => {
            if (!order?.createdAt) {
                return false;
            }

            const orderDate = new Date(order.createdAt);
            return orderDate >= startDate && orderDate <= endDate;
        });
    }, [orders, insightsRange]);

    const productSalesData = useMemo(() => {
        if (filteredOrders.length === 0) {
            return [] as { name: string; value: number }[];
        }

        const totals = new Map<string, number>();

        filteredOrders.forEach((order) => {
            order.items?.forEach((item) => {
                if (!item) {
                    return;
                }

                const productName = item.product?.name?.trim() || "Sem nome";
                const itemTotal = ((item.priceCents ?? 0) * item.quantity) / 100;

                totals.set(productName, (totals.get(productName) ?? 0) + itemTotal);
            });
        });

        const sortedTotals = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
        const maxItems = 6;
        const primaryItems = sortedTotals
            .slice(0, maxItems)
            .map(([name, value]) => ({ name, value }))
            .filter((item) => item.value > 0);
        const othersTotal = sortedTotals.slice(maxItems).reduce((sum, [, value]) => sum + value, 0);

        if (othersTotal > 0) {
            primaryItems.push({ name: "Outros", value: othersTotal });
        }

        return primaryItems;
    }, [filteredOrders]);

    const paymentMethodLabels: Record<string, string> = {
        cash: "Dinheiro",
        credit: "Crédito",
        debit: "Débito",
        pix: "Pix",
        invoice: "Ficha cliente",
    };

    const paymentMethodData = useMemo(() => {
        if (filteredOrders.length === 0) {
            return [] as { name: string; value: number; method: string }[];
        }

        const totals = new Map<string, number>();

        filteredOrders.forEach((order) => {
            const method = order.paymentMethod || "desconhecido";
            const orderTotal = (order.totalCents ?? 0) / 100;

            totals.set(method, (totals.get(method) ?? 0) + orderTotal);
        });

        return Array.from(totals.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([method, value]) => ({
                method,
                name: paymentMethodLabels[method] || "Outros",
                value,
            }))
            .filter((entry) => entry.value > 0);
    }, [filteredOrders]);

    const totalProductSales = useMemo(() => {
        return productSalesData.reduce((sum, item) => sum + item.value, 0);
    }, [productSalesData]);

    const totalPaymentSales = useMemo(() => {
        return paymentMethodData.reduce((sum, item) => sum + item.value, 0);
    }, [paymentMethodData]);

    const pieColors = ["#6366F1", "#F97316", "#22C55E", "#0EA5E9", "#A855F7", "#F43F5E", "#FACC15", "#14B8A6"];

    const renderRangeButtons = (currentRange: number, onSelect: (value: number) => void) => (
        <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((option) => (
                <Button
                    key={option.value}
                    variant={currentRange === option.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSelect(option.value)}
                >
                    {option.label}
                </Button>
            ))}
        </div>
    );

    return (
        <main className="min-h-screen bg-slate-50 p-6">
            <div className="mx-auto w-full max-w-5xl space-y-6">
                <section className="space-y-2">
                    <h1 className="text-3xl font-semibold text-slate-900">Vendas recentes</h1>
                    <p className="text-sm text-slate-600">
                        Visualize o total de vendas diárias e altere o período para comparar tendências.
                    </p>
                </section>

                <Card className="border-0 shadow-md">
                    <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <CardTitle className="text-xl text-slate-900">Vendas por período</CardTitle>
                        {renderRangeButtons(salesRange, setSalesRange)}
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="text-sm text-slate-600">
                            Total do período selecionado:
                            <span className="ml-1 font-semibold text-slate-900">
                                {currencyFormatter.format(totalSales)}
                            </span>
                        </div>
                        {error && (
                            <p className="text-sm text-red-500">{error}</p>
                        )}
                        <div className="h-80 w-full">
                            {loading ? (
                                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                                    Carregando dados...
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={salesChartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                        <XAxis dataKey="day" tickLine={false} axisLine={false} />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value: number) =>
                                                currencyFormatter.format(value).replace("R$", "").trim()
                                            }
                                        />
                                        <Tooltip
                                            cursor={{ fill: "rgba(148, 163, 184, 0.15)" }}
                                            formatter={(value: number) => currencyFormatter.format(value)}
                                            labelStyle={{ color: "#0f172a", fontWeight: 500 }}
                                        />
                                        <Bar dataKey="total" fill="#6366F1" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-md">
                    <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-xl text-slate-900">Pendentes vs. confirmadas</CardTitle>
                            <p className="text-xs text-slate-500">
                                Confirmadas exibem valores sem contabilizar entradas.
                            </p>
                        </div>
                        {renderRangeButtons(statusRange, setStatusRange)}
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                            <span>
                                Pendentes:
                                <span className="ml-1 font-semibold text-slate-900">
                                    {currencyFormatter.format(totalsByStatus.pending)}
                                </span>
                            </span>
                            <span>
                                Confirmadas:
                                <span className="ml-1 font-semibold text-slate-900">
                                    {currencyFormatter.format(totalsByStatus.confirmed)}
                                </span>
                            </span>
                        </div>
                        {error && (
                            <p className="text-sm text-red-500">{error}</p>
                        )}
                        <div className="h-80 w-full">
                            {loading ? (
                                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                                    Carregando dados...
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={statusChartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                                        <XAxis dataKey="day" tickLine={false} axisLine={false} />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value: number) =>
                                                currencyFormatter.format(value).replace("R$", "").trim()
                                            }
                                        />
                                        <Tooltip
                                            cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                                            formatter={(value: number) => currencyFormatter.format(value)}
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

                <Card className="border-0 shadow-md">
                    <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-xl text-slate-900">Distribuição das vendas</CardTitle>
                            <p className="text-xs text-slate-500">
                                Analise os produtos mais vendidos e os meios de pagamento preferidos.
                            </p>
                        </div>
                        {renderRangeButtons(insightsRange, setInsightsRange)}
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-8 lg:grid-cols-2">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-sm text-slate-600">
                                    <span>Vendas por produto</span>
                                    <span className="font-semibold text-slate-900">
                                        {currencyFormatter.format(totalProductSales)}
                                    </span>
                                </div>
                                <div className="h-80 w-full">
                                    {loading ? (
                                        <div className="flex h-full items-center justify-center text-sm text-slate-500">
                                            Carregando dados...
                                        </div>
                                    ) : productSalesData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Tooltip
                                                    formatter={(value) => currencyFormatter.format(Number(value))}
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
                                                        <Cell key={`product-pie-${entry.name}-${index}`} fill={pieColors[index % pieColors.length]} />
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
                                    <span className="font-semibold text-slate-900">
                                        {currencyFormatter.format(totalPaymentSales)}
                                    </span>
                                </div>
                                <div className="h-80 w-full">
                                    {loading ? (
                                        <div className="flex h-full items-center justify-center text-sm text-slate-500">
                                            Carregando dados...
                                        </div>
                                    ) : paymentMethodData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Tooltip
                                                    formatter={(value) => currencyFormatter.format(Number(value))}
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
                                                        <Cell key={`payment-pie-${entry.method}-${index}`} fill={pieColors[index % pieColors.length]} />
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
            </div>
        </main>
    );
}
