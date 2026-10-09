## Pedido online (o cliente pede pela área dele)

O cliente monta o pedido em `/pre-orders/novo` e envia. O admin libera o recurso, escolhe **quais produtos**, em **quais dias da semana** e em **quais horários**, e **aceita ou recusa** cada pedido. Nada é cobrado online: o pagamento acontece na retirada, pelo fluxo de sempre da Mesa de Pedido.

### Regras de negócio (v1)

| Regra | Como é |
|---|---|
| Quem libera | Só o administrador (interruptor mestre, desligado por padrão) |
| Horários | **Janelas** ("Almoço: seg–sex 10:00–13:00, estes produtos"). Dias da semana + início + fim (fim exclusivo; 24:00 vale). Tudo em **Brasília**, decidido pelo servidor. Atravessar a meia-noite = duas janelas |
| Produtos | Só produtos ativos, `sellable`, com preço e **não vendidos por quilo**. Cada janela diz quais produtos libera |
| "Hoje não" | Pausa até a meia-noite de Brasília (volta sozinho). "Esgotou hoje" por produto (também some amanhã) |
| Tolerância | O servidor ainda aceita o pedido até 3 min depois do fim da janela (cliente que montou o carrinho em cima da hora) |
| Quem pode pedir | Qualquer cliente **ativo** (relido do banco a cada pedido: a sessão dura 30 dias) |
| Retirada | v1 só retirada, "o mais rápido": ao aceitar, o admin informa a previsão (15/30/45/60 min ou sem previsão) |
| Preço | Lido do cadastro no momento do envio e congelado no item; preço, desconto, taxa e status vindos do cliente são ignorados |
| Estoque | Checagem de melhor esforço (estoque menos o que está em pedidos abertos **de hoje**, sem cancelados, entregues nem expirados) só para produtos com estoque controlado; a baixa real continua na conversão em venda |
| Limites | até 3 pedidos aguardando por cliente (o expirado não conta), 10 por hora, 10 produtos por pedido, 20 de cada, observação de até 200 letras |
| Duplo toque | `Idempotency-Key` por tentativa: repetir devolve o mesmo pedido (200, `duplicate: true`) |
| Expiração | Pedido sem resposta fica **expirado** depois de 20 min (e nunca passa do dia): só dá para recusar. Calculado na leitura, sem cron |
| Cancelar | O cliente cancela enquanto a loja não respondeu |

### Ciclo de vida do pedido

O pedido do cliente é um `PreOrder` comum, com colunas novas (nenhuma tabela existente mudou de forma incompatível):

```
cliente envia ─▶ source=online, approval=awaiting, status pending      ("Enviado", aguardando a loja)
                    │
   admin Aceitar ──▶ approval=accepted (segue na fila, com previsão)    ("Aceito") ─▶ fluxo normal da Mesa
   admin Recusar ──▶ approval=rejected, status cancelled, rejectReason  ("Recusado", com o motivo)
   cliente cancela ▶ approval=cancelled, status cancelled
   sem resposta 20 min ─▶ expirado (só Recusar)
```

**Guard:** enquanto `awaiting`, o pedido **não** muda de status, não é editado, apagado, não recebe entregador nem é convertido em venda por nenhum outro caminho (`409`, `code: AWAITING_APPROVAL`). Depois de `rejected`/`cancelled` ele também não reabre nem vira venda (`409`, `ORDER_CLOSED`). Só `POST /api/pre-orders/[id]/respond` tira o pedido de lá. Aceitar e cancelar usam `updateMany` com o estado no `where`: se dois chegam juntos, um leva `409`.

### Dados (migration `add_online_ordering`, aditiva)

- `PreOrder`: `source` (`staff` | `online`), `approval` (`awaiting` | `accepted` | `rejected` | `cancelled`), `respondedAt`, `rejectReason`, `idempotencyKey` (único por cliente).
- `OrderWindow` (nome, `weekdays` 0=domingo…6, `startMinute`, `endMinute`, `active`) e `OrderWindowProduct` (janela × produto). Uma `CHECK` em SQL garante ao menos um dia e horário válido (início antes do fim, dentro das 24 h); os dias 0–6 são validados na API.
- `SystemConfig` (categoria `ordering`): `online_ordering_enabled`, `online_ordering_paused_until`, `online_ordering_sold_out` (`{ day, ids }`).

### APIs

| Quem | Endereço | Para quê |
|---|---|---|
| Cliente | `GET /api/customer/ordering/menu` | Estado da loja (aberta, quando fecha/abre), produtos com `availableNow`, `soldOut` e o horário de cada um. `serverNow` para a tela não confiar no relógio do aparelho |
| Cliente | `POST /api/customer/ordering/orders` | Envia o pedido (`Idempotency-Key`). Erros com `code`: `ORDERING_DISABLED`, `CUSTOMER_INACTIVE`, `INVALID_ITEMS`, `WINDOW_CLOSED`, `PRODUCT_UNAVAILABLE`, `OUT_OF_STOCK`, `TOO_MANY_PENDING`, `RATE_LIMITED` |
| Cliente | `POST /api/customer/pre-orders/[id]/cancel` | Cancela enquanto aguarda |
| Admin | `GET`/`PUT /api/admin/customer-ordering` | Interruptor, pausa, "esgotou hoje" e janelas; a resposta traz a pré-visualização "o cliente vê agora" |
| Admin | `POST /api/pre-orders/[id]/respond` | `{ action: 'accept', minutes? }` ou `{ action: 'reject', reason? }` (só admin) |
| Funcionário | `GET /api/notifications` | Agora traz `awaitingOrders` e soma os pedidos aguardando em `badgeCount`/`pendingCount` |

### Sino e home do admin

O sino e o painel de atenção da home leem **da mesma fonte** (`/api/notifications`, num provider único). O contador do sino e o título da aba "(N)" somam o que pede ação (pedidos aguardando e pagamentos para conferir) mais os avisos ainda não lidos; o selo de Pré-Pedidos na barra lateral e o painel mostram cada grupo separado (pedidos / pagamentos). Pedido de um dia anterior que ninguém respondeu é recusado sozinho ("A loja não respondeu a tempo"), para não prender o contador. O pedido do cliente **não gera `Notification`**: o próprio pedido é a verdade (sem risco de selo preso por um caminho que esqueceu de resolver). Pagamentos PIX informados continuam como antes.

### Deploy em produção (ordem importa)

1. **Aplicar a migration no banco de produção** (a Vercel não aplica; ver `memory`/procedimento: só `prisma migrate deploy`, após ler o SQL, com autorização). A migration é só `ALTER TABLE ... ADD COLUMN` com valor padrão e `CREATE TABLE`.
2. Deploy do código. O recurso nasce **desligado**.
3. O admin configura os horários e produtos em Configurações → Pedidos online e liga o interruptor.

Código novo antes da migration: só o sino tolera (devolve 0 pedidos aguardando). Qualquer leitura de `PreOrder` sem `select` passa a pedir as colunas novas e falha (P2022): Mesa, conversão em venda, entrega, rastreio e o cardápio do pedido online. **Por isso a migration vem primeiro, sempre.** Rollback do código: desligue o interruptor e resolva os pedidos aguardando antes (a Mesa antiga os trataria como pedidos comuns).

### Testes

- `npm test`: regras de horário em Brasília (janela, tolerância, virada de dia, domingo à noite, próxima abertura, pausa, expiração, validação) com `TZ=UTC` e `now` injetado.
- `tests/integration/ordering-api.mts`: contra um servidor local (`TZ=UTC`) e o banco local, cobre permissões, janela, pausa, esgotado, idempotência, preço adulterado, limites, guard de status, aceitar/recusar/cancelar, expiração e corrida de pedidos simultâneos.

### Fora da v1
Entrega e frete, agendamento para outros dias, produtos por quilo e adicionais, pagamento online, reserva de estoque, horário diferente por produto, limite de pedidos por janela, aviso por e-mail/WhatsApp, "pedir de novo".
