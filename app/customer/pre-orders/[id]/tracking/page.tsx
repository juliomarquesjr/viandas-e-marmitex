"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { DeliveryStatusBadge } from "@/app/components/DeliveryStatusBadge";
import { DeliveryTrackingMap } from "@/app/components/DeliveryTrackingMap";
import { DeliveryTimeline } from "@/app/components/DeliveryTimeline";
import { ArrowLeft, Loader2, MapPin, Clock, Package, Share2 } from "lucide-react";
import { useToast } from "@/app/components/Toast";
import { shareTrackingLink, openWhatsApp } from "@/lib/whatsapp";

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
  tracking?: Array<{
    id: string;
    latitude?: number | null;
    longitude?: number | null;
    status: string;
    timestamp: string;
    notes?: string | null;
  }>;
}

export default function CustomerTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [deliveryData, setDeliveryData] = useState<DeliveryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preOrderId = params.id as string;

  const loadDeliveryData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Usar rota pública para permitir acesso sem autenticação
      const response = await fetch(`/api/public/pre-orders/${preOrderId}/delivery`);
      if (!response.ok) {
        throw new Error("Erro ao carregar dados de entrega");
      }

      const data = await response.json();
      setDeliveryData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      showToast("Erro ao carregar dados de entrega", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (preOrderId) {
      loadDeliveryData();
    }
  }, [preOrderId]);

  // Polling para atualização em tempo real (a cada 15 segundos)
  useEffect(() => {
    if (!preOrderId) return;

    const interval = setInterval(() => {
      loadDeliveryData();
    }, 15000);

    return () => clearInterval(interval);
  }, [preOrderId]);

  // Extrair coordenadas do endereço do cliente (se disponível)
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

  // Coordenadas do restaurante serão carregadas automaticamente pelo componente

  if (loading && !deliveryData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !deliveryData) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8 text-center text-red-700">
            <p>{error || "Pré-pedido não encontrado"}</p>
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="mt-4"
            >
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customerLocation = getCustomerLocation();
  const deliveryLocation = getDeliveryLocation();

  // Preparar eventos para timeline
  const timelineEvents = deliveryData.tracking?.map((track) => ({
    status: track.status as DeliveryStatus,
    timestamp: track.timestamp,
    notes: track.notes,
    latitude: track.latitude,
    longitude: track.longitude,
  })) || [];

  // Preparar trajetória completa do entregador para o mapa
  const deliveryPath = deliveryData.tracking
    ?.filter(track => track.latitude !== null && track.longitude !== null)
    .map(track => ({
      lat: parseFloat(track.latitude!.toString()),
      lng: parseFloat(track.longitude!.toString()),
      timestamp: track.timestamp,
    })) || [];

  const handleShareWhatsApp = () => {
    const trackingUrl = `${window.location.origin}/tracking/${preOrderId}`;
    const whatsappUrl = shareTrackingLink(
      trackingUrl,
      deliveryData.customer?.name || undefined,
      deliveryData.customer?.phone || undefined
    );
    openWhatsApp(whatsappUrl);
    showToast("Abrindo WhatsApp para compartilhar...", "success");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Acompanhar Entrega</h1>
            <p className="text-muted-foreground">
              Seu pedido está sendo preparado e entregue
            </p>
          </div>
        </div>
        <Button
          onClick={handleShareWhatsApp}
          className="bg-green-500 hover:bg-green-600 text-white"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Compartilhar
        </Button>
      </div>

      {/* Status Atual */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status Atual</p>
              <DeliveryStatusBadge status={deliveryData.deliveryStatus} />
            </div>
            {deliveryData.estimatedDeliveryTime && (
              <div className="text-right space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2 justify-end">
                  <Clock className="h-4 w-4" />
                  Tempo Estimado
                </p>
                <p className="font-medium">
                  {new Date(deliveryData.estimatedDeliveryTime).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mapa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Localização
          </CardTitle>
          <CardDescription>
            Acompanhe em tempo real a localização do entregador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeliveryTrackingMap
            customerLocation={customerLocation}
            deliveryLocation={deliveryLocation}
            deliveryPath={deliveryPath}
            height="400px"
            autoLoadRestaurantLocation={true}
          />
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Progresso da Entrega
          </CardTitle>
          <CardDescription>
            Acompanhe todas as etapas do seu pedido
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeliveryTimeline
            events={timelineEvents}
            currentStatus={deliveryData.deliveryStatus}
          />
        </CardContent>
      </Card>
    </div>
  );
}

