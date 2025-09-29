"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TrendingUp, DollarSign, Users, CreditCard, Calendar, BarChart3, Sparkles } from "lucide-react";
import type { ApiOrder, RangeOption, SalesPoint, StatusTotals, CustomerDebtor } from "./types";
import { SalesOverPeriodCard } from "./components/SalesOverPeriodCard";
import { StatusComparisonCard } from "./components/StatusComparisonCard";
import { SalesDistributionCard } from "./components/SalesDistributionCard";
import { TopDebtorsCard } from "./components/TopDebtorsCard";
import { Card, CardContent } from "../components/ui/card";
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
                    fetchError instanceof Error ? fetchError.message : "Nao foi possivel carregar os saldos de ficha."
                );
            } finally {
                setDebtorsLoading(false);
            }
        };

        fetchDebtors();
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
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20 custom-scrollbar">
            {/* Header Section */}
            <div className="relative overflow-hidden bg-white/95 backdrop-blur-sm border-b border-slate-200/40 sticky top-0 z-10 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 to-indigo-50/30" />
                <div className="relative mx-auto max-w-7xl px-6 py-8">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 shadow-md pulse-glow">
                                        <BarChart3 className="h-7 w-7 text-white" />
                                    </div>
                                    <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center shadow-sm">
                                        <Sparkles className="h-2.5 w-2.5 text-white" />
                                    </div>
                                </div>
                                <div>
                                    <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-700 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                        Dashboard de Vendas
                                    </h1>
                                    <p className="text-slate-600 text-lg">
                                        Acompanhe o desempenho do seu negócio em tempo real
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-slate-200/60 shadow-sm">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <Calendar className="h-4 w-4 text-slate-500" />
                            <span className="text-sm text-slate-600 font-medium">Atualizado agora</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
                {/* KPI Cards */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mobile-stack">
                    <Card className="group relative overflow-hidden border border-slate-200/40 bg-white/98 shadow-sm hover:shadow-md interactive-hover float-animation">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-50/80 to-emerald-50/40" />
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-400" />
                        <CardContent className="relative p-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-slate-600">Total de Vendas</p>
                                    <p className="text-3xl font-bold text-slate-900">
                                        {formatCurrency(totalSales)}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-green-500" />
                                        <p className="text-xs text-green-600 font-medium">
                                            Últimos {salesRange} dias
                                        </p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 shadow-md group-hover:scale-105 transition-all duration-300">
                                        <TrendingUp className="h-7 w-7 text-white" />
                                    </div>
                                    <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl opacity-10 group-hover:opacity-20 transition-opacity duration-300 blur-sm" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="group relative overflow-hidden border border-slate-200/40 bg-white/98 shadow-sm hover:shadow-md interactive-hover float-animation" style={{ animationDelay: '0.5s' }}>
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 to-cyan-50/40" />
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-400" />
                        <CardContent className="relative p-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-slate-600">Vendas Confirmadas</p>
                                    <p className="text-3xl font-bold text-slate-900">
                                        {formatCurrency(totalsByStatus.confirmed)}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                                        <p className="text-xs text-blue-600 font-medium">
                                            Últimos {statusRange} dias
                                        </p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 shadow-md group-hover:scale-105 transition-all duration-300">
                                        <DollarSign className="h-7 w-7 text-white" />
                                    </div>
                                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-xl opacity-10 group-hover:opacity-20 transition-opacity duration-300 blur-sm" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="group relative overflow-hidden border border-slate-200/40 bg-white/98 shadow-sm hover:shadow-md interactive-hover float-animation" style={{ animationDelay: '1s' }}>
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/80 to-amber-50/40" />
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-amber-400" />
                        <CardContent className="relative p-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-slate-600">Vendas Pendentes</p>
                                    <p className="text-3xl font-bold text-slate-900">
                                        {formatCurrency(totalsByStatus.pending)}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                                        <p className="text-xs text-orange-600 font-medium">
                                            Aguardando confirmação
                                        </p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 shadow-md group-hover:scale-105 transition-all duration-300">
                                        <CreditCard className="h-7 w-7 text-white" />
                                    </div>
                                    <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 to-amber-500 rounded-xl opacity-10 group-hover:opacity-20 transition-opacity duration-300 blur-sm" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="group relative overflow-hidden border border-slate-200/40 bg-white/98 shadow-sm hover:shadow-md interactive-hover float-animation" style={{ animationDelay: '1.5s' }}>
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 to-violet-50/40" />
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-violet-400" />
                        <CardContent className="relative p-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-slate-600">Clientes Devedores</p>
                                    <p className="text-3xl font-bold text-slate-900">
                                        {debtors.length}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-purple-500" />
                                        <p className="text-xs text-purple-600 font-medium">
                                            {formatCurrency(debtors.reduce((sum, d) => sum + d.balanceCents, 0) / 100)} em aberto
                                        </p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 shadow-md group-hover:scale-105 transition-all duration-300">
                                        <Users className="h-7 w-7 text-white" />
                                    </div>
                                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-violet-500 rounded-xl opacity-10 group-hover:opacity-20 transition-opacity duration-300 blur-sm" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Insights */}
                <div className="bg-white/98 border border-slate-200/40 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-sm">
                            <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">Insights Rápidos</h2>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                            <p className="text-2xl font-bold text-blue-900">
                                {formatCurrency(totalSales / (salesRange || 1))}
                            </p>
                            <p className="text-sm text-blue-700">Média diária</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
                            <p className="text-2xl font-bold text-green-900">
                                {((totalsByStatus.confirmed / (totalsByStatus.confirmed + totalsByStatus.pending)) * 100 || 0).toFixed(1)}%
                            </p>
                            <p className="text-sm text-green-700">Taxa de confirmação</p>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
                            <p className="text-2xl font-bold text-purple-900">
                                {productSalesData.length}
                            </p>
                            <p className="text-sm text-purple-700">Produtos vendidos</p>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="space-y-8">
                    <div className="grid gap-8 lg:grid-cols-1">
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
                    </div>

                    <div className="grid gap-8 lg:grid-cols-2">
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

                        <TopDebtorsCard
                            loading={debtorsLoading}
                            error={debtorsError}
                            debtors={debtors}
                            formatCurrency={formatCurrency}
                        />
                    </div>

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

                {/* Footer */}
                <div className="bg-white/98 border border-slate-200/40 rounded-2xl p-6 shadow-sm mt-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shadow-sm">
                                <BarChart3 className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-700">Dashboard de Vendas</p>
                                <p className="text-xs text-slate-500">Dados atualizados em tempo real</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>Última atualização: {new Date().toLocaleTimeString('pt-BR')}</span>
                            <div className="h-1 w-1 rounded-full bg-slate-400" />
                            <span>Período: Últimos {Math.max(salesRange, statusRange, insightsRange)} dias</span>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
