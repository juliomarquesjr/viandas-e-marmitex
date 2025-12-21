"use client";

import { DeliveryPersonAssigner } from "@/app/admin/components/DeliveryPersonAssigner";
import { DeliveryStatusUpdater } from "@/app/admin/components/DeliveryStatusUpdater";
import { DeliveryStatusBadge } from "@/app/components/DeliveryStatusBadge";
import { DeliveryTimeline } from "@/app/components/DeliveryTimeline";
import { DeliveryTrackingMap } from "@/app/components/DeliveryTrackingMap";
import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { openWhatsApp, shareTrackingLink } from "@/lib/whatsapp";
import { ArrowLeft, Clock, Loader2, MapPin, Share2, User } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  deliveryPersonId?: string | null;
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

export default function AdminTrackingPage() {
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

      const response = await fetch(`/api/pre-orders/${preOrderId}/delivery`);
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

  // Polling para atualização em tempo real (a cada 10 segundos)
  useEffect(() => {
    if (!preOrderId) return;

    const interval = setInterval(() => {
      loadDeliveryData();
    }, 10000);

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

  // Função para formatar o endereço
  const formatAddress = (address: any): string => {
    if (!address) return '';
    
    // Se já for uma string formatada, retorna
    if (typeof address === 'string') {
      return address;
    }
    
    // Se for um objeto, formata os campos
    const parts: string[] = [];
    
    if (address.street) parts.push(address.street);
    if (address.number) parts.push(address.number);
    if (address.complement) parts.push(address.complement);
    if (address.neighborhood) parts.push(address.neighborhood);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zip) parts.push(`CEP: ${address.zip}`);
    
    return parts.length > 0 ? parts.join(', ') : '';
  };

  if (loading && !deliveryData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando informações de rastreamento...</p>
        </div>
      </div>
    );
  }

  if (error || !deliveryData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">{error || "Pré-pedido não encontrado"}</p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customerLocation = getCustomerLocation();
  const deliveryLocation = getDeliveryLocation();

  // Preparar eventos para timeline filtrando duplicados (quando não há mudança de lat/lng)
  const timelineEvents = (() => {
    if (!deliveryData.tracking) return [];
    
    const events = deliveryData.tracking.map((track) => ({
      status: track.status as DeliveryStatus,
      timestamp: track.timestamp,
      notes: track.notes,
      latitude: track.latitude,
      longitude: track.longitude,
    }));

    // Ordenar por timestamp (mais antigo primeiro) para processar em ordem cronológica
    const sorted = [...events].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Filtrar duplicados: se status e coordenadas forem iguais (ou ambos sem coordenadas), manter apenas o mais recente
    const seen = new Map<string, typeof events[0]>();

    sorted.forEach((event) => {
      // Criar chave única baseada em status e coordenadas
      // Se não houver coordenadas, usar apenas o status
      const hasCoords = event.latitude !== null && event.latitude !== undefined &&
                       event.longitude !== null && event.longitude !== undefined;
      
      let key: string;
      if (hasCoords) {
        const latValue = parseFloat(event.latitude!.toString());
        const lngValue = parseFloat(event.longitude!.toString());
        
        if (!isNaN(latValue) && !isNaN(lngValue)) {
          // Usar coordenadas com precisão reduzida para agrupar eventos próximos
          // 4 casas decimais = ~11 metros de precisão, agrupa eventos muito próximos
          const latKey = latValue.toFixed(4);
          const lngKey = lngValue.toFixed(4);
          key = `${event.status}-${latKey}-${lngKey}`;
        } else {
          key = `${event.status}-no-coords`;
        }
      } else {
        // Sem coordenadas: agrupar por status apenas
        key = `${event.status}-no-coords`;
      }
      
      // Se já existe um evento com esta chave, manter o mais recente
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, event);
      } else {
        const existingTime = new Date(existing.timestamp).getTime();
        const currentTime = new Date(event.timestamp).getTime();
        if (currentTime > existingTime) {
          seen.set(key, event); // Substituir pelo mais recente
        }
      }
    });

    const filtered = Array.from(seen.values());

    // Reordenar por timestamp (mais recente primeiro) para exibição
    return filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  })();

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
    showToast("Abrindo WhatsApp para compartilhar com o cliente...", "success");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Rastreamento de Entrega</h1>
            <p className="text-muted-foreground">
              Pré-pedido #{preOrderId.slice(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleShareWhatsApp}
            className="bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar WhatsApp
          </Button>
          <DeliveryStatusBadge status={deliveryData.deliveryStatus} />
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Coluna Esquerda - Informações */}
        <div className="xl:col-span-4 space-y-6">
          {/* Card Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deliveryData.customer ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-lg">{deliveryData.customer.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {deliveryData.customer.phone}
                    </p>
                  </div>
                  {deliveryData.customer.address && (
                    <div className="flex items-start gap-2 pt-2 border-t">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {formatAddress(deliveryData.customer.address) || 'Endereço não informado'}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Cliente não informado</p>
              )}
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status da Entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Status Atual</p>
                <DeliveryStatusBadge status={deliveryData.deliveryStatus} />
              </div>

              {deliveryData.estimatedDeliveryTime && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4" />
                    Tempo Estimado
                  </p>
                  <p className="font-medium text-sm">
                    {new Date(deliveryData.estimatedDeliveryTime).toLocaleString("pt-BR", {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}

              {deliveryData.deliveryPerson && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    Entregador
                  </p>
                  <p className="font-medium text-sm">{deliveryData.deliveryPerson.name}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="space-y-4">
            <DeliveryPersonAssigner
              preOrderId={preOrderId}
              currentDeliveryPersonId={deliveryData.deliveryPersonId}
              currentDeliveryPersonName={deliveryData.deliveryPerson?.name}
              onUpdate={loadDeliveryData}
            />

            <DeliveryStatusUpdater
              preOrderId={preOrderId}
              currentStatus={deliveryData.deliveryStatus}
              deliveryPersonId={deliveryData.deliveryPersonId}
              estimatedDeliveryTime={deliveryData.estimatedDeliveryTime}
              onUpdate={loadDeliveryData}
            />
          </div>
        </div>

        {/* Coluna Direita - Mapa e Timeline */}
        <div className="xl:col-span-8 space-y-6">
          {/* Mapa */}
          <Card>
            <CardHeader>
              <CardTitle>Localização em Tempo Real</CardTitle>
              <CardDescription>
                Acompanhe a localização do entregador e a rota completa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeliveryTrackingMap
                customerLocation={customerLocation}
                deliveryLocation={deliveryLocation}
                deliveryPath={deliveryPath}
                height="500px"
                autoLoadRestaurantLocation={true}
              />
            </CardContent>
          </Card>

          {/* Timeline com scroll */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Eventos</CardTitle>
              <CardDescription>
                Timeline de mudanças de status e localizações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                <DeliveryTimeline
                  events={timelineEvents}
                  currentStatus={deliveryData.deliveryStatus}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

