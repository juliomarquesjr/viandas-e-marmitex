"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// Importação dinâmica do Leaflet apenas no cliente
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);

// Componente interno para ajustar o zoom do mapa
// Precisa ser criado dinamicamente para usar useMap dentro do MapContainer
const createMapBounds = () => {
  return function MapBounds({
    restaurantLocation,
    customerLocation,
    deliveryLocation,
    isDeliveryActive,
  }: {
    restaurantLocation?: { lat: number; lng: number };
    customerLocation?: { lat: number; lng: number };
    deliveryLocation?: { lat: number; lng: number };
    isDeliveryActive?: boolean;
  }) {
    const [useMapHook, setUseMapHook] = useState<any>(null);
    const [map, setMap] = useState<any>(null);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        import("react-leaflet").then((mod) => {
          setUseMapHook(() => mod.useMap);
        });
      }
    }, []);

    useEffect(() => {
      if (useMapHook) {
        try {
          const mapInstance = useMapHook();
          setMap(mapInstance);
        } catch (e) {
          // useMap só funciona dentro de MapContainer
        }
      }
    }, [useMapHook]);

    useEffect(() => {
      if (!map || typeof map !== 'object' || !map.fitBounds) return;

      const bounds: [number, number][] = [];

      if (restaurantLocation) {
        bounds.push([restaurantLocation.lat, restaurantLocation.lng]);
      }
      if (customerLocation) {
        bounds.push([customerLocation.lat, customerLocation.lng]);
      }
      if (deliveryLocation) {
        bounds.push([deliveryLocation.lat, deliveryLocation.lng]);
      }

      if (bounds.length > 0) {
        // Se houver entregador (entrega iniciada), ajustar zoom constantemente como GPS
        const hasDeliveryPerson = !!deliveryLocation || isDeliveryActive;
        
        if (bounds.length === 1) {
          // Apenas um ponto (geralmente cliente antes de iniciar entrega)
          // Zoom muito próximo para não mostrar cidade inteira (zoom 17)
          map.setView(bounds[0], 17, { animate: true, duration: 0.5 });
        } else if (bounds.length === 2) {
          // Dois pontos: entregador + cliente (entrega em andamento)
          const [lat1, lng1] = bounds[0];
          const [lat2, lng2] = bounds[1];
          
          // Fórmula de Haversine para calcular distância
          const R = 6371; // Raio da Terra em km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLng = (lng2 - lng1) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c; // Distância em km
          
          if (hasDeliveryPerson) {
            // Entrega iniciada: ajustar zoom dinamicamente como GPS
            // Usar fitBounds com padding reduzido para zoom mais próximo
            // Padding menor = zoom mais próximo (mostra menos área)
            const padding = [300, 300]; // Padding muito maior para forçar zoom bem próximo
            
            // Calcular bounds
            const minLat = Math.min(lat1, lat2);
            const maxLat = Math.max(lat1, lat2);
            const minLng = Math.min(lng1, lng2);
            const maxLng = Math.max(lng1, lng2);
            
            // Ajustar zoom baseado na distância, mas com zoom mais próximo
            // Zoom mínimo mais alto = visualização mais próxima
            let maxZoom = 18; // Zoom máximo mais alto
            let minZoom = 15; // Zoom mínimo mais alto para não mostrar cidade inteira
            if (distance > 10) {
              maxZoom = 13;
              minZoom = 13;
            } else if (distance > 5) {
              maxZoom = 14;
              minZoom = 14;
            } else if (distance > 2) {
              maxZoom = 15;
              minZoom = 15;
            } else if (distance > 1) {
              maxZoom = 16;
              minZoom = 15;
            } else if (distance > 0.5) {
              maxZoom = 17;
              minZoom = 16;
            } else {
              maxZoom = 18;
              minZoom = 17;
            }
            
            map.fitBounds(
              [[minLat, minLng], [maxLat, maxLng]],
              { 
                padding: padding,
                maxZoom: maxZoom,
                minZoom: minZoom,
                animate: true,
                duration: 0.3 // Animação mais rápida para ajuste constante
              }
            );
          } else {
            // Ainda não iniciou entrega: zoom mais próximo
            const centerLat = (lat1 + lat2) / 2;
            const centerLng = (lng1 + lng2) / 2;
            // Calcular distância para ajustar zoom
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const dist = R * c;
            
            // Zoom mais próximo baseado na distância
            let zoom = 15;
            if (dist > 5) zoom = 14;
            else if (dist > 2) zoom = 15;
            else if (dist > 1) zoom = 16;
            else zoom = 17;
            
            map.setView([centerLat, centerLng], zoom, { animate: true, duration: 0.5 });
          }
        } else {
          // Múltiplos pontos (restaurante + entregador + cliente)
          // Calcular distância máxima entre pontos
          let maxDistance = 0;
          for (let i = 0; i < bounds.length; i++) {
            for (let j = i + 1; j < bounds.length; j++) {
              const [lat1, lng1] = bounds[i];
              const [lat2, lng2] = bounds[j];
              const R = 6371;
              const dLat = (lat2 - lat1) * Math.PI / 180;
              const dLng = (lng2 - lng1) * Math.PI / 180;
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                        Math.sin(dLng/2) * Math.sin(dLng/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const distance = R * c;
              if (distance > maxDistance) maxDistance = distance;
            }
          }
          
          // Ajustar padding baseado na distância (padding maior = zoom mais próximo)
          let padding = [150, 150]; // Padding maior para zoom mais próximo
          if (maxDistance < 1) padding = [200, 200];
          else if (maxDistance < 5) padding = [180, 180];
          else if (maxDistance < 10) padding = [150, 150];
          
          // Se houver entregador, ajustar constantemente
          const animationDuration = hasDeliveryPerson ? 0.3 : 0.5;
          
          // Zoom mínimo mais alto para não mostrar cidade inteira
          let minZoom = 15;
          let maxZoom = 17;
          if (maxDistance > 10) {
            minZoom = 13;
            maxZoom = 14;
          } else if (maxDistance > 5) {
            minZoom = 14;
            maxZoom = 15;
          } else if (maxDistance > 2) {
            minZoom = 15;
            maxZoom = 16;
          }
          
          map.fitBounds(bounds, { 
            padding,
            minZoom: minZoom,
            maxZoom: maxZoom,
            animate: true,
            duration: animationDuration
          });
        }
      }
    }, [map, restaurantLocation, customerLocation, deliveryLocation]);

    return null;
  };
};

interface DeliveryTrackingMapProps {
  restaurantLocation?: { lat: number; lng: number };
  customerLocation?: { lat: number; lng: number };
  deliveryLocation?: { lat: number; lng: number };
  deliveryPath?: Array<{ lat: number; lng: number; timestamp?: string }>;
  className?: string;
  height?: string;
  autoLoadRestaurantLocation?: boolean;
  isDeliveryActive?: boolean; // Indica se a entrega está em andamento (para ajuste constante de zoom)
}

export function DeliveryTrackingMap({
  restaurantLocation: propRestaurantLocation,
  customerLocation,
  deliveryLocation,
  deliveryPath,
  className,
  height = "400px",
  autoLoadRestaurantLocation = true,
  isDeliveryActive = false,
}: DeliveryTrackingMapProps) {
  const [restaurantLocation, setRestaurantLocation] = useState<{ lat: number; lng: number } | undefined>(propRestaurantLocation);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [icons, setIcons] = useState<{
    restaurant: any;
    customer: any;
    delivery: any;
  } | null>(null);

  // Verificar se está no cliente e carregar CSS do Leaflet
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Importar CSS do Leaflet dinamicamente usando require para evitar erro de tipo
      try {
        require("leaflet/dist/leaflet.css");
      } catch (e) {
        // Se require não funcionar, carregar via link tag
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      setMounted(true);
    }
  }, []);

  // Carregar ícones do Leaflet apenas no cliente
  useEffect(() => {
    if (typeof window === 'undefined' || !mounted) return;

    import("leaflet").then((L) => {
      // Fix para ícones padrão do Leaflet
      delete (L.default.Icon.Default.prototype as any)._getIconUrl;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      setIcons({
        restaurant: L.default.icon({
          iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
        customer: L.default.icon({
          iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
        delivery: L.default.icon({
          iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
      });
    });
  }, [mounted]);

  // Carregar localização do restaurante se não fornecida
  useEffect(() => {
    // Se restaurantLocation foi explicitamente passado como undefined, não carregar
    if (propRestaurantLocation === undefined && !autoLoadRestaurantLocation) {
      setRestaurantLocation(undefined);
      return;
    }
    
    if (autoLoadRestaurantLocation && !propRestaurantLocation) {
      setLoading(true);
      fetch('/api/config/restaurant-location')
        .then(res => res.json())
        .then(data => {
          if (data.latitude && data.longitude) {
            setRestaurantLocation({
              lat: data.latitude,
              lng: data.longitude
            });
          }
        })
        .catch(err => {
          console.error('Error loading restaurant location:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (propRestaurantLocation) {
      setRestaurantLocation(propRestaurantLocation);
    } else {
      // Se não foi fornecido e não deve carregar automaticamente, manter undefined
      setRestaurantLocation(undefined);
    }
  }, [autoLoadRestaurantLocation, propRestaurantLocation]);

  // Coordenadas padrão (centro do Brasil - pode ser configurado)
  const defaultCenter: [number, number] = [-14.235, -51.9253];
  // Zoom inicial: mais próximo (15) para não mostrar cidade inteira
  const defaultZoom = customerLocation && !deliveryLocation ? 15 : 15;

  // Calcular centro do mapa
  const center: [number, number] = deliveryLocation
    ? [deliveryLocation.lat, deliveryLocation.lng]
    : customerLocation
    ? [customerLocation.lat, customerLocation.lng]
    : restaurantLocation
    ? [restaurantLocation.lat, restaurantLocation.lng]
    : defaultCenter;

  // Criar rota completa: restaurante → entregador → cliente
  const fullRoute: [number, number][] = [];
  if (restaurantLocation) {
    fullRoute.push([restaurantLocation.lat, restaurantLocation.lng]);
  }
  
  // Se houver entregador, adicionar à rota
  if (deliveryLocation) {
    fullRoute.push([deliveryLocation.lat, deliveryLocation.lng]);
  } else if (deliveryPath && deliveryPath.length > 0) {
    // Usar última posição do histórico se não houver posição atual
    const lastPoint = deliveryPath[deliveryPath.length - 1];
    if (lastPoint.lat && lastPoint.lng) {
      fullRoute.push([lastPoint.lat, lastPoint.lng]);
    }
  }
  
  if (customerLocation) {
    fullRoute.push([customerLocation.lat, customerLocation.lng]);
  }

  // Rota direta entre restaurante e cliente (linha pontilhada)
  const directRoute: [number, number][] = [];
  if (restaurantLocation && customerLocation) {
    directRoute.push([restaurantLocation.lat, restaurantLocation.lng]);
    directRoute.push([customerLocation.lat, customerLocation.lng]);
  }

  // Criar trajetória do entregador (histórico completo de movimento)
  const deliveryTrajectory: [number, number][] = [];
  if (deliveryPath && deliveryPath.length > 0) {
    deliveryPath.forEach(point => {
      if (point.lat && point.lng) {
        deliveryTrajectory.push([point.lat, point.lng]);
      }
    });
  }

  // Adicionar estilos para z-index do Leaflet (ANTES do return condicional)
  useEffect(() => {
    if (typeof window !== 'undefined' && mounted) {
      const style = document.createElement('style');
      style.textContent = `
        .leaflet-container {
          z-index: 1 !important;
        }
        .leaflet-control-container {
          z-index: 1 !important;
        }
        .leaflet-top,
        .leaflet-bottom {
          z-index: 1 !important;
        }
        .leaflet-pane {
          z-index: 1 !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, [mounted]);

  // Não renderizar até estar montado no cliente
  if (!mounted || !icons) {
    return (
      <div className={cn("w-full rounded-lg overflow-hidden border flex items-center justify-center", className)} style={{ height }}>
        <div className="text-muted-foreground">Carregando mapa...</div>
      </div>
    );
  }

  return (
    <div className={cn("w-full rounded-lg overflow-hidden border relative", className)} style={{ height }}>
      <MapContainer
        center={center}
        zoom={defaultZoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
        zoomControl={true}
        doubleClickZoom={true}
        dragging={true}
        touchZoom={true}
        boxZoom={true}
        keyboard={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {(() => {
          const MapBoundsComponent = createMapBounds();
          return (
            <MapBoundsComponent
              restaurantLocation={restaurantLocation}
              customerLocation={customerLocation}
              deliveryLocation={deliveryLocation || (deliveryPath && deliveryPath.length > 0 ? { lat: deliveryPath[0].lat, lng: deliveryPath[0].lng } : undefined)}
              isDeliveryActive={isDeliveryActive}
            />
          );
        })()}

        {restaurantLocation && (
          <Marker position={[restaurantLocation.lat, restaurantLocation.lng]} icon={icons.restaurant}>
            <Popup>
              <div className="text-sm font-medium">Restaurante</div>
              <div className="text-xs text-muted-foreground">
                {restaurantLocation.lat.toFixed(6)}, {restaurantLocation.lng.toFixed(6)}
              </div>
            </Popup>
          </Marker>
        )}

        {customerLocation && (
          <Marker position={[customerLocation.lat, customerLocation.lng]} icon={icons.customer}>
            <Popup>
              <div className="text-sm font-medium">Cliente</div>
              <div className="text-xs text-muted-foreground">
                {customerLocation.lat.toFixed(6)}, {customerLocation.lng.toFixed(6)}
              </div>
            </Popup>
          </Marker>
        )}

        {deliveryLocation && (
          <Marker position={[deliveryLocation.lat, deliveryLocation.lng]} icon={icons.delivery}>
            <Popup>
              <div className="text-sm font-medium">Entregador</div>
              <div className="text-xs text-muted-foreground">
                {deliveryLocation.lat.toFixed(6)}, {deliveryLocation.lng.toFixed(6)}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Rota completa: restaurante → entregador → cliente */}
        {fullRoute.length >= 2 && (
          <Polyline
            positions={fullRoute}
            color="#f97316"
            weight={4}
            opacity={0.7}
            smoothFactor={1}
          />
        )}

        {/* Rota direta entre restaurante e cliente (linha pontilhada de referência) */}
        {directRoute.length === 2 && (
          <Polyline
            positions={directRoute}
            color="#94a3b8"
            weight={2}
            opacity={0.3}
            dashArray="10, 10"
          />
        )}

        {/* Trajetória do entregador (histórico completo de movimento) */}
        {deliveryTrajectory.length > 1 && (
          <Polyline
            positions={deliveryTrajectory}
            color="#3b82f6"
            weight={3}
            opacity={0.5}
            smoothFactor={1}
          />
        )}
      </MapContainer>
    </div>
  );
}
