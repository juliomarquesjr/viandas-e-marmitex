"use client";

import {
    Calculator,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    FileText,
    Package,
    Plus,
    Printer,
    Tag,
    X,
    Check
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "./Toast";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { DateSummaryModal } from "./DateSummaryModal";

// Componente Switch inline
interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const Switch = ({ checked = false, onCheckedChange, disabled = false, className, id, ...props }: SwitchProps) => {
  const handleClick = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={handleClick}
      id={id}
      className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-blue-600" : "bg-gray-200"
      } ${className || ""}`}
      {...props}
    >
      <span
        className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
};

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

// Nova estrutura baseada em datas específicas
type BudgetDate = {
    date: string; // ISO date string (YYYY-MM-DD)
    items: BudgetItem[];
    discountCents: number;
    enabled: boolean;
};

// Estrutura antiga para compatibilidade com impressão
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
    customerName 
}: BudgetModalProps) {
    const { showToast } = useToast();
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
    
    // Estado temporário para edição do dia (não aplica até salvar)
    const [tempDateData, setTempDateData] = useState<BudgetDate | null>(null);
    const [applyDiscountToAllDays, setApplyDiscountToAllDays] = useState(false);

    // Buscar produtos disponíveis
    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/products?active=true", {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache'
                }
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

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
            // Definir datas padrão (próximos 30 dias)
            const today = new Date();
            const nextMonth = new Date(today);
            nextMonth.setDate(today.getDate() + 30);
            
            setStartDate(today.toISOString().split('T')[0]);
            setEndDate(nextMonth.toISOString().split('T')[0]);
            setCurrentMonth(new Date(today));
        } else {
            // Limpar dados ao fechar
            setBudgetDates(new Map());
            setSelectedDate(null);
            setShowProductList(false);
            setShowBulkAddModal(false);
            setSelectedProductsForBulk(new Set());
            setBulkQuantity({});
            setTempDateData(null);
        }
    }, [isOpen]);
    
    // Inicializar estado temporário quando o modal de edição abrir
    useEffect(() => {
        if (showProductList && selectedDate) {
            const originalData = getDateData(selectedDate);
            if (originalData) {
                // Criar cópia profunda dos itens
                setTempDateData({
                    ...originalData,
                    items: originalData.items.map(item => ({ ...item, product: { ...item.product } }))
                });
            } else {
                setTempDateData({
                    date: selectedDate,
                    items: [],
                    discountCents: 0,
                    enabled: true
                });
            }
        } else {
            // Limpar quando fechar
            setTempDateData(null);
            setApplyDiscountToAllDays(false);
        }
    }, [showProductList, selectedDate]);

    // Gerar array de todas as datas do período
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

    // Inicializar datas quando o período muda
    useEffect(() => {
        if (allDatesInPeriod.length > 0) {
            setBudgetDates(prev => {
                const newMap = new Map(prev);
                allDatesInPeriod.forEach(date => {
                    if (!newMap.has(date)) {
                        newMap.set(date, {
                            date,
                            items: [],
                            discountCents: 0,
                            enabled: true
                        });
                    }
                });
                // Remover datas que não estão mais no período
                Array.from(newMap.keys()).forEach(date => {
                    if (!allDatesInPeriod.includes(date)) {
                        newMap.delete(date);
                    }
                });
                return newMap;
            });
        }
    }, [allDatesInPeriod]);

    // Filtrar produtos por busca - apenas produtos com valor unitário (não por quilo)
    // Mostrar apenas quando há busca ativa
    const filteredProducts = products.filter(product => {
        // Excluir produtos por quilo
        if (product.pricePerKgCents && product.pricePerKgCents > 0) {
            return false;
        }
        
        // Verificar se tem valor unitário válido
        if (!product.priceCents || product.priceCents <= 0) {
            return false;
        }
        
        // Só mostrar se houver busca
        if (!searchQuery.trim()) {
            return false;
        }
        
        // Filtrar por busca
        return product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.barcode?.includes(searchQuery) ||
            product.category?.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Adicionar produto a uma data específica
    const addProductToDate = (product: Product, date: string) => {
        setBudgetDates(prev => {
            const newMap = new Map(prev);
            const budgetDate = newMap.get(date) || {
                date,
                items: [],
                discountCents: 0,
                enabled: true
            };
            
            const existingItem = budgetDate.items.find(item => item.productId === product.id);
            if (existingItem) {
                budgetDate.items = budgetDate.items.map(item =>
                    item.productId === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            } else {
                budgetDate.items = [...budgetDate.items, {
                    productId: product.id,
                    product,
                    quantity: 1
                }];
            }
            
            newMap.set(date, budgetDate);
            return newMap;
        });
    };

    // Remover produto de uma data
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

    // Atualizar quantidade do produto
    const updateProductQuantity = (productId: string, date: string, quantity: number) => {
        if (quantity <= 0) {
            removeProductFromDate(productId, date);
            return;
        }

        setBudgetDates(prev => {
            const newMap = new Map(prev);
            const budgetDate = newMap.get(date);
            if (budgetDate) {
                budgetDate.items = budgetDate.items.map(item =>
                    item.productId === productId
                        ? { ...item, quantity }
                        : item
                );
                newMap.set(date, budgetDate);
            }
            return newMap;
        });
    };

    // Atualizar desconto de uma data
    const updateDateDiscount = (date: string, discountValue: string) => {
        let value = discountValue;
        value = value.replace(/\D/g, '');
        let numValue = parseInt(value || '0');
        
        setBudgetDates(prev => {
            const newMap = new Map(prev);
            const budgetDate = newMap.get(date);
            if (budgetDate) {
                const daySubtotal = budgetDate.items.reduce((total, item) => {
                    return total + (item.product.priceCents * item.quantity);
                }, 0);
                const finalDiscount = Math.min(numValue, daySubtotal);
                budgetDate.discountCents = finalDiscount;
                newMap.set(date, budgetDate);
            }
            return newMap;
        });
    };

    // Aplicar produtos em massa
    const applyBulkProducts = () => {
        if (selectedProductsForBulk.size === 0) {
            showToast("Selecione pelo menos um produto", "warning");
            return;
        }

        const selectedProducts = products.filter(p => selectedProductsForBulk.has(p.id));
        let appliedCount = 0;

        setBudgetDates(prev => {
            const newMap = new Map(prev);
            allDatesInPeriod.forEach(date => {
                const budgetDate = newMap.get(date);
                if (budgetDate && budgetDate.enabled) {
                    // Verificar se deve aplicar apenas em dias vazios
                    if (bulkApplyMode === 'empty' && budgetDate.items.length > 0) {
                        return;
                    }

                    // Aplicar produtos selecionados
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
                            budgetDate.items = [...budgetDate.items, {
                                productId: product.id,
                                product,
                                quantity
                            }];
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

    // Aplicar produtos de uma data para outras datas
    const applyProductsFromDate = (sourceDate: string, targetDates: string[]) => {
        const sourceDateData = budgetDates.get(sourceDate);
        if (!sourceDateData || sourceDateData.items.length === 0) {
            showToast("Data de origem não possui produtos", "warning");
            return;
        }

        setBudgetDates(prev => {
            const newMap = new Map(prev);
            targetDates.forEach(targetDate => {
                const targetDateData = newMap.get(targetDate);
                if (targetDateData) {
                    targetDateData.items = [...sourceDateData.items];
                    newMap.set(targetDate, targetDateData);
                }
            });
            return newMap;
        });

        showToast(`Produtos aplicados em ${targetDates.length} dia(s)`, "success");
    };

    // Aplicar desconto de uma data para outras datas
    const applyDiscountFromDate = (sourceDate: string, targetDates: string[]) => {
        const sourceDateData = budgetDates.get(sourceDate);
        if (!sourceDateData || sourceDateData.discountCents === 0) {
            showToast("Data de origem não possui desconto", "warning");
            return;
        }

        setBudgetDates(prev => {
            const newMap = new Map(prev);
            targetDates.forEach(targetDate => {
                const targetDateData = newMap.get(targetDate);
                if (targetDateData) {
                    const daySubtotal = targetDateData.items.reduce((total, item) => {
                        return total + (item.product.priceCents * item.quantity);
                    }, 0);
                    const finalDiscount = Math.min(sourceDateData.discountCents, daySubtotal);
                    targetDateData.discountCents = finalDiscount;
                    newMap.set(targetDate, targetDateData);
                }
            });
            return newMap;
        });

        showToast(`Desconto aplicado em ${targetDates.length} dia(s)`, "success");
    };

    // Calcular total do orçamento
    const calculateBudgetTotal = () => {
        let total = 0;
        budgetDates.forEach((budgetDate) => {
            if (budgetDate.enabled) {
                const subtotal = budgetDate.items.reduce((daySum, item) => {
                    return daySum + (item.product.priceCents * item.quantity);
                }, 0);
                const dayTotal = Math.max(0, subtotal - budgetDate.discountCents);
                total += dayTotal;
            }
        });
        return total;
    };

    // Calcular total por data
    const calculateDateTotal = (date: string) => {
        const budgetDate = budgetDates.get(date);
        if (!budgetDate) return 0;
        
        const subtotal = budgetDate.items.reduce((total, item) => {
            return total + (item.product.priceCents * item.quantity);
        }, 0);
        return Math.max(0, subtotal - budgetDate.discountCents);
    };

    // Converter estrutura de datas para estrutura de dias da semana (compatibilidade)
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
        
        // Agrupar por dia da semana - usar o primeiro dia encontrado de cada dia da semana como base
        // Ordenar datas para garantir consistência
        const sortedDates = Array.from(budgetDates.entries())
            .filter(([_, budgetDate]) => budgetDate.enabled && budgetDate.items.length > 0)
            .sort(([a], [b]) => a.localeCompare(b));
        
        sortedDates.forEach(([dateStr, budgetDate]) => {
            const date = new Date(dateStr + 'T00:00:00');
            const dayOfWeek = dayNames[date.getDay()];
            const dayData = dayMap[dayOfWeek];
            
            // Usar o primeiro dia encontrado de cada dia da semana
            if (!dayData.enabled) {
                dayData.enabled = true;
                dayData.items = budgetDate.items.map(item => ({ ...item }));
                dayData.discountCents = budgetDate.discountCents;
            }
        });

        return Object.values(dayMap);
    };

    // Gerar orçamento completo (A4)
    const generateFullBudget = () => {
        if (!startDate || !endDate) {
            showToast("Por favor, preencha as datas de início e fim", "warning");
            return;
        }

        const enabledDates = Array.from(budgetDates.values()).filter(d => d.enabled && d.items.length > 0);
        if (enabledDates.length === 0) {
            showToast("Por favor, adicione produtos em pelo menos um dia", "warning");
            return;
        }

        const budgetDays = convertToBudgetDays();
        const enabledDays = budgetDays.filter(day => day.enabled);

        const budgetData = {
            customerId,
            customerName,
            startDate,
            endDate,
            days: enabledDays,
            sameProductsAllDays: false,
            totalCents: calculateBudgetTotal()
        };

        const params = new URLSearchParams({
            data: JSON.stringify(budgetData)
        });

        window.open(`/print/budget-full?${params.toString()}`, '_blank');
    };

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(cents / 100);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const formatDateLong = (dateString: string) => {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
        });
    };

    // Funções para o calendário
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        return { daysInMonth, startingDayOfWeek, year, month };
    };

    const getCalendarDays = () => {
        const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
        const days: (string | null)[] = [];
        
        // Adicionar dias vazios no início
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        
        // Adicionar dias do mês
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            days.push(dateStr);
        }
        
        return days;
    };

    const isDateInPeriod = (date: string) => {
        return allDatesInPeriod.includes(date);
    };

    const getDateData = (date: string) => {
        return budgetDates.get(date);
    };

    const enabledDatesCount = Array.from(budgetDates.values()).filter(d => d.enabled && d.items.length > 0).length;
    const totalDeliveryDays = Array.from(budgetDates.values()).filter(d => d.enabled && d.items.length > 0).length;

    const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 relative">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
                    <div className="relative p-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Calculator className="h-5 w-5 text-blue-600" />
                                Gerar Orçamento
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                                Configure produtos por dia para {customerName}
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

                {/* Conteúdo scrollável */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Configurações básicas */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                Período do Orçamento
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="startDate">Data de Início</Label>
                                    <Input
                                        id="startDate"
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
                                <div className="space-y-2">
                                    <Label htmlFor="endDate">Data de Fim</Label>
                                    <Input
                                        id="endDate"
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => {
                                            setEndDate(e.target.value);
                                            if (e.target.value && startDate && new Date(e.target.value) >= new Date(startDate)) {
                                                const end = new Date(e.target.value + 'T00:00:00');
                                                setCurrentMonth(end);
                                            }
                                        }}
                                        min={startDate || undefined}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Estatísticas Rápidas */}
                    {startDate && endDate && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-blue-700 font-medium mb-1">Total de Dias</p>
                                            <p className="text-2xl font-bold text-blue-900">{allDatesInPeriod.length}</p>
                                        </div>
                                        <Calendar className="h-8 w-8 text-blue-600 opacity-50" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-green-700 font-medium mb-1">Dias com Produtos</p>
                                            <p className="text-2xl font-bold text-green-900">{enabledDatesCount}</p>
                                        </div>
                                        <Package className="h-8 w-8 text-green-600 opacity-50" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-purple-700 font-medium mb-1">Valor Total</p>
                                            <p className="text-2xl font-bold text-purple-900">{formatCurrency(calculateBudgetTotal())}</p>
                                        </div>
                                        <Calculator className="h-8 w-8 text-purple-600 opacity-50" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-orange-700 font-medium mb-1">Média por Dia</p>
                                            <p className="text-2xl font-bold text-orange-900">
                                                {enabledDatesCount > 0 
                                                    ? formatCurrency(Math.round(calculateBudgetTotal() / enabledDatesCount))
                                                    : formatCurrency(0)
                                                }
                                            </p>
                                        </div>
                                        <Clock className="h-8 w-8 text-orange-600 opacity-50" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Calendário */}
                    {startDate && endDate && (
                        <Card className="shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-gray-900">
                                            <Calendar className="h-5 w-5 text-green-600" />
                                            Calendário do Período
                                        </CardTitle>
                                        <p className="text-xs text-gray-600 mt-1">
                                            {formatDate(startDate)} até {formatDate(endDate)} • {allDatesInPeriod.length} dias
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const prev = new Date(currentMonth);
                                                prev.setMonth(prev.getMonth() - 1);
                                                setCurrentMonth(prev);
                                            }}
                                            className="h-9 w-9 p-0 hover:bg-white hover:shadow-md transition-all"
                                            title="Mês anterior"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <div className="min-w-[200px] text-center">
                                            <div className="text-base font-bold text-gray-900">
                                                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const next = new Date(currentMonth);
                                                next.setMonth(next.getMonth() + 1);
                                                setCurrentMonth(next);
                                            }}
                                            className="h-9 w-9 p-0 hover:bg-white hover:shadow-md transition-all"
                                            title="Próximo mês"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                        {startDate && endDate && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    if (startDate) {
                                                        setCurrentMonth(new Date(startDate + 'T00:00:00'));
                                                    }
                                                }}
                                                className="h-9 px-3 text-xs ml-2 hover:bg-white hover:shadow-md transition-all"
                                                title="Voltar para o período selecionado"
                                            >
                                                Ir para período
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    {/* Botão para adicionar em todos os dias */}
                                    <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
                                        <div>
                                            <p className="text-sm font-semibold text-purple-900">Adição Rápida</p>
                                            <p className="text-xs text-purple-700">Adicione produtos em todos os dias de uma vez</p>
                                        </div>
                                        <Button
                                            onClick={() => setShowBulkAddModal(true)}
                                            className="bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Adicionar em Todos os Dias
                                        </Button>
                                    </div>
                                    
                                    {/* Legenda melhorada */}
                                    <div className="flex flex-wrap items-center gap-4 text-xs bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 rounded border-2 border-gray-300 bg-white shadow-sm"></div>
                                            <span className="font-medium text-gray-700">Sem produtos</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 rounded bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-300 shadow-sm"></div>
                                            <span className="font-medium text-gray-700">Com produtos</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 rounded ring-2 ring-blue-400 ring-offset-1 bg-blue-50"></div>
                                            <span className="font-medium text-gray-700">Hoje</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 rounded bg-gray-100 border-2 border-gray-300 opacity-50"></div>
                                            <span className="font-medium text-gray-500">Fora do período</span>
                                        </div>
                                    </div>

                                    {/* Grid do calendário */}
                                    <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-lg bg-white relative">
                                        {/* Cabeçalho dos dias da semana */}
                                        <div className="grid grid-cols-7 bg-gradient-to-r from-gray-800 to-gray-900">
                                            {weekDays.map((day, idx) => (
                                                <div key={day} className={`p-3 text-center text-sm font-bold text-white border-r border-gray-700 last:border-r-0 ${idx === 0 || idx === 6 ? 'bg-gray-900/50' : ''}`}>
                                                    {day}
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {/* Dias do mês */}
                                        <div className="grid grid-cols-7 bg-white" style={{ gridAutoRows: 'minmax(120px, auto)' }}>
                                            {getCalendarDays().map((date, index) => {
                                                if (date === null) {
                                                    return (
                                                        <div key={`empty-${index}`} className="aspect-[1.2] border-r border-b border-gray-100 last:border-r-0 bg-gray-50/50"></div>
                                                    );
                                                }
                                                
                                                const isInPeriod = isDateInPeriod(date);
                                                const dateData = getDateData(date);
                                                const hasProducts = dateData && dateData.items.length > 0;
                                                const hasDiscount = dateData && dateData.discountCents > 0;
                                                const isToday = date === new Date().toISOString().split('T')[0];
                                                const totalItems = dateData?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
                                                const dayTotal = calculateDateTotal(date);
                                                
                                                // Determinar cor baseado no valor
                                                const getValueColor = () => {
                                                    if (dayTotal === 0) return '';
                                                    if (dayTotal < 5000) return 'from-green-50 to-green-100 border-green-300';
                                                    if (dayTotal < 15000) return 'from-blue-50 to-blue-100 border-blue-300';
                                                    return 'from-purple-50 to-purple-100 border-purple-300';
                                                };
                                                
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
                                                            min-h-[120px] border-r border-b border-gray-200 last:border-r-0 p-2
                                                            transition-all duration-300 relative group
                                                            ${isInPeriod 
                                                                ? 'hover:shadow-lg hover:scale-[1.03] hover:z-10 cursor-pointer active:scale-[0.98]' 
                                                                : 'bg-gray-50 cursor-not-allowed opacity-40'
                                                            }
                                                            ${hasProducts ? `bg-gradient-to-br ${getValueColor()} hover:shadow-xl` : 'hover:bg-blue-50'}
                                                            ${isToday ? 'ring-2 ring-blue-500 ring-offset-2 shadow-md' : ''}
                                                        `}
                                                        title={isInPeriod && hasProducts 
                                                            ? `${formatDateLong(date)} - ${dateData?.items.length || 0} produto(s), ${totalItems} unidade(s)${hasDiscount ? `, Desconto: ${formatCurrency(dateData?.discountCents || 0)}` : ''} - Total: ${formatCurrency(dayTotal)}`
                                                            : isInPeriod 
                                                                ? `${formatDateLong(date)} - Clique para adicionar produtos`
                                                                : 'Fora do período selecionado'
                                                        }
                                                    >
                                                        <div className="flex flex-col h-full">
                                                            {/* Número do dia */}
                                                            <div className={`flex items-center justify-between mb-1.5 ${isInPeriod ? 'text-gray-900' : 'text-gray-400'}`}>
                                                                <span className={`text-sm font-bold ${isToday ? 'text-blue-600' : ''}`}>
                                                                    {new Date(date + 'T00:00:00').getDate()}
                                                                </span>
                                                                {isToday && (
                                                                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shadow-sm"></span>
                                                                )}
                                                            </div>
                                                            
                                                            {/* Conteúdo do dia */}
                                                            {hasProducts ? (
                                                                <div className="mt-auto space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full flex-1 flex flex-col">
                                                                    {/* Lista de produtos */}
                                                                    <div className="space-y-0.5 flex-1 min-h-0 overflow-y-auto max-h-[80px] pr-0.5 scrollbar-thin scrollbar-thumb-green-300 scrollbar-track-transparent">
                                                                        {dateData?.items.map((item, idx) => (
                                                                            <div key={idx} className="bg-white/95 backdrop-blur-sm rounded px-1.5 py-1 border border-green-200 shadow-sm hover:bg-white hover:border-green-300 transition-colors">
                                                                                <div className="flex items-center justify-between gap-1">
                                                                                    <span className="text-[9px] font-semibold text-gray-800 leading-tight truncate flex-1" title={item.product.name}>
                                                                                        {item.product.name}
                                                                                    </span>
                                                                                    <span className="text-[9px] font-bold text-green-700 flex-shrink-0 bg-green-100 px-1 rounded">
                                                                                        {item.quantity}x
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    
                                                                    {/* Badge de desconto */}
                                                                    {hasDiscount && (
                                                                        <div className="flex items-center gap-1 bg-orange-100/90 backdrop-blur-sm rounded-md px-1.5 py-0.5 border border-orange-300 shadow-sm">
                                                                            <Tag className="h-2.5 w-2.5 text-orange-600 flex-shrink-0" />
                                                                            <span className="text-[9px] font-semibold text-orange-800 leading-tight truncate">
                                                                                -{formatCurrency(dateData?.discountCents || 0)}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {/* Valor total - sempre visível */}
                                                                    <div className={`bg-gradient-to-r ${getValueColor()} rounded-md px-1.5 py-1 border-2 shadow-sm`}>
                                                                        <div className="text-[10px] font-extrabold text-gray-900 leading-tight truncate text-center">
                                                                            {formatCurrency(dayTotal)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : isInPeriod ? (
                                                                <div className="mt-auto flex items-center justify-center">
                                                                    <div className="h-6 w-6 rounded-full border-2 border-dashed border-gray-300 group-hover:border-blue-400 group-hover:bg-blue-50 transition-colors flex items-center justify-center">
                                                                        <Plus className="h-3 w-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                                                    </div>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                        
                                                        {/* Overlay de hover */}
                                                        {isInPeriod && (
                                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300 rounded pointer-events-none"></div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                </div>

                {/* Rodapé */}
                <div className="border-t border-gray-200 p-6 bg-gray-50/50">
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl border-gray-300 hover:bg-gray-100 text-gray-700 font-medium transition-all"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={generateFullBudget}
                            disabled={!startDate || !endDate || enabledDatesCount === 0}
                            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            Impressão Completa
                        </Button>
                    </div>
                </div>

                {/* Modal de adicionar produtos em massa */}
                {showBulkAddModal && (
                    <Dialog open={showBulkAddModal} onOpenChange={setShowBulkAddModal}>
                        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden p-0 flex flex-col">
                            <DialogTitle className="sr-only">Adicionar Produtos em Todos os Dias</DialogTitle>
                            
                            {/* Header */}
                            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200 relative">
                                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
                                <div className="relative p-6 flex items-center justify-between">
                                    <div>
                                        <h2 className="flex items-center gap-3 text-xl font-bold text-gray-900">
                                            <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
                                                <Package className="h-5 w-5 text-purple-600" />
                                            </div>
                                            Adicionar Produtos em Todos os Dias
                                        </h2>
                                        <p className="text-sm text-gray-600 mt-2 ml-13">
                                            Selecione os produtos que serão adicionados em todos os dias do período
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowBulkAddModal(false)}
                                        className="h-12 w-12 rounded-full bg-white/60 hover:bg-white shadow-md border border-gray-200 text-gray-600 hover:text-gray-800 transition-all hover:scale-105"
                                    >
                                        <X className="h-6 w-6" />
                                    </Button>
                                </div>
                                
                                {/* Barra de busca */}
                                <div className="relative px-6 pb-6">
                                    <div className="relative">
                                        <Input
                                            placeholder="Buscar produtos por nome, código ou categoria..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full h-12 pl-10 pr-4 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500/20"
                                        />
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                            <Package className="h-5 w-5 text-gray-400" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6">
                                {/* Opções de aplicação */}
                                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <Label className="text-sm font-semibold text-blue-800 mb-2 block">
                                        Modo de Aplicação
                                    </Label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="bulkApplyMode"
                                                value="all"
                                                checked={bulkApplyMode === 'all'}
                                                onChange={(e) => setBulkApplyMode(e.target.value as 'all' | 'empty')}
                                                className="w-4 h-4 text-purple-600"
                                            />
                                            <span className="text-sm text-gray-700">
                                                Aplicar em todos os dias (sobrescrever se já existir)
                                            </span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="bulkApplyMode"
                                                value="empty"
                                                checked={bulkApplyMode === 'empty'}
                                                onChange={(e) => setBulkApplyMode(e.target.value as 'all' | 'empty')}
                                                className="w-4 h-4 text-purple-600"
                                            />
                                            <span className="text-sm text-gray-700">
                                                Aplicar apenas em dias vazios
                                            </span>
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-2">
                                        {bulkApplyMode === 'all' 
                                            ? `Aplicará em ${allDatesInPeriod.length} dia(s) do período`
                                            : `Aplicará apenas nos dias que ainda não possuem produtos`
                                        }
                                    </p>
                                </div>

                                {loading ? (
                                    <div className="text-center py-12">
                                        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent"></div>
                                        <p className="mt-4 text-gray-600 text-lg">Carregando produtos...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {filteredProducts.map((product) => {
                                            const isSelected = selectedProductsForBulk.has(product.id);
                                            const quantity = bulkQuantity[product.id] || 1;
                                            
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
                                                    className={`
                                                        group flex items-center gap-3 rounded-lg border-2 p-3 bg-white transition-all duration-200 cursor-pointer
                                                        ${isSelected 
                                                            ? 'border-purple-500 bg-purple-50 shadow-md' 
                                                            : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                                                        }
                                                    `}
                                                >
                                                    {/* Checkbox visual */}
                                                    <div className={`
                                                        h-6 w-6 rounded border-2 flex items-center justify-center flex-shrink-0
                                                        ${isSelected 
                                                            ? 'bg-purple-600 border-purple-600' 
                                                            : 'border-gray-300 bg-white'
                                                        }
                                                    `}>
                                                        {isSelected && <Check className="h-4 w-4 text-white" />}
                                                    </div>
                                                    
                                                    {/* Imagem do produto */}
                                                    <div className="h-16 w-16 flex-shrink-0 bg-gray-100 flex items-center justify-center overflow-hidden rounded-md border border-gray-200">
                                                        {product.imageUrl ? (
                                                            <img
                                                                src={product.imageUrl}
                                                                alt={product.name}
                                                                className="h-full w-full object-cover"
                                                                loading="lazy"
                                                                onError={(e) => {
                                                                    const target = e.target as HTMLImageElement;
                                                                    target.style.display = "none";
                                                                }}
                                                            />
                                                        ) : (
                                                            <Package className="h-8 w-8 text-gray-300" />
                                                        )}
                                                    </div>
                                                    
                                                    {/* Conteúdo */}
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-medium text-sm text-gray-900 line-clamp-1 mb-1">
                                                            {product.name}
                                                        </h3>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-bold text-green-600">
                                                                {product.pricePerKgCents && product.pricePerKgCents > 0 ? (
                                                                    <>{formatCurrency(product.pricePerKgCents)}/kg</>
                                                                ) : (
                                                                    <>{formatCurrency(product.priceCents)}</>
                                                                )}
                                                            </span>
                                                        </div>
                                                        
                                                        {/* Quantidade (só aparece se selecionado) */}
                                                        {isSelected && (
                                                            <div className="mt-2 flex items-center gap-2">
                                                                <Label className="text-xs text-gray-600">Quantidade:</Label>
                                                                <Input
                                                                    type="number"
                                                                    min="1"
                                                                    value={quantity}
                                                                    onChange={(e) => {
                                                                        const qty = parseInt(e.target.value) || 1;
                                                                        setBulkQuantity({ ...bulkQuantity, [product.id]: qty });
                                                                    }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="w-20 h-7 text-xs"
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
                            
                            <div className="p-6 border-t bg-gray-50/50">
                                <div className="flex justify-between items-center">
                                    <div className="text-sm text-gray-600">
                                        {selectedProductsForBulk.size} produto(s) selecionado(s)
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowBulkAddModal(false);
                                                setSelectedProductsForBulk(new Set());
                                                setBulkQuantity({});
                                            }}
                                            className="px-6 py-2 border-gray-300 hover:bg-gray-100 text-gray-700"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            onClick={applyBulkProducts}
                                            disabled={selectedProductsForBulk.size === 0}
                                            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                                        >
                                            Aplicar em Todos os Dias
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

                {/* Modal de resumo do dia */}
                {showDateSummary && selectedDate && (
                    <DateSummaryModal
                        isOpen={showDateSummary}
                        onClose={() => setShowDateSummary(false)}
                        onEdit={() => {
                            setShowDateSummary(false);
                            setShowProductList(true);
                        }}
                        date={selectedDate}
                        dateData={getDateData(selectedDate)}
                        formatDate={formatDate}
                        formatDateLong={formatDateLong}
                        formatCurrency={formatCurrency}
                        calculateDateTotal={calculateDateTotal}
                    />
                )}

                {/* Modal de edição de dia específico */}
                {showProductList && selectedDate && (
                    <Dialog open={showProductList} onOpenChange={(open) => {
                        if (!open) {
                            // Limpar estado temporário ao fechar sem salvar
                            setTempDateData(null);
                            setSearchQuery("");
                            setApplyDiscountToAllDays(false);
                        }
                        setShowProductList(open);
                    }}>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
                            <DialogTitle className="sr-only">Editar Dia - {formatDate(selectedDate)}</DialogTitle>
                            
                            {/* Header */}
                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200 p-6 relative">
                                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
                                <div className="relative flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                            <Calendar className="h-5 w-5 text-orange-600" />
                                            Editar Dia
                                        </h2>
                                        <p className="text-gray-600 mt-1 text-sm">
                                            {formatDateLong(selectedDate)}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowProductList(false)}
                                        className="h-12 w-12 rounded-full bg-white/60 hover:bg-white shadow-md border border-gray-200 text-gray-600 hover:text-gray-800 transition-all hover:scale-105"
                                    >
                                        <X className="h-6 w-6" />
                                    </Button>
                                </div>
                                
                                {/* Barra de busca com dropdown */}
                                <div className="relative">
                                    <Input
                                        placeholder="Buscar produtos por nome, código ou categoria..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onFocus={() => {
                                            // Manter foco para mostrar resultados
                                        }}
                                        className="w-full h-12 pl-10 pr-4 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
                                    />
                                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                        <Package className="h-5 w-5 text-gray-400" />
                                    </div>
                                    
                                    {/* Dropdown de resultados */}
                                    {searchQuery.trim() && filteredProducts.length > 0 && (
                                        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-96 overflow-y-auto">
                                            <div className="p-2">
                                                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase mb-1">
                                                    {filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''}
                                                </div>
                                                <div className="space-y-1">
                                                    {filteredProducts.map((product) => (
                                                        <button
                                                            key={product.id}
                                                        onClick={() => {
                                                            // Adicionar ao estado temporário
                                                            if (tempDateData) {
                                                                const existingItem = tempDateData.items.find(item => item.productId === product.id);
                                                                if (existingItem) {
                                                                    setTempDateData({
                                                                        ...tempDateData,
                                                                        items: tempDateData.items.map(item =>
                                                                            item.productId === product.id
                                                                                ? { ...item, quantity: item.quantity + 1 }
                                                                                : item
                                                                        )
                                                                    });
                                                                } else {
                                                                    setTempDateData({
                                                                        ...tempDateData,
                                                                        items: [...tempDateData.items, {
                                                                            productId: product.id,
                                                                            product,
                                                                            quantity: 1
                                                                        }]
                                                                    });
                                                                }
                                                            } else {
                                                                // Criar novo estado temporário se não existir
                                                                const originalData = getDateData(selectedDate) || {
                                                                    date: selectedDate,
                                                                    items: [],
                                                                    discountCents: 0,
                                                                    enabled: true
                                                                };
                                                                setTempDateData({
                                                                    ...originalData,
                                                                    items: [...originalData.items, {
                                                                        productId: product.id,
                                                                        product,
                                                                        quantity: 1
                                                                    }]
                                                                });
                                                            }
                                                            showToast(`${product.name} adicionado`, "success");
                                                            setSearchQuery("");
                                                        }}
                                                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-orange-50 hover:border-orange-200 border border-transparent transition-all group"
                                                        >
                                                            {/* Miniatura */}
                                                            <div className="h-12 w-12 flex-shrink-0 rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                                                                {product.imageUrl ? (
                                                                    <img
                                                                        src={product.imageUrl}
                                                                        alt={product.name}
                                                                        className="h-full w-full object-cover"
                                                                        loading="lazy"
                                                                        onError={(e) => {
                                                                            const target = e.target as HTMLImageElement;
                                                                            target.style.display = "none";
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100">
                                                                        <Package className="h-5 w-5 text-orange-400" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            {/* Informações */}
                                                            <div className="flex-1 min-w-0 text-left">
                                                                <div className="font-medium text-sm text-gray-900 group-hover:text-orange-700 transition-colors truncate">
                                                                    {product.name}
                                                                </div>
                                                                <div className="text-xs font-semibold text-green-600 mt-0.5">
                                                                    {formatCurrency(product.priceCents)}
                                                                </div>
                                                            </div>
                                                            
                                                            {/* Ícone de adicionar */}
                                                            <div className="h-8 w-8 rounded-md bg-orange-500 flex items-center justify-center shadow-sm group-hover:bg-orange-600 transition-all flex-shrink-0">
                                                                <Plus className="h-4 w-4 text-white" />
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Mensagem quando não há resultados */}
                                    {searchQuery.trim() && filteredProducts.length === 0 && !loading && (
                                        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl p-4">
                                            <div className="text-center py-4">
                                                <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                                <p className="text-sm text-gray-500">Nenhum produto encontrado</p>
                                                <p className="text-xs text-gray-400 mt-1">Tente buscar por nome, código ou categoria</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                {/* Lista de produtos do dia */}
                                {(() => {
                                    // Usar dados temporários se existirem, senão usar os dados originais
                                    const dateData = tempDateData || getDateData(selectedDate);
                                    return dateData && dateData.items.length > 0 ? (
                                        <div className="space-y-4 pb-6 border-b border-gray-200">
                                            <div className="flex items-center gap-3 pb-3">
                                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center shadow-sm">
                                                    <Package className="h-5 w-5 text-orange-600" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-bold text-gray-900">Produtos do Dia</h3>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {dateData.items.length} {dateData.items.length === 1 ? 'item adicionado' : 'itens adicionados'}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-3">
                                                {dateData.items.map((item) => (
                                                    <div key={item.productId} className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors">
                                                        {/* Miniatura */}
                                                        <div className="h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200">
                                                            {item.product.imageUrl ? (
                                                                <img
                                                                    src={item.product.imageUrl}
                                                                    alt={item.product.name}
                                                                    className="h-full w-full object-cover"
                                                                    loading="lazy"
                                                                    onError={(e) => {
                                                                        const target = e.target as HTMLImageElement;
                                                                        target.style.display = "none";
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100">
                                                                    <Package className="h-6 w-6 text-orange-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Informações */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-semibold text-gray-900 text-sm mb-1">{item.product.name}</div>
                                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                                <span>Preço: <span className="font-semibold text-gray-700">{formatCurrency(item.product.priceCents)}</span></span>
                                                                <span>•</span>
                                                                <span>Qtd: <span className="font-semibold text-orange-600">{item.quantity}</span></span>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Controles */}
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={(e) => {
                                                                const quantity = parseInt(e.target.value) || 1;
                                                                if (tempDateData) {
                                                                    if (quantity <= 0) {
                                                                        setTempDateData({
                                                                            ...tempDateData,
                                                                            items: tempDateData.items.filter(i => i.productId !== item.productId)
                                                                        });
                                                                    } else {
                                                                        setTempDateData({
                                                                            ...tempDateData,
                                                                            items: tempDateData.items.map(i =>
                                                                                i.productId === item.productId
                                                                                    ? { ...i, quantity }
                                                                                    : i
                                                                            )
                                                                        });
                                                                    }
                                                                }
                                                            }}
                                                                className="w-20 h-9 text-center text-sm rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    if (tempDateData) {
                                                                        setTempDateData({
                                                                            ...tempDateData,
                                                                            items: tempDateData.items.filter(i => i.productId !== item.productId)
                                                                        });
                                                                    }
                                                                }}
                                                                className="h-9 w-9 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            {/* Desconto e total */}
                                            <div className="mt-4 space-y-4 pt-4 border-t border-gray-200">
                                                {/* Seção de desconto */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <Tag className="h-4 w-4 text-orange-600" />
                                                        <Label className="text-sm font-semibold text-gray-900">Desconto do Dia</Label>
                                                    </div>
                                                    
                                                    {/* Input de desconto */}
                                                    <div className="relative">
                                                        <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                        <Input
                                                            type="text"
                                                            inputMode="decimal"
                                                            value={(() => {
                                                                if (!dateData.discountCents) return '';
                                                                const realValue = dateData.discountCents / 100;
                                                                return realValue.toLocaleString('pt-BR', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2
                                                                });
                                                            })()}
                                                            onChange={(e) => {
                                                                if (tempDateData) {
                                                                    let value = e.target.value;
                                                                    value = value.replace(/\D/g, '');
                                                                    let numValue = parseInt(value || '0');
                                                                    
                                                                    const daySubtotal = tempDateData.items.reduce((total, item) => {
                                                                        return total + (item.product.priceCents * item.quantity);
                                                                    }, 0);
                                                                    const finalDiscount = Math.min(numValue, daySubtotal);
                                                                    
                                                                    setTempDateData({
                                                                        ...tempDateData,
                                                                        discountCents: finalDiscount
                                                                    });
                                                                }
                                                            }}
                                                            placeholder="0,00"
                                                            className="pl-10 h-10 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20"
                                                        />
                                                    </div>
                                                    
                                                    {/* Botões de ação de desconto */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                showToast("Desconto aplicado neste dia", "success");
                                                            }}
                                                            disabled={!dateData.discountCents || dateData.discountCents === 0}
                                                            className="h-9 text-xs border-gray-300 text-gray-700 hover:bg-gray-50"
                                                            title="Desconto aplicado apenas neste dia"
                                                        >
                                                            <Tag className="h-3 w-3 mr-1.5" />
                                                            Apenas este dia
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                if (tempDateData && tempDateData.discountCents > 0) {
                                                                    setApplyDiscountToAllDays(true);
                                                                    showToast("Desconto será aplicado em todos os dias ao salvar", "info");
                                                                }
                                                            }}
                                                            disabled={!dateData.discountCents || dateData.discountCents === 0}
                                                            className={`h-9 text-xs border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400 ${applyDiscountToAllDays ? 'bg-orange-100 border-orange-400' : ''}`}
                                                            title="Aplicar este desconto em todos os dias do calendário ao salvar"
                                                        >
                                                            <Tag className="h-3 w-3 mr-1.5" />
                                                            Todos os dias
                                                        </Button>
                                                    </div>
                                                    
                                                    <p className="text-xs text-gray-500">
                                                        O desconto é aplicado automaticamente neste dia ao digitar. Use os botões acima para confirmar ou aplicar em todos os dias.
                                                    </p>
                                                </div>
                                                
                                                {/* Total do dia */}
                                                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-200">
                                                    <span className="text-sm font-semibold text-orange-800">Total do dia:</span>
                                                    <span className="text-lg font-bold text-orange-900">
                                                        {(() => {
                                                            let total = 0;
                                                            if (tempDateData) {
                                                                const subtotal = tempDateData.items.reduce((sum, item) => {
                                                                    return sum + (item.product.priceCents * item.quantity);
                                                                }, 0);
                                                                total = Math.max(0, subtotal - tempDateData.discountCents);
                                                            } else {
                                                                total = calculateDateTotal(selectedDate);
                                                            }
                                                            return formatCurrency(total);
                                                        })()}
                                                    </span>
                                                </div>
                                                
                                                {/* Ação rápida - produtos */}
                                                <div className="pt-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            const otherDates = allDatesInPeriod.filter(d => d !== selectedDate);
                                                            applyProductsFromDate(selectedDate, otherDates);
                                                        }}
                                                        className="w-full h-9 text-xs border-gray-300 hover:bg-gray-50"
                                                    >
                                                        <Package className="h-3 w-3 mr-2" />
                                                        Aplicar produtos deste dia em todos os dias
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 bg-orange-50 rounded-xl border-2 border-dashed border-orange-200">
                                            <Package className="h-10 w-10 text-orange-300 mx-auto mb-3" />
                                            <p className="text-sm text-gray-500">Nenhum produto adicionado para este dia</p>
                                        </div>
                                    );
                                })()}

                            </div>
                            
                            <div className="border-t border-gray-200 p-6 bg-gray-50/50">
                                <div className="flex justify-between items-center">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                // Cancelar: descartar alterações temporárias
                                                setTempDateData(null);
                                                setApplyDiscountToAllDays(false);
                                                setShowProductList(false);
                                                setSearchQuery("");
                                            }}
                                            className="px-6 py-3 rounded-xl border-gray-300 hover:bg-gray-100 text-gray-700 font-medium transition-all"
                                        >
                                            Cancelar
                                        </Button>
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowProductList(false);
                                                setSearchQuery("");
                                                setTempDateData(null);
                                                setApplyDiscountToAllDays(false);
                                            }}
                                            className="px-6 py-3 rounded-xl border-gray-300 hover:bg-gray-100 text-gray-700 font-medium transition-all"
                                        >
                                            Fechar
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                // Salvar: aplicar alterações temporárias ao estado principal
                                                if (tempDateData && selectedDate) {
                                                    setBudgetDates(prev => {
                                                        const newMap = new Map(prev);
                                                        newMap.set(selectedDate, { ...tempDateData });
                                                        
                                                        // Se marcado para aplicar desconto em todos os dias
                                                        if (applyDiscountToAllDays && tempDateData.discountCents > 0) {
                                                            const otherDates = allDatesInPeriod.filter(d => d !== selectedDate);
                                                            otherDates.forEach(targetDate => {
                                                                const targetDateData = newMap.get(targetDate);
                                                                if (targetDateData) {
                                                                    const daySubtotal = targetDateData.items.reduce((total, item) => {
                                                                        return total + (item.product.priceCents * item.quantity);
                                                                    }, 0);
                                                                    const finalDiscount = Math.min(tempDateData.discountCents, daySubtotal);
                                                                    targetDateData.discountCents = finalDiscount;
                                                                    newMap.set(targetDate, targetDateData);
                                                                }
                                                            });
                                                            showToast(`Alterações salvas! Desconto aplicado em ${otherDates.length} dia(s)`, "success");
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
                                            className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-lg hover:shadow-xl transition-all"
                                        >
                                            Salvar Alterações
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </DialogContent>
        </Dialog>
    );
}
