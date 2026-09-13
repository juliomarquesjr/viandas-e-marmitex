"use client";

import { ReportLoading } from '@/app/components/ReportLoading';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

type BudgetItem = {
    productId: string;
    name: string;
    priceCents: number;
    quantity: number;
    weightKg?: number | null;
};

type BudgetDate = {
    date: string;
    items: BudgetItem[];
    discountCents?: number;
};

type BudgetData = {
    customerId: string;
    customerName: string;
    startDate: string;
    endDate: string;
    dates: BudgetDate[];
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
    const keyParam = searchParams.get('key');
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
            // O payload chega pelo localStorage (chave na URL) para não estourar o
            // limite de tamanho da URL; o parâmetro `data` é o fallback.
            let raw: string | null = null;
            if (keyParam) {
                try {
                    raw = window.localStorage.getItem(keyParam);
                } catch {
                    raw = null;
                }
            }
            if (!raw && dataParam) {
                raw = dataParam;
            }

            if (!raw) {
                setError('Dados do orçamento não fornecidos');
                setLoading(false);
                return;
            }

            try {
                const budget: BudgetData = JSON.parse(raw);
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
    }, [keyParam, dataParam]);

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

    const calculateDaySubtotal = (budgetDate: BudgetDate) => {
        return budgetDate.items.reduce((total, item) => {
            return total + (item.priceCents * item.quantity);
        }, 0);
    };

    const calculateDayTotal = (budgetDate: BudgetDate) => {
        const subtotal = calculateDaySubtotal(budgetDate);
        const discount = budgetDate.discountCents || 0;
        return Math.max(0, subtotal - discount);
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

    // Datas exatamente como planejadas no calendário, em ordem cronológica
    const selectedDates = [...budgetData.dates]
        .filter((budgetDate) => budgetDate.items.length > 0)
        .sort((a, b) => a.date.localeCompare(b.date));

    const totalDiscount = selectedDates.reduce(
        (total, budgetDate) => total + (budgetDate.discountCents || 0),
        0
    );
    const datesWithItems = selectedDates.length;

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
                                {selectedDates.map((budgetDate) => {
                                    const discount = budgetDate.discountCents || 0;
                                    const total = calculateDayTotal(budgetDate);
                                    
                                    // Formatar itens separados por vírgula
                                    const itemsText = budgetDate.items.map((item) => {
                                        const qty = item.weightKg && Number(item.weightKg) > 0 
                                            ? `${Number(item.weightKg).toFixed(2)}kg` 
                                            : item.quantity;
                                        return `${item.name} (${qty})`;
                                    }).join(', ');
                                    
                                    return (
                                        <tr key={budgetDate.date} className="border-b border-gray-200">
                                            <td className="py-0 print:py-0 px-0.5 print:px-0.5 font-semibold text-gray-900 text-[9px] print:text-[8px]">
                                                {formatDate(budgetDate.date)}
                                            </td>
                                            <td className="py-0 print:py-0 px-0.5 print:px-0.5 text-gray-900 text-[9px] print:text-[8px]">
                                                {itemsText}
                                            </td>
                                            <td className="py-0 print:py-0 px-0.5 print:px-0.5 text-center text-gray-700 text-[9px] print:text-[8px]">
                                                {budgetDate.items.length}
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

