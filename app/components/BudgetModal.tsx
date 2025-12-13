"use client";

import {
    Calculator,
    Calendar,
    Clock,
    FileText,
    Package,
    Plus,
    Printer,
    Tag,
    X
} from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "./Toast";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

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

const DAYS_OF_WEEK: BudgetDay[] = [
    { day: 'monday', label: 'Segunda-feira', enabled: false, items: [], discountCents: 0 },
    { day: 'tuesday', label: 'Terça-feira', enabled: false, items: [], discountCents: 0 },
    { day: 'wednesday', label: 'Quarta-feira', enabled: false, items: [], discountCents: 0 },
    { day: 'thursday', label: 'Quinta-feira', enabled: false, items: [], discountCents: 0 },
    { day: 'friday', label: 'Sexta-feira', enabled: false, items: [], discountCents: 0 },
    { day: 'saturday', label: 'Sábado', enabled: false, items: [], discountCents: 0 },
    { day: 'sunday', label: 'Domingo', enabled: false, items: [], discountCents: 0 },
];

export function BudgetModal({ 
    isOpen, 
    onClose, 
    customerId, 
    customerName 
}: BudgetModalProps) {
    const { showToast } = useToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [budgetDays, setBudgetDays] = useState<BudgetDay[]>(DAYS_OF_WEEK);
    const [sameProductsAllDays, setSameProductsAllDays] = useState(true);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
    const [showProductList, setShowProductList] = useState(false);

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
        }
    }, [isOpen]);

    // Filtrar produtos por busca
    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode?.includes(searchQuery) ||
        product.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Adicionar produto ao dia selecionado
    const addProductToDay = (product: Product, day: DayOfWeek) => {
        setBudgetDays(prev => prev.map(budgetDay => {
            if (budgetDay.day === day) {
                const existingItem = budgetDay.items.find(item => item.productId === product.id);
                if (existingItem) {
                    return {
                        ...budgetDay,
                        items: budgetDay.items.map(item =>
                            item.productId === product.id
                                ? { ...item, quantity: item.quantity + 1 }
                                : item
                        )
                    };
                } else {
                    return {
                        ...budgetDay,
                        items: [...budgetDay.items, {
                            productId: product.id,
                            product,
                            quantity: 1
                        }]
                    };
                }
            }
            return budgetDay;
        }));
    };

    // Remover produto do dia
    const removeProductFromDay = (productId: string, day: DayOfWeek) => {
        setBudgetDays(prev => prev.map(budgetDay => {
            if (budgetDay.day === day) {
                return {
                    ...budgetDay,
                    items: budgetDay.items.filter(item => item.productId !== productId)
                };
            }
            return budgetDay;
        }));
    };

    // Atualizar quantidade do produto
    const updateProductQuantity = (productId: string, day: DayOfWeek, quantity: number) => {
        if (quantity <= 0) {
            removeProductFromDay(productId, day);
            return;
        }

        setBudgetDays(prev => prev.map(budgetDay => {
            if (budgetDay.day === day) {
                return {
                    ...budgetDay,
                    items: budgetDay.items.map(item =>
                        item.productId === productId
                            ? { ...item, quantity }
                            : item
                    )
                };
            }
            return budgetDay;
        }));
    };

    // Aplicar produtos do primeiro dia habilitado para todos os dias habilitados
    const applySameProductsToAllDays = () => {
        const enabledDays = budgetDays.filter(day => day.enabled);
        if (enabledDays.length === 0) return;

        const firstEnabledDay = enabledDays[0];
        const productsToApply = firstEnabledDay.items;
        
        // Calcular subtotal dos produtos que serão aplicados
        const newSubtotal = productsToApply.reduce((total, item) => {
            return total + (item.product.priceCents * item.quantity);
        }, 0);

        setBudgetDays(prev => prev.map(budgetDay => {
            if (budgetDay.enabled) {
                // Quando aplicar produtos, não copiar desconto se o dia já tiver produtos próprios
                // Se o dia estiver vazio, pode copiar o desconto também
                const shouldCopyDiscount = budgetDay.items.length === 0;
                const finalDiscount = shouldCopyDiscount 
                    ? Math.min(firstEnabledDay.discountCents, newSubtotal)
                    : budgetDay.discountCents;
                
                return {
                    ...budgetDay,
                    items: [...productsToApply],
                    discountCents: finalDiscount
                };
            }
            return budgetDay;
        }));
        
        showToast("Produtos aplicados a todos os dias selecionados", "success");
    };

    // Aplicar produtos de um dia específico para outros dias
    const applyProductsFromDay = (sourceDay: DayOfWeek, targetDays: DayOfWeek[]) => {
        const sourceDayData = budgetDays.find(day => day.day === sourceDay);
        if (!sourceDayData || sourceDayData.items.length === 0) {
            showToast("Dia de origem não possui produtos", "warning");
            return;
        }

        setBudgetDays(prev => prev.map(budgetDay => {
            if (targetDays.includes(budgetDay.day)) {
                // Aplicar produtos e, se o dia estiver vazio, também aplicar desconto
                const shouldCopyDiscount = budgetDay.items.length === 0;
                const newSubtotal = sourceDayData.items.reduce((total, item) => {
                    return total + (item.product.priceCents * item.quantity);
                }, 0);
                const finalDiscount = shouldCopyDiscount
                    ? Math.min(sourceDayData.discountCents, newSubtotal)
                    : budgetDay.discountCents;
                
                return {
                    ...budgetDay,
                    items: [...sourceDayData.items],
                    discountCents: finalDiscount
                };
            }
            return budgetDay;
        }));

        const targetDayNames = targetDays.map(day => 
            budgetDays.find(d => d.day === day)?.label
        ).join(", ");
        
        showToast(`Produtos aplicados para: ${targetDayNames}`, "success");
    };

    // Mapear dia da semana para número (0 = domingo, 1 = segunda, etc.)
    const getDayOfWeekNumber = (day: DayOfWeek): number => {
        const dayMap: Record<DayOfWeek, number> = {
            'sunday': 0,
            'monday': 1,
            'tuesday': 2,
            'wednesday': 3,
            'thursday': 4,
            'friday': 5,
            'saturday': 6
        };
        return dayMap[day];
    };

    // Contar quantas vezes um dia da semana ocorre no range de datas
    const countDayOccurrences = (dayOfWeek: DayOfWeek, start: Date, end: Date): number => {
        const targetDayNumber = getDayOfWeekNumber(dayOfWeek);
        let count = 0;
        
        // Criar uma cópia da data de início para não modificar a original
        // Usar UTC para evitar problemas de timezone
        const currentDate = new Date(start);
        currentDate.setHours(0, 0, 0, 0);
        
        // Ajustar para o primeiro dia da semana desejado no range
        const currentDay = currentDate.getDay();
        const daysToAdd = (targetDayNumber - currentDay + 7) % 7;
        currentDate.setDate(currentDate.getDate() + daysToAdd);
        
        // Se o primeiro dia calculado estiver antes da data de início, pular para a próxima semana
        if (currentDate < start) {
            currentDate.setDate(currentDate.getDate() + 7);
        }
        
        // Contar todas as ocorrências do dia da semana no range
        const endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        
        while (currentDate <= endDate) {
            count++;
            currentDate.setDate(currentDate.getDate() + 7); // Próxima semana
        }
        
        return count;
    };

    // Calcular total do orçamento
    const calculateBudgetTotal = () => {
        const enabledDays = budgetDays.filter(day => day.enabled);
        if (enabledDays.length === 0) return 0;

        if (!startDate || !endDate) return 0;
        
        // Criar datas sem problemas de timezone
        const start = new Date(startDate + 'T00:00:00');
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate + 'T23:59:59');
        end.setHours(23, 59, 59, 999);
        
        // Calcular total considerando apenas os dias que realmente ocorrem no período
        let total = 0;
        
        for (const day of enabledDays) {
            // Calcular total do dia
            const subtotal = day.items.reduce((daySum, item) => {
                return daySum + (item.product.priceCents * item.quantity);
            }, 0);
            const dayTotal = Math.max(0, subtotal - day.discountCents);
            
            // Contar quantas vezes este dia da semana ocorre no período
            const occurrences = countDayOccurrences(day.day, start, end);
            
            // Multiplicar o total do dia pelo número de ocorrências
            total += dayTotal * occurrences;
        }

        return total;
    };

    // Calcular total por dia
    const calculateDayTotal = (day: BudgetDay) => {
        const subtotal = day.items.reduce((total, item) => {
            return total + (item.product.priceCents * item.quantity);
        }, 0);
        return Math.max(0, subtotal - day.discountCents);
    };

    // Atualizar desconto de um dia
    const updateDayDiscount = (day: DayOfWeek, discountValue: string) => {
        // Aplicar máscara monetária para valor (seguindo padrão do sistema)
        let value = discountValue;
        
        // Remove tudo que não é dígito
        value = value.replace(/\D/g, '');
        
        // Converte para número (centavos)
        let numValue = parseInt(value || '0');
        
        // Converte centavos para reais para validação
        let realValue = numValue / 100;
        
        setBudgetDays(prev => prev.map(budgetDay => {
            if (budgetDay.day === day) {
                const daySubtotal = budgetDay.items.reduce((total, item) => {
                    return total + (item.product.priceCents * item.quantity);
                }, 0);
                // Não permitir desconto maior que o subtotal do dia
                const finalDiscount = Math.min(numValue, daySubtotal);
                return {
                    ...budgetDay,
                    discountCents: finalDiscount
                };
            }
            return budgetDay;
        }));
    };

    // Aplicar desconto de um dia para outros dias
    const applyDiscountToOtherDays = (sourceDay: DayOfWeek) => {
        const sourceDayData = budgetDays.find(day => day.day === sourceDay);
        if (!sourceDayData || sourceDayData.discountCents === 0) {
            showToast("Dia de origem não possui desconto", "warning");
            return;
        }

        const otherEnabledDays = budgetDays
            .filter(d => d.enabled && d.day !== sourceDay)
            .map(d => d.day);

        if (otherEnabledDays.length === 0) {
            showToast("Não há outros dias habilitados", "warning");
            return;
        }

        setBudgetDays(prev => prev.map(budgetDay => {
            if (otherEnabledDays.includes(budgetDay.day)) {
                const daySubtotal = budgetDay.items.reduce((total, item) => {
                    return total + (item.product.priceCents * item.quantity);
                }, 0);
                // Não permitir desconto maior que o subtotal do dia
                const finalDiscount = Math.min(sourceDayData.discountCents, daySubtotal);
                return {
                    ...budgetDay,
                    discountCents: finalDiscount
                };
            }
            return budgetDay;
        }));

        const targetDayNames = otherEnabledDays.map(day => 
            budgetDays.find(d => d.day === day)?.label
        ).join(", ");
        
        showToast(`Desconto aplicado para: ${targetDayNames}`, "success");
    };

    // Gerar orçamento térmico
    const generateThermalBudget = () => {
        if (!startDate || !endDate) {
            showToast("Por favor, preencha as datas de início e fim", "warning");
            return;
        }

        const enabledDays = budgetDays.filter(day => day.enabled);
        if (enabledDays.length === 0) {
            showToast("Por favor, selecione pelo menos um dia da semana", "warning");
            return;
        }

        const budgetData = {
            customerId,
            customerName,
            startDate,
            endDate,
            days: enabledDays,
            sameProductsAllDays,
            totalCents: calculateBudgetTotal()
        };

        // Criar URL para impressão térmica
        const params = new URLSearchParams({
            data: JSON.stringify(budgetData)
        });

        window.open(`/print/budget-thermal?${params.toString()}`, '_blank');
    };

    // Gerar orçamento completo (A4)
    const generateFullBudget = () => {
        if (!startDate || !endDate) {
            showToast("Por favor, preencha as datas de início e fim", "warning");
            return;
        }

        const enabledDays = budgetDays.filter(day => day.enabled);
        if (enabledDays.length === 0) {
            showToast("Por favor, selecione pelo menos um dia da semana", "warning");
            return;
        }

        const budgetData = {
            customerId,
            customerName,
            startDate,
            endDate,
            days: enabledDays,
            sameProductsAllDays,
            totalCents: calculateBudgetTotal()
        };

        // Criar URL para impressão completa
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

    // Calcular total de dias de entrega (soma de todas as ocorrências dos dias habilitados)
    const calculateTotalDeliveryDays = () => {
        const enabledDays = budgetDays.filter(day => day.enabled);
        if (enabledDays.length === 0 || !startDate || !endDate) return 0;
        
        const start = new Date(startDate + 'T00:00:00');
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate + 'T23:59:59');
        end.setHours(23, 59, 59, 999);
        
        let totalDays = 0;
        for (const day of enabledDays) {
            totalDays += countDayOccurrences(day.day, start, end);
        }
        
        return totalDays;
    };

    const enabledDaysCount = budgetDays.filter(day => day.enabled).length;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
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
                                Configure produtos e dias da semana para {customerName}
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
                                        onChange={(e) => setStartDate(e.target.value)}
                                        max={endDate || undefined}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="endDate">Data de Fim</Label>
                                    <Input
                                        id="endDate"
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        min={startDate || undefined}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Seleção de dias da semana */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-green-600" />
                                Dias da Semana
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {budgetDays.map((day) => (
                                    <div key={day.day} className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors">
                                        <div className="flex items-center justify-between mb-3">
                                            <Label className="text-sm font-semibold text-gray-800">{day.label}</Label>
                                            <Switch
                                                checked={day.enabled}
                                                onCheckedChange={(checked) => {
                                                    setBudgetDays(prev => prev.map(d => 
                                                        d.day === day.day ? { ...d, enabled: checked } : d
                                                    ));
                                                }}
                                            />
                                        </div>
                                        {day.enabled ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-600">
                                                        {day.items.length} produto{day.items.length !== 1 ? 's' : ''}
                                                    </span>
                                                    <span className="font-semibold text-green-600">
                                                        {formatCurrency(calculateDayTotal(day))}
                                                    </span>
                                                </div>
                                                {day.items.length > 0 && (
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                        <div 
                                                            className="bg-green-500 h-1.5 rounded-full transition-all duration-300" 
                                                            style={{ width: `${Math.min((day.items.length / 5) * 100, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-gray-400 text-center py-2">
                                                Dia não selecionado
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                     {/* Produtos por dia */}
                     {enabledDaysCount > 0 && (
                         <Card>
                             <CardHeader>
                                 <CardTitle className="flex items-center gap-2">
                                     <Package className="h-5 w-5 text-purple-600" />
                                     Produtos por Dia
                                 </CardTitle>
                             </CardHeader>
                             <CardContent>
                                 <div className="space-y-2.5">
                                     {budgetDays.filter(day => day.enabled).map((day) => (
                                         <div key={day.day} className="border rounded-lg p-3">
                                             <div className="flex items-center justify-between mb-2">
                                                 <h4 className="font-medium text-sm text-gray-900">{day.label}</h4>
                                                 <Button
                                                     variant="outline"
                                                     size="sm"
                                                     onClick={() => {
                                                         setSelectedDay(day.day);
                                                         setShowProductList(true);
                                                     }}
                                                     className="h-7 px-2 text-xs"
                                                 >
                                                     <Plus className="h-3 w-3 mr-1" />
                                                     Adicionar
                                                 </Button>
                                             </div>
                                             
                                             {day.items.length > 0 ? (
                                                 <>
                                                     <div className="space-y-1.5 mb-3">
                                                         {day.items.map((item) => (
                                                             <div key={item.productId} className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 rounded text-sm">
                                                                 <div className="flex-1 min-w-0">
                                                                     <div className="font-medium truncate">{item.product.name}</div>
                                                                     <div className="text-xs text-gray-500">
                                                                         {formatCurrency(item.product.priceCents)} x {item.quantity}
                                                                     </div>
                                                                 </div>
                                                                 <div className="flex items-center gap-2 ml-2">
                                                                     <Input
                                                                         type="number"
                                                                         min="1"
                                                                         value={item.quantity}
                                                                         onChange={(e) => updateProductQuantity(item.productId, day.day, parseInt(e.target.value) || 1)}
                                                                         className="w-12 h-7 text-center text-xs"
                                                                     />
                                                                     <Button
                                                                         variant="ghost"
                                                                         size="sm"
                                                                         onClick={() => removeProductFromDay(item.productId, day.day)}
                                                                         className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                                                                     >
                                                                         <X className="h-3.5 w-3.5" />
                                                                     </Button>
                                                                 </div>
                                                             </div>
                                                         ))}
                                                     </div>
                                                     
                                                    {/* Resumo e ações compactas */}
                                                    <div className="border-t pt-2.5 space-y-2">
                                                        {/* Chips informativos */}
                                                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                                            <span className="px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700">
                                                                Subtotal: {formatCurrency(day.items.reduce((total, item) => total + (item.product.priceCents * item.quantity), 0))}
                                                            </span>
                                                            {day.discountCents > 0 && (
                                                                <span className="px-2 py-0.5 rounded border border-red-200 bg-red-50 text-red-700">
                                                                    Desconto: -{formatCurrency(day.discountCents)}
                                                                </span>
                                                            )}
                                                            <span className="px-2 py-0.5 rounded border border-green-200 bg-green-50 text-green-700">
                                                                Total: {formatCurrency(calculateDayTotal(day))}
                                                            </span>
                                                        </div>
                                                         
                                                         {/* Desconto e ações em linha */}
                                                         <div className="flex items-center gap-2">
                                                             <div className="relative flex-1">
                                                                 <Tag className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                                                 <Input
                                                                     id={`discount-${day.day}`}
                                                                     type="text"
                                                                     inputMode="decimal"
                                                                     value={(() => {
                                                                         if (day.discountCents === 0) return '';
                                                                         const realValue = day.discountCents / 100;
                                                                         return realValue.toLocaleString('pt-BR', {
                                                                             minimumFractionDigits: 2,
                                                                             maximumFractionDigits: 2
                                                                         });
                                                                     })()}
                                                                     onChange={(e) => updateDayDiscount(day.day, e.target.value)}
                                                                     placeholder="Desconto"
                                                                     className="pl-8 h-7 text-xs"
                                                                 />
                                                             </div>
                                                            <Button
                                                                 variant="outline"
                                                                 size="sm"
                                                                 onClick={() => applyDiscountToOtherDays(day.day)}
                                                                 disabled={day.discountCents === 0}
                                                                title="Aplica este desconto aos outros dias selecionados"
                                                                aria-label="Aplicar desconto aos outros dias"
                                                                className="h-7 px-2 text-xs"
                                                             >
                                                                 <Tag className="h-3 w-3 mr-1" />
                                                                Aplicar desconto
                                                             </Button>
                                                            <Button
                                                                 variant="outline"
                                                                 size="sm"
                                                                 onClick={() => {
                                                                     const otherEnabledDays = budgetDays
                                                                         .filter(d => d.enabled && d.day !== day.day)
                                                                         .map(d => d.day);
                                                                     if (otherEnabledDays.length > 0) {
                                                                         applyProductsFromDay(day.day, otherEnabledDays);
                                                                     } else {
                                                                         showToast("Não há outros dias habilitados", "warning");
                                                                     }
                                                                 }}
                                                                title="Aplica os produtos deste dia aos outros dias selecionados"
                                                                aria-label="Aplicar produtos aos outros dias"
                                                                className="h-7 px-2 text-xs"
                                                             >
                                                                 <Package className="h-3 w-3 mr-1" />
                                                                Aplicar produtos
                                                             </Button>
                                                         </div>
                                                     </div>
                                                 </>
                                             ) : (
                                                 <div className="text-center py-3 text-gray-400 text-sm">
                                                     Nenhum produto
                                                 </div>
                                             )}
                                         </div>
                                     ))}
                                 </div>
                             </CardContent>
                         </Card>
                     )}

                    {/* Resumo do orçamento */}
                    {enabledDaysCount > 0 && startDate && endDate && (
                        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-green-800">
                                    <Calculator className="h-5 w-5" />
                                    Resumo do Orçamento
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="text-center p-3 bg-white rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">
                                            {formatCurrency(calculateBudgetTotal())}
                                        </div>
                                        <div className="text-sm text-gray-600">Valor Total</div>
                                    </div>
                                    <div className="text-center p-3 bg-white rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {enabledDaysCount}
                                        </div>
                                        <div className="text-sm text-gray-600">Dias Selecionados</div>
                                    </div>
                                    <div className="text-center p-3 bg-white rounded-lg">
                                        <div className="text-2xl font-bold text-purple-600">
                                            {calculateTotalDeliveryDays()}
                                        </div>
                                        <div className="text-sm text-gray-600">Dias de Entrega</div>
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
                            onClick={generateThermalBudget}
                            disabled={!startDate || !endDate || enabledDaysCount === 0}
                            className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white border-orange-500 hover:border-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Printer className="h-4 w-4 mr-2" />
                            Impressão Térmica
                        </Button>
                        <Button
                            onClick={generateFullBudget}
                            disabled={!startDate || !endDate || enabledDaysCount === 0}
                            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            Impressão Completa
                        </Button>
                    </div>
                </div>

                {/* Modal de seleção de produtos */}
                {showProductList && selectedDay && (
                    <Dialog open={showProductList} onOpenChange={setShowProductList}>
                        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden p-0 flex flex-col">
                            <DialogTitle className="sr-only">Selecionar Produtos - {budgetDays.find(d => d.day === selectedDay)?.label}</DialogTitle>
                            
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 relative">
                                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
                                <div className="relative p-6 flex items-center justify-between">
                                    <div>
                                        <h2 className="flex items-center gap-3 text-xl font-bold text-gray-900">
                                            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                                <Package className="h-5 w-5 text-blue-600" />
                                            </div>
                                            Selecionar Produtos
                                        </h2>
                                        <p className="text-sm text-gray-600 mt-2 ml-13">
                                            Adicionando produtos para {budgetDays.find(d => d.day === selectedDay)?.label}
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
                                
                                {/* Barra de busca */}
                                <div className="relative px-6 pb-6">
                                    <div className="relative">
                                        <Input
                                            placeholder="Buscar produtos por nome, código ou categoria..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full h-12 pl-10 pr-4 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                                        />
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                            <Package className="h-5 w-5 text-gray-400" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6">
                                {loading ? (
                                    <div className="text-center py-12">
                                        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                                        <p className="mt-4 text-gray-600 text-lg">Carregando produtos...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {filteredProducts.map((product) => (
                                            <button
                                                key={product.id}
                                                onClick={() => {
                                                    addProductToDay(product, selectedDay);
                                                    showToast(`${product.name} adicionado`, "success");
                                                }}
                                                className="group flex items-center gap-3 rounded-lg border border-gray-200 p-3 bg-white transition-all duration-200 hover:border-blue-400 hover:shadow-md hover:scale-[1.01]"
                                            >
                                                {/* Imagem do produto */}
                                                <div className="h-16 w-16 flex-shrink-0 bg-gray-100 flex items-center justify-center overflow-hidden rounded-md border border-gray-200">
                                                    {product.imageUrl ? (
                                                        <img
                                                            src={product.imageUrl}
                                                            alt={product.name}
                                                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                            loading="lazy"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = "none";
                                                                target.parentElement!.innerHTML = `
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package h-8 w-8 text-gray-300">
                                                                        <path d="M12 22l-8-4V6L12 2l8 4v12l-8 4z"/>
                                                                        <path d="M12 2v20"/>
                                                                        <path d="M4 6l8 4 8-4"/>
                                                                    </svg>
                                                                `;
                                                            }}
                                                        />
                                                    ) : (
                                                        <Package className="h-8 w-8 text-gray-300" />
                                                    )}
                                                </div>
                                                
                                                {/* Conteúdo */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-medium text-sm text-gray-900 line-clamp-1 group-hover:text-blue-700 transition-colors mb-1">
                                                        {product.name}
                                                    </h3>
                                                    
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-green-600">
                                                                {product.pricePerKgCents && product.pricePerKgCents > 0 ? (
                                                                    <>{formatCurrency(product.pricePerKgCents)}/kg</>
                                                                ) : (
                                                                    <>{formatCurrency(product.priceCents)}</>
                                                                )}
                                                            </span>
                                                            {product.pricePerKgCents && product.pricePerKgCents > 0 && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                                    Por Quilo
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="h-8 w-8 rounded-md bg-green-500 flex items-center justify-center shadow-sm group-hover:bg-green-600 group-hover:shadow transition-all">
                                                            <Plus className="h-4 w-4 text-white" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-6 border-t bg-gray-50/50">
                                <div className="flex justify-between items-center">
                                    <div className="text-sm text-gray-600">
                                        {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowProductList(false)}
                                            className="px-6 py-2 border-gray-300 hover:bg-gray-100 text-gray-700"
                                        >
                                            Fechar
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
