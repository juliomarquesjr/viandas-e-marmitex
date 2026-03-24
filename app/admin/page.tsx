"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Users, Clock, CheckCircle, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApiOrder, RangeOption, SalesPoint, StatusTotals, CustomerDebtor } from "./types";
import { SalesOverPeriodCard } from "./components/SalesOverPeriodCard";
import { StatusComparisonCard } from "./components/StatusComparisonCard";
import { SalesDistributionCard } from "./components/SalesDistributionCard";
import { TopDebtorsCard } from "./components/TopDebtorsCard";
import { RangeSelector } from "./components/RangeSelector";
import { CardContent, CardHighlighted } from "../components/ui/card";
import { SimplePageHeader } from "./components/layout/PageHeader";
import "./dashboard.css";

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

// ------- KPI Card -------

const iconBg: Record<string, string> = {
    success: "bg-emerald-50",
    info: "bg-blue-50",
    warning: "bg-amber-50",
    primary: "bg-slate-100",
    error: "bg-red-50",
};
const iconColor: Record<string, string> = {
    success: "text-emerald-600",
    info: "text-blue-600",
    warning: "text-amber-600",
    primary: "text-slate-600",
    error: "text-red-600",
};

type KpiCardProps = {
    color: "success" | "info" | "warning" | "primary" | "error";
    icon: React.ElementType;
    label: string;
    value: string;
    subtitle: string;
    trend?: number | null;
};

function KpiCard({ color, icon: Icon, label, value, subtitle, trend }: KpiCardProps) {
    return (
        <CardHighlighted highlightColor={color}>
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
                        <p className="text-2xl font-bold text-slate-900 truncate">{value}</p>
                        {trend != null && (
                            <div className="flex items-center gap-1 mt-1.5">
                                {trend >= 0 ? (
                                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                    <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                )}
                                <span className={cn("text-xs font-medium", trend >= 0 ? "text-emerald-600" : "text-red-600")}>
                                    {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
                                </span>
                                <span className="text-xs text-slate-400">vs anterior</span>
                            </div>
                        )}
                        <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
                    </div>
                    <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ml-3", iconBg[color])}>
                        <Icon className={cn("h-5 w-5", iconColor[color])} />
                    </div>
                </div>
            </CardContent>
        </CardHighlighted>
    );
}

// ------- Page -------

export default function AdminHome() {
    const [globalRange, setGlobalRange] = useState<number>(7);
    const [orders, setOrders] = useState<ApiOrder[]>([]);
    const [dailyData, setDailyData] = useState<SalesPoint[]>(() => {
        const endDate = new Date();
        endDate.setHours(0, 0, 0, 0);
        return createDailySkeleton(MAX_HISTORY_DAYS, endDate).list;
    });
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [debtors, setDebtors] = useState<CustomerDebtor[]>([]);
    const [debtorsLoading, setDebtorsLoading] = useState<boolean>(false);
    const [debtorsError, setDebtorsError] = useState<string | null>(null);

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

    useEffect(() => {
        const fetchDebtors = async () => {
            setDebtorsLoading(true);
            setDebtorsError(null);

            try {
                const response = await fetch("/api/reports/debtors", {
                    cache: "no-store",
                });

                if (!response.ok) {
                    throw new Error("Falha ao carregar saldos de ficha.");
                }

                const payload = await response.json();
                const debtorsData = Array.isArray(payload?.data) ? (payload.data as CustomerDebtor[]) : [];

                setDebtors(debtorsData);
            } catch (fetchError) {
                setDebtors([]);
                setDebtorsError(
                    fetchError instanceof Error ? fetchError.message : "Não foi possível carregar os saldos de ficha."
                );
            } finally {
                setDebtorsLoading(false);
            }
        };

        fetchDebtors();
    }, []);

    const formatCurrency = useCallback((value: number) => currencyFormatter.format(value), []);

    const salesChartData = useMemo(() => {
        if (dailyData.length === 0) return [];
        return dailyData.slice(Math.max(dailyData.length - globalRange, 0));
    }, [dailyData, globalRange]);

    const totalSales = useMemo(() => {
        return salesChartData.reduce((sum, item) => sum + item.total, 0);
    }, [salesChartData]);

    const totalsByStatus = useMemo<StatusTotals>(() => {
        return salesChartData.reduce<StatusTotals>(
            (acc, item) => {
                acc.pending += item.pending;
                acc.confirmed += item.confirmed;
                return acc;
            },
            { pending: 0, confirmed: 0 }
        );
    }, [salesChartData]);

    const filteredOrders = useMemo(() => {
        if (orders.length === 0) return [] as ApiOrder[];

        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        const startDate = new Date(endDate);
        startDate.setHours(0, 0, 0, 0);
        startDate.setDate(startDate.getDate() - (globalRange - 1));

        return orders.filter((order) => {
            if (!order?.createdAt) return false;
            const orderDate = new Date(order.createdAt);
            return orderDate >= startDate && orderDate <= endDate;
        });
    }, [orders, globalRange]);

    const ticketMedio = useMemo(() => {
        if (filteredOrders.length === 0) return 0;
        return filteredOrders.reduce((sum, o) => sum + (o.totalCents ?? 0), 0) / 100 / filteredOrders.length;
    }, [filteredOrders]);

    // Trend vs período anterior (disponível apenas para ranges onde há dados suficientes: 7d e 15d)
    const previousPeriodSales = useMemo(() => {
        if (globalRange * 2 > MAX_HISTORY_DAYS) return null;
        const prevSlice = dailyData.slice(
            Math.max(0, dailyData.length - globalRange * 2),
            dailyData.length - globalRange
        );
        return prevSlice.reduce((sum, item) => sum + item.total, 0);
    }, [dailyData, globalRange]);

    const salesTrend = useMemo<number | null>(() => {
        if (previousPeriodSales == null || previousPeriodSales === 0) return null;
        return ((totalSales - previousPeriodSales) / previousPeriodSales) * 100;
    }, [totalSales, previousPeriodSales]);

    const productSalesData = useMemo(() => {
        if (filteredOrders.length === 0) return [] as { name: string; value: number }[];

        const totals = new Map<string, number>();

        filteredOrders.forEach((order) => {
            order.items?.forEach((item) => {
                if (!item) return;
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
        if (filteredOrders.length === 0) return [] as { name: string; value: number; method: string }[];

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

    const totalDebtorBalance = useMemo(() => {
        return debtors.reduce((sum, d) => sum + d.balanceCents, 0) / 100;
    }, [debtors]);

    return (
        <>
            <SimplePageHeader
                title="Dashboard"
                description="Visão geral de vendas e operações"
                actions={
                    <RangeSelector
                        options={RANGE_OPTIONS}
                        currentValue={globalRange}
                        onSelect={setGlobalRange}
                    />
                }
            />

            <div className="space-y-6 mt-6">
                {/* KPI Cards */}
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                    <KpiCard
                        color="success"
                        icon={TrendingUp}
                        label="Total de Vendas"
                        value={formatCurrency(totalSales)}
                        subtitle={`Últimos ${globalRange} dias`}
                        trend={salesTrend}
                    />
                    <KpiCard
                        color="info"
                        icon={CheckCircle}
                        label="Confirmadas"
                        value={formatCurrency(totalsByStatus.confirmed)}
                        subtitle={`Últimos ${globalRange} dias`}
                    />
                    <KpiCard
                        color="warning"
                        icon={Clock}
                        label="Pendentes"
                        value={formatCurrency(totalsByStatus.pending)}
                        subtitle="Aguardando confirmação"
                    />
                    <KpiCard
                        color="primary"
                        icon={Receipt}
                        label="Ticket Médio"
                        value={formatCurrency(ticketMedio)}
                        subtitle={`Últimos ${globalRange} dias`}
                    />
                    <KpiCard
                        color="error"
                        icon={Users}
                        label="Clientes Devedores"
                        value={String(debtors.length)}
                        subtitle={`${formatCurrency(totalDebtorBalance)} em aberto`}
                    />
                </div>

                {/* Gráfico de Vendas — full width */}
                <SalesOverPeriodCard
                    loading={loading}
                    error={error}
                    chartData={salesChartData}
                    formatCurrency={formatCurrency}
                />

                {/* Status + Devedores — lado a lado */}
                <div className="grid gap-4 lg:grid-cols-2">
                    <StatusComparisonCard
                        loading={loading}
                        error={error}
                        chartData={salesChartData}
                        totalsByStatus={totalsByStatus}
                        formatCurrency={formatCurrency}
                    />
                    <TopDebtorsCard
                        loading={debtorsLoading}
                        error={debtorsError}
                        debtors={debtors}
                        formatCurrency={formatCurrency}
                    />
                </div>

                {/* Distribuição — full width */}
                <SalesDistributionCard
                    loading={loading}
                    productSalesData={productSalesData}
                    paymentMethodData={paymentMethodData}
                    totalProductSales={totalProductSales}
                    totalPaymentSales={totalPaymentSales}
                    formatCurrency={formatCurrency}
                />
            </div>
        </>
    );
}
