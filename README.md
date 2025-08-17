# Viandas e Marmitex

Sistema de gestão para restaurantes especializados em viandas e marmitas, com PDV (Ponto de Venda) e área administrativa.

## Funcionalidades

- **PDV (Ponto de Venda)**: Interface para realização de vendas
- **Gestão de Produtos**: Cadastro e gerenciamento de produtos e categorias
- **Gestão de Clientes**: Cadastro e gerenciamento de clientes
- **Gestão de Pedidos**: Acompanhamento de pedidos
- **Relatórios**: Análise de vendas e desempenho

## Tecnologias

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, Shadcn UI, Lucide Icons
- **Backend**: Next.js API Routes
- **Banco de Dados**: PostgreSQL com Prisma ORM
- **Autenticação**: (A ser implementada)

## Pré-requisitos

- Node.js 18+
- Docker e Docker Compose

## Instalação

1. **Clone o repositório:**
   ```bash
   git clone <repositorio>
   cd viandas-e-marmitex
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o banco de dados PostgreSQL:**
   ```bash
   docker-compose up -d
   ```

4. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   # Ajuste as variáveis conforme necessário
   ```

5. **Execute as migrations do banco de dados:**
   ```bash
   npx prisma migrate dev
   ```

6. **Popule o banco com dados de exemplo:**
   ```bash
   npx tsx scripts/seed-categories.ts
   npx tsx scripts/seed-products.ts
   npx tsx scripts/seed-customers.ts
   ```

7. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

8. **Acesse a aplicação:**
   Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

## Estrutura do Projeto

```
app/
  ├── admin/           # Área administrativa
  │   ├── customers/   # Gestão de clientes
  │   ├── products/    # Gestão de produtos
  │   ├── orders/      # Gestão de pedidos
  │   └── reports/     # Relatórios
  ├── pdv/             # Ponto de venda
  ├── api/             # APIs REST
  └── components/      # Componentes reutilizáveis
lib/
  ├── prisma.ts        # Cliente Prisma
  └── utils.ts         # Funções utilitárias
prisma/
  ├── schema.prisma    # Schema do banco de dados
  └── migrations/      # Migrations
scripts/
  ├── seed-categories.ts  # Script para popular categorias
  ├── seed-products.ts    # Script para popular produtos
  └── seed-customers.ts   # Script para popular clientes
```

## APIs

### Clientes

- `GET /api/customers` - Listar clientes
  - Parâmetros: `q` (busca), `status` (all/active/inactive), `page`, `size`
- `POST /api/customers` - Criar cliente
- `PUT /api/customers` - Atualizar cliente
- `DELETE /api/customers?id={id}` - Excluir cliente

### Produtos

- `GET /api/products` - Listar produtos
  - Parâmetros: `q` (busca), `category`, `status`, `type`, `variable`, `page`, `size`
- `POST /api/products` - Criar produto
- `PUT /api/products` - Atualizar produto
- `DELETE /api/products?id={id}` - Excluir produto

### Categorias

- `GET /api/categories` - Listar categorias
- `POST /api/categories` - Criar categoria

## Desenvolvimento

### Comandos úteis

- `npm run dev` - Iniciar servidor de desenvolvimento
- `npm run build` - Build de produção
- `npm run start` - Iniciar servidor de produção
- `npm run lint` - Verificar linting

### Comandos do Prisma

- `npx prisma studio` - Abrir Prisma Studio (interface visual do banco)
- `npx prisma migrate dev` - Criar e executar nova migration
- `npx prisma generate` - Gerar cliente Prisma
- `npx prisma migrate reset` - Resetar banco de dados (apenas desenvolvimento)

## Documentação

- [Documentação do Next.js](https://nextjs.org/docs)
- [Documentação do Prisma](https://www.prisma.io/docs/)
- [Documentação do Tailwind CSS](https://tailwindcss.com/docs)

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a licença MIT.