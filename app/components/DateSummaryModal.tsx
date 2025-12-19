"use client";

import {
    Calendar,
    Calculator,
    Package,
    Tag,
    X
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";

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
    calculateDateTotal
}: DateSummaryModalProps) {
    const hasProducts = dateData && dateData.items.length > 0;
    const hasDiscount = dateData && dateData.discountCents > 0;
    const dayTotal = calculateDateTotal(date);
    const subtotal = dateData ? dateData.items.reduce((total, item) => {
        return total + (item.product.priceCents * item.quantity);
    }, 0) : 0;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0 flex flex-col">
                <DialogTitle className="sr-only">Resumo do Dia - {formatDate(date)}</DialogTitle>
                
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 p-6 relative">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
                    <div className="relative flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-orange-600" />
                                Resumo do Dia
                            </h2>
                            <p className="text-gray-600 mt-1 text-sm">
                                {formatDateLong(date)}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-12 w-12 rounded-full bg-white/60 hover:bg-white shadow-md border border-gray-200 text-gray-600 hover:text-gray-800 transition-all hover:scale-105"
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                    {hasProducts ? (
                        <div className="space-y-8">
                            {/* Lista de produtos */}
                            <div className="space-y-4 pb-6 border-b border-gray-200">
                                <div className="flex items-center gap-3 pb-3">
                                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center shadow-sm">
                                        <Package className="h-5 w-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900">
                                            Produtos do Dia
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {dateData?.items.length || 0} {dateData && dateData.items.length === 1 ? 'item adicionado' : 'itens adicionados'}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-4">
                                    {dateData?.items.map((item) => {
                                        const itemTotal = item.product.priceCents * item.quantity;
                                        return (
                                            <motion.div
                                                key={item.productId}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-orange-300"
                                            >
                                                <div className="flex items-start gap-4 p-5">
                                                    {/* Miniatura do produto */}
                                                    <div className="relative h-20 w-20 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-200 group-hover:border-orange-300 transition-all duration-300 shadow-md group-hover:shadow-lg group-hover:scale-105">
                                                        {item.product.imageUrl ? (
                                                            <img
                                                                src={item.product.imageUrl}
                                                                alt={item.product.name}
                                                                className="h-full w-full object-cover"
                                                                loading="lazy"
                                                                onError={(e) => {
                                                                    const target = e.target as HTMLImageElement;
                                                                    target.style.display = "none";
                                                                    const parent = target.parentElement;
                                                                    if (parent) {
                                                                        parent.innerHTML = `
                                                                            <div class="h-full w-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100">
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package text-orange-400">
                                                                                    <path d="M12 22l-8-4V6L12 2l8 4v12l-8 4z"/>
                                                                                    <path d="M12 2v20"/>
                                                                                    <path d="M4 6l8 4 8-4"/>
                                                                                </svg>
                                                                            </div>
                                                                        `;
                                                                    }
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100">
                                                                <Package className="h-8 w-8 text-orange-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Informações do produto */}
                                                    <div className="flex-1 min-w-0 pt-1">
                                                        <h4 className="font-semibold text-gray-900 text-base mb-1.5 line-clamp-2 group-hover:text-orange-700 transition-colors">
                                                            {item.product.name}
                                                        </h4>
                                                        
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs font-medium text-gray-500">Preço unitário:</span>
                                                                <span className="text-sm font-semibold text-gray-700">
                                                                    {formatCurrency(item.product.priceCents)}
                                                                </span>
                                                            </div>
                                                            <span className="text-gray-300">•</span>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs font-medium text-gray-500">Quantidade:</span>
                                                                <span className="text-sm font-semibold text-orange-600">
                                                                    {item.quantity}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Total do item */}
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-500">Subtotal:</span>
                                                            <span className="text-base font-bold text-green-600">
                                                                {formatCurrency(itemTotal)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Barra decorativa inferior */}
                                                <div className="h-1 bg-gradient-to-r from-orange-200 via-orange-300 to-amber-200 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            {/* Resumo financeiro */}
                            <div className="space-y-4 pb-6 border-b border-gray-200">
                                <div className="flex items-center gap-3 pb-3">
                                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center shadow-sm">
                                        <Tag className="h-5 w-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-gray-900">Valores</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">Resumo financeiro do dia</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    {/* Subtotal */}
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                                        <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                                        <span className="text-base font-semibold text-gray-900">
                                            {formatCurrency(subtotal)}
                                        </span>
                                    </div>
                                    
                                    {/* Desconto */}
                                    {hasDiscount && (
                                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-200">
                                            <span className="text-sm font-medium text-red-700">Desconto aplicado:</span>
                                            <span className="text-base font-semibold text-red-900">
                                                -{formatCurrency(dateData?.discountCents || 0)}
                                            </span>
                                        </div>
                                    )}
                                    
                                    {/* Total */}
                                    <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-200">
                                        <span className="text-base font-semibold text-orange-800">Total do Dia:</span>
                                        <div className="text-2xl font-bold text-orange-900">
                                            {formatCurrency(dayTotal)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative overflow-hidden text-center py-12 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 rounded-2xl border-2 border-dashed border-orange-200"
                        >
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2ZjYjY3NSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIgb3BhY2l0eT0iMC4xIi8+PC9zdmc+')] opacity-30"></div>
                            <div className="relative">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 mb-4 shadow-lg">
                                    <Package className="h-10 w-10 text-orange-400" />
                                </div>
                                <h4 className="text-base font-semibold text-gray-700 mb-1">Nenhum produto adicionado</h4>
                                <p className="text-sm text-gray-500">Este dia ainda não possui produtos. Clique em "Editar" para adicionar produtos.</p>
                            </div>
                        </motion.div>
                    )}
                </div>
                
                <div className="border-t border-gray-200 p-6 bg-gray-50/50">
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl border-gray-300 hover:bg-gray-100 text-gray-700 font-medium transition-all"
                        >
                            Fechar
                        </Button>
                        <Button
                            onClick={onEdit}
                            className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-lg hover:shadow-xl transition-all"
                        >
                            Editar
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

