## Especificação de APIs (v1)

Base URL: `/api`

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


