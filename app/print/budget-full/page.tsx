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

function FullBudgetContent() {
    const searchParams = useSearchParams();
    const dataParam = searchParams.get('data');

    const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
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

                // Carregar informações de contato do sistema
                const configResponse = await fetch('/api/config');
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

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(cents / 100);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const calculateDayTotal = (day: BudgetDay) => {
        return day.items.reduce((total, item) => {
            return total + (item.product.priceCents * item.quantity);
        }, 0);
    };

    const calculateWeeks = () => {
        if (!budgetData) return 0;
        const start = new Date(budgetData.startDate);
        const end = new Date(budgetData.endDate);
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
                <div className="text-center mb-8 print:mb-4">
                    <h1 className="text-3xl font-bold text-gray-900 print:text-2xl">{systemTitle}</h1>
                    <p className="text-xl text-gray-600 print:text-lg mt-2">ORÇAMENTO DETALHADO</p>
                    <div className="mt-4 print:mt-2 text-sm text-gray-500 print:text-xs">
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
                <div className="bg-gray-50 rounded-lg p-6 print:p-4 mb-8 print:mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 print:text-lg mb-4 print:mb-2">
                        Informações do Cliente
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
                        <div>
                            <p className="text-sm text-gray-600 print:text-xs">Nome:</p>
                            <p className="font-semibold text-gray-900 print:text-sm">{budgetData.customerName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 print:text-xs">Período:</p>
                            <p className="font-semibold text-gray-900 print:text-sm">
                                {formatDate(budgetData.startDate)} a {formatDate(budgetData.endDate)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 print:text-xs">Duração:</p>
                            <p className="font-semibold text-gray-900 print:text-sm">{weeks} semanas</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 print:text-xs">Dias por semana:</p>
                            <p className="font-semibold text-gray-900 print:text-sm">{enabledDays.length} dias</p>
                        </div>
                    </div>
                </div>

                {/* Resumo Executivo */}
                <div className="bg-blue-50 rounded-lg p-6 print:p-4 mb-8 print:mb-4">
                    <h2 className="text-xl font-semibold text-blue-900 print:text-lg mb-4 print:mb-2">
                        Resumo Executivo
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:gap-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600 print:text-2xl">
                                {formatCurrency(totalPerWeek)}
                            </div>
                            <div className="text-sm text-blue-800 print:text-xs">Por Semana</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600 print:text-2xl">
                                {formatCurrency(budgetData.totalCents)}
                            </div>
                            <div className="text-sm text-green-800 print:text-xs">Total Geral</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-purple-600 print:text-2xl">
                                {enabledDays.length}
                            </div>
                            <div className="text-sm text-purple-800 print:text-xs">Dias Selecionados</div>
                        </div>
                    </div>
                </div>

                {/* Detalhamento por Dia */}
                <div className="mb-8 print:mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 print:text-lg mb-6 print:mb-3">
                        Detalhamento por Dia da Semana
                    </h2>
                    
                    <div className="space-y-6 print:space-y-4">
                        {enabledDays.map((day) => (
                            <div key={day.day} className="border rounded-lg p-6 print:p-4">
                                <div className="flex justify-between items-center mb-4 print:mb-2">
                                    <h3 className="text-lg font-semibold text-gray-900 print:text-base">
                                        {day.label}
                                    </h3>
                                    <div className="text-lg font-bold text-green-600 print:text-base">
                                        {formatCurrency(calculateDayTotal(day))}
                                    </div>
                                </div>
                                
                                {day.items.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-gray-200">
                                                    <th className="text-left py-2 print:py-1 text-sm font-medium text-gray-700 print:text-xs">
                                                        Produto
                                                    </th>
                                                    <th className="text-center py-2 print:py-1 text-sm font-medium text-gray-700 print:text-xs">
                                                        Qtd
                                                    </th>
                                                    <th className="text-right py-2 print:py-1 text-sm font-medium text-gray-700 print:text-xs">
                                                        Preço Unit.
                                                    </th>
                                                    <th className="text-right py-2 print:py-1 text-sm font-medium text-gray-700 print:text-xs">
                                                        Total
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {day.items.map((item, index) => (
                                                    <tr key={index} className="border-b border-gray-100">
                                                        <td className="py-2 print:py-1 text-sm text-gray-900 print:text-xs">
                                                            {item.product.name}
                                                        </td>
                                                        <td className="py-2 print:py-1 text-center text-sm text-gray-700 print:text-xs">
                                                            {item.quantity}
                                                        </td>
                                                        <td className="py-2 print:py-1 text-right text-sm text-gray-700 print:text-xs">
                                                            {formatCurrency(item.product.priceCents)}
                                                        </td>
                                                        <td className="py-2 print:py-1 text-right text-sm font-semibold text-gray-900 print:text-xs">
                                                            {formatCurrency(item.product.priceCents * item.quantity)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 print:py-2 text-gray-500">
                                        <p className="text-sm print:text-xs">Nenhum produto selecionado para este dia</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Resumo Financeiro */}
                <div className="bg-gray-50 rounded-lg p-6 print:p-4 mb-8 print:mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 print:text-lg mb-4 print:mb-2">
                        Resumo Financeiro
                    </h2>
                    
                    <div className="space-y-3 print:space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-700 print:text-sm">Total por dia:</span>
                            <span className="font-semibold print:text-sm">
                                {formatCurrency(enabledDays.reduce((total, day) => total + calculateDayTotal(day), 0))}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-700 print:text-sm">Total por semana:</span>
                            <span className="font-semibold print:text-sm">
                                {formatCurrency(totalPerWeek)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-700 print:text-sm">Número de semanas:</span>
                            <span className="font-semibold print:text-sm">{weeks}</span>
                        </div>
                        <div className="border-t border-gray-300 pt-3 print:pt-2">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold text-gray-900 print:text-base">
                                    TOTAL GERAL:
                                </span>
                                <span className="text-xl font-bold text-green-600 print:text-lg">
                                    {formatCurrency(budgetData.totalCents)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Observações */}
                <div className="bg-yellow-50 rounded-lg p-6 print:p-4 mb-8 print:mb-4">
                    <h2 className="text-lg font-semibold text-yellow-800 print:text-base mb-3 print:mb-2">
                        Observações Importantes
                    </h2>
                    <ul className="space-y-2 print:space-y-1 text-sm text-yellow-700 print:text-xs">
                        <li>• Este é um orçamento estimativo baseado nos produtos e quantidades especificadas</li>
                        <li>• Os valores podem variar conforme a disponibilidade dos produtos</li>
                        <li>• Preços estão sujeitos a alterações sem aviso prévio</li>
                        <li>• O orçamento é válido por 7 dias a partir da data de emissão</li>
                        <li>• Para confirmação do pedido, entre em contato conosco</li>
                    </ul>
                </div>

                {/* Informações de Contato */}
                {contactInfo && (
                    <div className="text-center text-sm text-gray-600 print:text-xs">
                        <div className="mb-2 print:mb-1">
                            <strong>{systemTitle}</strong>
                        </div>
                        {contactInfo.address && (
                            <div className="mb-1 print:mb-0">
                                {contactInfo.address}
                            </div>
                        )}
                        <div className="mb-1 print:mb-0">
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
