## Modelagem de Dados (Postgres)

### Tabelas Principais
- users(id, name, email, password_hash, role[admin|pdv], created_at)
- customers(id, name, phone, email, doc, address_json, created_at)
- products(id, sku, name, barcode, category_id, price_cents, active, created_at)
- categories(id, name)
- orders(id, customer_id, status, subtotal_cents, discount_cents, delivery_fee_cents, total_cents, payment_method, created_at)
- order_items(id, order_id, product_id, quantity, unit_price_cents, total_cents)

### Índices Sugeridos
- products.sku, products.barcode
- orders.created_at, orders.customer_id

### Observações
- `address_json` estruturado (rua, número, bairro, cidade, UF, CEP, complemento, geolocalização futura).
- Valores monetários em centavos (inteiros) para evitar erros de ponto flutuante.


