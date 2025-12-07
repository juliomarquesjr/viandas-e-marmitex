"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, ShoppingBag, Home, MapPin, Phone, FileText } from "lucide-react";
import Link from "next/link";

interface Customer {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    doc: string | null;
    address: any;
}

export default function MobileDashboard() {
    const router = useRouter();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCustomerData();
    }, []);

    const fetchCustomerData = async () => {
        try {
            const response = await fetch('/api/mobile/customer/me');
            if (!response.ok) {
                router.push('/mobile/auth/login');
                return;
            }
            const data = await response.json();
            setCustomer(data.customer);
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            router.push('/mobile/auth/login');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/mobile/auth/logout', {
                method: 'POST',
            });
            router.push('/mobile/auth/login');
            router.refresh();
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">Carregando...</p>
                </div>
            </div>
        );
    }

    if (!customer) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-white p-6 shadow-sm rounded-b-3xl">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Olá, {customer.name.split(' ')[0]}!</h1>
                        <p className="text-gray-500 text-sm">O que vamos pedir hoje?</p>
                    </div>
                    <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                        <User className="h-6 w-6" />
                    </div>
                </div>

                {/* Card de Status */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white shadow-lg shadow-orange-200">
                    <div className="flex items-center gap-3 mb-2">
                        <ShoppingBag className="h-5 w-5" />
                        <span className="font-semibold">Seu último pedido</span>
                    </div>
                    <p className="text-orange-50 text-sm mb-3">Você ainda não fez pedidos hoje.</p>
                    <button className="bg-white text-orange-600 text-xs font-bold py-2 px-4 rounded-xl w-full">
                        Ver Cardápio
                    </button>
                </div>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-6">
                {/* Dados do Cliente */}
                <section className="bg-white p-5 rounded-2xl shadow-sm space-y-4">
                    <h2 className="font-bold text-gray-800 border-b border-gray-100 pb-2">Meus Dados</h2>

                    <div className="flex items-start gap-3">
                        <div className="mt-1 text-orange-500"><Phone className="h-4 w-4" /></div>
                        <div>
                            <p className="text-xs text-gray-400">Telefone</p>
                            <p className="text-sm text-gray-700 font-medium">{customer.phone}</p>
                        </div>
                    </div>

                    {customer.email && (
                        <div className="flex items-start gap-3">
                            <div className="mt-1 text-orange-500"><User className="h-4 w-4" /></div>
                            <div>
                                <p className="text-xs text-gray-400">Email</p>
                                <p className="text-sm text-gray-700 font-medium">{customer.email}</p>
                            </div>
                        </div>
                    )}

                    {customer.doc && (
                        <div className="flex items-start gap-3">
                            <div className="mt-1 text-orange-500"><FileText className="h-4 w-4" /></div>
                            <div>
                                <p className="text-xs text-gray-400">CPF/CNPJ</p>
                                <p className="text-sm text-gray-700 font-medium">{customer.doc}</p>
                            </div>
                        </div>
                    )}

                    {customer.address && (
                        <div className="flex items-start gap-3">
                            <div className="mt-1 text-orange-500"><MapPin className="h-4 w-4" /></div>
                            <div>
                                <p className="text-xs text-gray-400">Endereço</p>
                                <div className="text-sm text-gray-700 font-medium">
                                    <pre className="font-sans whitespace-pre-wrap text-xs">
                                        {JSON.stringify(customer.address, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="font-bold text-gray-800 mb-3">Acesso Rápido</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/mobile/orders/last" className="bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-2 h-32 hover:shadow-md transition-shadow">
                            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                <ShoppingBag className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-medium text-gray-600">Última Compra</span>
                        </Link>
                        <Link href="/mobile/orders/consumption" className="bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-2 h-32 hover:shadow-md transition-shadow">
                            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                <User className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-medium text-gray-600">Meu Consumo</span>
                        </Link>
                    </div>
                </section>

                <button
                    onClick={handleLogout}
                    className="w-full bg-white border border-red-100 text-red-500 font-medium py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
                >
                    <LogOut className="h-5 w-5" />
                    Sair da Conta
                </button>
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 px-6 py-4 flex justify-between items-center rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <button className="flex flex-col items-center gap-1 text-orange-500">
                    <Home className="h-6 w-6" />
                    <span className="text-[10px] font-medium">Início</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-gray-400">
                    <ShoppingBag className="h-6 w-6" />
                    <span className="text-[10px] font-medium">Pedidos</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-gray-400">
                    <User className="h-6 w-6" />
                    <span className="text-[10px] font-medium">Perfil</span>
                </button>
            </div>
        </div>
    );
}
