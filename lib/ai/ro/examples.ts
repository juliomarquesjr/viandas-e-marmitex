export const SQL_EXAMPLES = `
EXEMPLOS DE CONSULTAS SQL CORRETAS PARA POSTGRESQL:

1. Vendas por dia:
   SELECT DATE_TRUNC('day', "createdAt") as data, COUNT(*) as vendas
   FROM "Order" 
   WHERE status = 'delivered'
   GROUP BY DATE_TRUNC('day', "createdAt")
   ORDER BY data DESC

2. Vendas por mês:
   SELECT DATE_TRUNC('month', "createdAt") as mes, COUNT(*) as vendas
   FROM "Order"
   GROUP BY DATE_TRUNC('month', "createdAt")
   ORDER BY mes DESC

3. Produtos mais vendidos:
   SELECT p.name, SUM(oi.quantity) as total_vendido
   FROM "Product" p
   JOIN "OrderItem" oi ON p.id = oi."productId"
   JOIN "Order" o ON oi."orderId" = o.id
   WHERE o.status = 'delivered'
   GROUP BY p.id, p.name
   ORDER BY total_vendido DESC

4. Clientes com mais pedidos:
   SELECT c.name, COUNT(o.id) as total_pedidos
   FROM "Customer" c
   JOIN "Order" o ON c.id = o."customerId"
   GROUP BY c.id, c.name
   ORDER BY total_pedidos DESC

5. Faturamento por período:
   SELECT DATE_TRUNC('day', "createdAt") as data,
          SUM("totalCents")/100.0 as faturamento_reais
   FROM "Order"
   WHERE status = 'delivered'
   GROUP BY DATE_TRUNC('day', "createdAt")
   ORDER BY data DESC

FUNÇÕES POSTGRESQL MAIS USADAS:
- DATE_TRUNC('day', campo) - agrupa por dia
- DATE_TRUNC('month', campo) - agrupa por mês  
- DATE_TRUNC('year', campo) - agrupa por ano
- EXTRACT(day FROM campo) - extrai o dia
- EXTRACT(month FROM campo) - extrai o mês
- EXTRACT(year FROM campo) - extrai o ano
- CAST(campo AS DATE) - converte para data
- NOW() - data/hora atual
- CURRENT_DATE - data atual
- COUNT(*), SUM(), AVG(), MIN(), MAX() - agregações
- ROUND(valor, 2) - arredondar para 2 casas decimais

LEMBRE-SE: NUNCA use date(), time() ou datetime() - essas funções não existem no PostgreSQL!
`;

export const COMMON_QUERIES = {
  dailySales: `
    SELECT DATE_TRUNC('day', "createdAt") as data, 
           COUNT(*) as vendas,
           SUM("totalCents")/100.0 as faturamento
    FROM "Order" 
    WHERE status = 'delivered'
    GROUP BY DATE_TRUNC('day', "createdAt")
    ORDER BY data DESC
    LIMIT 30
  `,
  
  monthlySales: `
    SELECT DATE_TRUNC('month', "createdAt") as mes, 
           COUNT(*) as vendas,
           SUM("totalCents")/100.0 as faturamento
    FROM "Order"
    WHERE status = 'delivered'
    GROUP BY DATE_TRUNC('month', "createdAt")
    ORDER BY mes DESC
    LIMIT 12
  `,
  
  topProducts: `
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
  `,
  
  customerStats: `
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
  `,
  
  inactiveCustomers: `
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
  `,
  
  orderStatus: `
    SELECT status, 
           COUNT(*) as quantidade, 
           SUM("totalCents")/100.0 as valor_total
    FROM "Order"
    GROUP BY status
    ORDER BY quantidade DESC
  `,
  
  productsByCategory: `
    SELECT cat.name as categoria,
           COUNT(p.id) as total_produtos,
           AVG(p."priceCents")/100.0 as preco_medio
    FROM "Category" cat
    LEFT JOIN "Product" p ON cat.id = p."categoryId"
    WHERE p.active = true
    GROUP BY cat.id, cat.name
    ORDER BY total_produtos DESC
  `,
  
  recentOrders: `
    SELECT o.id,
           c.name as cliente,
           o.status,
           o."totalCents"/100.0 as valor,
           o."createdAt"
    FROM "Order" o
    LEFT JOIN "Customer" c ON o."customerId" = c.id
    ORDER BY o."createdAt" DESC
    LIMIT 20
  `,
  
  customerDetails: `
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
  `
};
