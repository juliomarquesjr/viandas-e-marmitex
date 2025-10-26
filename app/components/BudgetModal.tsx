"use client";

import {
    Calculator,
    Calendar,
    Clock,
    FileText,
    Package,
    Plus,
    Printer,
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
};

type BudgetModalProps = {
    isOpen: boolean;
    onClose: () => void;
    customerId: string;
    customerName: string;
};

const DAYS_OF_WEEK: BudgetDay[] = [
    { day: 'monday', label: 'Segunda-feira', enabled: false, items: [] },
    { day: 'tuesday', label: 'Terça-feira', enabled: false, items: [] },
    { day: 'wednesday', label: 'Quarta-feira', enabled: false, items: [] },
    { day: 'thursday', label: 'Quinta-feira', enabled: false, items: [] },
    { day: 'friday', label: 'Sexta-feira', enabled: false, items: [] },
    { day: 'saturday', label: 'Sábado', enabled: false, items: [] },
    { day: 'sunday', label: 'Domingo', enabled: false, items: [] },
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

        setBudgetDays(prev => prev.map(budgetDay => {
            if (budgetDay.enabled) {
                return {
                    ...budgetDay,
                    items: [...productsToApply]
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
                return {
                    ...budgetDay,
                    items: [...sourceDayData.items]
                };
            }
            return budgetDay;
        }));

        const targetDayNames = targetDays.map(day => 
            budgetDays.find(d => d.day === day)?.label
        ).join(", ");
        
        showToast(`Produtos aplicados para: ${targetDayNames}`, "success");
    };

    // Calcular total do orçamento
    const calculateBudgetTotal = () => {
        const enabledDays = budgetDays.filter(day => day.enabled);
        if (enabledDays.length === 0) return 0;

        const totalPerDay = enabledDays.reduce((total, day) => {
            const dayTotal = day.items.reduce((daySum, item) => {
                return daySum + (item.product.priceCents * item.quantity);
            }, 0);
            return total + dayTotal;
        }, 0);

        // Calcular número de semanas no período
        if (!startDate || !endDate) return 0;
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const weeks = Math.ceil(daysDiff / 7);

        return totalPerDay * weeks;
    };

    // Calcular total por dia
    const calculateDayTotal = (day: BudgetDay) => {
        return day.items.reduce((total, item) => {
            return total + (item.product.priceCents * item.quantity);
        }, 0);
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
                            className="h-10 w-10 rounded-full bg-white/60 hover:bg-white shadow-md border border-gray-200 text-gray-600 hover:text-gray-800 transition-all"
                        >
                            <X className="h-5 w-5" />
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
                                 <div className="space-y-4">
                                     {budgetDays.filter(day => day.enabled).map((day) => (
                                         <div key={day.day} className="border rounded-lg p-4">
                                             <div className="flex items-center justify-between mb-3">
                                                 <h4 className="font-medium text-gray-900">{day.label}</h4>
                                                 <div className="flex items-center gap-2">
                                                     <span className="text-sm text-gray-600">
                                                         Total: {formatCurrency(calculateDayTotal(day))}
                                                     </span>
                                                     <Button
                                                         variant="outline"
                                                         size="sm"
                                                         onClick={() => {
                                                             setSelectedDay(day.day);
                                                             setShowProductList(true);
                                                         }}
                                                         className="h-8 px-3 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300"
                                                     >
                                                         <Plus className="h-4 w-4 mr-1" />
                                                         Adicionar
                                                     </Button>
                                                 </div>
                                             </div>
                                             
                                             {day.items.length > 0 ? (
                                                 <div className="space-y-2">
                                                     {day.items.map((item) => (
                                                         <div key={item.productId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                             <div className="flex-1">
                                                                 <div className="font-medium text-sm">{item.product.name}</div>
                                                                 <div className="text-xs text-gray-600">
                                                                     {formatCurrency(item.product.priceCents)} cada
                                                                 </div>
                                                             </div>
                                                             <div className="flex items-center gap-2">
                                                                 <Input
                                                                     type="number"
                                                                     min="1"
                                                                     value={item.quantity}
                                                                     onChange={(e) => updateProductQuantity(item.productId, day.day, parseInt(e.target.value) || 1)}
                                                                     className="w-16 h-8 text-center"
                                                                 />
                                                                 <Button
                                                                     variant="outline"
                                                                     size="sm"
                                                                     onClick={() => removeProductFromDay(item.productId, day.day)}
                                                                     className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                 >
                                                                     <X className="h-4 w-4" />
                                                                 </Button>
                                                             </div>
                                                         </div>
                                                     ))}
                                                 </div>
                                             ) : (
                                                 <div className="text-center py-4 text-gray-500">
                                                     <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                     <p className="text-sm">Nenhum produto adicionado</p>
                                                 </div>
                                             )}
                                             
                                             {/* Botões de ação para aplicar produtos */}
                                             {day.items.length > 0 && (
                                                 <div className="mt-3 pt-3 border-t border-gray-200">
                                                     <div className="flex flex-wrap gap-2">
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
                                                             className="h-7 px-2 text-xs bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:border-purple-300"
                                                         >
                                                             Aplicar para outros dias
                                                         </Button>
                                                         <Button
                                                             variant="outline"
                                                             size="sm"
                                                             onClick={() => {
                                                                 const allEnabledDays = budgetDays
                                                                     .filter(d => d.enabled)
                                                                     .map(d => d.day);
                                                                 applyProductsFromDay(day.day, allEnabledDays);
                                                             }}
                                                             className="h-7 px-2 text-xs bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300"
                                                         >
                                                             Aplicar para todos os dias
                                                         </Button>
                                                     </div>
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
                                            {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 7))}
                                        </div>
                                        <div className="text-sm text-gray-600">Semanas</div>
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
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 relative">
                                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxkZWZzPjxwYXR0ZXJuIGlkPSJwYXR0ZXJuIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHBhdHRlcm5UcmFuc2Zvcm09InJvdGF0ZSg0NSkiPjxjaXJjbGUgY3g9IjEwIiBjeT0iMTAiIHI9IjAuNSIgZmlsbD0iI2M1YzVjNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNwYXR0ZXJuKSIvPjwvc3ZnPg==')] opacity-5"></div>
                                <div className="relative p-6 flex items-center justify-between">
                                    <div>
                                        <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                                            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                                <Package className="h-5 w-5 text-blue-600" />
                                            </div>
                                            Selecionar Produtos
                                        </DialogTitle>
                                        <p className="text-sm text-gray-600 mt-2 ml-13">
                                            Adicionando produtos para {budgetDays.find(d => d.day === selectedDay)?.label}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowProductList(false)}
                                        className="h-10 w-10 rounded-full bg-white/60 hover:bg-white shadow-md border border-gray-200 text-gray-600 hover:text-gray-800 transition-all"
                                    >
                                        <X className="h-5 w-5" />
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredProducts.map((product) => (
                                            <div key={product.id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-lg transition-all bg-white">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-gray-900 mb-1">{product.name}</div>
                                                        <div className="text-sm text-gray-600 mb-2">
                                                            {product.category?.name}
                                                        </div>
                                                        <div className="text-lg font-bold text-green-600">
                                                            {formatCurrency(product.priceCents)}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            addProductToDay(product, selectedDay);
                                                            showToast(`${product.name} adicionado`, "success");
                                                        }}
                                                        className="h-10 w-10 rounded-xl bg-green-500 hover:bg-green-600 text-white border-green-500 hover:border-green-600 shadow-md hover:shadow-lg transition-all"
                                                    >
                                                        <Plus className="h-5 w-5" />
                                                    </Button>
                                                </div>
                                            </div>
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
