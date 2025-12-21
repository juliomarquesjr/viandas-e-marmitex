"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Loader2, MapPin, Package, Clock, User, Phone, ArrowRight, LogOut, Truck, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/app/components/Toast";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

type DeliveryStatus = 
  | "pending" 
  | "preparing" 
  | "out_for_delivery" 
  | "in_transit" 
  | "delivered" 
  | "cancelled";

interface PreOrder {
  id: string;
  totalCents: number;
  deliveryStatus: DeliveryStatus;
  estimatedDeliveryTime?: string | null;
  deliveryStartedAt?: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    address?: any;
  } | null;
  items: Array<{
    id: string;
    quantity: number;
    product: {
      id: string;
      name: string;
    };
  }>;
}

export default function DeliveryDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [preOrders, setPreOrders] = useState<PreOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/auth/login");
      return;
    }

    loadPreOrders();
  }, [session, status, router]);

  const loadPreOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/delivery/pre-orders");
      if (!response.ok) {
        throw new Error("Erro ao carregar entregas");
      }

      const data = await response.json();
      setPreOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      showToast("Erro ao carregar entregas", "error");
    } finally {
      setLoading(false);
    }
  };

  // Polling para atualização automática
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      loadPreOrders();
    }, 15000); // A cada 15 segundos

    return () => clearInterval(interval);
  }, [session]);

  const formatAddress = (address: any): string => {
    if (!address) return 'Endereço não informado';
    if (typeof address === 'string') return address;
    
    const parts: string[] = [];
    if (address.street) parts.push(address.street);
    if (address.number) parts.push(address.number);
    if (address.complement) parts.push(address.complement);
    if (address.neighborhood) parts.push(address.neighborhood);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    
    return parts.length > 0 ? parts.join(', ') : 'Endereço não informado';
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const getStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case "pending":
      case "preparing":
        return "bg-yellow-500";
      case "out_for_delivery":
      case "in_transit":
        return "bg-blue-500";
      case "delivered":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: DeliveryStatus) => {
    switch (status) {
      case "pending":
        return "Pendente";
      case "preparing":
        return "Preparando";
      case "out_for_delivery":
        return "Saiu para Entrega";
      case "in_transit":
        return "Em Trânsito";
      case "delivered":
        return "Entregue";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 z-[9999]" style={{ height: '100dvh' }}>
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Carregando entregas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-50 p-4 flex items-center justify-center z-[9999]" style={{ height: '100dvh' }}>
        <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <p className="text-red-600 font-semibold mb-6">{error}</p>
          <Button onClick={loadPreOrders} className="w-full bg-orange-600 hover:bg-orange-700 text-white h-14 rounded-2xl font-semibold">
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  const activeDeliveries = preOrders.filter(
    po => po.deliveryStatus !== "delivered" && po.deliveryStatus !== "cancelled"
  );
  const completedDeliveries = preOrders.filter(
    po => po.deliveryStatus === "delivered"
  );

  return (
    <div className="fixed inset-0 bg-gray-50 overflow-y-auto" style={{ height: '100dvh', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
      {/* Header Fixo - Estilo App */}
      <div className="sticky top-0 w-full bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-lg z-30 flex-shrink-0 safe-area-top">
        <div className="flex items-center justify-between px-4 pt-3 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">Minhas Entregas</span>
              <span className="text-xs text-gray-500">{session?.user?.name || "Entregador"}</span>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut()}
            className="h-10 w-10 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="pb-24">
        {/* Estatísticas - Cards Compactos */}
        <div className="px-4 pt-4 pb-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100">
              <p className="text-xs text-gray-500 font-medium mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900">{preOrders.length}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 shadow-md border border-blue-200">
              <p className="text-xs text-blue-600 font-medium mb-1">Ativas</p>
              <p className="text-2xl font-bold text-blue-600">{activeDeliveries.length}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 shadow-md border border-green-200">
              <p className="text-xs text-green-600 font-medium mb-1">Concluídas</p>
              <p className="text-2xl font-bold text-green-600">{completedDeliveries.length}</p>
            </div>
          </div>
        </div>

        {/* Entregas Ativas */}
        {activeDeliveries.length > 0 && (
          <div className="px-4 pt-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              Em Andamento
            </h2>
            <div className="space-y-3">
              {activeDeliveries.map((preOrder, index) => (
                <Link
                  key={preOrder.id}
                  href={`/delivery/tracking/${preOrder.id}`}
                  className="block animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform duration-200">
                    {/* Header do Card */}
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                            <Package className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-white/90 text-xs font-medium">Entrega #{preOrder.id.slice(0, 8)}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className={cn("w-2 h-2 rounded-full", getStatusColor(preOrder.deliveryStatus), "animate-pulse")} />
                              <p className="text-white font-semibold text-sm">{getStatusText(preOrder.deliveryStatus)}</p>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-white/80" />
                      </div>
                    </div>

                    {/* Corpo do Card */}
                    <div className="p-5 space-y-4">
                      {preOrder.customer && (
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="bg-orange-100 rounded-full p-2.5 flex-shrink-0">
                              <User className="h-5 w-5 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 text-base mb-2">
                                {preOrder.customer.name}
                              </h3>
                              <div className="space-y-2">
                                <a 
                                  href={`tel:${preOrder.customer.phone}`}
                                  className="flex items-center gap-2 text-blue-600 font-medium text-sm active:opacity-70"
                                >
                                  <Phone className="h-4 w-4" />
                                  <span>{preOrder.customer.phone}</span>
                                </a>
                                <div className="flex items-start gap-2 text-gray-600">
                                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                  <p className="text-sm leading-relaxed">
                                    {formatAddress(preOrder.customer.address)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Informações Adicionais */}
                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Valor: </span>
                            <span className="font-bold text-gray-900">{formatCurrency(preOrder.totalCents)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Itens: </span>
                            <span className="font-bold text-gray-900">{preOrder.items.length}</span>
                          </div>
                        </div>
                        {preOrder.estimatedDeliveryTime && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {new Date(preOrder.estimatedDeliveryTime).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Entregas Concluídas */}
        {completedDeliveries.length > 0 && (
          <div className="px-4 pt-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Concluídas
            </h2>
            <div className="space-y-2">
              {completedDeliveries.slice(0, 5).map((preOrder) => (
                <div
                  key={preOrder.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 opacity-75"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn("w-2 h-2 rounded-full", getStatusColor(preOrder.deliveryStatus))} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {preOrder.customer?.name || "Cliente"}
                        </p>
                        <p className="text-xs text-gray-500">#{preOrder.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(preOrder.totalCents)}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(preOrder.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estado Vazio */}
        {preOrders.length === 0 && (
          <div className="flex items-center justify-center min-h-[60vh] px-4">
            <div className="text-center max-w-sm">
              <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Package className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma entrega atribuída</h3>
              <p className="text-gray-500 text-sm">
                Quando você receber entregas, elas aparecerão aqui.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
