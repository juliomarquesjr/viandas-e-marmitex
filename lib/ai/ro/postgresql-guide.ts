export const POSTGRESQL_SQL_GUIDE = `
GUIA COMPLETO DE SQL PARA POSTGRESQL:

FUNÇÕES DE DATA (NUNCA use date(), time(), datetime()):
✅ CORRETO:
- DATE_TRUNC('day', campo) - extrai apenas a data (YYYY-MM-DD)
- DATE_TRUNC('month', campo) - extrai ano e mês (YYYY-MM-01)
- DATE_TRUNC('year', campo) - extrai apenas o ano (YYYY-01-01)
- DATE_TRUNC('hour', campo) - extrai até a hora
- DATE_TRUNC('minute', campo) - extrai até o minuto
- EXTRACT(day FROM campo) - extrai o dia (1-31)
- EXTRACT(month FROM campo) - extrai o mês (1-12)
- EXTRACT(year FROM campo) - extrai o ano
- EXTRACT(dow FROM campo) - extrai dia da semana (0=domingo, 6=sábado)
- CAST(campo AS DATE) - converte para data
- CAST(campo AS TIMESTAMP) - converte para timestamp
- NOW() - data/hora atual
- CURRENT_DATE - data atual
- CURRENT_TIMESTAMP - timestamp atual
- INTERVAL '1 day' - intervalo de 1 dia
- campo + INTERVAL '1 day' - adicionar 1 dia

❌ INCORRETO (não existem no PostgreSQL):
- date(campo)
- time(campo)
- datetime(campo)
- getdate()
- curdate()

FUNÇÕES DE AGREGAÇÃO:
- COUNT(*) - contar registros
- COUNT(campo) - contar valores não nulos
- SUM(campo) - somar valores
- AVG(campo) - média
- MIN(campo), MAX(campo) - mínimo e máximo
- ROUND(valor, 2) - arredondar para 2 casas decimais
- COALESCE(campo, 0) - substituir NULL por 0

FUNÇÕES DE STRING:
- UPPER(campo) - converter para maiúscula
- LOWER(campo) - converter para minúscula
- TRIM(campo) - remover espaços
- LENGTH(campo) - tamanho da string
- SUBSTRING(campo, 1, 10) - extrair substring
- CONCAT(campo1, ' ', campo2) - concatenar strings

CONDIÇÕES E FILTROS:
- campo IS NULL - verificar se é nulo
- campo IS NOT NULL - verificar se não é nulo
- campo IN ('valor1', 'valor2') - lista de valores
- campo NOT IN ('valor1', 'valor2') - excluir valores
- campo BETWEEN 'inicio' AND 'fim' - intervalo
- campo LIKE 'padrão%' - busca com wildcard
- campo ILIKE 'padrão%' - busca case-insensitive

AGRUPAMENTO E ORDENAÇÃO:
- GROUP BY campo - agrupar por campo
- HAVING condição - filtrar grupos
- ORDER BY campo ASC/DESC - ordenar
- LIMIT n - limitar resultados
- OFFSET n - pular registros

EXEMPLOS PRÁTICOS PARA O SISTEMA ADMINISTRATIVO:

1. Vendas por dia:
SELECT DATE_TRUNC('day', "createdAt") as data, 
       COUNT(*) as vendas,
       SUM("totalCents")/100.0 as faturamento
FROM "Order" 
WHERE status = 'delivered'
GROUP BY DATE_TRUNC('day', "createdAt")
ORDER BY data DESC
LIMIT 30

2. Vendas por mês:
SELECT DATE_TRUNC('month', "createdAt") as mes, 
       COUNT(*) as vendas,
       SUM("totalCents")/100.0 as faturamento
FROM "Order"
WHERE status = 'delivered'
GROUP BY DATE_TRUNC('month', "createdAt")
ORDER BY mes DESC
LIMIT 12

3. Produtos mais vendidos:
SELECT p.name, 
       SUM(oi.quantity) as total_vendido,
       SUM(oi."priceCents" * oi.quantity)/100.0 as receita
FROM "Product" p
JOIN "OrderItem" oi ON p.id = oi."productId"
JOIN "Order" o ON oi."orderId" = o.id
WHERE o.status = 'delivered'
GROUP BY p.id, p.name
ORDER BY total_vendido DESC
LIMIT 10

4. Clientes com mais pedidos:
SELECT c.name, 
       c.phone,
       COUNT(o.id) as total_pedidos,
       SUM(o."totalCents")/100.0 as total_gasto
FROM "Customer" c
JOIN "Order" o ON c.id = o."customerId"
WHERE o.status = 'delivered'
GROUP BY c.id, c.name, c.phone
ORDER BY total_gasto DESC
LIMIT 10

5. Clientes inativos (últimos 30 dias):
SELECT c.name, 
       c.phone, 
       c.email,
       MAX(o."createdAt") as ultimo_pedido
FROM "Customer" c
LEFT JOIN "Order" o ON c.id = o."customerId"
WHERE o."createdAt" < CURRENT_DATE - INTERVAL '30 days' 
   OR o."createdAt" IS NULL
GROUP BY c.id, c.name, c.phone, c.email
ORDER BY ultimo_pedido ASC
LIMIT 20

6. Status dos pedidos:
SELECT status, 
       COUNT(*) as quantidade, 
       SUM("totalCents")/100.0 as valor_total
FROM "Order"
GROUP BY status
ORDER BY quantidade DESC

7. Produtos por categoria:
SELECT cat.name as categoria,
       COUNT(p.id) as total_produtos,
       AVG(p."priceCents")/100.0 as preco_medio
FROM "Category" cat
LEFT JOIN "Product" p ON cat.id = p."categoryId"
WHERE p.active = true
GROUP BY cat.id, cat.name
ORDER BY total_produtos DESC

8. Pedidos recentes:
SELECT o.id,
       c.name as cliente,
       o.status,
       o."totalCents"/100.0 as valor,
       o."createdAt"
FROM "Order" o
LEFT JOIN "Customer" c ON o."customerId" = c.id
ORDER BY o."createdAt" DESC
LIMIT 20

9. Detalhes dos clientes:
SELECT c.name,
       c.phone,
       c.email,
       c.doc,
       c."createdAt" as cadastrado_em,
       COUNT(o.id) as total_pedidos,
       SUM(COALESCE(o."totalCents", 0))/100.0 as total_gasto
FROM "Customer" c
LEFT JOIN "Order" o ON c.id = o."customerId"
WHERE c.active = true
GROUP BY c.id, c.name, c.phone, c.email, c.doc, c."createdAt"
ORDER BY total_gasto DESC
LIMIT 50

10. Vendas da última semana:
SELECT DATE_TRUNC('day', "createdAt") as data,
       COUNT(*) as vendas,
       SUM("totalCents")/100.0 as faturamento
FROM "Order"
WHERE "createdAt" >= CURRENT_DATE - INTERVAL '7 days'
  AND status = 'delivered'
GROUP BY DATE_TRUNC('day', "createdAt")
ORDER BY data DESC

REGRAS CRÍTICAS:
1. SEMPRE use aspas duplas para nomes de tabelas e colunas: "Order", "createdAt"
2. NUNCA use date(), time(), datetime() - use DATE_TRUNC ou EXTRACT
3. Para datas, sempre use DATE_TRUNC('day', campo) em vez de date(campo)
4. Para conversão de centavos para reais: campo/100.0
5. Use COALESCE para tratar valores NULL
6. Sempre inclua LIMIT para consultas grandes
7. Use JOINs explícitos em vez de vírgulas
8. Ordene os resultados quando fizer sentido
`;

export const SQL_VALIDATION_RULES = [
  {
    pattern: /date\s*\(/gi,
    error: "Função date() não existe no PostgreSQL. Use DATE_TRUNC('day', campo) ou CAST(campo AS DATE)",
    fix: (sql: string) => sql.replace(/date\s*\(/gi, 'DATE_TRUNC(\'day\', ')
  },
  {
    pattern: /time\s*\(/gi,
    error: "Função time() não existe no PostgreSQL. Use CAST(campo AS TIME) ou EXTRACT",
    fix: (sql: string) => sql.replace(/time\s*\(/gi, 'CAST(')
  },
  {
    pattern: /datetime\s*\(/gi,
    error: "Função datetime() não existe no PostgreSQL. Use CAST(campo AS TIMESTAMP)",
    fix: (sql: string) => sql.replace(/datetime\s*\(/gi, 'CAST(')
  },
  {
    pattern: /getdate\s*\(/gi,
    error: "Função getdate() não existe no PostgreSQL. Use NOW()",
    fix: (sql: string) => sql.replace(/getdate\s*\(/gi, 'NOW()')
  },
  {
    pattern: /curdate\s*\(/gi,
    error: "Função curdate() não existe no PostgreSQL. Use CURRENT_DATE",
    fix: (sql: string) => sql.replace(/curdate\s*\(/gi, 'CURRENT_DATE')
  }
];
