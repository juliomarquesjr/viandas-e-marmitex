# 🔐 Como Fazer Login na Interface do Entregador

## 📋 Processo Atual

### 1. **Acessar a Página de Login**

Acesse: `http://localhost:3000/auth/login`

### 2. **Fazer Login com Credenciais**

Use as mesmas credenciais de um usuário do sistema (admin ou pdv):
- **Email:** Seu email cadastrado
- **Senha:** Sua senha

**Nota:** Não há um role específico "entregador" no sistema. Qualquer usuário autenticado (admin ou pdv) pode acessar a área de entregador.

### 3. **Redirecionamento Após Login**

Após o login, o sistema redireciona automaticamente:
- **Se role = "pdv"** → `/pdv`
- **Se role = "admin"** → `/admin`

### 4. **Acessar Interface do Entregador**

Após fazer login, você pode acessar a interface do entregador de duas formas:

#### Opção A: Digitar URL Diretamente
```
http://localhost:3000/delivery/dashboard
```

#### Opção B: Navegar Manualmente
1. Após login, você estará em `/admin` ou `/pdv`
2. Digite na barra de endereços: `/delivery/dashboard`
3. Ou adicione um link no menu (sugestão de melhoria)

## 🎯 Como Funciona

### Sistema de Permissões

- ✅ **Qualquer usuário autenticado** (admin ou pdv) pode acessar `/delivery/*`
- ✅ **Apenas entregadores atribuídos** verão suas entregas no dashboard
- ✅ **Entregadores atribuídos** podem atualizar localização GPS e status

### Fluxo Completo

```
1. Login em /auth/login
   ↓
2. Redirecionamento automático:
   - PDV → /pdv
   - Admin → /admin
   ↓
3. Acessar /delivery/dashboard manualmente
   ↓
4. Ver entregas atribuídas (se houver)
   ↓
5. Clicar em "Acompanhar" para rastrear
```

## 💡 Melhorias Sugeridas

### 1. Adicionar Link no Menu

Adicionar um link "Entregas" no menu do admin/pdv que leve para `/delivery/dashboard`.

### 2. Redirecionamento Automático

Modificar o sistema de login para redirecionar para `/delivery/dashboard` se o usuário tiver entregas atribuídas.

### 3. Criar Role Específico "delivery"

Criar um role específico "delivery" para entregadores, com redirecionamento automático após login.

## 📝 Exemplo Prático

### Passo a Passo

1. **Abra o navegador** e acesse: `http://localhost:3000/auth/login`

2. **Digite suas credenciais:**
   ```
   Email: admin@viandas.com (ou outro usuário)
   Senha: sua senha
   ```

3. **Clique em "Entrar"**

4. **Você será redirecionado para:**
   - `/admin` (se for admin)
   - `/pdv` (se for pdv)

5. **Para acessar a interface do entregador:**
   - Digite na barra de endereços: `/delivery/dashboard`
   - Ou acesse diretamente: `http://localhost:3000/delivery/dashboard`

6. **Você verá:**
   - Dashboard com estatísticas
   - Lista de entregas atribuídas a você
   - Botão "Acompanhar" em cada entrega

## 🔍 Verificar Entregas Atribuídas

Para ver entregas no dashboard do entregador, você precisa ter entregas atribuídas:

1. **Admin atribui entregador** via:
   - Página de rastreamento do pré-pedido
   - Ou via API: `POST /api/pre-orders/[id]/delivery/assign`

2. **Entregador acessa** `/delivery/dashboard`

3. **Vê suas entregas** na lista

## ⚠️ Importante

- **Não há login separado** para entregador
- **Usa as mesmas credenciais** do sistema (admin/pdv)
- **Apenas entregadores atribuídos** verão entregas
- **Qualquer usuário autenticado** pode acessar `/delivery/*`

## 🚀 Acesso Rápido

**URL Direta:** `http://localhost:3000/delivery/dashboard`

Após fazer login, você pode acessar diretamente esta URL.

