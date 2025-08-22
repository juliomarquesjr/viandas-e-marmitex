# Viandas e Marmitex

Sistema de gestão para restaurantes especializados em viandas e marmitas, com PDV (Ponto de Venda) e área administrativa.

## Funcionalidades

- **PDV (Ponto de Venda)**: Interface para realização de vendas
- **Gestão de Produtos**: Cadastro e gerenciamento de produtos e categorias
- **Gestão de Clientes**: Cadastro e gerenciamento de clientes
- **Gestão de Usuários**: Cadastro e gerenciamento de usuários (Administradores e PDV)
- **Gestão de Pedidos**: Acompanhamento de pedidos
- **Relatórios**: Análise de vendas e desempenho

## Perfis de Usuário

O sistema possui dois perfis de usuário com diferentes níveis de acesso:

### Administrador
- Acesso completo a todas as funcionalidades
- Pode gerenciar usuários (criar, editar, excluir)
- Pode acessar todas as áreas do sistema

### PDV (Ponto de Venda)
- Acesso ao PDV para realização de vendas
- Pode visualizar produtos e clientes
- Não pode acessar áreas administrativas restritas

## Códigos de Barras

O sistema utiliza códigos de barras para identificação rápida de produtos e clientes no PDV:

- **Clientes**: Códigos que começam com 1, 2 ou 3
- **Produtos**: Códigos que começam com 5, 6 ou 7

## Tecnologias

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, Shadcn UI, Lucide Icons
- **Backend**: Next.js API Routes
- **Banco de Dados**: PostgreSQL com Prisma ORM
- **Autenticação**: NextAuth.js com credenciais

## Pré-requisitos

- Node.js 18+

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

3. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   # Ajuste as variáveis conforme necessário
   ```

4. **Execute as migrations do banco de dados:**
   ```bash
   npx prisma migrate dev
   ```

6. **Popule o banco com dados de exemplo:**
   ```bash
   npm run seed:all
   ```

7. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

8. **Acesse a aplicação:**
   Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

## Credenciais de Acesso

Após executar o seed, as seguintes credenciais estarão disponíveis:

**Administrador:**
- Email: `admin@viandas.com`
- Senha: `admin123`

**PDV:**
- Email: `pdv@viandas.com`
- Senha: `pdv123`

## Estrutura do Projeto

```
app/
  ├── auth/            # Autenticação
  ├── admin/           # Área administrativa
  │   ├── customers/   # Gestão de clientes
  │   ├── products/    # Gestão de produtos
  │   ├── users/       # Gestão de usuários
  │   ├── orders/      # Gestão de pedidos
  │   └── reports/     # Relatórios
  ├── pdv/             # Ponto de venda
  ├── api/             # APIs REST
  │   └── auth/        # API de autenticação
  └── components/      # Componentes reutilizáveis
lib/
  ├── auth.ts          # Configuração do NextAuth
  ├── prisma.ts        # Cliente Prisma
  └── utils.ts         # Funções utilitárias
prisma/
  ├── schema.prisma    # Schema do banco de dados
  └── migrations/      # Migrations
scripts/
  ├── seed-categories.ts  # Script para popular categorias
  ├── seed-products.ts    # Script para popular produtos
  ├── seed-customers.ts   # Script para popular clientes
  └── seed-users.ts       # Script para popular usuários
```

## APIs

### Autenticação

- `POST /api/auth/callback/credentials` - Autenticação de credenciais
- `GET /api/auth/session` - Obter sessão atual
- `POST /api/auth/signout` - Encerrar sessão

### Usuários

- `GET /api/users` - Listar usuários
  - Parâmetros: `q` (busca), `role` (all/admin/pdv), `status` (all/active/inactive), `page`, `size`
- `POST /api/users` - Criar usuário
- `PUT /api/users` - Atualizar usuário
- `DELETE /api/users?id={id}` - Excluir usuário

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
- `npm run seed:all` - Popular todos os dados de exemplo
- `npm run seed:users` - Popular apenas usuários
- `npm run seed:customers` - Popular apenas clientes
- `npm run seed:products` - Popular apenas produtos
- `npm run seed:categories` - Popular apenas categorias

### Comandos do Prisma

- `npx prisma studio` - Abrir Prisma Studio (interface visual do banco)
- `npx prisma migrate dev` - Criar e executar nova migration
- `npx prisma generate` - Gerar cliente Prisma
- `npx prisma migrate reset` - Resetar banco de dados (apenas desenvolvimento)

## Segurança

- Todas as senhas são armazenadas com hash bcrypt
- Rotas protegidas por middleware de autenticação
- Controle de acesso baseado em perfis de usuário
- Sessões seguras com JWT

## Documentação

- [Documentação do Next.js](https://nextjs.org/docs)
- [Documentação do NextAuth.js](https://next-auth.js.org/)
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