"use client";

import { Calendar, Package } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";

type Product = {
    id: string;
    name: string;
    priceCents: number;
    pricePerKgCents?: number;
    imageUrl?: string;
};

type BudgetItem = {
    productId: string;
    product: Product;
    quantity: number;
};

type BudgetDate = {
    date: string;
    items: BudgetItem[];
    discountCents: number;
    enabled: boolean;
};

type DateSummaryModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onEdit: () => void;
    date: string;
    dateData: BudgetDate | undefined;
    formatDate: (dateString: string) => string;
    formatDateLong: (dateString: string) => string;
    formatCurrency: (cents: number) => string;
    calculateDateTotal: (date: string) => number;
};

export function DateSummaryModal({
    isOpen,
    onClose,
    onEdit,
    date,
    dateData,
    formatDate,
    formatDateLong,
    formatCurrency,
    calculateDateTotal,
}: DateSummaryModalProps) {
    const hasProducts = dateData && dateData.items.length > 0;
    const hasDiscount = dateData && dateData.discountCents > 0;
    const dayTotal = calculateDateTotal(date);
    const subtotal = dateData
        ? dateData.items.reduce(
              (total, item) => total + item.product.priceCents * item.quantity,
              0
          )
        : 0;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden p-0 flex flex-col border-t-[3px] border-t-primary">
                {/* Header */}
                <DialogHeader>
                    <DialogTitle>
                        <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                            style={{
                                background: "var(--modal-header-icon-bg)",
                                outline: "1px solid var(--modal-header-icon-ring)",
                            }}
                        >
                            <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        Resumo do Dia
                    </DialogTitle>
                    <DialogDescription>{formatDateLong(date)}</DialogDescription>

                    {hasProducts && (
                        <div className="mt-4 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-emerald-600 tabular-nums">
                                {formatCurrency(dayTotal)}
                            </span>
                            <span
                                className="text-sm"
                                style={{ color: "var(--modal-header-description)" }}
                            >
                                total do dia
                            </span>
                        </div>
                    )}
                </DialogHeader>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {hasProducts ? (
                        <>
                            {/* Lista de produtos */}
                            <div className="px-6 pt-5 pb-1">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                                    Produtos &mdash;{" "}
                                    {dateData?.items.length}{" "}
                                    {dateData?.items.length === 1 ? "item" : "itens"}
                                </span>
                            </div>

                            <div className="px-6 divide-y divide-slate-100">
                                {dateData?.items.map((item, index) => {
                                    const itemTotal =
                                        item.product.priceCents * item.quantity;
                                    return (
                                        <motion.div
                                            key={item.productId}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="flex items-center gap-4 py-3"
                                        >
                                            {/* Thumbnail */}
                                            <div className="h-12 w-12 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                                                {item.product.imageUrl ? (
                                                    <img
                                                        src={item.product.imageUrl}
                                                        alt={item.product.name}
                                                        className="h-full w-full object-cover"
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            const target =
                                                                e.target as HTMLImageElement;
                                                            target.style.display = "none";
                                                            const parent =
                                                                target.parentElement;
                                                            if (parent) {
                                                                parent.innerHTML = `<div class="h-full w-full flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22l-8-4V6L12 2l8 4v12l-8 4z"/><path d="M12 2v20"/><path d="M4 6l8 4 8-4"/></svg></div>`;
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center">
                                                        <Package className="h-5 w-5 text-slate-400" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Informações */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-800 truncate">
                                                    {item.product.name}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {formatCurrency(item.product.priceCents)} ×{" "}
                                                    {item.quantity}
                                                </p>
                                            </div>

                                            {/* Subtotal do item */}
                                            <span className="text-sm font-bold text-slate-900 tabular-nums flex-shrink-0">
                                                {formatCurrency(itemTotal)}
                                            </span>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Resumo financeiro */}
                            <div className="px-6 pt-5 pb-1 mt-1 border-t border-slate-100">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                                    Resumo financeiro
                                </span>
                            </div>

                            <div className="px-6 pb-5 divide-y divide-slate-100">
                                <div className="flex items-center justify-between py-3">
                                    <span className="text-sm text-slate-500">Subtotal</span>
                                    <span className="text-sm font-semibold text-slate-700 tabular-nums">
                                        {formatCurrency(subtotal)}
                                    </span>
                                </div>

                                {hasDiscount && (
                                    <div className="flex items-center justify-between py-3">
                                        <span className="text-sm text-slate-500">Desconto</span>
                                        <span className="inline-flex items-center text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-full px-2.5 py-1 tabular-nums">
                                            &minus;{formatCurrency(dateData?.discountCents || 0)}
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between py-3">
                                    <span className="text-sm font-semibold text-slate-700">
                                        Total
                                    </span>
                                    <span className="text-base font-bold text-emerald-600 tabular-nums">
                                        {formatCurrency(dayTotal)}
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                            <div
                                className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
                                style={{
                                    background: "var(--modal-header-icon-bg)",
                                    outline: "1px solid var(--modal-header-icon-ring)",
                                }}
                            >
                                <Package className="h-8 w-8 text-primary" />
                            </div>
                            <p className="text-sm font-semibold text-slate-700 mb-1">
                                Nenhum produto adicionado
                            </p>
                            <p className="text-xs text-slate-400">
                                Clique em &ldquo;Editar&rdquo; para adicionar produtos a este dia.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <DialogFooter>
                    <div />
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Fechar
                        </Button>
                        <Button onClick={onEdit}>Editar</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
