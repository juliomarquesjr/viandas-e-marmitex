## Mapa de rotas

Quem usa o sistema entra por portas diferentes. Cada uma tem a sua sessão (cookie próprio) e as suas regras no `middleware.ts`.

### Páginas

| Quem | Endereço | O que é |
|---|---|---|
| Cliente | `/` | Entrada da área do cliente: logado vai para `/dashboard`, sem login vai para `/login` |
| Cliente | `/login`, `/forgot-password`, `/reset-password` | Entrar e recuperar a senha (públicas) |
| Cliente | `/dashboard` | Início: saldo, últimas movimentações, pedido em andamento |
| Cliente | `/expenses` | Ficha: compras e pagamentos, com o comprovante |
| Cliente | `/pre-orders` | Pedidos, com a lista e o detalhe lado a lado |
| Cliente | `/pre-orders/[id]/tracking` | Rastreio no mapa (público: o link é compartilhado) |
| Cliente | `/profile` | Perfil, foto, senha e tema |
| Funcionário | `/auth/login` | Entrada de admin, PDV e entregador |
| Funcionário | `/redirect` | Tela de abertura: confere o servidor e a sessão e leva ao destino do perfil (o app desktop abre por ela) |
| Admin | `/admin/**` | Painel administrativo |
| Admin e PDV | `/admin/pdv` | Ponto de venda, em tela cheia dentro do painel |
| Entregador | `/delivery/**` | Painel do entregador (qualquer funcionário logado) |
| Público | `/tracking/[id]` | Rastreio por link (sem login) |
| Público | `/unauthorized` | Aviso de acesso negado |
| Interno | `/print/**`, `/scan`, `/reports` | Impressão, leitura de QR e relatórios |

### Regras de acesso (`middleware.ts`)

- **Cliente** (`/dashboard`, `/expenses`, `/pre-orders`, `/profile`): exige a sessão do cliente. As exceções públicas são `/forgot-password`, `/reset-password` e `/pre-orders/[id]/tracking`. `/login` leva ao Início quem já está logado. Um funcionário logado no mesmo navegador não atrapalha: cada área olha só para a sua sessão.
- **Admin** (`/admin/**`): exige sessão de funcionário. O perfil `pdv` só entra em `/admin/pdv`; `/admin/users` é só do admin. 
- **Entregador** (`/delivery/**`): qualquer funcionário logado.
- A lista de páginas do cliente fica em `CUSTOMER_PATHS` no `middleware.ts`: ao criar uma página nova do cliente na raiz, acrescente-a lá e ao `matcher`.

### Sessões

Funcionário e cliente têm logins separados e **cookies com nomes diferentes** (o do cliente é `next-auth.customer-session-token`, ver `lib/customer-session-cookie.ts`). Entrar como cliente não derruba a sessão do funcionário no mesmo navegador.

| | Funcionário | Cliente |
|---|---|---|
| Rotas do NextAuth | `/api/auth` | `/api/auth/customer` |
| Tela de entrada | `/auth/login` | `/login` |
| Configuração | `lib/auth.ts` | `lib/auth-customer.ts` |

### Endereços antigos

Continuam funcionando, com redirecionamento permanente (`next.config.ts`):

| Antigo | Novo |
|---|---|
| `/customer` | `/` |
| `/customer/**` (ex.: `/customer/reset-password?token=…`) | `/**` (ex.: `/reset-password?token=…`) |
| `/pdv`, `/pdv/**` | `/admin/pdv`, `/admin/pdv/**` |

Isso cobre os e-mails de recuperação de senha já enviados e os favoritos do PDV.

### APIs

As APIs não mudaram de endereço. As do cliente ficam em `/api/customer/**` (ver [area-cliente.md](./area-cliente.md)) e o NextAuth do cliente em `/api/auth/customer`.

### Onde está no código

| Rota | Pasta |
|---|---|
| Área do cliente (`/`, `/login`, `/dashboard`…) | `app/(customer)/` (grupo de rotas: o nome da pasta não aparece na URL) |
| Painel e PDV | `app/admin/` e `app/admin/pdv/` |
| Entrada de funcionários | `app/auth/`, `app/redirect/` |
| Entregador | `app/delivery/` |
