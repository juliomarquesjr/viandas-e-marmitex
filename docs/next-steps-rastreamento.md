# Próximos Passos - Sistema de Rastreamento de Entregas

## ✅ O que já está implementado

1. **Banco de Dados**
   - ✅ Campos de entrega no modelo `PreOrder`
   - ✅ Modelo `DeliveryTracking` para histórico
   - ✅ Migração aplicada

2. **APIs**
   - ✅ `GET /api/pre-orders/[id]/delivery` - Obter dados de entrega
   - ✅ `PUT /api/pre-orders/[id]/delivery` - Atualizar status/localização
   - ✅ `POST /api/pre-orders/[id]/delivery/assign` - Atribuir entregador
   - ✅ `DELETE /api/pre-orders/[id]/delivery/assign` - Remover entregador
   - ✅ `GET /api/pre-orders/[id]/delivery/tracking` - Histórico de tracking
   - ✅ `GET /api/customer/pre-orders/[id]/delivery` - Dados para cliente
   - ✅ `GET /api/config/restaurant-location` - Coordenadas do restaurante

3. **Frontend**
   - ✅ Página de rastreamento admin (`/admin/pre-orders/[id]/tracking`)
   - ✅ Página de rastreamento cliente (`/customer/pre-orders/[id]/tracking`)
   - ✅ Componente `DeliveryTrackingMap` com Leaflet
   - ✅ Componente `DeliveryStatusBadge`
   - ✅ Componente `DeliveryTimeline`
   - ✅ Componente `DeliveryStatusUpdater`
   - ✅ Coluna "Status Entrega" na lista de pré-pedidos
   - ✅ Opção "Rastrear Entrega" no menu de ações
   - ✅ Formatação de endereço corrigida

## 🔧 Próximos Passos para Revisão e Funcionalidade Completa

### 1. Componente de Atribuição de Entregador ⚠️ PRIORITÁRIO

**Status:** Não implementado na UI

**O que fazer:**
- Criar componente `DeliveryPersonAssigner` na página de rastreamento admin
- Listar usuários disponíveis (role: pdv ou novo role: delivery)
- Permitir atribuir/remover entregador
- Exibir entregador atual se houver

**Arquivo:** `app/admin/components/DeliveryPersonAssigner.tsx`

### 2. Geocodificação de Endereços ⚠️ IMPORTANTE

**Status:** Endereços não têm coordenadas GPS

**O que fazer:**
- Implementar função para converter endereço em coordenadas
- Opções:
  - **Nominatim (OpenStreetMap)** - Gratuito, sem API key
  - **Google Geocoding API** - Requer API key
- Adicionar campos `latitude` e `longitude` no endereço do cliente
- Criar endpoint ou função para geocodificar endereços

**Arquivo:** `lib/geocoding.ts` ou `app/api/geocoding/route.ts`

### 3. Link de Rastreamento no PreOrderCard do Cliente

**Status:** Cliente não tem acesso fácil ao rastreamento

**O que fazer:**
- Adicionar botão/link "Rastrear Entrega" no `PreOrderCard`
- Mostrar badge de status
- Link para `/customer/pre-orders/[id]/tracking`

**Arquivo:** `app/customer/components/PreOrderCard.tsx`

### 4. Testes Funcionais

**O que testar:**
- [ ] Atualizar status de entrega (todos os status)
- [ ] Atribuir entregador
- [ ] Remover atribuição de entregador
- [ ] Atualizar localização GPS do entregador
- [ ] Visualizar histórico de tracking
- [ ] Mapa exibindo corretamente:
  - [ ] Marcador do restaurante
  - [ ] Marcador do cliente (se tiver coordenadas)
  - [ ] Marcador do entregador (se tiver localização)
  - [ ] Rota entre pontos (opcional)

### 5. Melhorias de UX

**O que melhorar:**
- Adicionar rota visual no mapa entre restaurante → entregador → cliente
- Melhorar feedback visual ao atualizar status
- Adicionar notificações/alertas quando status mudar
- Adicionar filtros na lista de pré-pedidos por status de entrega
- Adicionar busca rápida por status

### 6. Validações e Tratamento de Erros

**O que adicionar:**
- Validar coordenadas GPS (latitude: -90 a 90, longitude: -180 a 180)
- Validar transições de status (ex: não pode voltar de "entregue" para "preparando")
- Tratar erros de geocodificação
- Adicionar mensagens de erro mais descritivas
- Validar permissões em todas as rotas

### 7. Performance e Otimização

**O que otimizar:**
- Cache de coordenadas do restaurante
- Reduzir frequência de polling (atualmente 10s admin, 15s cliente)
- Implementar Server-Sent Events (SSE) para atualizações em tempo real
- Lazy loading do mapa
- Otimizar queries do banco de dados

### 8. Documentação

**O que documentar:**
- Como usar o sistema de rastreamento
- Como configurar coordenadas do restaurante
- Como atribuir entregadores
- Como atualizar status
- Como funciona a geocodificação

## 🎯 Ordem de Prioridade Recomendada

1. **ALTA PRIORIDADE**
   - Componente de atribuição de entregador
   - Geocodificação de endereços
   - Link de rastreamento no PreOrderCard do cliente

2. **MÉDIA PRIORIDADE**
   - Testes funcionais completos
   - Melhorias de UX (rota no mapa)
   - Validações adicionais

3. **BAIXA PRIORIDADE**
   - Otimizações de performance
   - Documentação detalhada
   - Features extras (notificações, filtros avançados)

## 📝 Notas Técnicas

### Geocodificação com Nominatim (Recomendado - Gratuito)

```typescript
// Exemplo de uso
const geocodeAddress = async (address: string) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
  );
  const data = await response.json();
  if (data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon)
    };
  }
  return null;
};
```

**Limitações:**
- Rate limit: 1 requisição por segundo
- Requer User-Agent header
- Pode não ser 100% preciso

### Estrutura de Dados do Endereço

O endereço do cliente está armazenado como JSON no campo `address`:
```json
{
  "street": "Rua Exemplo",
  "number": "123",
  "complement": "Apto 45",
  "neighborhood": "Centro",
  "city": "São Paulo",
  "state": "SP",
  "zip": "01234-567",
  "latitude": null,
  "longitude": null
}
```

### Status de Entrega

Os status disponíveis são:
- `pending` - Pendente
- `preparing` - Preparando
- `out_for_delivery` - Saiu para Entrega
- `in_transit` - Em Trânsito
- `delivered` - Entregue
- `cancelled` - Cancelado

