## Especificação de APIs (v1)

Base URL: `/api`

### Versão / deploy

- GET `/api/version` — metadados públicos da build em execução (`app`, `version`, `commitSha`, `buildTime`, `environment`). Detalhes e variáveis de ambiente: [version-operacao.md](./version-operacao.md).

### Auth
- POST `/auth/login` { email, password } → { token, user:{ id, name, role } }
- POST `/auth/logout`

### Produtos
- GET `/products` query: q, page, size, active
- POST `/products` body: { sku, name, barcode?, category_id?, price_cents, active }
- GET `/products/:id`
- PATCH `/products/:id`

### Clientes
- GET `/customers` q, page, size
- POST `/customers` { name, phone, email?, doc?, address_json? }
- GET `/customers/:id`
- PATCH `/customers/:id`

### Pedidos (PDV)
- POST `/orders` { customer_id?, items:[{ product_id, quantity }], discount_cents?, delivery_fee_cents?, payment_method }
- GET `/orders/:id`
- GET `/orders` q, customer_id, from, to

### Relatórios
- GET `/reports/daily?date=YYYY-MM-DD`
- GET `/reports/by-customer?customer_id=...&from=...&to=...`
- GET `/reports/summary?from=...&to=...`

### Área do cliente (`/api/customer/**`)
Exigem a sessão do cliente (NextAuth em `/api/auth/customer`) e só devolvem dados do próprio cliente. Lista completa e descrição em [area-cliente.md](./area-cliente.md).

- GET/PUT `/api/customer/profile` · POST/DELETE `/api/customer/profile/photo`
- GET `/api/customer/expenses` (saldo, compras e pagamentos; filtro `startDate` e `endDate`)
- GET `/api/customer/pre-orders` · GET `/api/customer/pre-orders/:id/delivery` e `/tracking`
- GET `/api/customer/notifications` (avisos derivados de pedidos e ficha)
- GET/POST `/api/customer/payment-intents` ("Já paguei")
- GET `/api/admin/whatsapp` · POST `/api/admin/whatsapp/connect|disconnect|test` · POST `/api/webhooks/evolution` · GET `/api/cron/whatsapp-health` (WhatsApp; ver [whatsapp.md](./whatsapp.md))
- GET `/api/customer/menus` · GET `/api/customer/menus/:date` (cardápio diário; ver [cardapio-diario.md](./cardapio-diario.md)) · GET `/api/admin/menus` · GET/PUT/DELETE `/api/admin/menus/:date` (só administrador)
- GET `/api/customer/ordering/menu` · POST `/api/customer/ordering/orders` (header `Idempotency-Key`) · POST `/api/customer/pre-orders/:id/cancel` (pedido online; ver [pedido-online.md](./pedido-online.md))
- POST `/api/customer/forgot-password` e `/reset-password`
- GET `/api/customer/realtime-token` (204 sem `ABLY_API_KEY`)

### Funcionários: notificações e PIX informado
- GET `/api/notifications` · POST `/api/notifications/:id/read` e `/read-all`
- GET `/api/payment-intents/:id` · POST `/api/payment-intents/:id/confirm` (aceita `amountCents`) e `/reject` (aceita `reason`)
- GET `/api/realtime/staff-token` (só funcionário; 204 sem `ABLY_API_KEY`)

### Pedido online (admin)
- GET/PUT `/api/admin/customer-ordering` (só admin: interruptor, pausa, "esgotou hoje" e janelas de horário)
- POST `/api/pre-orders/:id/respond` (só admin: `accept` com previsão ou `reject` com motivo)

### Público (sem login)
- GET `/api/public/pre-orders/:id/delivery` e `/tracking` (usados pelo rastreio por link)
- GET `/api/version`
