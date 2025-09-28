"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiOrder, RangeOption, SalesPoint, StatusTotals } from "./types";
import { SalesOverPeriodCard } from "./components/SalesOverPeriodCard";
import { StatusComparisonCard } from "./components/StatusComparisonCard";
import { SalesDistributionCard } from "./components/SalesDistributionCard";

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

    const formatCurrency = useCallback((value: number) => currencyFormatter.format(value), []);

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

    const totalsByStatus = useMemo<StatusTotals>(() => {
        return statusChartData.reduce<StatusTotals>(
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



    return (
        <main className="min-h-screen bg-slate-50 p-6">
            <div className="mx-auto w-full max-w-5xl space-y-6">
                <section className="space-y-2">
                    <h1 className="text-3xl font-semibold text-slate-900">Vendas recentes</h1>
                    <p className="text-sm text-slate-600">
                        Visualize o total de vendas diárias e altere o período para comparar tendências.
                    </p>
                </section>

                <SalesOverPeriodCard
                    loading={loading}
                    error={error}
                    totalSales={totalSales}
                    chartData={salesChartData}
                    rangeOptions={RANGE_OPTIONS}
                    currentRange={salesRange}
                    onRangeChange={setSalesRange}
                    formatCurrency={formatCurrency}
                />

                <StatusComparisonCard
                    loading={loading}
                    error={error}
                    chartData={statusChartData}
                    totalsByStatus={totalsByStatus}
                    rangeOptions={RANGE_OPTIONS}
                    currentRange={statusRange}
                    onRangeChange={setStatusRange}
                    formatCurrency={formatCurrency}
                />

                <SalesDistributionCard
                    loading={loading}
                    productSalesData={productSalesData}
                    paymentMethodData={paymentMethodData}
                    totalProductSales={totalProductSales}
                    totalPaymentSales={totalPaymentSales}
                    rangeOptions={RANGE_OPTIONS}
                    currentRange={insightsRange}
                    onRangeChange={setInsightsRange}
                    formatCurrency={formatCurrency}
                />
            </div>
        </main>
    );
}
