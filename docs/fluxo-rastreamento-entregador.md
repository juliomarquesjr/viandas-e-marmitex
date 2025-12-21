# Fluxo de Rastreamento do Entregador - Como Funciona

## 📍 Como o Deslocamento do Entregador é Mostrado no Mapa

### Fluxo Atual Implementado

```
1. Entregador atualiza localização GPS
   ↓
2. API salva no banco (tabela DeliveryTracking)
   ↓
3. Página de rastreamento faz polling (a cada 10-15s)
   ↓
4. Mapa atualiza mostrando nova posição
```

### Como Funciona na Prática

#### 1. **Atualização da Localização pelo Entregador**

O entregador precisa enviar sua localização GPS para a API:

**Endpoint:** `PUT /api/pre-orders/[id]/delivery`

**Payload:**
```json
{
  "latitude": -23.5505,
  "longitude": -46.6333,
  "status": "in_transit" // opcional
}
```

**Como o entregador envia:**
- **Opção 1:** App mobile do entregador (não implementado ainda)
- **Opção 2:** Página web para entregadores (não implementado ainda)
- **Opção 3:** API direta (para testes)

#### 2. **Armazenamento no Banco de Dados**

Cada atualização cria um registro na tabela `DeliveryTracking`:

```sql
DeliveryTracking {
  id: uuid
  preOrderId: uuid
  latitude: -23.5505
  longitude: -46.6333
  status: "in_transit"
  timestamp: 2025-12-20 18:30:00
  notes: null
}
```

#### 3. **Exibição no Mapa**

A página de rastreamento:
- Busca a **última localização** do entregador (último registro de tracking)
- Atualiza o marcador azul no mapa
- Faz polling a cada 10 segundos (admin) ou 15 segundos (cliente)

**Código atual:**
```typescript
// Obter última localização do entregador
const getDeliveryLocation = () => {
  if (!deliveryData?.tracking || deliveryData.tracking.length === 0) return undefined;
  
  const lastTracking = deliveryData.tracking[0]; // Primeiro = mais recente (ordenado DESC)
  if (lastTracking.latitude && lastTracking.longitude) {
    return {
      lat: parseFloat(lastTracking.latitude.toString()),
      lng: parseFloat(lastTracking.longitude.toString()),
    };
  }
  return undefined;
};
```

#### 4. **Visualização no Mapa**

O mapa mostra:
- 🔴 **Marcador Vermelho:** Restaurante (fixo)
- 🟢 **Marcador Verde:** Cliente (fixo, se tiver coordenadas)
- 🔵 **Marcador Azul:** Entregador (atualiza conforme movimento)
- 📍 **Linha Pontilhada:** Rota entre restaurante e cliente

## 🚀 O Que Está Faltando

### 1. Interface para Entregador Atualizar Localização

**Opções de Implementação:**

#### **Opção A: Página Web para Entregador** (Mais Simples)
- Criar `/delivery/tracking/[id]` ou `/delivery/dashboard`
- Botão "Atualizar Minha Localização" que usa GPS do navegador
- Atualização automática a cada X segundos
- Mostrar lista de entregas atribuídas

#### **Opção B: App Mobile** (Mais Completo)
- App React Native ou Flutter
- GPS automático em background
- Notificações push
- Mais complexo de implementar

#### **Opção C: Integração com App de Terceiros**
- WhatsApp Business API
- Integração com apps de entrega (Rappi, iFood, etc.)
- Mais complexo e pode ter custos

### 2. Atualização Automática de Localização

**Implementação Sugerida:**

```typescript
// Componente para entregador atualizar localização
function DeliveryLocationUpdater({ preOrderId }: { preOrderId: string }) {
  useEffect(() => {
    if (!navigator.geolocation) {
      console.error('Geolocation não suportado');
      return;
    }

    // Atualizar a cada 30 segundos
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Enviar para API
          await fetch(`/api/pre-orders/${preOrderId}/delivery`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude })
          });
        },
        (error) => console.error('Erro ao obter localização:', error)
      );
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [preOrderId]);
}
```

## 📊 Fluxo Completo Visual

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA DE RASTREAMENTO                   │
└─────────────────────────────────────────────────────────────┘

1. ADMIN atribui entregador ao pré-pedido
   └─> deliveryPersonId é salvo no PreOrder

2. ENTREGADOR inicia entrega
   └─> Status muda para "out_for_delivery"
   └─> deliveryStartedAt é registrado

3. ENTREGADOR se move (GPS atualiza)
   └─> App/Web envia: { latitude, longitude }
   └─> API salva em DeliveryTracking
   └─> Timestamp registrado

4. ADMIN/CLIENTE visualiza no mapa
   └─> Polling busca última localização
   └─> Mapa atualiza marcador azul
   └─> Posição do entregador é exibida

5. ENTREGADOR chega ao destino
   └─> Status muda para "delivered"
   └─> deliveredAt é registrado
```

## 🎯 Implementação Recomendada

### Fase 1: Página Web para Entregador (Mais Rápido)

Criar `/delivery/tracking` ou `/delivery/dashboard` com:

1. **Lista de Entregas Atribuídas**
   - Mostrar pré-pedidos onde `deliveryPersonId = userId`
   - Status atual de cada entrega
   - Botão para ver detalhes

2. **Página de Detalhes da Entrega**
   - Informações do cliente
   - Endereço de entrega
   - Mapa mostrando rota
   - Botão "Atualizar Minha Localização"
   - Atualização automática de GPS (opcional)

3. **Atualização de Localização**
   - Botão manual: "Atualizar Localização Agora"
   - Modo automático: Atualiza a cada 30-60 segundos
   - Mostrar última atualização

### Fase 2: Melhorias (Opcional)

1. **Histórico de Rota no Mapa**
   - Mostrar trajetória completa do entregador
   - Linha conectando todas as posições

2. **Notificações**
   - Cliente recebe notificação quando entregador está próximo
   - Admin recebe alertas de atraso

3. **Otimizações**
   - Server-Sent Events (SSE) em vez de polling
   - Cache de localizações
   - Compressão de dados

## 🔧 Exemplo de Código para Entregador

```typescript
// app/delivery/tracking/[id]/page.tsx
"use client";

export default function DeliveryTrackingPage() {
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [autoUpdate, setAutoUpdate] = useState(false);

  // Obter localização atual
  const updateLocation = async () => {
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        
        // Enviar para API
        await fetch(`/api/pre-orders/${preOrderId}/delivery`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude, longitude })
        });
      }
    );
  };

  // Atualização automática
  useEffect(() => {
    if (!autoUpdate) return;
    
    const interval = setInterval(updateLocation, 30000);
    return () => clearInterval(interval);
  }, [autoUpdate]);

  return (
    <div>
      <button onClick={updateLocation}>
        Atualizar Minha Localização
      </button>
      <label>
        <input 
          type="checkbox" 
          checked={autoUpdate}
          onChange={(e) => setAutoUpdate(e.target.checked)}
        />
        Atualização Automática (30s)
      </label>
    </div>
  );
}
```

## 📝 Resumo

**Como funciona atualmente:**
- ✅ API pronta para receber localização
- ✅ Banco de dados armazenando histórico
- ✅ Mapa exibindo última posição
- ✅ Polling atualizando automaticamente

**O que falta:**
- ⚠️ Interface para entregador enviar localização
- ⚠️ App mobile ou página web para entregadores
- ⚠️ Atualização automática de GPS

**Recomendação:**
Implementar página web simples primeiro (`/delivery/tracking`), depois evoluir para app mobile se necessário.

