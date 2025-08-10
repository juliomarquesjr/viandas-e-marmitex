## Arquitetura

### Visão Geral
- Frontend: Next.js (App Router), shadcn/ui, axios.
- Backend: Next.js API Routes (inicial) com possibilidade de migração para serviço dedicado.
- Banco: Postgres.

### Módulos
- Auth & RBAC
- Catálogo (produtos, categorias)
- Clientes
- Vendas/PDV
- Relatórios

### Comunicação
- HTTP REST (axios) com interceptors para auth e tratamento de erros.

### Ambientes
- dev, test, prod com `.env` separados.


