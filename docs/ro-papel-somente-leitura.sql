-- Papel de banco SOMENTE LEITURA para a RO (exemplo; NÃO foi aplicado em lugar nenhum).
--
-- Por quê: hoje, sem RO_DATABASE_URL, a RO usa o mesmo usuário do sistema. O código já bloqueia escrita (veja
-- lib/ai/ro/db.ts), mas só um papel que NÃO TEM permissão de escrever, nem de ler senhas e configurações, garante
-- isso dentro do próprio PostgreSQL. Com este papel, mesmo um erro de programação futuro não consegue gravar nada
-- nem ler as tabelas User, SystemConfig, tokens de senha, nem as colunas password e barcode.
--
-- Como usar (um administrador do banco, uma vez, em cada ambiente; troque <banco> e a senha):
--   psql "<conexão de administrador>" -f docs/ro-papel-somente-leitura.sql
-- Depois, na hospedagem (Vercel/Coolify), crie a variável de ambiente:
--   RO_DATABASE_URL=postgresql://ro_leitura:<senha>@<servidor>:5432/<banco>?sslmode=require
-- (a mesma forma da DATABASE_URL, só trocando usuário e senha). Sem a variável, a RO continua como está hoje.
--
-- Ao criar uma consulta nova na RO que leia outra tabela ou coluna, acrescente o GRANT correspondente aqui.

CREATE ROLE ro_leitura LOGIN PASSWORD 'TROQUE-ESTA-SENHA' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT;

-- tudo o que este papel faz é leitura, com limites de tempo
ALTER ROLE ro_leitura SET default_transaction_read_only = on;
ALTER ROLE ro_leitura SET statement_timeout = '8s';
ALTER ROLE ro_leitura SET lock_timeout = '2s';
ALTER ROLE ro_leitura SET idle_in_transaction_session_timeout = '20s';

GRANT CONNECT ON DATABASE <banco> TO ro_leitura;
GRANT USAGE ON SCHEMA public TO ro_leitura;

-- Customer: só as colunas que a RO mostra (sem password, barcode, endereço, foto)
GRANT SELECT ("id", "name", "phone", "email", "doc", "active", "phoneIsWhatsapp") ON "Customer" TO ro_leitura;

-- Product: sem código de barras
GRANT SELECT ("id", "name", "priceCents", "pricePerKgCents", "stockEnabled", "stock", "active") ON "Product" TO ro_leitura;

-- WhatsApp: só para contar mensagens não lidas (sem o texto das conversas)
GRANT SELECT ("customerId", "fromMe", "readAt") ON "WhatsAppMessage" TO ro_leitura;

-- vendas, pedidos, despesas e cardápio
GRANT SELECT ON "Order", "OrderItem", "PreOrder", "Expense", "ExpenseType", "DailyMenu", "DailyMenuSection", "DailyMenuItem" TO ro_leitura;

-- NÃO conceder (de propósito): "User", "SystemConfig", "CustomerPasswordResetToken", "PaymentIntent",
-- "MessageLog", "Notification" e qualquer outra tabela fora da lista acima.

-- Conferência (como ro_leitura): isto deve funcionar...
--   SELECT count(*) FROM "Order";
-- ...e tudo isto deve dar "permission denied" ou "read-only transaction":
--   SELECT * FROM "User";           SELECT "password" FROM "Customer";
--   UPDATE "Customer" SET name = 'x';   DELETE FROM "Order";   COPY (SELECT 1) TO PROGRAM 'id';
