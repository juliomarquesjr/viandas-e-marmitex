"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DeliveryTrackingMap } from "@/app/components/DeliveryTrackingMap";
import { 
  Package, 
  MapPin, 
  Clock,
  Loader2,
  CheckCircle2,
  Truck,
  User,
  Phone,
  UserCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

type DeliveryStatus = 
  | "pending" 
  | "preparing" 
  | "out_for_delivery" 
  | "in_transit" 
  | "delivered" 
  | "cancelled";

interface DeliveryData {
  id: string;
  deliveryStatus: DeliveryStatus;
  estimatedDeliveryTime?: string | null;
  deliveryStartedAt?: string | null;
  deliveredAt?: string | null;
  customer?: {
    id: string;
    name: string;
    phone: string;
    address?: any;
  } | null;
  deliveryPerson?: {
    id: string;
    name: string;
    email: string;
  } | null;
  tracking?: Array<{
    id: string;
    latitude?: number | null;
    longitude?: number | null;
    status: string;
    timestamp: string;
    notes?: string | null;
  }>;
}

export default function PublicTrackingPage() {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [deliveryData, setDeliveryData] = useState<DeliveryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preOrderId = params.id as string;

  const loadDeliveryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/public/pre-orders/${preOrderId}/delivery`);
      if (!response.ok) {
        throw new Error("Erro ao carregar dados de entrega");
      }

      const data = await response.json();
      setDeliveryData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (preOrderId) {
      loadDeliveryData();
    }
  }, [preOrderId]);

  // Polling para atualização em tempo real (a cada 5 segundos)
  useEffect(() => {
    if (!preOrderId) return;

    const interval = setInterval(() => {
      loadDeliveryData();
    }, 5000);

    return () => clearInterval(interval);
  }, [preOrderId]);

  // Extrair coordenadas do endereço do cliente
  const getCustomerLocation = () => {
    if (!deliveryData?.customer?.address) return undefined;
    const address = deliveryData.customer.address;
    if (address.latitude && address.longitude) {
      return {
        lat: parseFloat(address.latitude),
        lng: parseFloat(address.longitude),
      };
    }
    return undefined;
  };

  // Obter última localização do entregador
  const getDeliveryLocation = () => {
    if (!deliveryData?.tracking || deliveryData.tracking.length === 0) return undefined;
    const lastTracking = deliveryData.tracking[0];
    if (lastTracking.latitude && lastTracking.longitude) {
      return {
        lat: parseFloat(lastTracking.latitude.toString()),
        lng: parseFloat(lastTracking.longitude.toString()),
      };
    }
    return undefined;
  };

  const formatAddress = (address: any): string => {
    if (!address) return '';
    if (typeof address === 'string') return address;
    const parts: string[] = [];
    if (address.street) parts.push(address.street);
    if (address.number) parts.push(address.number);
    if (address.complement) parts.push(address.complement);
    if (address.neighborhood) parts.push(address.neighborhood);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    return parts.length > 0 ? parts.join(', ') : '';
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

  const getStatusIcon = (status: DeliveryStatus) => {
    switch (status) {
      case "delivered":
        return CheckCircle2;
      case "out_for_delivery":
      case "in_transit":
        return Truck;
      default:
        return Package;
    }
  };

  if (loading && !deliveryData) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 z-[9999]" style={{ height: '100dvh' }}>
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Carregando rastreamento...</p>
        </div>
      </div>
    );
  }

  if (error || !deliveryData) {
    return (
      <div className="fixed inset-0 bg-gray-50 p-4 flex items-center justify-center z-[9999]" style={{ height: '100dvh' }}>
        <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-red-600" />
          </div>
          <p className="text-red-600 font-semibold mb-2">{error || "Pedido não encontrado"}</p>
          <p className="text-gray-500 text-sm">Verifique se o link está correto</p>
        </div>
      </div>
    );
  }

  const customerLocation = getCustomerLocation();
  const deliveryLocation = getDeliveryLocation();
  const StatusIcon = getStatusIcon(deliveryData.deliveryStatus);
  const isDeliveryActive = deliveryData.deliveryStatus === "out_for_delivery" || deliveryData.deliveryStatus === "in_transit";

  // Preparar trajetória do entregador
  const deliveryPath = deliveryData.tracking
    ?.filter(track => track.latitude !== null && track.longitude !== null)
    .map(track => ({
      lat: parseFloat(track.latitude!.toString()),
      lng: parseFloat(track.longitude!.toString()),
      timestamp: track.timestamp,
    })) || [];

  return (
    <div className="fixed inset-0 bg-gray-50 overflow-hidden flex flex-col" style={{ height: '100dvh', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
      {/* Header Fixo - Estilo App Mobile */}
      <div className="w-full bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-lg z-30 flex-shrink-0 safe-area-top">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900">Rastreamento</span>
              <span className="text-xs text-gray-500">#{preOrderId.slice(0, 8)}</span>
              {/* Informação discreta do entregador */}
              {deliveryData.deliveryPerson && (isDeliveryActive || deliveryData.deliveryStatus === "delivered") && (
                <div className="flex items-center gap-1.5 mt-1">
                  <UserCircle className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">{deliveryData.deliveryPerson.name}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Mostrar status apenas quando a entrega estiver em andamento ou entregue */}
          {isDeliveryActive || deliveryData.deliveryStatus === "delivered" ? (
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full shadow-md",
                deliveryData.deliveryStatus === "delivered" 
                  ? "bg-gradient-to-r from-green-500 to-green-600"
                  : "bg-gradient-to-r from-blue-500 to-blue-600"
              )}>
                <div className={cn("w-2 h-2 rounded-full bg-white animate-pulse")} />
                <span className="text-white text-xs font-semibold tracking-wide">
                  {getStatusText(deliveryData.deliveryStatus)}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Mapa - Ocupa toda a área disponível */}
      <div className="flex-1 relative overflow-hidden" style={{ zIndex: 1 }}>
        {deliveryData.customer?.address && (
          <>
            <DeliveryTrackingMap
              key={`map-${deliveryLocation?.lat}-${deliveryLocation?.lng}-${customerLocation?.lat}-${customerLocation?.lng}`}
              restaurantLocation={undefined}
              customerLocation={customerLocation}
              deliveryLocation={deliveryLocation}
              deliveryPath={deliveryPath}
              height="100%"
              className="rounded-none"
              autoLoadRestaurantLocation={false}
              isDeliveryActive={isDeliveryActive}
            />
            
            {/* Overlay escuro quando pedido não está em rota */}
            {!isDeliveryActive && deliveryData.deliveryStatus !== "delivered" && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-10 flex items-center justify-center animate-in fade-in duration-300">
                <div className="bg-white/95 backdrop-blur-lg rounded-3xl p-8 mx-4 max-w-sm shadow-2xl text-center animate-in zoom-in-95 duration-300">
                  <div className="bg-orange-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <Package className="h-10 w-10 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Pedido em Preparação
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    Seu pedido ainda não saiu para entrega. O mapa será liberado assim que o entregador iniciar a rota.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-orange-600">
                    <Clock className="h-4 w-4 animate-pulse" />
                    <span className="text-sm font-medium">Aguarde...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Card de Informações - Flutuante na parte inferior - Oculto até iniciar rota */}
      {(isDeliveryActive || deliveryData.deliveryStatus === "delivered") && (
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-4 safe-area-bottom">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md mx-auto animate-in slide-in-from-bottom-5 duration-300">
          {/* Header do Card */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                <StatusIcon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white/90 text-xs font-medium">Status da Entrega</p>
                <p className="text-white font-bold text-base">{getStatusText(deliveryData.deliveryStatus)}</p>
              </div>
            </div>
          </div>

          {/* Informações do Cliente */}
          {deliveryData.customer && (
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-orange-100 rounded-full p-2.5 flex-shrink-0">
                  <User className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-base mb-2">
                    {deliveryData.customer.name}
                  </h3>
                  
                  <a 
                    href={`tel:${deliveryData.customer.phone}`}
                    className="flex items-center gap-2 text-blue-600 font-semibold mb-3 active:opacity-70"
                  >
                    <Phone className="h-4 w-4" />
                    <span className="text-sm">{deliveryData.customer.phone}</span>
                  </a>

                  <div className="flex items-start gap-2 text-gray-700">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm leading-relaxed">
                      {formatAddress(deliveryData.customer.address) || "Endereço não informado"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Informação discreta do entregador */}
          {deliveryData.deliveryPerson && (
            <div className="px-5 pb-3 border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Truck className="h-3.5 w-3.5" />
                <span>Entregador: <span className="font-medium text-gray-700">{deliveryData.deliveryPerson.name}</span></span>
              </div>
            </div>
          )}

          {/* Informações de Tempo */}
          {deliveryData.estimatedDeliveryTime && (
            <div className="px-5 pb-4 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>
                  Previsão: {new Date(deliveryData.estimatedDeliveryTime).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Mensagem de Entrega Concluída */}
          {deliveryData.deliveryStatus === "delivered" && (
            <div className="px-5 pb-5 border-t border-gray-100 pt-4">
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-bold text-sm">Entrega Concluída!</p>
                {deliveryData.deliveredAt && (
                  <p className="text-green-600 text-xs mt-1">
                    {new Date(deliveryData.deliveredAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
}

