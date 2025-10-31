"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

type BudgetItem = {
    productId: string;
    product: {
        id: string;
        name: string;
        priceCents: number;
    };
    quantity: number;
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                    <p className="mt-4 text-gray-600">Carregando orçamento...</p>
                </div>
            </div>
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

    const enabledDays = budgetData.days.filter(day => day.enabled);
    const weeks = calculateWeeks();
    const totalPerWeek = budgetData.totalCents / weeks;

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
                            <div className="text-2xl font-bold text-blue-600 print:text-lg">
                                {formatCurrency(totalPerWeek)}
                            </div>
                            <div className="text-xs text-blue-800 print:text-[10px]">Por Semana</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600 print:text-lg">
                                {formatCurrency(budgetData.totalCents)}
                            </div>
                            <div className="text-xs text-green-800 print:text-[10px]">Total Geral</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600 print:text-lg">
                                {enabledDays.length}
                            </div>
                            <div className="text-xs text-purple-800 print:text-[10px]">Dias Selecionados</div>
                        </div>
                    </div>
                </div>

                {/* Detalhamento por Dia */}
                <div className="mb-4 print:mb-2">
                    <h2 className="text-base font-semibold text-gray-900 print:text-sm mb-3 print:mb-1.5">
                        Detalhamento por Dia da Semana
                    </h2>
                    
                    <div className="space-y-3 print:space-y-2">
                        {enabledDays.map((day) => {
                            const subtotal = calculateDaySubtotal(day);
                            const discount = day.discountCents || 0;
                            const total = calculateDayTotal(day);
                            
                            return (
                                <div key={day.day} className="border rounded-lg p-3 print:p-2">
                                    <div className="flex justify-between items-center mb-2 print:mb-1">
                                        <h3 className="text-sm font-semibold text-gray-900 print:text-xs">
                                            {day.label}
                                        </h3>
                                        <div className="text-sm font-bold text-green-600 print:text-xs">
                                            {formatCurrency(total)}
                                        </div>
                                    </div>
                                    
                                    {day.items.length > 0 ? (
                                        <>
                                            <div className="overflow-x-auto mb-2 print:mb-1">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="border-b border-gray-200">
                                                            <th className="text-left py-1 print:py-0.5 text-xs font-medium text-gray-700 print:text-[10px]">
                                                                Produto
                                                            </th>
                                                            <th className="text-center py-1 print:py-0.5 text-xs font-medium text-gray-700 print:text-[10px]">
                                                                Qtd
                                                            </th>
                                                            <th className="text-right py-1 print:py-0.5 text-xs font-medium text-gray-700 print:text-[10px]">
                                                                Preço Unit.
                                                            </th>
                                                            <th className="text-right py-1 print:py-0.5 text-xs font-medium text-gray-700 print:text-[10px]">
                                                                Total
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {day.items.map((item, index) => (
                                                            <tr key={index} className="border-b border-gray-100">
                                                                <td className="py-1 print:py-0.5 text-xs text-gray-900 print:text-[10px]">
                                                                    {item.product.name}
                                                                </td>
                                                                <td className="py-1 print:py-0.5 text-center text-xs text-gray-700 print:text-[10px]">
                                                                    {item.quantity}
                                                                </td>
                                                                <td className="py-1 print:py-0.5 text-right text-xs text-gray-700 print:text-[10px]">
                                                                    {formatCurrency(item.product.priceCents)}
                                                                </td>
                                                                <td className="py-1 print:py-0.5 text-right text-xs font-semibold text-gray-900 print:text-[10px]">
                                                                    {formatCurrency(item.product.priceCents * item.quantity)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            
                                            {/* Resumo do dia com desconto */}
                                            <div className="bg-gray-50 rounded p-2 print:p-1.5 mt-2 print:mt-1">
                                                <div className="grid grid-cols-2 gap-2 print:gap-1.5 mb-1 print:mb-0.5">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-gray-700 print:text-[10px]">Subtotal:</span>
                                                        <span className="text-xs font-medium print:text-[10px]">
                                                            {formatCurrency(subtotal)}
                                                        </span>
                                                    </div>
                                                    {discount > 0 ? (
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs text-red-600 print:text-[10px]">Desconto:</span>
                                                            <span className="text-xs font-medium text-red-600 print:text-[10px]">
                                                                -{formatCurrency(discount)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div></div>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center pt-1 border-t border-gray-300 mt-0.5">
                                                    <span className="text-sm font-semibold text-gray-900 print:text-xs">Total do dia:</span>
                                                    <span className="text-sm font-bold text-green-600 print:text-xs">
                                                        {formatCurrency(total)}
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-2 print:py-1 text-gray-500">
                                            <p className="text-xs print:text-[10px]">Nenhum produto selecionado para este dia</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Observações */}
                <div className="bg-yellow-50 rounded-lg p-3 print:p-2 mb-4 print:mb-2">
                    <h2 className="text-sm font-semibold text-yellow-800 print:text-xs mb-2 print:mb-1">
                        Observações Importantes
                    </h2>
                    <ul className="space-y-1 print:space-y-0.5 text-xs text-yellow-700 print:text-[10px]">
                        <li>• Este é um orçamento estimativo baseado nos produtos e quantidades especificadas</li>
                        <li>• Os valores podem variar conforme a disponibilidade dos produtos</li>
                        <li>• Preços estão sujeitos a alterações sem aviso prévio</li>
                        <li>• O orçamento é válido por 7 dias a partir da data de emissão</li>
                        <li>• Para confirmação do pedido, entre em contato conosco</li>
                    </ul>
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
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                    <p className="mt-4 text-gray-600">Carregando...</p>
                </div>
            </div>
        }>
            <FullBudgetContent />
        </Suspense>
    );
}

