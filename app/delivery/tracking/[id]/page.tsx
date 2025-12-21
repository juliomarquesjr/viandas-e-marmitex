"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { DeliveryTrackingMap } from "@/app/components/DeliveryTrackingMap";
import { 
  ArrowLeft, 
  MapPin, 
  User, 
  Phone, 
  Navigation, 
  CheckCircle2, 
  PlayCircle,
  Loader2,
  Clock,
  Package,
  X,
  Menu
} from "lucide-react";
import { useToast } from "@/app/components/Toast";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";

// Tipo para Wake Lock API
interface WakeLockSentinel extends EventTarget {
  released: boolean;
  type: 'screen';
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
  removeEventListener(type: 'release', listener: () => void): void;
}

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinel>;
  };
}

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

export default function DeliveryTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [deliveryData, setDeliveryData] = useState<DeliveryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [showCustomerInfo, setShowCustomerInfo] = useState(true);
  const [isCustomerInfoCollapsed, setIsCustomerInfoCollapsed] = useState(false);
  const [geocodingAddress, setGeocodingAddress] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const lastDataUpdateRef = useRef<number>(0);

  const preOrderId = params.id as string;

  const loadDeliveryData = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/pre-orders/${preOrderId}/delivery`);
      if (!response.ok) {
        throw new Error("Erro ao carregar dados de entrega");
      }
      const data = await response.json();
      setDeliveryData(data);
      setLastUpdateTime(new Date());
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

  // Polling para atualização em tempo real
  useEffect(() => {
    if (!preOrderId) return;
    const interval = setInterval(() => {
      loadDeliveryData();
    }, 5000); // A cada 5 segundos
    return () => clearInterval(interval);
  }, [preOrderId]);

  // Verificar se precisa iniciar tracking automaticamente quando a entrega já está em andamento
  useEffect(() => {
    if (!deliveryData || loading) return;
    
    // Se a entrega está em andamento e o tracking não está ativo, iniciar automaticamente
    const isDeliveryInProgress = 
      deliveryData.deliveryStatus === "out_for_delivery" || 
      deliveryData.deliveryStatus === "in_transit";
    
    if (isDeliveryInProgress && !isTracking && watchIdRef.current === null) {
      // Iniciar tracking automaticamente após um pequeno delay para evitar múltiplas chamadas
      const timer = setTimeout(() => {
        if (watchIdRef.current === null) {
          startLocationTracking().catch((err) => {
            console.error("Erro ao iniciar tracking automático:", err);
          });
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    
    // Se a entrega foi finalizada, parar o tracking
    if (deliveryData.deliveryStatus === "delivered" && isTracking) {
      stopLocationTracking();
    }
    
    // Colapsar informações do cliente quando iniciar a entrega
    if (isDeliveryInProgress && !isCustomerInfoCollapsed) {
      setIsCustomerInfoCollapsed(true);
      setShowCustomerInfo(false);
    }
  }, [deliveryData?.deliveryStatus, isTracking, loading, isCustomerInfoCollapsed]);

  // Função para solicitar permissão e iniciar tracking de localização
  const startLocationTracking = async () => {
    if (!navigator.geolocation) {
      showToast("Geolocalização não suportada neste navegador", "error");
      return false;
    }

    // Verificar se está em HTTPS (necessário para geolocalização em muitos navegadores mobile)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      showToast("HTTPS é necessário para geolocalização em dispositivos móveis. Por favor, acesse via HTTPS.", "error");
      return false;
    }

    if (watchIdRef.current !== null) {
      return true; // Já está rastreando
    }

    // Primeiro, solicitar permissão explicitamente com getCurrentPosition
    // Isso garante que o navegador mobile mostre o prompt de permissão
    return new Promise<boolean>((resolve) => {
      // Tentar primeiro com alta precisão (GPS)
      const tryGetLocation = (options: PositionOptions, isRetry: boolean = false) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            // Permissão concedida! Agora iniciar watchPosition para tracking contínuo
            const { latitude, longitude } = position.coords;
            
            // Enviar primeira localização imediatamente
            try {
              const response = await fetch(`/api/pre-orders/${preOrderId}/delivery`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ latitude, longitude })
              });
              if (response.ok) {
                setLastUpdateTime(new Date());
              }
            } catch (err) {
              console.error("Erro ao enviar primeira localização:", err);
            }

            setIsTracking(true);
            
            // Agora iniciar watchPosition para atualizações contínuas
            // Usar configurações mais flexíveis para mobile
            let lastSentTime = 0;
            watchIdRef.current = navigator.geolocation.watchPosition(
              async (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                const now = Date.now();
                
                // Enviar localização a cada 10 segundos (evitar muitas requisições)
                if (now - lastSentTime < 10000) {
                  return;
                }
                
                lastSentTime = now;
                
                try {
                  const response = await fetch(`/api/pre-orders/${preOrderId}/delivery`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ latitude: lat, longitude: lng })
                  });

                  if (!response.ok) {
                    throw new Error("Erro ao atualizar localização");
                  }

                  // Atualizar timestamp da última atualização
                  setLastUpdateTime(new Date());
                  
                  // Atualizar dados do pedido a cada 5 segundos
                  if (now - lastDataUpdateRef.current > 5000) {
                    lastDataUpdateRef.current = now;
                    await loadDeliveryData();
                  }
                } catch (err) {
                  console.error("Erro ao atualizar localização:", err);
                }
              },
              (error) => {
                console.error("Erro ao obter localização (watch):", error);
                
                // Não mostrar erro imediatamente no watch, apenas logar
                // O watchPosition pode falhar temporariamente mas continuar tentando
                if (error.code === 1) {
                  // Permissão negada - parar tracking
                  showToast("Permissão de localização negada. Rastreamento interrompido.", "error");
                  stopLocationTracking();
                }
              },
              {
                enableHighAccuracy: true,
                timeout: 30000, // 30 segundos para mobile
                maximumAge: 30000 // Aceitar localização com até 30 segundos de idade
              }
            );
            
            resolve(true);
          },
          (error) => {
            // Se falhar com alta precisão e ainda não tentou sem, tentar sem alta precisão
            if (!isRetry && error.code === 2) {
              // POSITION_UNAVAILABLE - tentar sem alta precisão (usar rede/WiFi)
              console.log("Tentando localização sem alta precisão (GPS)...");
              tryGetLocation(
                {
                  enableHighAccuracy: false,
                  timeout: 30000,
                  maximumAge: 60000 // Aceitar localização com até 1 minuto de idade
                },
                true
              );
              return;
            }
            
            // Erro ao obter permissão
            console.error("Erro ao solicitar permissão de localização:", error);
            
            let errorMessage = "Erro ao obter localização GPS";
            const PERMISSION_DENIED = 1;
            const POSITION_UNAVAILABLE = 2;
            const TIMEOUT = 3;
            
            switch (error.code) {
              case PERMISSION_DENIED:
                errorMessage = "Permissão de localização negada. Por favor, permita o acesso à localização nas configurações do navegador e tente novamente.";
                break;
              case POSITION_UNAVAILABLE:
                errorMessage = "Localização indisponível. Verifique se o GPS está ativado nas configurações do dispositivo.";
                break;
              case TIMEOUT:
                errorMessage = "Tempo esgotado ao obter localização. Verifique se o GPS está ativado e tente novamente.";
                break;
              default:
                errorMessage = `Erro ao obter localização: ${error.message || "Erro desconhecido"}`;
            }
            
            showToast(errorMessage, "error");
            resolve(false);
          },
          options
        );
      };

      // Tentar primeiro com alta precisão (GPS)
      tryGetLocation({
        enableHighAccuracy: true,
        timeout: 30000, // 30 segundos para mobile (GPS pode demorar)
        maximumAge: 0 // Sempre obter nova localização na primeira vez
      });
    });
  };

  // Função para parar tracking de localização
  const stopLocationTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsTracking(false);
    }
  };

  // Função para ativar Wake Lock (manter tela ativa)
  const requestWakeLock = async () => {
    try {
      // Verificar se a API está disponível
      const nav = navigator as NavigatorWithWakeLock;
      if (nav.wakeLock) {
        const wakeLock = await nav.wakeLock.request('screen');
        wakeLockRef.current = wakeLock;
        setWakeLockActive(true);
        
        // Listener para quando a tela é desbloqueada novamente
        wakeLock.addEventListener('release', () => {
          setWakeLockActive(false);
        });
        
        return true;
      } else {
        console.log('Wake Lock API não suportada neste navegador');
        return false;
      }
    } catch (err: any) {
      console.error('Erro ao ativar Wake Lock:', err);
      // Não mostrar erro ao usuário, é uma funcionalidade opcional
      if (err.name === 'NotAllowedError') {
        console.log('Wake Lock negado pelo usuário ou navegador');
      }
      return false;
    }
  };

  // Função para liberar Wake Lock
  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setWakeLockActive(false);
      } catch (err) {
        console.error('Erro ao liberar Wake Lock:', err);
      }
    }
  };

  // Ativar Wake Lock quando iniciar tracking
  useEffect(() => {
    if (isTracking) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [isTracking]);

  // Reativar Wake Lock quando a página volta ao foco (alguns navegadores liberam ao trocar de aba)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isTracking && !wakeLockActive) {
        // Tentar reativar se estava rastreando mas wake lock foi liberado
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isTracking, wakeLockActive]);

  // Limpar watch e wake lock ao desmontar
  useEffect(() => {
    return () => {
      stopLocationTracking();
      releaseWakeLock();
    };
  }, []);

  // Função para atualizar status
  const updateStatus = async (newStatus: DeliveryStatus) => {
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/pre-orders/${preOrderId}/delivery`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar status");
      }

      await loadDeliveryData();
      
      // Tracking já foi iniciado em handleStartDelivery se tiver permissão
      if (newStatus === "out_for_delivery") {
        if (isTracking) {
          showToast("Entrega iniciada! Localização sendo rastreada automaticamente.", "success");
        } else {
          showToast("Entrega iniciada!", "success");
        }
      } else if (newStatus === "delivered") {
        stopLocationTracking();
        showToast("Entrega concluída com sucesso!", "success");
      } else {
        showToast("Status atualizado com sucesso!", "success");
      }
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      showToast("Erro ao atualizar status", "error");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Função para iniciar entrega
  const handleStartDelivery = () => {
    // Primeiro solicitar permissão de localização (deve ser chamado diretamente do evento de clique)
    startLocationTracking().then((permissionGranted) => {
      if (!permissionGranted) {
        // Se não tiver permissão, ainda atualiza o status mas sem tracking
        showToast("Status atualizado, mas rastreamento não iniciado. Permita o acesso à localização para rastreamento automático.", "warning");
      }
    });
    
    // Atualizar status (não esperar pela permissão)
    updateStatus("out_for_delivery");
  };

  // Função para marcar como entregue
  const handleMarkDelivered = () => {
    updateStatus("delivered");
  };

  // Formatar endereço completo para geocodificação (formato otimizado para Nominatim)
  const formatAddressForGeocoding = (address: any): string => {
    if (!address) return '';
    if (typeof address === 'string') return address;
    
    // Construir endereço no formato otimizado para Nominatim
    // Formato: Rua + Número, Bairro, Cidade, Estado, Brasil
    const parts: string[] = [];
    
    // Rua e número juntos
    if (address.street) {
      const streetPart = address.number ? `${address.street}, ${address.number}` : address.street;
      parts.push(streetPart);
    } else if (address.number) {
      parts.push(address.number);
    }
    
    // Complemento (opcional, pode ajudar na precisão)
    // if (address.complement) parts.push(address.complement);
    
    // Bairro
    if (address.neighborhood) parts.push(address.neighborhood);
    
    // Cidade
    if (address.city) parts.push(address.city);
    
    // Estado
    if (address.state) parts.push(address.state);
    
    // País (adicionar Brasil para melhorar resultados)
    parts.push('Brasil');
    
    return parts.join(', ');
  };

  // Geocodificar endereço do cliente se não tiver coordenadas
  const geocodeCustomerAddress = async () => {
    if (!deliveryData?.customer?.address || geocodingAddress) return;
    
    const address = deliveryData.customer.address;
    
    // Se já tem coordenadas válidas, não precisa geocodificar
    if (address.latitude && address.longitude) {
      const lat = parseFloat(address.latitude);
      const lng = parseFloat(address.longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return;
      }
    }

    // Formatar endereço para geocodificação
    const addressString = formatAddressForGeocoding(address);
    if (!addressString || addressString.length < 10) {
      console.log('Endereço muito curto para geocodificação:', addressString);
      return;
    }

    setGeocodingAddress(true);
    try {
      // Aguardar 1 segundo para respeitar rate limit do Nominatim (1 req/seg)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await fetch('/api/geocoding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addressString })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao geocodificar endereço');
      }

      const data = await response.json();
      
      // Atualizar endereço do cliente com as coordenadas
      if (data.latitude && data.longitude) {
        // Atualizar apenas as coordenadas do endereço via API específica
        const updateResponse = await fetch(`/api/customers/${deliveryData.customer.id}/address`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: data.latitude,
            longitude: data.longitude
          })
        });

        if (updateResponse.ok) {
          // Recarregar dados da entrega para atualizar o mapa
          await loadDeliveryData();
          showToast('Coordenadas do endereço atualizadas!', 'success');
        } else {
          const errorData = await updateResponse.json().catch(() => ({}));
          console.error('Erro ao atualizar coordenadas:', errorData);
          showToast('Erro ao salvar coordenadas. Tente novamente.', 'error');
        }
      } else {
        throw new Error('Coordenadas não retornadas pela API');
      }
    } catch (error) {
      console.error('Erro ao geocodificar endereço:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      showToast(`Erro ao obter coordenadas: ${errorMessage}`, 'error');
    } finally {
      setGeocodingAddress(false);
    }
  };

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

  // Geocodificar automaticamente quando o endereço não tiver coordenadas
  useEffect(() => {
    if (deliveryData?.customer?.address && !loading) {
      const address = deliveryData.customer.address;
      
      // Verificar se tem coordenadas válidas
      const hasValidCoordinates = address.latitude && address.longitude && 
        !isNaN(parseFloat(address.latitude)) && 
        !isNaN(parseFloat(address.longitude));
      
      if (!hasValidCoordinates) {
        // Aguardar um pouco antes de geocodificar para evitar muitas requisições
        const timer = setTimeout(() => {
          geocodeCustomerAddress();
        }, 3000); // Aumentar delay para 3 segundos
        return () => clearTimeout(timer);
      }
    }
  }, [deliveryData?.customer?.address, loading]);

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

  if (loading && !deliveryData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-white text-lg">Carregando entrega...</p>
        </div>
      </div>
    );
  }

  if (error || !deliveryData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-sm w-full">
          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8 text-red-600" />
          </div>
          <p className="text-red-600 font-semibold mb-6">{error || "Entrega não encontrada"}</p>
          <Button 
            onClick={() => router.push("/delivery/dashboard")} 
            className="w-full bg-gray-900 hover:bg-gray-800 text-white h-14 rounded-2xl font-semibold"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const customerLocation = getCustomerLocation();
  const deliveryLocation = getDeliveryLocation();
  const canStartDelivery = deliveryData.deliveryStatus === "preparing" || deliveryData.deliveryStatus === "pending";
  const canMarkDelivered = deliveryData.deliveryStatus === "out_for_delivery" || deliveryData.deliveryStatus === "in_transit";

  // Status colors
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

    return (
      <div className="fixed inset-0 bg-gray-900 overflow-hidden flex flex-col" style={{ height: '100dvh', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
        {/* Header Fixo - Estilo App */}
        <div className="w-full bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-lg z-30 flex-shrink-0 safe-area-top">
          <div className="flex items-center justify-between px-4 pt-3 pb-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/delivery/dashboard")}
                className="h-10 w-10 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              {/* Informações quando não iniciou a entrega */}
              {!isTracking && (deliveryData.deliveryStatus === "pending" || deliveryData.deliveryStatus === "preparing") && (
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 font-medium">Entrega #{preOrderId.slice(0, 8)}</span>
                    {deliveryData.customer?.name && (
                      <span className="text-sm text-gray-900 font-semibold truncate max-w-[150px]">
                        {deliveryData.customer.name}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2.5">
              {isTracking && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 px-3 py-1.5 rounded-full shadow-md hover:shadow-lg transition-shadow duration-200">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-sm" />
                  <span className="text-white text-xs font-semibold tracking-wide">Rastreando</span>
                </div>
              )}
              {wakeLockActive && (
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-1.5 rounded-full shadow-md hover:shadow-lg transition-shadow duration-200">
                  <Clock className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Mapa abaixo do Header */}
        <div className="flex-1 relative overflow-hidden" style={{ zIndex: 1 }}>
          {deliveryData.customer?.address && (
            <DeliveryTrackingMap
              key={`map-${deliveryLocation?.lat}-${deliveryLocation?.lng}-${customerLocation?.lat}-${customerLocation?.lng}`}
              restaurantLocation={undefined}
              customerLocation={customerLocation}
              deliveryLocation={deliveryLocation}
              deliveryPath={deliveryData.tracking?.filter(t => t.latitude && t.longitude).map(t => ({ lat: t.latitude!, lng: t.longitude!, timestamp: t.timestamp }))}
              height="100%"
              className="rounded-none"
              autoLoadRestaurantLocation={false}
              isDeliveryActive={deliveryData.deliveryStatus === "out_for_delivery" || deliveryData.deliveryStatus === "in_transit"}
            />
          )}
        </div>

      {/* Card de Informações do Cliente - Flutuante (estilo 99) */}
      {showCustomerInfo && (
        <div className="absolute top-20 left-0 right-0 z-20 px-4 safe-area-top">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-md mx-auto animate-in slide-in-from-top-5 duration-300">
            {/* Header do Card */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white/90 text-xs font-medium">Entrega #{preOrderId.slice(0, 8)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(deliveryData.deliveryStatus)} animate-pulse`} />
                      <p className="text-white font-semibold text-sm">{getStatusText(deliveryData.deliveryStatus)}</p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowCustomerInfo(false);
                    setIsCustomerInfoCollapsed(true);
                  }}
                  className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Informações do Cliente */}
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-orange-100 rounded-full p-3 flex-shrink-0">
                  <User className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-lg mb-2">
                    {deliveryData.customer?.name || "Cliente"}
                  </h3>
                  
                  <a 
                    href={`tel:${deliveryData.customer?.phone}`}
                    className="flex items-center gap-2 text-blue-600 font-semibold mb-3 active:opacity-70"
                  >
                    <Phone className="h-5 w-5" />
                    <span className="text-base">{deliveryData.customer?.phone || "Telefone não informado"}</span>
                  </a>

                  <div className="flex items-start gap-2 text-gray-700">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed">
                        {formatAddress(deliveryData.customer?.address) || "Endereço não informado"}
                      </p>
                      {geocodingAddress && (
                        <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Obtendo coordenadas...
                        </p>
                      )}
                      {deliveryData.customer?.address && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={geocodeCustomerAddress}
                          disabled={geocodingAddress}
                          className="mt-2 text-xs h-7"
                        >
                          {geocodingAddress ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Buscando...
                            </>
                          ) : (
                            <>
                              <MapPin className="h-3 w-3 mr-1" />
                              {getCustomerLocation() ? 'Atualizar Localização' : 'Obter Localização'}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Informações Adicionais */}
              {lastUpdateTime && (
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>Atualizado: {lastUpdateTime.toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit'
                    })}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Botão para mostrar informações do cliente (quando oculto) */}
      {!showCustomerInfo && (
        <Button
          onClick={() => {
            setShowCustomerInfo(true);
            setIsCustomerInfoCollapsed(false);
          }}
          className="absolute top-20 right-4 z-20 bg-white hover:bg-gray-50 shadow-2xl rounded-full h-14 w-14 p-0 animate-in fade-in duration-300"
        >
          <div className="relative">
            <User className="h-6 w-6 text-gray-900" />
            {deliveryData.customer && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white" />
            )}
          </div>
        </Button>
      )}

      {/* Botões de Ação Fixos na Parte Inferior - Estilo App */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/70 to-transparent pb-10 pt-8 px-4 safe-area-bottom" style={{ position: 'absolute' }}>
        <div className="max-w-md mx-auto space-y-3">
          {canStartDelivery && (
            <Button
              onClick={handleStartDelivery}
              disabled={updatingStatus}
              className="w-full h-16 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-lg font-bold rounded-2xl shadow-2xl active:scale-95 transition-transform"
            >
              {updatingStatus ? (
                <>
                  <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <PlayCircle className="h-7 w-7 mr-3" />
                  Iniciar Entrega
                </>
              )}
            </Button>
          )}

          {canMarkDelivered && (
            <Button
              onClick={handleMarkDelivered}
              disabled={updatingStatus}
              className="w-full h-16 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-lg font-bold rounded-2xl shadow-2xl active:scale-95 transition-transform"
            >
              {updatingStatus ? (
                <>
                  <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-7 w-7 mr-3" />
                  Chegou no Destino
                </>
              )}
            </Button>
          )}

          {deliveryData.deliveryStatus === "delivered" && (
            <div className="bg-green-500 rounded-2xl p-5 text-center shadow-2xl">
              <CheckCircle2 className="h-10 w-10 text-white mx-auto mb-2" />
              <p className="text-white font-bold text-lg">Entrega Concluída!</p>
              <p className="text-white/90 text-sm mt-1">Obrigado pelo seu trabalho</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
