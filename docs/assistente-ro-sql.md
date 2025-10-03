# Sistema de Validação SQL para o Assistente RO

## Visão Geral

O sistema foi aprimorado para garantir que a IA gere SQL correta para PostgreSQL desde o início, evitando erros como `function date() does not exist`.

## Componentes Implementados

### 1. **Validação SQL Robusta** (`lib/ai/sql-validator.ts`)
- Detecta funções inválidas como `date()`, `time()`, `datetime()`
- Corrige automaticamente para funções PostgreSQL válidas
- Valida uso de aspas duplas para nomes de tabelas/colunas
- Sugere melhorias como LIMIT e JOINs explícitos

### 2. **Prompt Específico para PostgreSQL** (`lib/ai/ro/constants.ts`)
- Regras críticas para SQL PostgreSQL
- Exemplos obrigatórios de consultas corretas
- Lista completa de funções suportadas
- Instruções específicas sobre conversão de centavos para reais

### 3. **Sistema de Feedback** (`lib/ai/ro/feedback-prompt.ts`)
- Gera feedback detalhado quando há erros
- Ensina a IA com exemplos específicos
- Fornece correções sugeridas

### 4. **Guia Completo PostgreSQL** (`lib/ai/ro/postgresql-guide.ts`)
- Documentação completa de funções PostgreSQL
- Exemplos práticos para o sistema de marmitas
- Regras de validação com correções automáticas

## Fluxo de Validação

1. **IA gera SQL** baseada no prompt otimizado
2. **Validação PostgreSQL** verifica se a SQL é válida
3. **Correção automática** para erros conhecidos
4. **Feedback** para a IA se houver erros críticos
5. **Execução** apenas com SQL válida

## Funções PostgreSQL Suportadas

### Datas
- `DATE_TRUNC('day', campo)` - extrai apenas a data
- `DATE_TRUNC('month', campo)` - extrai ano e mês
- `DATE_TRUNC('year', campo)` - extrai apenas o ano
- `EXTRACT(day FROM campo)` - extrai o dia
- `CAST(campo AS DATE)` - converte para data
- `NOW()`, `CURRENT_DATE` - data atual

### Agregação
- `COUNT(*)`, `SUM()`, `AVG()`, `MIN()`, `MAX()`
- `ROUND(valor, 2)` - arredondar
- `COALESCE(campo, 0)` - tratar NULL

## Exemplos de Consultas Corretas

```sql
-- Vendas por dia
SELECT DATE_TRUNC('day', "createdAt") as data, 
       COUNT(*) as vendas,
       SUM("totalCents")/100.0 as faturamento
FROM "Order" 
WHERE status = 'delivered'
GROUP BY DATE_TRUNC('day', "createdAt")
ORDER BY data DESC
LIMIT 30;

-- Produtos mais vendidos
SELECT p.name, 
       SUM(oi.quantity) as total_vendido,
       SUM(oi."priceCents" * oi.quantity)/100.0 as receita
FROM "Product" p
JOIN "OrderItem" oi ON p.id = oi."productId"
JOIN "Order" o ON oi."orderId" = o.id
WHERE o.status = 'delivered'
GROUP BY p.id, p.name
ORDER BY total_vendido DESC
LIMIT 10;

-- Clientes com mais pedidos (dados administrativos)
SELECT c.name, 
       c.phone,
       COUNT(o.id) as total_pedidos,
       SUM(o."totalCents")/100.0 as total_gasto
FROM "Customer" c
JOIN "Order" o ON c.id = o."customerId"
WHERE o.status = 'delivered'
GROUP BY c.id, c.name, c.phone
ORDER BY total_gasto DESC
LIMIT 10;

-- Clientes inativos
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
LIMIT 20;
```

## Benefícios

1. **Prevenção de Erros**: SQL válida é gerada desde o início
2. **Correção Automática**: Erros conhecidos são corrigidos automaticamente
3. **Feedback Educativo**: IA aprende com os erros
4. **Performance**: Menos tentativas e erros
5. **Manutenibilidade**: Código mais limpo e organizado

## Monitoramento

O sistema inclui logs detalhados:
- `[RO][SQL][Original]` - SQL original da IA
- `[RO][SQL][Validation Errors]` - Erros detectados
- `[RO][SQL][Auto-corrected]` - SQL corrigida automaticamente
- `[RO][SQL][Warnings]` - Avisos e sugestões
- `[RO][SQL][Feedback]` - Feedback enviado para a IA

## Próximos Passos

1. Monitorar logs para identificar padrões de erro
2. Adicionar mais funções de correção conforme necessário
3. Implementar cache de consultas corrigidas
4. Adicionar métricas de sucesso da validação
