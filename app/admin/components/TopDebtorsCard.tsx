"use client";

import { useMemo } from "react";
import { AlertCircle, Phone } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ChartLoading } from "../../components/ChartLoading";
import type { CustomerDebtor } from "../types";

type TopDebtorsCardProps = {
    loading: boolean;
    error: string | null;
    debtors: CustomerDebtor[];
    formatCurrency: (value: number) => string;
};

const MAX_VISIBLE_DEBTORS = 20; // Aumentado para permitir scroll

export function TopDebtorsCard({ loading, error, debtors, formatCurrency }: TopDebtorsCardProps) {
    const itemsToDisplay = useMemo(() => debtors.slice(0, MAX_VISIBLE_DEBTORS), [debtors]);
    const totalOutstanding = useMemo(() => {
        return debtors.reduce((sum, debtor) => sum + debtor.balanceCents, 0);
    }, [debtors]);

    return (
        <Card className="relative overflow-hidden border border-slate-200/40 bg-white/98 shadow-sm hover:shadow-md transition-all duration-300 h-[600px] flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-red-50/80 to-orange-50/40" />
            <CardHeader className="relative flex flex-col gap-1 flex-shrink-0">
                <CardTitle className="text-xl font-bold text-slate-800">Clientes Devedores</CardTitle>
                <p className="text-sm text-slate-600">
                    {debtors.length > 0
                        ? `${debtors.length} cliente${debtors.length === 1 ? "" : "s"} com saldo em aberto`
                        : "Acompanhe os clientes com vendas em aberto (ficha)"}
                </p>
            </CardHeader>
            <CardContent className="relative flex-1 flex flex-col min-h-0">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <ChartLoading />
                    </div>
                ) : error ? (
                    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-gradient-to-r from-red-50 to-red-100 p-4 text-sm text-red-700">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <div>
                            <p className="font-medium">Não foi possível carregar os saldos</p>
                            <p>{error}</p>
                        </div>
                    </div>
                ) : itemsToDisplay.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-green-200 bg-gradient-to-r from-green-50 to-green-100 text-center">
                        <p className="text-sm font-medium text-green-700">Nenhum cliente com saldo devedor</p>
                        <p className="text-xs text-green-600">Ótimo sinal! Todas as fichas estão em dia</p>
                    </div>
                ) : (
                    <div className="flex flex-col space-y-4 flex-1 min-h-0">
                        <div className="rounded-lg bg-gradient-to-r from-red-50 to-red-100 p-4 border border-red-200 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-red-700">Total em Aberto</p>
                                    <p className="text-xl font-bold text-red-900">
                                        {formatCurrency(totalOutstanding / 100)}
                                    </p>
                                </div>
                                <div className="text-xs text-red-600">
                                    {debtors.length} cliente{debtors.length === 1 ? "" : "s"}
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto debtors-scroll pr-2 space-y-3">
                            {itemsToDisplay.map((debtor, index) => (
                                <div
                                    key={debtor.customerId}
                                    className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white/90 backdrop-blur-sm p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="relative flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-red-500 text-sm font-bold text-white shadow-md">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-800">{debtor.name}</p>
                                                {debtor.phone && (
                                                    <p className="flex items-center gap-1 text-xs text-slate-500">
                                                        <Phone className="h-3.5 w-3.5" />
                                                        {debtor.phone}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500 mb-1">Saldo devedor</p>
                                            <p className="text-lg font-bold text-red-600">
                                                {formatCurrency(debtor.balanceCents / 100)}
                                            </p>
                                            <div className="flex flex-col gap-1 text-xs text-slate-500 mt-1">
                                                <span>Consumido: {formatCurrency(debtor.pendingCents / 100)}</span>
                                                {debtor.paymentsCents > 0 && (
                                                    <span>Pago: {formatCurrency(debtor.paymentsCents / 100)}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {debtors.length > MAX_VISIBLE_DEBTORS && (
                            <div className="text-xs text-slate-500 text-center py-2 flex-shrink-0">
                                + {debtors.length - MAX_VISIBLE_DEBTORS} outro{debtors.length - MAX_VISIBLE_DEBTORS === 1 ? "" : "s"} com saldo em aberto.
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
