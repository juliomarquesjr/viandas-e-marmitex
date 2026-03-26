"use client";

import {
    Calculator,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    ExternalLink,
    FileText,
    FolderOpen,
    Loader2,
    Minus,
    Package,
    Plus,
    Save,
    Search,
    Tag,
    X,
    Check
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useCustomerBudgets } from "@/app/admin/customers/[id]/hooks/useCustomerBudgets";
import { useToast } from "./Toast";
import { Button } from "./ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { DateSummaryModal } from "./DateSummaryModal";
import { SavedBudgetsPickerDialog, type SavedBudgetLoadData } from "./SavedBudgetsPickerDialog";
import { SaveBudgetDialog } from "./SaveBudgetDialog";

type Product = {
    id: string;
    name: string;
    priceCents: number;
    pricePerKgCents?: number;
    barcode?: string;
    imageUrl?: string;
    active: boolean;
    category?: {
        id: string;
        name: string;
    };
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

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

type BudgetDay = {
    day: DayOfWeek;
    label: string;
    enabled: boolean;
    items: BudgetItem[];
    discountCents: number;
};

type BudgetModalProps = {
    isOpen: boolean;
    onClose: () => void;
    customerId: string;
    customerName: string;
};

export function BudgetModal({
    isOpen,
    onClose,
    customerId,
    customerName,
}: BudgetModalProps) {
    const { showToast } = useToast();
    const { loadBudgets } = useCustomerBudgets(customerId);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [budgetDates, setBudgetDates] = useState<Map<string, BudgetDate>>(new Map());
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showProductList, setShowProductList] = useState(false);
    const [showBulkAddModal, setShowBulkAddModal] = useState(false);
    const [showDateSummary, setShowDateSummary] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedProductsForBulk, setSelectedProductsForBulk] = useState<Set<string>>(new Set());
    const [bulkQuantity, setBulkQuantity] = useState<Record<string, number>>({});
    const [bulkApplyMode, setBulkApplyMode] = useState<'all' | 'empty'>('all');
    const [tempDateData, setTempDateData] = useState<BudgetDate | null>(null);
    const [applyDiscountToAllDays, setApplyDiscountToAllDays] = useState(false);
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSavedBudgetsPicker, setShowSavedBudgetsPicker] = useState(false);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/products?status=active", {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (response.ok) {
                const result = await response.json();
                setProducts(result.data || []);
            }
        } catch (error) {
            console.error("Erro ao buscar produtos:", error);
            showToast("Erro ao carregar produtos", "error");
        } finally {
            setLoading(false);
        }
    };

    const applyLoadedBudget = (budget: SavedBudgetLoadData) => {
        setStartDate(budget.startDate);
        setEndDate(budget.endDate);
        setBudgetDates(new Map<string, BudgetDate>(
            budget.budgetData.map((budgetDate) => [budgetDate.date, budgetDate as BudgetDate])
        ));
        setCurrentMonth(new Date(budget.startDate + 'T00:00:00'));
        setSelectedDate(null);
        setShowDateSummary(false);
        setShowProductList(false);
        setTempDateData(null);
    };

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
            const today = new Date();
            const nextMonth = new Date(today);
            nextMonth.setDate(today.getDate() + 30);
            setStartDate(today.toISOString().split('T')[0]);
            setEndDate(nextMonth.toISOString().split('T')[0]);
            setCurrentMonth(new Date(today));
        } else {
            setBudgetDates(new Map());
            setSelectedDate(null);
            setShowProductList(false);
            setShowDateSummary(false);
            setShowBulkAddModal(false);
            setShowSavedBudgetsPicker(false);
            setSelectedProductsForBulk(new Set());
            setBulkQuantity({});
            setTempDateData(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (showProductList && selectedDate) {
            const originalData = getDateData(selectedDate);
            if (originalData) {
                setTempDateData({
                    ...originalData,
                    items: originalData.items.map(item => ({ ...item, product: { ...item.product } }))
                });
            } else {
                setTempDateData({ date: selectedDate, items: [], discountCents: 0, enabled: true });
            }
        } else {
            setTempDateData(null);
            setApplyDiscountToAllDays(false);
        }
    }, [showProductList, selectedDate]);

    const allDatesInPeriod = useMemo(() => {
        if (!startDate || !endDate) return [];
        const dates: string[] = [];
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');
        const current = new Date(start);
        while (current <= end) {
            dates.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }
        return dates;
    }, [startDate, endDate]);

    useEffect(() => {
        if (allDatesInPeriod.length > 0) {
            setBudgetDates(prev => {
                const newMap = new Map(prev);
                allDatesInPeriod.forEach(date => {
                    if (!newMap.has(date)) {
                        newMap.set(date, { date, items: [], discountCents: 0, enabled: true });
                    }
                });
                Array.from(newMap.keys()).forEach(date => {
                    if (!allDatesInPeriod.includes(date)) newMap.delete(date);
                });
                return newMap;
            });
        }
    }, [allDatesInPeriod]);

    const filteredProducts = products.filter(product => {
        if (!product.active) return false;
        if (product.pricePerKgCents && product.pricePerKgCents > 0) return false;
        if (!product.priceCents || product.priceCents <= 0) return false;
        if (!searchQuery.trim()) return false;
        return product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.barcode?.includes(searchQuery) ||
            product.category?.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const allProductsForBulk = products.filter(product =>
        product.active && product.priceCents && product.priceCents > 0 &&
        (!product.pricePerKgCents || product.pricePerKgCents <= 0)
    ).filter(product => {
        if (!searchQuery.trim()) return true;
        return product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.barcode?.includes(searchQuery) ||
            product.category?.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const addProductToDate = (product: Product, date: string) => {
        if (!product.active) { showToast("Este produto está desabilitado", "error"); return; }
        if (product.pricePerKgCents && product.pricePerKgCents > 0) { showToast("Produtos por peso não podem ser adicionados", "error"); return; }
        if (!product.priceCents || product.priceCents <= 0) { showToast("Produto sem valor unitário válido", "error"); return; }

        setBudgetDates(prev => {
            const newMap = new Map(prev);
            const budgetDate = newMap.get(date) || { date, items: [], discountCents: 0, enabled: true };
            const existingItem = budgetDate.items.find(item => item.productId === product.id);
            if (existingItem) {
                budgetDate.items = budgetDate.items.map(item =>
                    item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                budgetDate.items = [...budgetDate.items, { productId: product.id, product, quantity: 1 }];
            }
            newMap.set(date, budgetDate);
            return newMap;
        });
    };

    const removeProductFromDate = (productId: string, date: string) => {
        setBudgetDates(prev => {
            const newMap = new Map(prev);
            const budgetDate = newMap.get(date);
            if (budgetDate) {
                budgetDate.items = budgetDate.items.filter(item => item.productId !== productId);
                newMap.set(date, budgetDate);
            }
            return newMap;
        });
    };

    const updateProductQuantity = (productId: string, date: string, quantity: number) => {
        if (quantity <= 0) { removeProductFromDate(productId, date); return; }
        setBudgetDates(prev => {
            const newMap = new Map(prev);
            const budgetDate = newMap.get(date);
            if (budgetDate) {
                budgetDate.items = budgetDate.items.map(item =>
                    item.productId === productId ? { ...item, quantity } : item
                );
                newMap.set(date, budgetDate);
            }
            return newMap;
        });
    };

    const updateDateDiscount = (date: string, discountValue: string) => {
        let value = discountValue.replace(/\D/g, '');
        let numValue = parseInt(value || '0');
        setBudgetDates(prev => {
            const newMap = new Map(prev);
            const budgetDate = newMap.get(date);
            if (budgetDate) {
                const daySubtotal = budgetDate.items.reduce((total, item) => total + (item.product.priceCents * item.quantity), 0);
                budgetDate.discountCents = Math.min(numValue, daySubtotal);
                newMap.set(date, budgetDate);
            }
            return newMap;
        });
    };

    const applyBulkProducts = () => {
        if (selectedProductsForBulk.size === 0) { showToast("Selecione pelo menos um produto", "warning"); return; }
        const selectedProducts = products.filter(p =>
            selectedProductsForBulk.has(p.id) && p.active && p.priceCents && p.priceCents > 0 &&
            (!p.pricePerKgCents || p.pricePerKgCents <= 0)
        );
        let appliedCount = 0;
        setBudgetDates(prev => {
            const newMap = new Map(prev);
            allDatesInPeriod.forEach(date => {
                const budgetDate = newMap.get(date);
                if (budgetDate && budgetDate.enabled) {
                    if (bulkApplyMode === 'empty' && budgetDate.items.length > 0) return;
                    selectedProducts.forEach(product => {
                        const quantity = bulkQuantity[product.id] || 1;
                        const existingItem = budgetDate.items.find(item => item.productId === product.id);
                        if (existingItem) {
                            budgetDate.items = budgetDate.items.map(item =>
                                item.productId === product.id
                                    ? { ...item, quantity: bulkApplyMode === 'all' ? quantity : item.quantity }
                                    : item
                            );
                        } else {
                            budgetDate.items = [...budgetDate.items, { productId: product.id, product, quantity }];
                        }
                    });
                    newMap.set(date, budgetDate);
                    appliedCount++;
                }
            });
            return newMap;
        });
        showToast(`${selectedProducts.length} produto(s) aplicado(s) em ${appliedCount} dia(s)`, "success");
        setShowBulkAddModal(false);
        setSelectedProductsForBulk(new Set());
        setBulkQuantity({});
    };

    const applyProductsFromDate = (sourceDate: string, targetDates: string[]) => {
        const sourceDateData = budgetDates.get(sourceDate);
        if (!sourceDateData || sourceDateData.items.length === 0) { showToast("Data de origem não possui produtos", "warning"); return; }
        setBudgetDates(prev => {
            const newMap = new Map(prev);
            targetDates.forEach(targetDate => {
                const targetDateData = newMap.get(targetDate);
                if (targetDateData) { targetDateData.items = [...sourceDateData.items]; newMap.set(targetDate, targetDateData); }
            });
            return newMap;
        });
        showToast(`Produtos aplicados em ${targetDates.length} dia(s)`, "success");
    };

    const applyDiscountFromDate = (sourceDate: string, targetDates: string[]) => {
        const sourceDateData = budgetDates.get(sourceDate);
        if (!sourceDateData || sourceDateData.discountCents === 0) { showToast("Data de origem não possui desconto", "warning"); return; }
        setBudgetDates(prev => {
            const newMap = new Map(prev);
            targetDates.forEach(targetDate => {
                const targetDateData = newMap.get(targetDate);
                if (targetDateData) {
                    const daySubtotal = targetDateData.items.reduce((total, item) => total + (item.product.priceCents * item.quantity), 0);
                    targetDateData.discountCents = Math.min(sourceDateData.discountCents, daySubtotal);
                    newMap.set(targetDate, targetDateData);
                }
            });
            return newMap;
        });
        showToast(`Desconto aplicado em ${targetDates.length} dia(s)`, "success");
    };

    const calculateBudgetTotal = () => {
        let total = 0;
        budgetDates.forEach((budgetDate) => {
            if (budgetDate.enabled) {
                const subtotal = budgetDate.items.reduce((daySum, item) => daySum + (item.product.priceCents * item.quantity), 0);
                total += Math.max(0, subtotal - budgetDate.discountCents);
            }
        });
        return total;
    };

    const defaultBudgetTitle = useMemo(() => {
        if (!startDate) return "";
        const d = new Date(startDate + 'T00:00:00');
        return `Orçamento ${d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
    }, [startDate]);

    const handleSaveBudget = async (title: string) => {
        setIsSaving(true);
        try {
            const budgetDataArray = Array.from(budgetDates.values());
            const res = await fetch(`/api/customers/${customerId}/budgets`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    startDate,
                    endDate,
                    totalCents: calculateBudgetTotal(),
                    budgetData: budgetDataArray,
                }),
            });
            if (!res.ok) throw new Error("Falha ao salvar");
            showToast("Orçamento salvo com sucesso!", "success");
            setIsSaveDialogOpen(false);
            await loadBudgets();
        } catch {
            showToast("Erro ao salvar orçamento", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const calculateDateTotal = (date: string) => {
        const budgetDate = budgetDates.get(date);
        if (!budgetDate) return 0;
        const subtotal = budgetDate.items.reduce((total, item) => total + (item.product.priceCents * item.quantity), 0);
        return Math.max(0, subtotal - budgetDate.discountCents);
    };

    const convertToBudgetDays = (): BudgetDay[] => {
        const dayMap: Record<DayOfWeek, BudgetDay> = {
            'monday': { day: 'monday', label: 'Segunda-feira', enabled: false, items: [], discountCents: 0 },
            'tuesday': { day: 'tuesday', label: 'Terça-feira', enabled: false, items: [], discountCents: 0 },
            'wednesday': { day: 'wednesday', label: 'Quarta-feira', enabled: false, items: [], discountCents: 0 },
            'thursday': { day: 'thursday', label: 'Quinta-feira', enabled: false, items: [], discountCents: 0 },
            'friday': { day: 'friday', label: 'Sexta-feira', enabled: false, items: [], discountCents: 0 },
            'saturday': { day: 'saturday', label: 'Sábado', enabled: false, items: [], discountCents: 0 },
            'sunday': { day: 'sunday', label: 'Domingo', enabled: false, items: [], discountCents: 0 },
        };
        const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const sortedDates = Array.from(budgetDates.entries())
            .filter(([_, budgetDate]) => budgetDate.enabled && budgetDate.items.length > 0)
            .sort(([a], [b]) => a.localeCompare(b));
        sortedDates.forEach(([dateStr, budgetDate]) => {
            const date = new Date(dateStr + 'T00:00:00');
            const dayOfWeek = dayNames[date.getDay()];
            const dayData = dayMap[dayOfWeek];
            if (!dayData.enabled) {
                dayData.enabled = true;
                dayData.items = budgetDate.items.map(item => ({ ...item }));
                dayData.discountCents = budgetDate.discountCents;
            }
        });
        return Object.values(dayMap);
    };

    const generateFullBudget = () => {
        if (!startDate || !endDate) { showToast("Por favor, preencha as datas de início e fim", "warning"); return; }
        const enabledDates = Array.from(budgetDates.values()).filter(d => d.enabled && d.items.length > 0);
        if (enabledDates.length === 0) { showToast("Adicione produtos em pelo menos um dia", "warning"); return; }
        const budgetDays = convertToBudgetDays();
        const enabledDays = budgetDays.filter(day => day.enabled);
        const budgetData = { customerId, customerName, startDate, endDate, days: enabledDays, sameProductsAllDays: false, totalCents: calculateBudgetTotal() };
        const params = new URLSearchParams({ data: JSON.stringify(budgetData) });
        window.open(`/print/budget-full?${params.toString()}`, '_blank');
    };

    const formatCurrency = (cents: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

    const formatDate = (dateString: string) =>
        new Date(dateString + 'T00:00:00').toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

    const formatDateLong = (dateString: string) =>
        new Date(dateString + 'T00:00:00').toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        return { daysInMonth: lastDay.getDate(), startingDayOfWeek: firstDay.getDay(), year, month };
    };

    const getCalendarDays = () => {
        const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
        const days: (string | null)[] = [];
        for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        }
        return days;
    };

    const isDateInPeriod = (date: string) => allDatesInPeriod.includes(date);
    const getDateData = (date: string) => budgetDates.get(date);

    const enabledDatesCount = Array.from(budgetDates.values()).filter(d => d.enabled && d.items.length > 0).length;

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    return (
        <>
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                            style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
                        >
                            <Calculator className="h-5 w-5 text-primary" />
                        </div>
                        Gerar Orçamento
                    </DialogTitle>
                    <DialogDescription>
                        Configure produtos por dia para <strong>{customerName}</strong>
                    </DialogDescription>
                </DialogHeader>

                {/* Conteúdo scrollável */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Período */}
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                            Período do Orçamento
                        </span>
                        <div className="flex-1 h-px bg-slate-100" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Data de Início</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    if (e.target.value && endDate && new Date(e.target.value) <= new Date(endDate)) {
                                        setCurrentMonth(new Date(e.target.value + 'T00:00:00'));
                                    }
                                }}
                                max={endDate || undefined}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Data de Fim</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    if (e.target.value && startDate && new Date(e.target.value) >= new Date(startDate)) {
                                        setCurrentMonth(new Date(e.target.value + 'T00:00:00'));
                                    }
                                }}
                                min={startDate || undefined}
                            />
                        </div>
                    </div>

                    {/* Estatísticas */}
                    {startDate && endDate && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { label: "Total de Dias", value: allDatesInPeriod.length.toString(), icon: Calendar },
                                { label: "Dias com Produtos", value: enabledDatesCount.toString(), icon: Package },
                                { label: "Valor Total", value: formatCurrency(calculateBudgetTotal()), icon: Calculator },
                                {
                                    label: "Média por Dia",
                                    value: enabledDatesCount > 0 ? formatCurrency(Math.round(calculateBudgetTotal() / enabledDatesCount)) : formatCurrency(0),
                                    icon: Clock
                                },
                            ].map(({ label, value, icon: Icon }) => (
                                <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
                                        <p className="text-lg font-bold text-slate-800 leading-tight">{value}</p>
                                    </div>
                                    <Icon className="h-7 w-7 text-slate-300" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Calendário */}
                    {startDate && endDate && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            {/* Cabeçalho do card de calendário */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        Calendário do Período
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {formatDate(startDate)} até {formatDate(endDate)} · {allDatesInPeriod.length} dias
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => { const prev = new Date(currentMonth); prev.setMonth(prev.getMonth() - 1); setCurrentMonth(prev); }}
                                        className="h-8 w-8 p-0"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="min-w-[160px] text-center text-sm font-bold text-slate-800">
                                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => { const next = new Date(currentMonth); next.setMonth(next.getMonth() + 1); setCurrentMonth(next); }}
                                        className="h-8 w-8 p-0"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                    {startDate && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentMonth(new Date(startDate + 'T00:00:00'))}
                                            className="h-8 px-3 text-xs"
                                        >
                                            Ir ao período
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 space-y-3">
                                {/* Adição rápida */}
                                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-700">Adição Rápida</p>
                                        <p className="text-xs text-slate-400">Adicione produtos em todos os dias de uma vez</p>
                                    </div>
                                    <Button onClick={() => setShowBulkAddModal(true)} size="sm">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Todos os Dias
                                    </Button>
                                </div>

                                {/* Legenda */}
                                <div className="flex flex-wrap items-center gap-4 text-xs px-1">
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-3.5 w-3.5 rounded border-2 border-dashed border-slate-300 bg-white" />
                                        <span className="text-slate-500">Sem produtos</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-3.5 w-3.5 rounded bg-primary/15 border border-primary/30" />
                                        <span className="text-slate-500">Com produtos</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-3.5 w-3.5 rounded ring-2 ring-primary ring-offset-1 bg-primary/5" />
                                        <span className="text-slate-500">Hoje</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-3.5 w-3.5 rounded bg-slate-100 border border-slate-200 opacity-50" />
                                        <span className="text-slate-400">Fora do período</span>
                                    </div>
                                </div>

                                {/* Grid do calendário */}
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    {/* Header dos dias da semana */}
                                    <div className="grid grid-cols-7 bg-slate-800">
                                        {weekDays.map((day, idx) => (
                                            <div
                                                key={day}
                                                className={`p-2.5 text-center text-xs font-semibold text-slate-300 border-r border-slate-700 last:border-r-0 ${idx === 0 || idx === 6 ? 'text-slate-400' : ''}`}
                                            >
                                                {day}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Dias */}
                                    <div className="grid grid-cols-7 bg-white" style={{ gridAutoRows: 'minmax(110px, auto)' }}>
                                        {getCalendarDays().map((date, index) => {
                                            if (date === null) {
                                                return <div key={`empty-${index}`} className="border-r border-b border-slate-100 last:border-r-0 bg-slate-50/50" />;
                                            }

                                            const isInPeriod = isDateInPeriod(date);
                                            const dateData = getDateData(date);
                                            const hasProducts = dateData && dateData.items.length > 0;
                                            const hasDiscount = dateData && dateData.discountCents > 0;
                                            const isToday = date === new Date().toISOString().split('T')[0];
                                            const dayTotal = calculateDateTotal(date);

                                            return (
                                                <button
                                                    key={date}
                                                    onClick={() => {
                                                        if (isInPeriod) {
                                                            setSelectedDate(date);
                                                            setShowDateSummary(true);
                                                        }
                                                    }}
                                                    disabled={!isInPeriod}
                                                    className={`
                                                        min-h-[110px] border-r border-b border-slate-100 last:border-r-0 p-2
                                                        transition-all duration-200 relative group text-left
                                                        ${isInPeriod
                                                            ? 'hover:shadow-md hover:z-10 cursor-pointer'
                                                            : 'bg-slate-50/60 cursor-not-allowed opacity-40'
                                                        }
                                                        ${hasProducts ? 'bg-primary/8 hover:bg-primary/12' : 'hover:bg-slate-50'}
                                                        ${isToday ? 'ring-2 ring-primary ring-inset' : ''}
                                                    `}
                                                >
                                                    <div className="flex flex-col h-full">
                                                        {/* Número do dia */}
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className={`text-sm font-bold ${isToday ? 'text-primary' : isInPeriod ? 'text-slate-700' : 'text-slate-400'}`}>
                                                                {new Date(date + 'T00:00:00').getDate()}
                                                            </span>
                                                            {isToday && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                                                        </div>

                                                        {/* Conteúdo */}
                                                        {hasProducts ? (
                                                            <div className="space-y-1 flex-1 flex flex-col">
                                                                {/* Produtos */}
                                                                <div className="space-y-0.5 flex-1 min-h-0 overflow-y-auto max-h-[65px]">
                                                                    {dateData?.items.map((item, idx) => (
                                                                        <div key={idx} className="flex items-center justify-between gap-1 bg-white/90 rounded px-1.5 py-0.5 border border-primary/15">
                                                                            <span className="text-[9px] font-medium text-slate-700 truncate flex-1">{item.product.name}</span>
                                                                            <span className="text-[9px] font-bold text-primary flex-shrink-0 bg-primary/10 px-1 rounded">
                                                                                {item.quantity}×
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Desconto */}
                                                                {hasDiscount && (
                                                                    <div className="flex items-center gap-1 bg-amber-50 rounded px-1.5 py-0.5 border border-amber-200">
                                                                        <Tag className="h-2.5 w-2.5 text-amber-600 flex-shrink-0" />
                                                                        <span className="text-[9px] font-semibold text-amber-700 truncate">
                                                                            -{formatCurrency(dateData?.discountCents || 0)}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {/* Total */}
                                                                <div className="bg-slate-800 rounded px-1.5 py-0.5">
                                                                    <span className="text-[10px] font-bold text-white leading-tight truncate block text-center">
                                                                        {formatCurrency(dayTotal)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : isInPeriod ? (
                                                            <div className="mt-auto flex items-center justify-center">
                                                                <div className="h-6 w-6 rounded-full border-2 border-dashed border-slate-200 group-hover:border-primary/50 group-hover:bg-primary/5 transition-colors flex items-center justify-center">
                                                                    <Plus className="h-3 w-3 text-slate-300 group-hover:text-primary/60 transition-colors" />
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Rodapé */}
                <DialogFooter>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        Abre em nova aba
                    </p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button
                            variant="outline"
                            onClick={() => setShowSavedBudgetsPicker(true)}
                        >
                            <FolderOpen className="h-4 w-4 mr-2" />
                            Orçamentos Salvos
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setIsSaveDialogOpen(true)}
                            disabled={!startDate || !endDate || enabledDatesCount === 0}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Salvar Orçamento
                        </Button>
                        <Button
                            onClick={generateFullBudget}
                            disabled={!startDate || !endDate || enabledDatesCount === 0}
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            Impressão Completa
                        </Button>
                    </div>
                </DialogFooter>

                {/* ── Modal: Adição em massa ── */}
                {showBulkAddModal && (
                    <Dialog open={showBulkAddModal} onOpenChange={(open) => {
                        if (!open) { setSelectedProductsForBulk(new Set()); setBulkQuantity({}); }
                        setShowBulkAddModal(open);
                    }}>
                        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden p-0 flex flex-col">
                            <DialogHeader>
                                <DialogTitle>
                                    <div
                                        className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                                        style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
                                    >
                                        <Package className="h-5 w-5 text-primary" />
                                    </div>
                                    Adicionar em Todos os Dias
                                </DialogTitle>
                                <DialogDescription>
                                    Selecione os produtos que serão adicionados em todos os dias do período
                                </DialogDescription>
                            </DialogHeader>

                            {/* Busca dentro do header */}
                            <div className="px-6 pb-4 border-b border-slate-100" style={{ background: "var(--modal-header-bg)" }}>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Buscar produtos por nome, código ou categoria..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 h-10"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {/* Modo de aplicação */}
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Modo de Aplicação</p>
                                    <div className="flex flex-col gap-2">
                                        {[
                                            { value: 'all', label: 'Aplicar em todos os dias', sub: `Sobrescrever se já existir — ${allDatesInPeriod.length} dia(s)` },
                                            { value: 'empty', label: 'Aplicar apenas em dias vazios', sub: 'Não altera dias que já possuem produtos' },
                                        ].map(({ value, label, sub }) => (
                                            <label key={value} className="flex items-start gap-3 cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    name="bulkApplyMode"
                                                    value={value}
                                                    checked={bulkApplyMode === value}
                                                    onChange={(e) => setBulkApplyMode(e.target.value as 'all' | 'empty')}
                                                    className="mt-0.5 accent-primary"
                                                />
                                                <div>
                                                    <span className="text-sm text-slate-700 font-medium">{label}</span>
                                                    <p className="text-xs text-slate-400">{sub}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="flex items-center justify-center py-12 gap-3 text-slate-400">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span className="text-sm">Carregando produtos...</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {allProductsForBulk.map((product) => {
                                            const isSelected = selectedProductsForBulk.has(product.id);
                                            const qty = bulkQuantity[product.id] || 1;
                                            return (
                                                <div
                                                    key={product.id}
                                                    onClick={() => {
                                                        const newSet = new Set(selectedProductsForBulk);
                                                        if (isSelected) {
                                                            newSet.delete(product.id);
                                                            const newQty = { ...bulkQuantity };
                                                            delete newQty[product.id];
                                                            setBulkQuantity(newQty);
                                                        } else {
                                                            newSet.add(product.id);
                                                            setBulkQuantity({ ...bulkQuantity, [product.id]: 1 });
                                                        }
                                                        setSelectedProductsForBulk(newSet);
                                                    }}
                                                    className={`flex items-center gap-3 rounded-xl border-2 p-3 bg-white transition-all duration-150 cursor-pointer select-none ${
                                                        isSelected
                                                            ? 'border-primary bg-primary/5 shadow-sm'
                                                            : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {/* Checkbox */}
                                                    <div className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                                        isSelected ? 'bg-primary border-primary' : 'border-slate-300 bg-white'
                                                    }`}>
                                                        {isSelected && <Check className="h-3 w-3 text-white" />}
                                                    </div>

                                                    {/* Imagem */}
                                                    <div className="h-14 w-14 flex-shrink-0 bg-slate-100 flex items-center justify-center overflow-hidden rounded-lg border border-slate-200">
                                                        {product.imageUrl ? (
                                                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy"
                                                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                                        ) : (
                                                            <Package className="h-6 w-6 text-slate-300" />
                                                        )}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm text-slate-800 truncate">{product.name}</p>
                                                        <p className="text-xs font-semibold text-emerald-600 mt-0.5">
                                                            {formatCurrency(product.priceCents)}
                                                        </p>
                                                        {isSelected && (
                                                            <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                <Label className="text-xs text-slate-500">Qtd:</Label>
                                                                <Input
                                                                    type="number"
                                                                    min="1"
                                                                    value={qty}
                                                                    onChange={(e) => setBulkQuantity({ ...bulkQuantity, [product.id]: parseInt(e.target.value) || 1 })}
                                                                    className="w-16 h-6 text-xs"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                <p className="text-xs text-slate-400">
                                    {selectedProductsForBulk.size} produto(s) selecionado(s)
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => { setShowBulkAddModal(false); setSelectedProductsForBulk(new Set()); setBulkQuantity({}); }}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button onClick={applyBulkProducts} disabled={selectedProductsForBulk.size === 0}>
                                        Aplicar em Todos os Dias
                                    </Button>
                                </div>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}

                {/* ── Modal: Resumo do dia ── */}
                {showDateSummary && selectedDate && (
                    <DateSummaryModal
                        isOpen={showDateSummary}
                        onClose={() => setShowDateSummary(false)}
                        onEdit={() => { setShowDateSummary(false); setShowProductList(true); }}
                        date={selectedDate}
                        dateData={getDateData(selectedDate)}
                        formatDate={formatDate}
                        formatDateLong={formatDateLong}
                        formatCurrency={formatCurrency}
                        calculateDateTotal={calculateDateTotal}
                    />
                )}

                {/* ── Modal: Edição do dia ── */}
                {showProductList && selectedDate && (
                    <Dialog open={showProductList} onOpenChange={(open) => {
                        if (!open) { setTempDateData(null); setSearchQuery(""); setApplyDiscountToAllDays(false); }
                        setShowProductList(open);
                    }}>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 flex flex-col border-t-[3px] border-t-primary">
                            <DialogHeader>
                                <DialogTitle>
                                    <div
                                        className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                                        style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
                                    >
                                        <Calendar className="h-5 w-5 text-primary" />
                                    </div>
                                    Editar Dia
                                </DialogTitle>
                                <DialogDescription>
                                    {formatDateLong(selectedDate)}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="flex flex-1 overflow-hidden min-h-0">
                                {/* ── Catálogo de produtos (esquerda) ── */}
                                <div className="flex flex-col flex-1 border-r border-slate-100 overflow-hidden min-w-0">
                                    {/* Barra de busca */}
                                    <div className="px-4 py-3 border-b border-slate-100">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input
                                                placeholder="Buscar produto por nome, código ou categoria..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-9 h-9"
                                            />
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery("")}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Lista de produtos */}
                                    <div className="flex-1 overflow-y-auto">
                                        {loading ? (
                                            <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                <span className="text-sm">Carregando produtos...</span>
                                            </div>
                                        ) : allProductsForBulk.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                                                <Package className="h-8 w-8 opacity-40" />
                                                <p className="text-sm">Nenhum produto encontrado</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-50">
                                                {allProductsForBulk.map((product) => {
                                                    const currentItem = tempDateData?.items.find(i => i.productId === product.id);
                                                    const qty = currentItem?.quantity ?? 0;
                                                    const isSelected = qty > 0;
                                                    return (
                                                        <div
                                                            key={product.id}
                                                            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                                                                isSelected
                                                                    ? 'bg-primary/5 border-l-2 border-l-primary'
                                                                    : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                                                            }`}
                                                        >
                                                            {/* Thumbnail */}
                                                            <div className="h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                                                                {product.imageUrl ? (
                                                                    <img
                                                                        src={product.imageUrl}
                                                                        alt={product.name}
                                                                        className="h-full w-full object-cover"
                                                                        loading="lazy"
                                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                                                    />
                                                                ) : (
                                                                    <Package className="h-4 w-4 text-slate-300" />
                                                                )}
                                                            </div>

                                                            {/* Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-slate-800'}`}>
                                                                    {product.name}
                                                                </p>
                                                                <p className="text-xs text-slate-500 mt-0.5">
                                                                    {formatCurrency(product.priceCents)}
                                                                    {product.category && (
                                                                        <span className="ml-2 text-slate-400">{product.category.name}</span>
                                                                    )}
                                                                </p>
                                                            </div>

                                                            {/* Stepper */}
                                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                                {isSelected ? (
                                                                    <>
                                                                        <button
                                                                            onClick={() => {
                                                                                if (!tempDateData) return;
                                                                                const newQty = qty - 1;
                                                                                if (newQty <= 0) {
                                                                                    setTempDateData({ ...tempDateData, items: tempDateData.items.filter(i => i.productId !== product.id) });
                                                                                } else {
                                                                                    setTempDateData({ ...tempDateData, items: tempDateData.items.map(i => i.productId === product.id ? { ...i, quantity: newQty } : i) });
                                                                                }
                                                                            }}
                                                                            className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                                                                        >
                                                                            <Minus className="h-3 w-3" />
                                                                        </button>
                                                                        <span className="w-8 text-center text-sm font-bold text-primary tabular-nums">
                                                                            {qty}
                                                                        </span>
                                                                        <button
                                                                            onClick={() => {
                                                                                if (!tempDateData) return;
                                                                                setTempDateData({ ...tempDateData, items: tempDateData.items.map(i => i.productId === product.id ? { ...i, quantity: Math.min(i.quantity + 1, 99) } : i) });
                                                                            }}
                                                                            className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                                                                        >
                                                                            <Plus className="h-3 w-3" />
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => {
                                                                            const current = tempDateData || { date: selectedDate, items: [], discountCents: 0, enabled: true };
                                                                            setTempDateData({ ...current, items: [...current.items, { productId: product.id, product, quantity: 1 }] });
                                                                        }}
                                                                        className="h-7 w-7 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                                                                    >
                                                                        <Plus className="h-3 w-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
                                        <p className="text-xs text-slate-400">
                                            {allProductsForBulk.length} produto{allProductsForBulk.length !== 1 ? "s" : ""} disponível{allProductsForBulk.length !== 1 ? "s" : ""}
                                            {searchQuery && ` · filtrando por "${searchQuery}"`}
                                        </p>
                                    </div>
                                </div>

                                {/* ── Painel direito: itens do dia ── */}
                                <div className="w-72 flex flex-col bg-slate-50/40 overflow-hidden flex-shrink-0">
                                    {/* Header do painel */}
                                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                            No Dia
                                        </span>
                                        {tempDateData && tempDateData.items.length > 0 && (
                                            <span
                                                className="text-xs font-bold px-2 py-0.5 rounded-full"
                                                style={{
                                                    background: "var(--modal-header-icon-bg)",
                                                    color: "var(--modal-header-text)",
                                                }}
                                            >
                                                {tempDateData.items.length}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex-1 overflow-y-auto">
                                        {!tempDateData || tempDateData.items.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center text-slate-400 gap-2">
                                                <Package className="h-7 w-7 opacity-30" />
                                                <p className="text-xs leading-snug">
                                                    Clique em <Plus className="inline h-3 w-3" /> ao lado de um produto para adicioná-lo
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {tempDateData.items.map((item) => {
                                                    const itemTotal = item.product.priceCents * item.quantity;
                                                    return (
                                                        <div key={item.productId} className="px-4 py-3 flex items-start gap-2">
                                                            <div className="h-8 w-8 flex-shrink-0 rounded-md overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center mt-0.5">
                                                                {item.product.imageUrl ? (
                                                                    <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" loading="lazy"
                                                                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                                                ) : (
                                                                    <Package className="h-3.5 w-3.5 text-slate-300" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-medium text-slate-800 leading-snug truncate">{item.product.name}</p>
                                                                <p className="text-xs text-slate-400 mt-0.5">
                                                                    {item.quantity}× &middot; <span className="font-semibold text-emerald-600 tabular-nums">{formatCurrency(itemTotal)}</span>
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() => setTempDateData({ ...tempDateData, items: tempDateData.items.filter(i => i.productId !== item.productId) })}
                                                                className="flex-shrink-0 text-slate-300 hover:text-red-500 transition-colors mt-0.5"
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Desconto + Total + Replicar */}
                                    {tempDateData && tempDateData.items.length > 0 && (
                                        <div className="border-t border-slate-200 px-4 py-3 space-y-3">
                                            {/* Desconto */}
                                            <div className="space-y-1.5">
                                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Desconto</span>
                                                <div className="relative">
                                                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                                    <Input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={(() => {
                                                            if (!tempDateData.discountCents) return '';
                                                            return (tempDateData.discountCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                        })()}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/\D/g, '');
                                                            const numValue = parseInt(value || '0');
                                                            const daySubtotal = tempDateData.items.reduce((total, item) => total + (item.product.priceCents * item.quantity), 0);
                                                            setTempDateData({ ...tempDateData, discountCents: Math.min(numValue, daySubtotal) });
                                                        }}
                                                        placeholder="0,00"
                                                        className="pl-8 h-8 text-sm"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    <button
                                                        onClick={() => showToast("Desconto aplicado neste dia", "success")}
                                                        disabled={!tempDateData.discountCents}
                                                        className="text-[10px] font-medium px-2 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-primary hover:text-primary hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        Este dia
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (tempDateData.discountCents > 0) {
                                                                setApplyDiscountToAllDays(true);
                                                                showToast("Desconto será aplicado em todos os dias ao salvar", "info");
                                                            }
                                                        }}
                                                        disabled={!tempDateData.discountCents}
                                                        className={`text-[10px] font-medium px-2 py-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${applyDiscountToAllDays ? 'border-primary text-primary bg-primary/5' : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary hover:bg-primary/5'}`}
                                                    >
                                                        Todos os dias
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Total */}
                                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                                <span className="text-xs font-semibold text-slate-600">Total do dia</span>
                                                <span className="text-base font-bold text-emerald-600 tabular-nums">
                                                    {(() => {
                                                        const subtotal = tempDateData.items.reduce((sum, item) => sum + (item.product.priceCents * item.quantity), 0);
                                                        return formatCurrency(Math.max(0, subtotal - tempDateData.discountCents));
                                                    })()}
                                                </span>
                                            </div>

                                            {/* Replicar */}
                                            <button
                                                onClick={() => applyProductsFromDate(selectedDate, allDatesInPeriod.filter(d => d !== selectedDate))}
                                                className="w-full text-[10px] font-medium text-slate-500 hover:text-primary transition-colors flex items-center justify-center gap-1.5 py-1"
                                            >
                                                <Package className="h-3 w-3" />
                                                Replicar em todos os outros dias
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <DialogFooter>
                                <p className="text-xs text-slate-400">
                                    {tempDateData?.items.length ?? 0} produto{(tempDateData?.items.length ?? 0) !== 1 ? "s" : ""} no dia
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => { setTempDateData(null); setApplyDiscountToAllDays(false); setShowProductList(false); setSearchQuery(""); }}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            if (tempDateData && selectedDate) {
                                                setBudgetDates(prev => {
                                                    const newMap = new Map(prev);
                                                    newMap.set(selectedDate, { ...tempDateData });
                                                    if (applyDiscountToAllDays && tempDateData.discountCents > 0) {
                                                        allDatesInPeriod.filter(d => d !== selectedDate).forEach(targetDate => {
                                                            const targetDateData = newMap.get(targetDate);
                                                            if (targetDateData) {
                                                                const daySubtotal = targetDateData.items.reduce((total, item) => total + (item.product.priceCents * item.quantity), 0);
                                                                targetDateData.discountCents = Math.min(tempDateData.discountCents, daySubtotal);
                                                                newMap.set(targetDate, targetDateData);
                                                            }
                                                        });
                                                        showToast(`Alterações salvas! Desconto aplicado em ${allDatesInPeriod.length - 1} dia(s)`, "success");
                                                    } else {
                                                        showToast("Alterações salvas com sucesso!", "success");
                                                    }
                                                    return newMap;
                                                });
                                            }
                                            setShowProductList(false);
                                            setSearchQuery("");
                                            setTempDateData(null);
                                            setApplyDiscountToAllDays(false);
                                        }}
                                    >
                                        Salvar Alterações
                                    </Button>
                                </div>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </DialogContent>
        </Dialog>

        <SavedBudgetsPickerDialog
            customerId={customerId}
            open={showSavedBudgetsPicker}
            onOpenChange={setShowSavedBudgetsPicker}
            onLoaded={applyLoadedBudget}
        />

        <SaveBudgetDialog
            open={isSaveDialogOpen}
            onOpenChange={setIsSaveDialogOpen}
            defaultTitle={defaultBudgetTitle}
            onConfirm={handleSaveBudget}
            isSaving={isSaving}
        />
        </>
    );
}
