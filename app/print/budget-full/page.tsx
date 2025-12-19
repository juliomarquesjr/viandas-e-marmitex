"use client";

import { ReportLoading } from '@/app/components/ReportLoading';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

type BudgetItem = {
    productId: string;
    product: {
        id: string;
        name: string;
        priceCents: number;
        pricePerKgCents?: number;
    };
    quantity: number;
    weightKg?: number | null;
};

type BudgetDay = {
    day: string;
    label: string;
    enabled: boolean;
    items: BudgetItem[];
    discountCents?: number;
};

type BudgetData = {
    customerId: string;
    customerName: string;
    startDate: string;
    endDate: string;
    days: BudgetDay[];
    sameProductsAllDays: boolean;
    totalCents: number;
};

type Customer = {
    id: string;
    name: string;
    phone: string;
    email?: string;
    doc?: string;
    address?: {
        street?: string;
        number?: string;
        complement?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
        zip?: string;
    };
};

function FullBudgetContent() {
    const searchParams = useSearchParams();
    const dataParam = searchParams.get('data');

    const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [contactInfo, setContactInfo] = useState<{
        address: string;
        phones: { mobile: string; landline: string };
        email?: string;
    } | null>(null);
    const [systemTitle, setSystemTitle] = useState<string>('COMIDA CASEIRA');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!dataParam) {
                setError('Dados do orçamento não fornecidos');
                setLoading(false);
                return;
            }

            try {
                // Decodificar dados do orçamento
                const budget = JSON.parse(decodeURIComponent(dataParam));
                setBudgetData(budget);

                // Carregar dados do cliente e informações de contato do sistema em paralelo
                const [customerResponse, configResponse] = await Promise.all([
                    fetch(`/api/customers/${budget.customerId}`),
                    fetch('/api/config')
                ]);

                // Processar dados do cliente
                if (customerResponse.ok) {
                    const customerData = await customerResponse.json();
                    setCustomer(customerData);
                }

                // Processar informações de contato do sistema
                if (configResponse.ok) {
                    const config = await configResponse.json();
                    setSystemTitle(config.data?.systemTitle || 'COMIDA CASEIRA');
                    
                    const address = config.data?.address || '';
                    const mobilePhone = config.data?.mobilePhone || '';
                    const landlinePhone = config.data?.landlinePhone || '';
                    const email = config.data?.email || '';
                    
                    setContactInfo({
                        address,
                        phones: { mobile: mobilePhone, landline: landlinePhone },
                        email
                    });
                }
            } catch (err) {
                console.error('Erro ao carregar dados:', err);
                setError('Erro ao carregar dados do orçamento');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [dataParam]);

    // Auto print when page loads
    useEffect(() => {
        if (budgetData && !loading && !error) {
            // Small delay to ensure content is rendered
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [budgetData, loading, error]);

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(cents / 100);
    };

    const formatCustomerAddress = (address?: Customer['address']) => {
        if (!address) return null;
        
        const parts = [
            address.street && `${address.street}${address.number ? `, ${address.number}` : ''}`,
            address.complement,
            address.neighborhood,
            address.city && address.state && `${address.city}/${address.state}`,
            address.zip
        ].filter(Boolean);
        
        return parts.length > 0 ? parts.join(', ') : null;
    };

    const parseLocalDate = (dateString: string): Date => {
        // For date strings in YYYY-MM-DD format, parse directly to avoid timezone conversion
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateString.split('-').map(Number);
            // Create date in local timezone
            return new Date(year, month - 1, day);
        }
        // For datetime strings, use the date as is
        return new Date(dateString);
    };

    const formatDate = (dateString: string) => {
        const date = parseLocalDate(dateString);
        return date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const calculateDaySubtotal = (day: BudgetDay) => {
        return day.items.reduce((total, item) => {
            return total + (item.product.priceCents * item.quantity);
        }, 0);
    };

    const calculateDayTotal = (day: BudgetDay) => {
        const subtotal = calculateDaySubtotal(day);
        const discount = day.discountCents || 0;
        return Math.max(0, subtotal - discount);
    };

    const calculateWeeks = () => {
        if (!budgetData) return 0;
        const start = parseLocalDate(budgetData.startDate);
        const end = parseLocalDate(budgetData.endDate);
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return Math.ceil(daysDiff / 7);
    };

    // Gerar todas as datas do período
    const generateAllDatesInPeriod = () => {
        if (!budgetData) return [];
        const dates: string[] = [];
        const start = parseLocalDate(budgetData.startDate);
        const end = parseLocalDate(budgetData.endDate);
        
        const currentDate = new Date(start);
        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            dates.push(dateStr);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return dates;
    };

    // Obter o dia da semana de uma data
    const getDayOfWeek = (dateString: string): string => {
        const date = parseLocalDate(dateString);
        const dayIndex = date.getDay();
        const dayNames = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
        return dayNames[dayIndex];
    };

    // Obter dados do dia da semana para uma data específica
    const getDayDataForDate = (dateString: string): BudgetDay | null => {
        const dayOfWeek = getDayOfWeek(dateString);
        // Mapear para o formato usado no BudgetDay
        const dayMap: Record<string, string> = {
            'domingo': 'sunday',
            'segunda-feira': 'monday',
            'terça-feira': 'tuesday',
            'quarta-feira': 'wednesday',
            'quinta-feira': 'thursday',
            'sexta-feira': 'friday',
            'sábado': 'saturday'
        };
        
        const dayKey = dayMap[dayOfWeek];
        if (!dayKey) return null;
        
        return budgetData?.days.find(day => day.day === dayKey) || null;
    };

    const calculateTotalPerWeek = () => {
        if (!budgetData) return 0;
        
        // Calcular o total de uma semana típica somando os totais de cada dia habilitado
        // Cada dia habilitado ocorre uma vez por semana
        const enabledDays = budgetData.days.filter(day => day.enabled);
        return enabledDays.reduce((total, day) => {
            const dayTotal = calculateDayTotal(day);
            return total + dayTotal;
        }, 0);
    };

    if (loading) {
        return (
            <ReportLoading 
                title="Gerando Orçamento"
                subtitle="Processando dados..."
            />
        );
    }

    if (error || !budgetData) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-red-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Erro ao carregar orçamento
                    </h3>
                    <p className="text-gray-600">
                        {error || "Dados do orçamento não encontrados"}
                    </p>
                </div>
            </div>
        );
    }

    // Calcular total de desconto (considerando quantas vezes cada dia ocorre no período)
    const calculateTotalDiscount = () => {
        if (!budgetData) return 0;
        const allDates = generateAllDatesInPeriod();
        let totalDiscount = 0;
        
        allDates.forEach(dateStr => {
            const dayData = getDayDataForDate(dateStr);
            if (dayData && dayData.enabled && dayData.discountCents) {
                totalDiscount += dayData.discountCents;
            }
        });
        
        return totalDiscount;
    };

    // Contar quantas datas do período têm itens
    const countDatesWithItems = () => {
        if (!budgetData) return 0;
        const allDates = generateAllDatesInPeriod();
        return allDates.filter(dateStr => {
            const dayData = getDayDataForDate(dateStr);
            return dayData && dayData.enabled && dayData.items.length > 0;
        }).length;
    };

    const totalDiscount = calculateTotalDiscount();
    const datesWithItems = countDatesWithItems();

    return (
        <div className="min-h-screen bg-white p-8 print:p-0">
            <div className="max-w-4xl mx-auto print:max-w-none print:mx-0">
                {/* Header */}
                <div className="text-center mb-4 print:mb-2">
                    <h1 className="text-2xl font-bold text-gray-900 print:text-lg">{systemTitle}</h1>
                    <p className="text-lg text-gray-600 print:text-sm mt-1 print:mt-0.5">ORÇAMENTO DETALHADO</p>
                    <div className="mt-2 print:mt-1 text-xs text-gray-500 print:text-[10px]">
                        Gerado em {new Date().toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit", 
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                        })}
                    </div>
                </div>

                {/* Informações do Cliente */}
                <div className="bg-gray-50 rounded-lg p-4 print:p-2 mb-4 print:mb-2">
                    <h2 className="text-lg font-semibold text-gray-900 print:text-sm mb-2 print:mb-1">
                        Informações do Cliente
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 print:gap-1.5 budget-customer-grid">
                        <div>
                            <p className="text-xs text-gray-600 print:text-[10px]">Nome:</p>
                            <p className="font-semibold text-gray-900 print:text-xs">{budgetData.customerName}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-600 print:text-[10px]">Período:</p>
                            <p className="font-semibold text-gray-900 print:text-xs">
                                {formatDate(budgetData.startDate)} a {formatDate(budgetData.endDate)}
                            </p>
                        </div>
                    </div>
                    {customer && formatCustomerAddress(customer.address) && (
                        <div className="mt-2 print:mt-1 pt-2 print:pt-1 border-t border-gray-200">
                            <p className="text-xs text-gray-600 print:text-[10px] mb-0.5">Endereço:</p>
                            <p className="font-semibold text-gray-900 print:text-xs">
                                {formatCustomerAddress(customer.address)}
                            </p>
                        </div>
                    )}
                </div>

                {/* Resumo Executivo */}
                <div className="bg-blue-50 rounded-lg p-3 print:p-2 mb-4 print:mb-2">
                    <h2 className="text-base font-semibold text-blue-900 print:text-sm mb-2 print:mb-1">
                        Resumo Executivo
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 print:gap-2 budget-executive-grid">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600 print:text-lg">
                                {formatCurrency(budgetData.totalCents)}
                            </div>
                            <div className="text-xs text-green-800 print:text-[10px]">Total Geral</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600 print:text-lg">
                                {formatCurrency(totalDiscount)}
                            </div>
                            <div className="text-xs text-red-800 print:text-[10px]">Total de Desconto</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600 print:text-lg">
                                {datesWithItems}
                            </div>
                            <div className="text-xs text-purple-800 print:text-[10px]">Dias Selecionados</div>
                        </div>
                    </div>
                </div>

                {/* Detalhamento por Data do Período */}
                <div className="mb-2 print:mb-1">
                    <h2 className="text-sm font-semibold text-gray-900 print:text-xs mb-2 print:mb-1">
                        Detalhamento por Data do Período
                    </h2>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-[9px] print:text-[8px]">
                            <thead>
                                <tr className="border-b border-gray-400">
                                    <th className="text-left py-0 print:py-0 px-0.5 print:px-0.5 font-semibold text-gray-900 w-[12%]">
                                        Data
                                    </th>
                                    <th className="text-left py-0 print:py-0 px-0.5 print:px-0.5 font-semibold text-gray-900">
                                        Itens
                                    </th>
                                    <th className="text-center py-0 print:py-0 px-0.5 print:px-0.5 font-semibold text-gray-900 w-[8%]">
                                        Qtd
                                    </th>
                                    <th className="text-right py-0 print:py-0 px-0.5 print:px-0.5 font-semibold text-gray-900 w-[12%]">
                                        Total
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {generateAllDatesInPeriod().map((dateStr) => {
                                    const dayData = getDayDataForDate(dateStr);
                                    
                                    if (!dayData || !dayData.enabled || dayData.items.length === 0) {
                                        return null;
                                    }
                                    
                                    const discount = dayData.discountCents || 0;
                                    const total = calculateDayTotal(dayData);
                                    
                                    // Formatar itens separados por vírgula
                                    const itemsText = dayData.items.map((item) => {
                                        const qty = item.weightKg && Number(item.weightKg) > 0 
                                            ? `${Number(item.weightKg).toFixed(2)}kg` 
                                            : item.quantity;
                                        return `${item.product.name} (${qty})`;
                                    }).join(', ');
                                    
                                    return (
                                        <tr key={dateStr} className="border-b border-gray-200">
                                            <td className="py-0 print:py-0 px-0.5 print:px-0.5 font-semibold text-gray-900 text-[9px] print:text-[8px]">
                                                {formatDate(dateStr)}
                                            </td>
                                            <td className="py-0 print:py-0 px-0.5 print:px-0.5 text-gray-900 text-[9px] print:text-[8px]">
                                                {itemsText}
                                            </td>
                                            <td className="py-0 print:py-0 px-0.5 print:px-0.5 text-center text-gray-700 text-[9px] print:text-[8px]">
                                                {dayData.items.length}
                                            </td>
                                            <td className="py-0 print:py-0 px-0.5 print:px-0.5 text-right font-bold text-green-700 text-[9px] print:text-[8px]">
                                                {formatCurrency(total)}
                                                {discount > 0 && ` (desc: -${formatCurrency(discount)})`}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Informações de Contato */}
                {contactInfo && (
                    <div className="text-center text-xs text-gray-600 print:text-[10px] mt-2 print:mt-1">
                        <div className="mb-1 print:mb-0.5">
                            <strong>{systemTitle}</strong>
                        </div>
                        {contactInfo.address && (
                            <div className="mb-0.5 print:mb-0">
                                {contactInfo.address}
                            </div>
                        )}
                        <div className="mb-0.5 print:mb-0">
                            {contactInfo.phones.mobile && `Tel: ${contactInfo.phones.mobile}`}
                            {contactInfo.phones.mobile && contactInfo.phones.landline && ' | '}
                            {contactInfo.phones.landline && `Tel: ${contactInfo.phones.landline}`}
                        </div>
                        {contactInfo.email && (
                            <div>
                                Email: {contactInfo.email}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Estilos específicos para impressão */}
            <style jsx global>{`
                /* Em tela normal, as classes customizadas não fazem nada - o Tailwind controla */
                .budget-customer-grid,
                .budget-executive-grid {
                    /* Deixa o Tailwind controlar via grid-cols-1 md:grid-cols-X */
                }
                
                @media print {
                    /* Em impressão, força as colunas corretas */
                    .budget-customer-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                    }
                    
                    .budget-executive-grid {
                        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default function FullBudgetPage() {
    return (
        <Suspense fallback={
            <ReportLoading 
                title="Carregando Orçamento"
                subtitle="Aguarde um momento..."
            />
        }>
            <FullBudgetContent />
        </Suspense>
    );
}

