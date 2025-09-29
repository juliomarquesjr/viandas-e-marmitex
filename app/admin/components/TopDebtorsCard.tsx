"use client";

import { useMemo } from "react";
import { AlertCircle, Phone } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { ChartLoading } from "../../components/ChartLoading";
import type { CustomerDebtor } from "../types";

type TopDebtorsCardProps = {
    loading: boolean;
    error: string | null;
    debtors: CustomerDebtor[];
    formatCurrency: (value: number) => string;
};

const MAX_VISIBLE_DEBTORS = 8;

export function TopDebtorsCard({ loading, error, debtors, formatCurrency }: TopDebtorsCardProps) {
    const itemsToDisplay = useMemo(() => debtors.slice(0, MAX_VISIBLE_DEBTORS), [debtors]);
    const totalOutstanding = useMemo(() => {
        return debtors.reduce((sum, debtor) => sum + debtor.balanceCents, 0);
    }, [debtors]);

    return (
        <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-col gap-1">
                <CardTitle className="text-xl text-slate-900">Clientes com saldo devedor</CardTitle>
                <p className="text-sm text-slate-600">
                    {debtors.length > 0
                        ? `${debtors.length} cliente${debtors.length === 1 ? "" : "s"} com saldo em aberto`
                        : "Acompanhe os clientes com vendas em aberto (ficha)."}
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? (
                    <div className="h-36 w-full">
                        <ChartLoading />
                    </div>
                ) : error ? (
                    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <div>
                            <p className="font-medium">Nao foi possivel carregar os saldos.</p>
                            <p>{error}</p>
                        </div>
                    </div>
                ) : itemsToDisplay.length === 0 ? (
                    <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-center">
                        <p className="text-sm font-medium text-slate-600">Nenhum cliente com saldo devedor.</p>
                        <p className="text-xs text-slate-500">Otimo sinal! Todas as fichas estao em dia.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-lg bg-slate-900/5 px-4 py-3 text-sm">
                            <span className="font-medium text-slate-700">Total em aberto</span>
                            <span className="font-semibold text-slate-900">
                                {formatCurrency(totalOutstanding / 100)}
                            </span>
                        </div>
                        <ul className="space-y-2">
                            {itemsToDisplay.map((debtor, index) => (
                                <li
                                    key={debtor.customerId}
                                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    <div className="flex items-center gap-4">
                                        <Badge
                                            variant="default"
                                            className="h-8 w-8 justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600"
                                        >
                                            {index + 1}
                                        </Badge>
                                        <div>
                                            <p className="font-semibold text-slate-900">{debtor.name}</p>
                                            {debtor.phone && (
                                                <p className="flex items-center gap-1 text-xs text-slate-500">
                                                    <Phone className="h-3.5 w-3.5" />
                                                    {debtor.phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right text-sm">
                                        <p className="text-slate-500">Saldo devedor</p>
                                        <p className="text-lg font-semibold text-red-600">
                                            {formatCurrency(debtor.balanceCents / 100)}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Consumido: {formatCurrency(debtor.pendingCents / 100)}
                                        </p>
                                        {debtor.paymentsCents > 0 && (
                                            <p className="text-xs text-slate-500">
                                                Pago: {formatCurrency(debtor.paymentsCents / 100)}
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                        {debtors.length > MAX_VISIBLE_DEBTORS && (
                            <p className="text-xs text-slate-500">
                                + {debtors.length - MAX_VISIBLE_DEBTORS} outro{debtors.length - MAX_VISIBLE_DEBTORS === 1 ? "" : "s"} com saldo em aberto.
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
