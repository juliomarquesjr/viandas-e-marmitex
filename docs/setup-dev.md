## Setup de Desenvolvimento

### Pré-requisitos
- Node 18+
- Docker Desktop

### Passos
1. Copie `.env.example` para `.env` e ajuste variáveis.
2. Suba o Postgres: `docker compose up -d`.
3. Instale dependências: `npm install`.
4. Rode a aplicação: `npm run dev`.

### Variáveis de Ambiente
- `DATABASE_URL=postgres://postgres:postgres@localhost:5432/viandas`
- `NEXTAUTH_SECRET=` (se usar)
- `JWT_SECRET=`


