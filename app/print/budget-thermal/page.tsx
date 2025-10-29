"use client";

import { ThermalFooter } from '@/app/components/ThermalFooter';
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

function ThermalBudgetContent() {
    const searchParams = useSearchParams();
    const dataParam = searchParams.get('data');

    const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [contactInfo, setContactInfo] = useState<{
        address: string;
        phones: { mobile: string; landline: string };
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
                    const configs = await configResponse.json();
                    const contactConfigs = configs.filter((config: any) => config.category === 'contact');
                    const brandingConfigs = configs.filter((config: any) => config.category === 'branding');
                    
                    // Extrair título do sistema
                    const systemTitleConfig = brandingConfigs.find((c: any) => c.key === 'branding_system_title');
                    if (systemTitleConfig?.value) {
                        setSystemTitle(systemTitleConfig.value.toUpperCase());
                    }
                    
                    // Construir endereço
                    const addressParts = [
                        contactConfigs.find((c: any) => c.key === 'contact_address_street')?.value,
                        contactConfigs.find((c: any) => c.key === 'contact_address_number')?.value,
                        contactConfigs.find((c: any) => c.key === 'contact_address_neighborhood')?.value,
                        contactConfigs.find((c: any) => c.key === 'contact_address_city')?.value,
                        contactConfigs.find((c: any) => c.key === 'contact_address_state')?.value,
                        contactConfigs.find((c: any) => c.key === 'contact_address_zipcode')?.value,
                        contactConfigs.find((c: any) => c.key === 'contact_address_complement')?.value
                    ].filter(part => part && part.trim());
                    
                    const formattedAddress = addressParts.join(', ');
                    
                    // Extrair telefones
                    const mobile = contactConfigs.find((c: any) => c.key === 'contact_phone_mobile')?.value || '';
                    const landline = contactConfigs.find((c: any) => c.key === 'contact_phone_landline')?.value || '';
                    
                    setContactInfo({
                        address: formattedAddress,
                        phones: { mobile, landline }
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
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
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

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("pt-BR", {
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
        const start = new Date(budgetData.startDate);
        const end = new Date(budgetData.endDate);
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return Math.ceil(daysDiff / 7);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="text-sm mb-2">Carregando...</div>
                </div>
            </div>
        );
    }

    if (error || !budgetData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center text-red-600">
                    <div className="text-sm mb-2">Erro ao carregar</div>
                    <div className="text-xs">{error || 'Orçamento não encontrado'}</div>
                </div>
            </div>
        );
    }

    const enabledDays = budgetData.days.filter(day => day.enabled);
    const weeks = calculateWeeks();

    return (
        <div className="thermal-report">
            {/* Header - Thermal Style */}
            <div className="thermal-header">
                {/* Logo */}
                <div className="thermal-logo">
                    <img 
                        src="/img/logo_print.png" 
                        alt="Logo Comida Caseira" 
                        className="thermal-logo-img"
                    />
                </div>
                
                <div className="thermal-title">
                    {systemTitle}
                </div>
                <div className="thermal-subtitle">
                    ORÇAMENTO
                </div>
                <div className="thermal-period">
                    {formatDate(budgetData.startDate)} a {formatDate(budgetData.endDate)}
                </div>
            </div>

            {/* Customer Info */}
            <div className="thermal-section">
                <div className="thermal-section-title">
                    CLIENTE:
                </div>
                <div className="thermal-text">
                    {budgetData.customerName}
                </div>
                {customer?.phone && (
                    <div className="thermal-text">
                        Tel: {customer.phone}
                    </div>
                )}
                {customer?.doc && (
                    <div className="thermal-text">
                        Doc: {customer.doc}
                    </div>
                )}
                {customer && formatCustomerAddress(customer.address) && (
                    <div className="thermal-text">
                        {formatCustomerAddress(customer.address)}
                    </div>
                )}
            </div>

            {/* Period Info */}
            <div className="thermal-section">
                <div className="thermal-section-title">
                    PERÍODO:
                </div>
                <div className="thermal-text">
                    {formatDate(budgetData.startDate)} a {formatDate(budgetData.endDate)}
                </div>
                <div className="thermal-text">
                    {weeks} semana{weeks !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Days and Products */}
            <div className="thermal-section">
                <div className="thermal-section-title">
                    DIAS SELECIONADOS:
                </div>
                
                {enabledDays.map((day, index) => {
                    const subtotal = calculateDaySubtotal(day);
                    const discount = day.discountCents || 0;
                    const total = calculateDayTotal(day);
                    
                    return (
                        <div key={day.day} className="thermal-transaction">
                            <div className="thermal-row">
                                <span className="thermal-date">{day.label}</span>
                                <span className="thermal-transaction-value">
                                    {formatCurrency(total)}
                                </span>
                            </div>
                            
                            <div className="thermal-description">
                                {day.items.length} produto{day.items.length !== 1 ? 's' : ''}
                                {day.items.length > 0 && (
                                    <div className="thermal-item-details" style={{marginTop: '2px'}}>
                                        {day.items.map((item, itemIndex) => (
                                            <div key={itemIndex} className="thermal-text" style={{fontSize: '11px', marginBottom: '1px'}}>
                                                {item.quantity}x {item.product.name.length > 25 
                                                    ? `${item.product.name.substring(0, 22)}...` 
                                                    : item.product.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {discount > 0 && (
                                    <div className="thermal-description" style={{marginTop: '4px', paddingTop: '2px', borderTop: '1px dotted #333'}}>
                                        <div className="thermal-text" style={{fontSize: '11px', marginBottom: '1px'}}>
                                            Subtotal: {formatCurrency(subtotal)}
                                        </div>
                                        <div className="thermal-text" style={{fontSize: '11px', marginBottom: '1px'}}>
                                            Desconto: -{formatCurrency(discount)}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {index < enabledDays.length - 1 && (
                                <div className="thermal-divider"></div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Totals */}
            <div className="thermal-section">
                <div className="thermal-section-title">
                    RESUMO FINANCEIRO:
                </div>
                
                {(() => {
                    const totalSubtotal = enabledDays.reduce((sum, day) => sum + calculateDaySubtotal(day), 0) * weeks;
                    const totalDiscount = enabledDays.reduce((sum, day) => sum + (day.discountCents || 0), 0) * weeks;
                    const totalWithDiscount = budgetData.totalCents;
                    
                    return (
                        <>
                            <div className="thermal-row">
                                <span>Subtotal por semana:</span>
                                <span className="thermal-value">
                                    {formatCurrency(totalSubtotal / weeks)}
                                </span>
                            </div>
                            {totalDiscount > 0 && (
                                <div className="thermal-row">
                                    <span>Desconto por semana:</span>
                                    <span className="thermal-value">
                                        -{formatCurrency(totalDiscount / weeks)}
                                    </span>
                                </div>
                            )}
                            <div className="thermal-row">
                                <span>Por semana:</span>
                                <span className="thermal-value">
                                    {formatCurrency(totalWithDiscount / weeks)}
                                </span>
                            </div>
                            <div className="thermal-row">
                                <span>Semanas:</span>
                                <span className="thermal-value">
                                    {weeks}
                                </span>
                            </div>
                            <div className="thermal-row thermal-total">
                                <span>TOTAL GERAL:</span>
                                <span className="thermal-value">
                                    {formatCurrency(totalWithDiscount)}
                                </span>
                            </div>
                        </>
                    );
                })()}
            </div>

            {/* Footer */}
            <div className="thermal-footer">
                <div className="thermal-text">Gerado em:</div>
                <div className="thermal-text">
                    {new Date().toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </div>
            </div>

            {/* Contact Footer */}
            <ThermalFooter contactInfo={contactInfo || undefined} />

            {/* Print button for screen view */}
            <div className="no-print thermal-print-btn">
                <button
                    onClick={() => window.print()}
                    className="thermal-btn"
                >
                    Imprimir Orçamento
                </button>
            </div>

            {/* Thermal printer specific styles */}
            <style jsx global>{`
                /* Estilos base para impressão térmica */
                .thermal-report {
                    font-family: 'Consolas', 'Monaco', 'Lucida Console', 'Liberation Mono', 'DejaVu Sans Mono', 'Bitstream Vera Sans Mono', 'Courier New', monospace;
                    font-size: 14px;
                    font-weight: 500;
                    line-height: 1.3;
                    max-width: 280px;
                    margin: 0 auto;
                    padding: 8px;
                    background: white;
                }
                
                /* Cabeçalho */
                .thermal-header {
                    text-align: center;
                    margin-bottom: 8px;
                    border-bottom: 2px solid #000;
                    padding-bottom: 6px;
                }
                
                /* Logo */
                .thermal-logo {
                    margin-bottom: 6px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                
                .thermal-logo-img {
                    max-width: 50px;
                    max-height: 50px;
                    width: auto;
                    height: auto;
                    filter: brightness(0) contrast(100%);
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                
                .thermal-title {
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 2px;
                }
                
                .thermal-subtitle {
                    font-size: 13px;
                    margin-bottom: 2px;
                }
                
                .thermal-period {
                    font-size: 12px;
                }
                
                /* Seções */
                .thermal-section {
                    margin-bottom: 8px;
                    border-bottom: 2px solid #000;
                    padding-bottom: 6px;
                }
                
                .thermal-section-title {
                    font-size: 13px;
                    font-weight: 600;
                    margin-bottom: 4px;
                }
                
                .thermal-text {
                    font-size: 12px;
                    font-weight: 500;
                    margin-bottom: 2px;
                }
                
                /* Linhas de dados */
                .thermal-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 14px;
                    font-weight: 500;
                    margin-bottom: 2px;
                }
                
                .thermal-value {
                    font-weight: 500;
                }
                
                .thermal-total {
                    font-size: 16px;
                    font-weight: 500;
                    border-top: 2px solid #000;
                    padding-top: 4px;
                    margin-top: 4px;
                }
                
                /* Transações (relatórios) */
                .thermal-transaction {
                    margin-bottom: 6px;
                    font-size: 12px;
                    font-weight: 500;
                }
                
                .thermal-date {
                    font-size: 12px;
                    font-weight: 500;
                }
                
                .thermal-transaction-value {
                    font-weight: 500;
                    font-size: 14px;
                }
                
                .thermal-description {
                    font-size: 12px;
                    font-weight: 500;
                    word-wrap: break-word;
                }
                
                /* Separadores */
                .thermal-divider {
                    border-bottom: 1px solid #333;
                    margin: 4px 0;
                }
                
                /* Rodapé */
                .thermal-footer {
                    text-align: center;
                    font-size: 12px;
                    font-weight: 500;
                    color: #333;
                    margin-top: 8px;
                    padding-top: 6px;
                    border-top: 3px solid #000;
                }
                
                /* Seção de Contato */
                .thermal-contact-section {
                    margin: 8px 0;
                    text-align: left;
                }
                
                .thermal-contact-title {
                    font-size: 13px;
                    font-weight: 500;
                    margin-bottom: 4px;
                    color: #000 !important;
                }
                
                .thermal-contact-info {
                    font-size: 12px;
                    font-weight: 500;
                    margin-bottom: 10px;
                    color: #000 !important;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .thermal-icon {
                    width: 14px;
                    height: 14px;
                    filter: brightness(0) contrast(100%);
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                
                .thermal-separator {
                    margin: 8px 0;
                    font-weight: 500;
                    font-size: 12px;
                    color: #000;
                }
                
                /* Botões (apenas para tela) */
                .thermal-print-btn {
                    text-align: center;
                    margin-top: 16px;
                }
                
                .thermal-btn {
                    background-color: #2563eb;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 6px;
                    border: none;
                    font-size: 14px;
                    cursor: pointer;
                    font-family: system-ui, -apple-system, sans-serif;
                }
                
                .thermal-btn:hover {
                    background-color: #1d4ed8;
                }
                
                /* Estilos específicos para impressão */
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    
                    .no-print {
                        display: none !important;
                    }
                    
                    * {
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    
                    .thermal-report {
                        max-width: none;
                        width: 58mm;
                        margin: 0;
                        padding: 2mm;
                    }
                    
                    @page {
                        size: 58mm auto;
                        margin: 0;
                    }
                }
            `}</style>
        </div>
    );
}

export default function ThermalBudgetPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                    <p className="mt-4 text-gray-600">Carregando...</p>
                </div>
            </div>
        }>
            <ThermalBudgetContent />
        </Suspense>
    );
}
