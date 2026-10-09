## Área do cliente

Onde o cliente acompanha a própria ficha e os pedidos. Pensada para o celular, com lista e detalhe lado a lado no computador. Vive na **raiz do site** (`/`), no grupo de rotas `app/(customer)/`. O mapa completo de endereços está em [rotas.md](./rotas.md).

### Telas

| Endereço | O que mostra |
|---|---|
| `/dashboard` | Saldo da ficha (com "Pagar com PIX"), as 5 últimas movimentações, o pedido em andamento mais recente e o endereço de entrega |
| `/expenses` | Ficha: compras e pagamentos por período. O comprovante tem a ilustração animada (selo no pagamento, sacola na compra), as fotos dos produtos e os valores |
| `/pre-orders` | Pedidos com miniaturas dos produtos; o detalhe mostra o andamento (recebido, em preparo, pronto, a caminho, entregue) |
| `/pre-orders/novo` | Fazer pedido: o cliente escolhe os produtos liberados pelo admin para o dia e o horário, envia e acompanha em Pedidos (Enviado, Aceito, Recusado). Ver [pedido-online.md](./pedido-online.md) |
| `/pre-orders/[id]/tracking` | Mapa da entrega (público, aberto por link) |
| `/profile` | Dados, foto (a mesma que o admin vê), senha e tema claro, escuro ou automático |
| Sino de **Avisos** | No cabeçalho (celular) e no menu lateral (computador): pedidos, compras na ficha e pagamentos dos últimos 30 dias |

### Login

- Entra por e-mail ou telefone e senha, em `/login`; a recuperação é por e-mail (`/forgot-password` e `/reset-password`).
- Sessão própria (NextAuth em `/api/auth/customer`, cookie separado do de funcionário). Ver [rotas.md](./rotas.md).

### APIs do cliente (`/api/customer/**`)

Todas exigem a sessão do cliente e devolvem só dados do próprio cliente.

| Endereço | Para quê |
|---|---|
| `GET /api/customer/profile`, `PUT` | Perfil e dados cadastrais |
| `POST` e `DELETE /api/customer/profile/photo` | Trocar ou remover a foto (JPEG, PNG, WebP ou GIF até 5 MB; sai em 512 px, WebP) |
| `GET /api/customer/expenses` | Ficha: saldo, compras e pagamentos (com filtro de período) |
| `GET /api/customer/pre-orders` | Pedidos, com os produtos e as fotos (e, nos pedidos feitos pelo app, a aprovação da loja) |
| `GET /api/customer/ordering/menu`, `POST /api/customer/ordering/orders`, `POST /api/customer/pre-orders/[id]/cancel` | Cardápio liberado agora, envio e cancelamento do pedido online |
| `GET /api/customer/pre-orders/[id]/delivery` e `/tracking` | Entrega e posição do entregador |
| `GET /api/customer/notifications` | Feed de avisos, montado na hora a partir dos pedidos e da ficha (sem tabela própria) |
| `GET` e `POST /api/customer/payment-intents` | "Já paguei": o cliente informa um PIX e o operador confere |
| `POST` e `DELETE /api/customer/dismissals` | Guarda (ou desfaz) o que o cliente dispensou: avisos e cartões de pagamento |
| `GET /api/customer/realtime-token` | Token para ouvir o canal do cliente (ver abaixo) |
| `POST /api/customer/forgot-password`, `/reset-password` | Recuperação de senha |

### Avisos

O que o cliente já **viu** fica no aparelho (`localStorage`), por aviso e por cliente: tocar no aviso ou marcar como visto diminui o contador do sino. Num aparelho novo, o que tem mais de um dia já entra como visto.

O que o cliente **limpa ou dispensa** (avisos do sino e cartões de "pagamento informado" no Início) fica **no servidor**, na tabela `CustomerDismissal` (chave = id do aviso, ou `intent:<id>`): vale em todos os aparelhos e não volta quando o navegador limpa o armazenamento. As APIs de avisos e de pagamentos já devolvem a lista sem o que foi dispensado. O envio usa uma fila local (`lib/dismissals.ts`) que tenta de novo a cada busca; dispensas antigas, feitas só no aparelho, sobem uma vez. "Limpar tudo" tem desfazer (`DELETE /api/customer/dismissals`). Sem a tabela (migration pendente) tudo segue funcionando só com o armazenamento local.

### PIX

O cliente informa o PIX pelo "Já paguei". Isso cria uma intenção de pagamento e uma notificação no sino do admin; o operador confere no banco, confirma (podendo corrigir o valor) ou recusa. Só a confirmação lança o pagamento na ficha.

### Tempo real

As telas se atualizam sozinhas quando o operador muda um pedido ou lança algo na ficha. O servidor publica um sinal no Ably (`customer:{id}`) depois de gravar, e o navegador busca os dados de novo. Sem `ABLY_API_KEY` tudo segue com a consulta periódica. O plano completo, com as fases e o custo, está em [plans/tempo-real-area-cliente.md](../plans/tempo-real-area-cliente.md).

### Código

| O quê | Onde |
|---|---|
| Páginas, kit visual e estilos | `app/(customer)/` (`customer.css` com os tokens `--c-*` e as classes `c-*`) |
| Casca (cabeçalho, menu, abas) | `app/(customer)/components/CustomerShell.tsx` |
| Tema | `app/(customer)/lib/theme.ts` (a escolha fica em `localStorage`, chave `customer:theme`) |
| Avisos | `app/(customer)/lib/notifications-store.ts`, `components/avisos/` |
| Tempo real no navegador | `app/(customer)/lib/realtime.tsx` e `lib/realtime-stream.ts` |
| APIs | `app/api/customer/**` |
