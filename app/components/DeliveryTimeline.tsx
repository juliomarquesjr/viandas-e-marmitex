"use client";

import { Clock, Package, Truck, CheckCircle, XCircle, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";

type DeliveryStatus = 
  | "pending" 
  | "preparing" 
  | "out_for_delivery" 
  | "in_transit" 
  | "delivered" 
  | "cancelled";

interface TimelineEvent {
  status: DeliveryStatus;
  timestamp: Date | string;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

// Função para fazer reverse geocoding e formatar endereço resumido
async function getAddressFromCoordinates(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Viandas-e-Marmitex/1.0'
        }
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data || !data.address) return null;

    const addr = data.address;
    const parts: string[] = [];

    // Priorizar rua/nome da via
    if (addr.road || addr.pedestrian || addr.path) {
      parts.push(addr.road || addr.pedestrian || addr.path);
    }
    
    // Adicionar número se disponível
    if (addr.house_number) {
      parts[parts.length - 1] += `, ${addr.house_number}`;
    }
    
    // Adicionar bairro ou subúrbio
    if (addr.suburb || addr.neighbourhood || addr.quarter) {
      parts.push(addr.suburb || addr.neighbourhood || addr.quarter);
    }

    // Adicionar cidade
    if (addr.city || addr.town || addr.village) {
      parts.push(addr.city || addr.town || addr.village);
    }

    return parts.length > 0 ? parts.join(', ') : data.display_name?.split(',').slice(0, 2).join(', ') || null;
  } catch (error) {
    console.error('Erro ao fazer reverse geocoding:', error);
    return null;
  }
}

interface DeliveryTimelineProps {
  events: TimelineEvent[];
  currentStatus: DeliveryStatus;
  className?: string;
}

const statusConfig: Record<
  DeliveryStatus,
  { label: string; icon: typeof Clock; color: string; bgColor: string }
> = {
  pending: {
    label: "Pendente",
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 border-yellow-300",
  },
  preparing: {
    label: "Preparando",
    icon: Package,
    color: "text-blue-600",
    bgColor: "bg-blue-100 border-blue-300",
  },
  out_for_delivery: {
    label: "Saiu para Entrega",
    icon: Truck,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100 border-indigo-300",
  },
  in_transit: {
    label: "Em Trânsito",
    icon: Truck,
    color: "text-purple-600",
    bgColor: "bg-purple-100 border-purple-300",
  },
  delivered: {
    label: "Entregue",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100 border-green-300",
  },
  cancelled: {
    label: "Cancelado",
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-100 border-red-300",
  },
};

export function DeliveryTimeline({
  events,
  currentStatus,
  className,
}: DeliveryTimelineProps) {
  const [addresses, setAddresses] = useState<Record<string, string | null>>({});
  const [loadingAddresses, setLoadingAddresses] = useState<Set<string>>(new Set());
  const loadedKeysRef = useRef<Set<string>>(new Set());
  const loadingKeysRef = useRef<Set<string>>(new Set());

  // Ordenar eventos por timestamp (mais recente primeiro)
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return dateB - dateA;
  });

  // Carregar endereços para eventos com coordenadas
  useEffect(() => {
    let cancelled = false;

    const loadAddresses = async () => {
      const eventsWithCoords = sortedEvents.filter(
        (e) => e.latitude && e.longitude
      );

      for (let i = 0; i < eventsWithCoords.length; i++) {
        if (cancelled) break;

        const event = eventsWithCoords[i];
        const key = `${event.latitude}-${event.longitude}`;
        
        // Pular se já foi carregado ou está carregando
        if (loadedKeysRef.current.has(key) || loadingKeysRef.current.has(key)) {
          continue;
        }

        loadingKeysRef.current.add(key);
        setLoadingAddresses(new Set(loadingKeysRef.current));

        try {
          // Aguardar um pouco para respeitar rate limit do Nominatim (1 req/seg)
          await new Promise(resolve => setTimeout(resolve, i * 1000 + 100));
          
          if (cancelled) break;

          const address = await getAddressFromCoordinates(
            parseFloat(event.latitude!.toString()),
            parseFloat(event.longitude!.toString())
          );

          if (!cancelled) {
            loadedKeysRef.current.add(key);
            loadingKeysRef.current.delete(key);
            setAddresses(prev => ({ ...prev, [key]: address }));
            setLoadingAddresses(new Set(loadingKeysRef.current));
          }
        } catch (error) {
          console.error('Erro ao carregar endereço:', error);
          if (!cancelled) {
            loadedKeysRef.current.add(key);
            loadingKeysRef.current.delete(key);
            setAddresses(prev => ({ ...prev, [key]: null }));
            setLoadingAddresses(new Set(loadingKeysRef.current));
          }
        }
      }
    };

    if (sortedEvents.length > 0) {
      loadAddresses();
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedEvents.length]); // Só recarregar se o número de eventos mudar

  if (sortedEvents.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <p>Nenhum evento de rastreamento disponível</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {sortedEvents.map((event, index) => {
        const config = statusConfig[event.status];
        const Icon = config.icon;
        const isLast = index === sortedEvents.length - 1;
        const isActive = event.status === currentStatus;
        const hasCoords = event.latitude && event.longitude;
        const addressKey = hasCoords ? `${event.latitude}-${event.longitude}` : null;
        const address = addressKey ? addresses[addressKey] : null;
        const isLoadingAddress = addressKey ? loadingAddresses.has(addressKey) : false;

        return (
          <div key={index} className="relative flex gap-4">
            {/* Linha vertical */}
            {!isLast && (
              <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-border" />
            )}

            {/* Ícone do status */}
            <div
              className={cn(
                "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2",
                isActive
                  ? config.bgColor
                  : "bg-muted border-border",
                config.color
              )}
            >
              <Icon className="h-5 w-5" />
            </div>

            {/* Conteúdo do evento */}
            <div className="flex-1 space-y-1 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className={cn("font-medium", config.color)}>
                    {config.label}
                  </h4>
                  {hasCoords && (
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <time className="text-xs text-muted-foreground">
                  {format(new Date(event.timestamp), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </time>
              </div>

              {event.notes && (
                <p className="text-sm text-muted-foreground">{event.notes}</p>
              )}

              {hasCoords && (
                <div className="text-xs text-muted-foreground">
                  {isLoadingAddress ? (
                    <span className="italic">Carregando endereço...</span>
                  ) : address ? (
                    <span>📍 {address}</span>
                  ) : (
                    <span>📍 Localização: {parseFloat(event.latitude!.toString()).toFixed(4)}, {parseFloat(event.longitude!.toString()).toFixed(4)}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

