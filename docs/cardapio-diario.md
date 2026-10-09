## Cardápio diário (o administrador publica, o cliente consulta)

O administrador monta o **cardápio de cada dia** (seções e itens) e publica. O cliente vê o de hoje no Início, na aba **Cardápio**, e consulta os anteriores. O cardápio é **informativo**: um botão opcional "Fazer pedido" leva ao pedido online (ver [pedido-online.md](./pedido-online.md)); os itens são texto livre, não produtos cadastrados.

### Regras

| Regra | Como é |
|---|---|
| Um por dia | Um cardápio por dia (`DailyMenu.date`, "AAAA-MM-DD" em Brasília, único). Sem turnos |
| Situação | `draft` (rascunho) ou `published`. Só o publicado aparece para o cliente |
| Quem edita | Só o administrador (`requireAdmin`) |
| O que o cliente vê | Publicados **de hoje para trás e o de amanhã** (se já publicado). Dia futuro e rascunho voltam `null` |
| Estrutura | Até 12 seções, 40 itens por seção. Item: nome (80), descrição (160), `★ Destaque` (só um por cardápio: o primeiro marcado vale) e `Vegetariano`. Seção sem item e item sem nome são descartados |
| Publicar | Exige pelo menos 1 item. Rascunho pode estar vazio |
| Botão de pedido | `showOrderButton`: aparece só no cardápio **de hoje** e só se o pedido online está ligado (usa o estado da loja do pedido online) |
| Aviso no sino | `notifyCustomers` (só vale publicado): vira o aviso "Cardápio de hoje publicado" por 7 dias, derivado na hora (sem tabela de avisos), como os demais |
| Sem cardápio hoje | O aviso do Início **não aparece**; dentro da aba aparece "O cardápio de hoje ainda não foi publicado" com atalho para o último |

### Telas

- **Admin → Cardápios** (`/admin/menus`): semana de segunda a domingo (um cartão por dia: Publicado / Rascunho / Sem cardápio) e a lista com abas Próximos e recentes · Anteriores · Rascunhos (Editar, Publicar, Duplicar). "Novo cardápio" e "Copiar de outro dia" abrem um diálogo.
- **Admin → Editar** (`/admin/menus/[AAAA-MM-DD]`, `?copiar=AAAA-MM-DD` começa de uma cópia, sempre como rascunho): dia, título e observação; seções e itens (nome, descrição, destaque, vegetariano, ordem); publicação (Publicado/Rascunho, botão de pedido, avisar no sino); prévia ao vivo "Como o cliente vê". Aviso ao sair com mudanças não salvas; "Apagar este cardápio" com confirmação.
- **Cliente → Início**: depois do saldo, um aviso de uma linha ("Cardápio de hoje disponível · Feijoada completa e mais 8 itens"). Só aparece com cardápio publicado (de hoje, ou o de amanhã).
- **Cliente → Cardápio** (`/cardapio`, `?dia=AAAA-MM-DD`): faixa de dias (últimos publicados, hoje, amanhã se publicado), o cardápio completo (dia passado mostra "só para consulta"), "Escolher data" e a lista de anteriores agrupada em Hoje e amanhã · Esta semana · Semana passada · Há N semanas, com "Ver mais antigos". No computador, lista à esquerda e cardápio à direita.

### API

| Quem | Rota | O que faz |
|---|---|---|
| Admin | `GET /api/admin/menus?from&to` | Resumos por dia (data, título, situação, itens, pratos principais, destaque) |
| Admin | `GET`/`PUT`/`DELETE /api/admin/menus/[date]` | Lê (`menu: null` se não existe), grava o cardápio inteiro (substitui seções e itens) ou apaga |
| Cliente | `GET /api/customer/menus?before&limit` | Resumos dos publicados visíveis, do mais novo ao mais antigo (padrão 30, máx. 60), mais `today` do servidor |
| Cliente | `GET /api/customer/menus/[date]` | O cardápio do dia (`menu: null` se não existe, é rascunho ou é futuro) |

### Dados

Tabelas `DailyMenu` (data única, título, observação, situação, `showOrderButton`, `notifyCustomers`, `publishedAt`), `DailyMenuSection` e `DailyMenuItem` (ordem por `position`; apagar o cardápio apaga seções e itens em cascata). Código: `lib/daily-menu.ts` (regras puras, testadas em `tests/daily-menu.test.ts`), `lib/daily-menu-db.ts` (banco). Sem a migration, as APIs do cliente devolvem "sem cardápio" e o app segue funcionando.

### Colocar em produção

A migration `20261010100000_add_daily_menu` só **cria** as três tabelas. Aplicar antes do deploy (`prisma migrate deploy`, com autorização), senão o admin dá erro ao abrir Cardápios.
