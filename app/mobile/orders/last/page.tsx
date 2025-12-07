import { getMobileSession } from "@/lib/mobile-auth";
import { redirect } from "next/navigation";
import { ArrowLeft, Calendar, CreditCard, Package, Clock } from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/prisma";

interface MobileSession {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    role: string;
}

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(cents / 100);
}

function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}

const paymentMethodLabels: Record<string, string> = {
    cash: 'Dinheiro',
    credit: 'Cartão de Crédito',
    debit: 'Cartão de Débito',
    pix: 'PIX',
    invoice: 'Fiado',
    ficha_payment: 'Pagamento de Ficha'
};

const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    ready: 'Pronto',
    delivered: 'Entregue',
    cancelled: 'Cancelado'
};

export default async function LastPurchasePage() {
    const session = (await getMobileSession()) as MobileSession | null;

    if (!session) {
        redirect("/mobile/auth/login");
    }

    // Buscar último pedido
    const lastOrder = await prisma.order.findFirst({
        where: {
            customerId: session.id,
        },
        include: {
            items: {
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                        }
                    }
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return (
        <div className="min-h-screen bg-gray-50 pb-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 pb-8 rounded-b-3xl shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                    <Link href="/mobile/dashboard" className="text-white">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Última Compra</h1>
                </div>
            </div>

            <div className="px-6 -mt-4">
                {!lastOrder ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Você ainda não fez nenhum pedido</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Card do Pedido */}
                        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs text-gray-400 mb-1">Data do Pedido</p>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-orange-500" />
                                        <p className="font-medium text-gray-800">{formatDate(lastOrder.createdAt)}</p>
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${lastOrder.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                        lastOrder.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                            'bg-blue-100 text-blue-700'
                                    }`}>
                                    {statusLabels[lastOrder.status] || lastOrder.status}
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <p className="text-xs text-gray-400 mb-2">Itens do Pedido</p>
                                <div className="space-y-2">
                                    {lastOrder.items.map((item) => (
                                        <div key={item.id} className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-600">{item.quantity}x</span>
                                                <span className="text-sm text-gray-800">{item.product.name}</span>
                                            </div>
                                            <span className="text-sm font-medium text-gray-800">
                                                {formatCurrency(item.priceCents)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="h-4 w-4 text-orange-500" />
                                        <p className="text-xs text-gray-400">Forma de Pagamento</p>
                                    </div>
                                    <p className="text-sm font-medium text-gray-800">
                                        {lastOrder.paymentMethod ? paymentMethodLabels[lastOrder.paymentMethod] : 'Não informado'}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <p className="font-bold text-gray-800">Total</p>
                                    <p className="text-xl font-bold text-orange-600">
                                        {formatCurrency(lastOrder.totalCents)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Informações Adicionais */}
                        {lastOrder.status === 'pending' && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3">
                                <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-yellow-800">Pedido Pendente</p>
                                    <p className="text-xs text-yellow-700 mt-1">
                                        Este pedido ainda não foi pago ou confirmado.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
