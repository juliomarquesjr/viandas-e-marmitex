## Setup de Desenvolvimento

### Pré-requisitos
- Node 18+
- Docker Desktop
- Rust (via rustup) com target Windows: `rustup default stable`
- Visual Studio Build Tools (Desktop development with C++) para build do Tauri no Windows

### Passos
1. Copie `.env.example` para `.env` e ajuste variáveis.
2. Suba o Postgres: `docker compose up -d`.
3. Instale dependências: `npm install`.
4. Rode a aplicação: `npm run dev`.

### Setup Desktop (Tauri + Next local)
1. Gere o build standalone do Next: `npm run desktop:next:build`.
2. Prepare os recursos para o bundle desktop: `npm run desktop:prepare`.
3. Execute em modo dev desktop: `npm run desktop:dev`.
4. Para gerar instalador: `npm run desktop:build:installer`.

Observação: o runtime desktop desta versão usa servidor Next local e requer Node.js instalado na máquina que executa o app.

### Variáveis de Ambiente
- `DATABASE_URL=postgres://postgres:postgres@localhost:5432/viandas`
- `NEXTAUTH_SECRET=` (se usar)
- `JWT_SECRET=`


