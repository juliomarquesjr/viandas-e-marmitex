"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Calendar, TrendingUp, DollarSign, CreditCard, Package } from "lucide-react";
import Link from "next/link";

interface Order {
    id: string;
    createdAt: string;
    totalCents: number;
    status: string;
    paymentMethod: string | null;
    items: Array<{
        id: string;
        quantity: number;
        priceCents: number;
        product: {
            id: string;
            name: string;
        };
    }>;
}

interface MonthlySummary {
    month: string;
    monthFormatted: string;
    initialBalanceCents: number;
    purchasesCents: number;
    paymentsCents: number;
    monthlyBalanceCents: number;
    finalBalanceCents: number;
    status: 'devedor' | 'credito' | 'zerado';
}

interface ConsumptionData {
    period: {
        startDate: string;
        endDate: string;
    };
    summary: {
        periodConsumptionCents: number;
        debtBalanceCents: number;
        totalPaymentsCents: number;
    };
    orders: Order[];
    monthlySummary: MonthlySummary[];
}

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(cents / 100);
}

function formatDate(dateString: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(new Date(dateString));
}

function formatDateTime(dateString: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(dateString));
}

export default function ConsumptionPage() {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [data, setData] = useState<ConsumptionData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Definir datas padrão (último mês)
    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
    }, []);

    const fetchConsumption = async () => {
        if (!startDate || !endDate) {
            setError("Selecione as datas");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch(
                `/api/mobile/orders/consumption?startDate=${startDate}&endDate=${endDate}`
            );

            if (!response.ok) {
                throw new Error("Erro ao buscar dados");
            }

            const result = await response.json();
            setData(result);
        } catch (err: any) {
            setError(err.message || "Erro ao buscar consumo");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (startDate && endDate) {
            fetchConsumption();
        }
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 pb-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 pb-8 rounded-b-3xl shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                    <Link href="/mobile/dashboard" className="text-white">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Meu Consumo</h1>
                </div>
            </div>

            <div className="px-6 -mt-4 space-y-4">
                {/* Seletor de Período */}
                <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-orange-500" />
                        Selecione o Período
                    </h2>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Data Inicial</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Data Final</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                            />
                        </div>
                    </div>

                    <button
                        onClick={fetchConsumption}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                    >
                        {loading ? "Buscando..." : "Consultar"}
                    </button>

                    {error && (
                        <p className="text-sm text-red-600 text-center">{error}</p>
                    )}
                </div>

                {/* Resumo */}
                {data && (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white rounded-2xl shadow-sm p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-4 w-4 text-blue-500" />
                                    <p className="text-xs text-gray-500">Consumo</p>
                                </div>
                                <p className="text-lg font-bold text-gray-800">
                                    {formatCurrency(data.summary.periodConsumptionCents)}
                                </p>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <CreditCard className="h-4 w-4 text-green-500" />
                                    <p className="text-xs text-gray-500">Pagamentos</p>
                                </div>
                                <p className="text-lg font-bold text-gray-800">
                                    {formatCurrency(data.summary.totalPaymentsCents)}
                                </p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="h-4 w-4 text-orange-500" />
                                <p className="text-xs text-gray-500">Saldo</p>
                            </div>
                            <p className={`text-2xl font-bold ${data.summary.debtBalanceCents > 0 ? 'text-red-600' :
                                    data.summary.debtBalanceCents < 0 ? 'text-green-600' :
                                        'text-gray-600'
                                }`}>
                                {formatCurrency(data.summary.debtBalanceCents)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {data.summary.debtBalanceCents > 0 ? 'A pagar' :
                                    data.summary.debtBalanceCents < 0 ? 'Crédito' :
                                        'Zerado'}
                            </p>
                        </div>

                        {/* Resumo Mensal */}
                        {data.monthlySummary.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm p-5">
                                <h3 className="font-bold text-gray-800 mb-3">Resumo Mensal</h3>
                                <div className="space-y-3">
                                    {data.monthlySummary.map((month) => (
                                        <div key={month.month} className="border-b border-gray-100 pb-3 last:border-0">
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="font-medium text-gray-800">{month.monthFormatted}</p>
                                                <span className={`text-xs px-2 py-1 rounded-full ${month.status === 'devedor' ? 'bg-red-100 text-red-700' :
                                                        month.status === 'credito' ? 'bg-green-100 text-green-700' :
                                                            'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {month.status}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <p className="text-gray-500">Compras</p>
                                                    <p className="font-medium">{formatCurrency(month.purchasesCents)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Pagamentos</p>
                                                    <p className="font-medium">{formatCurrency(month.paymentsCents)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Lista de Pedidos */}
                        <div className="bg-white rounded-2xl shadow-sm p-5">
                            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <Package className="h-5 w-5 text-orange-500" />
                                Pedidos do Período ({data.orders.length})
                            </h3>

                            {data.orders.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">
                                    Nenhum pedido neste período
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {data.orders.map((order) => (
                                        <div key={order.id} className="border border-gray-100 rounded-xl p-3">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-xs text-gray-500">{formatDateTime(order.createdAt)}</p>
                                                <p className="font-bold text-orange-600">{formatCurrency(order.totalCents)}</p>
                                            </div>
                                            <div className="space-y-1">
                                                {order.items.map((item) => (
                                                    <p key={item.id} className="text-sm text-gray-700">
                                                        {item.quantity}x {item.product.name}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
