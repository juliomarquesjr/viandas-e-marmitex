# 🧪 Guia de Teste - Página do Entregador

## ✅ Implementação Completa

Todas as funcionalidades foram implementadas:

1. ✅ Layout do entregador (`/delivery/layout.tsx`)
2. ✅ Dashboard (`/delivery/dashboard`)
3. ✅ Página de rastreamento (`/delivery/tracking/[id]`)
4. ✅ API de entregas (`/api/delivery/pre-orders`)
5. ✅ Ajustes de segurança e permissões

## 🚀 Como Testar

### 1. Iniciar o Servidor

```bash
# Limpar cache (se necessário)
rm -rf .next

# Iniciar servidor de desenvolvimento
npm run dev
```

### 2. Fazer Login

1. Acesse: `http://localhost:3000/auth/login`
2. Use credenciais de um usuário (admin ou pdv)
3. Após login, você será redirecionado para `/admin` ou `/pdv`

### 3. Atribuir Entregador a um Pré-Pedido

**Opção A: Via Admin (quando implementado)**
- Ir para `/admin/pre-orders`
- Clicar em uma entrega
- Atribuir entregador

**Opção B: Via Banco de Dados (para teste rápido)**
```sql
-- Atribuir um entregador a um pré-pedido
UPDATE "PreOrder" 
SET "deliveryPersonId" = '<ID_DO_USUARIO>' 
WHERE id = '<ID_DO_PRE_PEDIDO>';
```

### 4. Acessar Dashboard do Entregador

1. Acesse: `http://localhost:3000/delivery/dashboard`
2. Você deve ver:
   - Estatísticas (Total, Em Andamento, Concluídas)
   - Lista de entregas atribuídas
   - Botão "Acompanhar" em cada entrega

### 5. Testar Rastreamento

1. No dashboard, clique em "Acompanhar" em uma entrega
2. Você será redirecionado para `/delivery/tracking/[id]`
3. Você deve ver:
   - Informações do cliente
   - Status atual
   - Controles de GPS
   - Mapa interativo

### 6. Testar Atualização de Localização GPS

#### Manual:
1. Clique em "Atualizar Localização Agora"
2. Permita acesso à localização no navegador
3. Aguarde confirmação de sucesso
4. Verifique no mapa se o marcador azul apareceu/atualizou

#### Automática:
1. Clique em "Ativar Atualização Automática"
2. Permita acesso à localização no navegador
3. A localização será atualizada a cada 30 segundos automaticamente
4. Observe o mapa atualizando

### 7. Testar Atualização de Status

1. Na página de rastreamento, role até "Atualizar Status de Entrega"
2. Selecione um novo status
3. Clique em "Atualizar Status"
4. Verifique se o status foi atualizado

## 🗺️ Verificar no Mapa

O mapa deve mostrar:
- 🔴 **Marcador Vermelho:** Restaurante (fixo)
- 🟢 **Marcador Verde:** Cliente (se tiver coordenadas no endereço)
- 🔵 **Marcador Azul:** Entregador (atualiza conforme movimento)
- 📍 **Linha Azul:** Trajetória completa do entregador
- 📍 **Linha Cinza Pontilhada:** Rota entre restaurante e cliente

## 🔍 Verificar no Admin

1. Acesse: `http://localhost:3000/admin/pre-orders/[id]/tracking`
2. Você deve ver a mesma visualização do mapa
3. O mapa deve mostrar a localização do entregador em tempo real

## ⚠️ Problemas Comuns

### Erro 500 no Servidor

**Solução:**
```bash
# Limpar cache
rm -rf .next

# Reinstalar dependências (se necessário)
npm install

# Reiniciar servidor
npm run dev
```

### Erro de Tipo no Build

**Solução:**
- Já corrigido: `app/api/customer/pre-orders/[id]/delivery/route.ts` usa `Promise<{ id: string }>`

### Geolocalização Não Funciona

**Verificar:**
- Navegador permite acesso à localização?
- HTTPS ou localhost? (Geolocalização requer HTTPS ou localhost)
- Permissões do navegador estão habilitadas?

### Entregador Não Vê Entregas

**Verificar:**
- O pré-pedido tem `deliveryPersonId` atribuído?
- O `deliveryPersonId` corresponde ao ID do usuário logado?
- O usuário está autenticado?

## 📝 Checklist de Teste

- [ ] Login funciona
- [ ] Dashboard do entregador carrega
- [ ] Lista de entregas aparece
- [ ] Botão "Acompanhar" funciona
- [ ] Página de rastreamento carrega
- [ ] Mapa aparece corretamente
- [ ] Atualização manual de GPS funciona
- [ ] Atualização automática de GPS funciona
- [ ] Mapa atualiza em tempo real
- [ ] Trajetória aparece no mapa
- [ ] Atualização de status funciona
- [ ] Admin pode ver localização do entregador

## 🎯 Próximos Testes

1. Testar com múltiplos entregadores
2. Testar atualização simultânea de localização
3. Testar em dispositivos móveis
4. Testar com diferentes navegadores
5. Testar performance com muitas atualizações

## 📞 Suporte

Se encontrar problemas:
1. Verificar console do navegador (F12)
2. Verificar logs do servidor
3. Verificar banco de dados (se entregas estão atribuídas)
4. Verificar permissões de usuário

