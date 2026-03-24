"use client";

import { useMemo } from "react";
import { AlertCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { ChartLoading } from "../../components/ChartLoading";
import type { CustomerDebtor } from "../types";

type TopDebtorsCardProps = {
    loading: boolean;
    error: string | null;
    debtors: CustomerDebtor[];
    formatCurrency: (value: number) => string;
};

const MAX_VISIBLE_DEBTORS = 20;

export function TopDebtorsCard({ loading, error, debtors, formatCurrency }: TopDebtorsCardProps) {
    const itemsToDisplay = useMemo(() => debtors.slice(0, MAX_VISIBLE_DEBTORS), [debtors]);
    const totalOutstanding = useMemo(() => {
        return debtors.reduce((sum, debtor) => sum + debtor.balanceCents, 0);
    }, [debtors]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Clientes Devedores</CardTitle>
                <CardDescription>
                    {debtors.length > 0
                        ? `${debtors.length} cliente${debtors.length === 1 ? "" : "s"} — ${formatCurrency(totalOutstanding / 100)} em aberto`
                        : "Nenhum saldo em aberto"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <ChartLoading />
                    </div>
                ) : error ? (
                    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium">Não foi possível carregar os saldos</p>
                            <p className="text-red-600">{error}</p>
                        </div>
                    </div>
                ) : itemsToDisplay.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 p-8 text-center">
                        <p className="text-sm font-medium text-emerald-700">Nenhum cliente com saldo devedor</p>
                        <p className="text-xs text-emerald-600 mt-1">Ótimo sinal! Todas as fichas estão em dia</p>
                    </div>
                ) : (
                    <div className="max-h-[480px] overflow-y-auto debtors-scroll divide-y divide-slate-100">
                        {itemsToDisplay.map((debtor, index) => (
                            <div
                                key={debtor.customerId}
                                className="flex items-center gap-3 py-3 hover:bg-slate-50 transition-colors px-1"
                            >
                                <span className="w-5 text-center text-xs font-semibold text-slate-400 shrink-0">
                                    {index + 1}
                                </span>
                                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-600 shrink-0">
                                    {debtor.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">{debtor.name}</p>
                                    {debtor.phone && (
                                        <p className="text-xs text-slate-400">{debtor.phone}</p>
                                    )}
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-bold text-red-600">
                                        {formatCurrency(debtor.balanceCents / 100)}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {formatCurrency(debtor.pendingCents / 100)} consumido
                                    </p>
                                </div>
                            </div>
                        ))}
                        {debtors.length > MAX_VISIBLE_DEBTORS && (
                            <p className="text-xs text-slate-400 text-center py-3">
                                +{debtors.length - MAX_VISIBLE_DEBTORS} outros com saldo em aberto
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
