## Mensagens enviadas ao cliente

O administrador edita os textos que o sistema envia (WhatsApp e e-mail) em **WhatsApp → Mensagens**: textos (texto, assunto, liga/desliga por canal, prévia, "Enviar teste para mim", "Restaurar texto padrão", assinatura única) e **WhatsApp → Histórico** (quem recebeu, por qual canal e se deu certo).

### Tipos de mensagem
Ficam em `lib/messages/registry.ts`: nome, variáveis, texto padrão por canal. Hoje:
- `customer_password` — **Senha de acesso** (WhatsApp e e-mail). Variáveis: `{nome}` (primeiro nome), `{usuario}` (e-mail ou telefone), `{senha}`, `{loja}`, `{link_app}`.
- `customer_password_reset` — **Link para redefinir senha** (e-mail e WhatsApp, não pode ser desligada; o texto é o mesmo padrão nos dois canais). Usada por "Esqueci minha senha", onde o cliente escolhe como receber; a opção de WhatsApp só aparece se o WhatsApp do estabelecimento estiver conectado (`GET /api/customer/forgot-password`). Variáveis: `{nome}`, `{link}`, `{validade}`, `{loja}`.

- `daily_menu` — **Cardápio do dia** (só WhatsApp). Variáveis: `{nome}`, `{loja}`, `{cardapio}` (preenchida pelo sistema com o cardápio publicado de hoje, por seção, com ⭐ no destaque e "(vegetariano)"; cardápio grande é cortado com "…e mais N itens"), `{link_app}` (endereço da área do cliente, com https://).

- `customer_orders` — **Resumo das compras** (só WhatsApp, manual, só administrador). Variáveis: `{nome}`, `{loja}`, `{compras}` (preenchida pelo sistema com as compras dos dias escolhidos: itens, total do dia e "(na ficha)" quando ainda não foi paga), `{link_app}`.
- `customer_balance` — **Saldo da ficha** (só WhatsApp, manual, só administrador). Variáveis: `{nome}`, `{loja}`, `{saldo}` (valor sem sinal), `{situacao}` (a frase pronta: valor em aberto, crédito ou ficha em dia), `{link_app}`.

- `customer_closing` — **Fechamento da ficha (PDF)** (WhatsApp e e-mail, manual, só administrador). Variáveis: `{nome}`, `{loja}`, `{periodo}`, `{saldo}`, `{situacao}`, `{pagamento}` (o bloco com o link de pagamento; some se não há saldo a pagar ou se o administrador desligou o link), `{link_app}`. No WhatsApp o texto vai de **legenda do PDF**; no e-mail, o PDF vai **anexo**. Ver [fechamento-e-link-de-pagamento.md](./fechamento-e-link-de-pagamento.md).
- `customer_payment_link` — **Link de pagamento (PIX)** (WhatsApp e e-mail, manual, só administrador). Variáveis: `{nome}`, `{loja}`, `{saldo}`, `{link_pagamento}`.

- **Andamento do pedido** (grupo **Pedidos**, só WhatsApp): `order_received` (Pedido recebido), `order_accepted` (Pedido aceito), `order_rejected` (Pedido recusado), `order_preparing` (Pedido em preparo), `order_ready` (Pronto para retirar), `order_out_for_delivery` (Saiu para entrega), `order_delivered` (Pedido entregue) e `order_cancelled` (Pedido cancelado). Variáveis: `{nome}`, `{loja}`, `{pedido}` (os 4 últimos caracteres do código, como na comanda), `{itens}`, `{total}`, `{previsao}` (some se o pedido não tem previsão), `{link_app}` e, na recusa, `{motivo}` (some se não foi escrito). Ver "Avisar o cliente a cada etapa" abaixo.

Pagamento confirmado e lembrete de saldo aparecem como "em breve".

### Avisar o cliente a cada etapa do pedido
- **Switch "Avisar o cliente pelo WhatsApp"** na Mesa de pedido (Pré-Pedidos → Novo/Editar), na coluna da comanda. Só aparece se o cliente do pedido tem o telefone marcado como WhatsApp; vem **ligado** ao escolher um cliente com WhatsApp (o operador desliga se quiser). Trocar para um cliente sem WhatsApp, ou tirar o cliente, desliga o switch.
- Em pedido que já existe (o pedido feito pelo cliente no aplicativo também nasce ligado quando ele tem WhatsApp) o mesmo switch fica no cabeçalho do pedido, enquanto ele anda (da aprovação até "Em rota"). Ligar ou desligar **não envia nada na hora**; vale para as próximas etapas. `PUT /api/pre-orders/[id]/notify`.
- Com o switch ligado, o cliente recebe a mensagem do modelo correspondente quando: o pedido é salvo (recebido), o administrador aceita ou recusa (pedido do aplicativo), e a cada mudança de etapa: em preparo, pronto, saiu para entrega, entregue, cancelado. "Na fila" não envia; repetir a mesma etapa (ou ir de "saiu para entrega" a "em trânsito") não reenvia. Vale para qualquer tela que muda a etapa, inclusive a do entregador.
- O modelo desligado em **WhatsApp → Mensagens** apenas pula aquele aviso. Se o envio falha (WhatsApp desconectado, número sem WhatsApp), o pedido ou a etapa **são salvos do mesmo jeito** e o operador vê um aviso amarelo com o motivo. Cada envio entra no Histórico e na conversa do cliente.
- Coluna `PreOrder.notifyCustomer` (migration `20261018120000_add_pre_order_notify_customer`, só acrescenta; em produção aplicar **antes** de publicar: `prisma migrate deploy`). Código: `lib/messages/order-status-text.ts` (puro, testado em `tests/order-status-message.test.ts`), `lib/messages/order-status-send.ts`, `app/admin/pre-orders/components/CustomerNoticeSwitch.tsx`.

### Editor de texto
A caixa de texto tem barra com **Negrito**, **Itálico**, **Tachado** (Ctrl+B / Ctrl+I também) e **Emojis** (lista de emojis padrão, que o WhatsApp mostra). A formatação é a do WhatsApp (`*negrito*`, `_itálico_`, `~tachado~`, ` ```mono``` `): a prévia já a mostra aplicada e o e-mail converte o mesmo texto em HTML (`lib/messages/format.ts`). Os textos padrão (senha, redefinição e cardápio) já vêm com emojis e negrito; só quem editou um texto mantém o seu.

**Para criar um tipo novo:** acrescente a entrada em `MESSAGE_TYPES` (variáveis, `required`, textos padrão) e, onde o fato acontece, chame `sendCustomerMessage({ typeKey, customer, channels, values })` de `lib/messages/service.ts`. A tela de edição e o histórico já funcionam para ele.

### Regras
- Só o texto editado fica gravado (`MessageTemplate`, único por tipo+canal); sem registro vale o texto padrão do código.
- Validação (`lib/messages/render.ts`): variável desconhecida é recusada, `{senha}`/`{link}` são obrigatórias, limites de tamanho (WhatsApp 1000, e-mail 5000, assunto 150).
- O histórico (`MessageLog`) guarda tipo, canal, cliente, destino **mascarado**, resultado e erro. **Nunca o texto nem a senha.** Registros com mais de 90 dias são apagados a cada envio.
- A assinatura (`SystemConfig` `messages_signature` / `messages_signature_enabled`) é acrescentada ao fim de todas as mensagens.
- Um canal só é oferecido se o cliente tem o contato **e** o canal funciona: WhatsApp conectado, e-mail configurado (Configurações → Email) e modelo ligado. Se um canal falha, o outro segue e cada resultado é mostrado.

### Senha de acesso do cliente
- **Cadastro/edição** (`CustomerFormDialog`): **não há campo de senha**. A senha nunca é digitada: depois de cadastrar um cliente novo abre-se o "Enviar senha de acesso" (dá para fechar e fazer depois) e, sempre que for preciso uma senha nova, usa-se esse mesmo botão (menu do cliente).
- **Senha gerada** (`lib/messages/password.ts`): fácil de ler e ditar, 8 letras minúsculas e números, **sem símbolo** e sem caracteres que se confundem (ex.: `kp7mrx4a`). É temporária: o cliente troca no primeiro acesso.
- **Enviar senha de acesso** (menu da lista, cartão, resumo e ficha do cliente): `SendPasswordDialog` gera uma senha nova no servidor (`POST /api/admin/customers/[id]/send-password`), envia e mostra o resultado; "Tentar de novo" reenvia a **mesma** senha (o servidor confere com o hash). Cliente sem e-mail nem WhatsApp: só copiar.
- **WhatsApp do cliente:** `Customer.phoneIsWhatsapp` (padrão `false`), marcado pelo administrador no cadastro ou pelo próprio cliente em Perfil → Dados. Um ícone aparece ao lado do telefone.
- **Troca no primeiro acesso:** `Customer.mustChangePassword`. Com ele ligado, a área do cliente leva a Perfil → Segurança e não libera as outras telas até o cliente definir uma senha própria (`PUT /api/customer/profile` desliga a marca).

### Enviar o cardápio pelo WhatsApp
- **Individual:** "Enviar cardápio" no menu da linha (lista e cartões), só para quem tem o telefone marcado como WhatsApp. Mostra a prévia exata, bloqueia sem cardápio publicado hoje ou com o WhatsApp fora, e avisa antes de reenviar a quem já recebeu hoje.
- **Em massa:** botão "Enviar cardápio para todos" na tela **Cardápios**. Para clientes **ativos** com WhatsApp marcado; por padrão pula quem já recebeu hoje. O navegador percorre a lista **uma pessoa por vez**, com **6 a 12 s** entre as mensagens (para o número não ser bloqueado), com Pausar/Parar e resultado por cliente ("Tentar de novo" só os que falharam). A janela precisa ficar aberta; se fechar, é só abrir de novo e retomar (quem já recebeu fica de fora).
- Cada envio entra no Histórico (tipo `daily_menu`). Código: `lib/messages/daily-menu-send.ts`, `lib/messages/menu-text.ts`; `GET /api/admin/menu-broadcast`, `GET`/`POST /api/admin/customers/[id]/send-menu`.

### APIs (administrador, exceto onde indicado)
`GET /api/admin/messages`, `PUT|DELETE /api/admin/messages/[type]/[channel]`, `POST .../test`, `PUT /api/admin/messages/signature`, `GET /api/admin/messages/log`, `GET /api/admin/messages/channels?type=` (staff).

### Banco
Migration `20261010140000_add_messages_and_whatsapp_flag`: só acrescenta (2 colunas com padrão em `Customer` e as tabelas `MessageTemplate` e `MessageLog`). Em produção, aplicar **antes** de publicar o código: `prisma migrate deploy`.

### Código
`lib/messages/{registry,render,password,service,customer-password}.ts` (regras puras testadas em `tests/messages.test.ts`), `app/admin/whatsapp/components/MessagesViews.tsx`, `app/admin/customers/components/SendPasswordDialog.tsx`.

## Compras e saldo da ficha por WhatsApp

No menu **Ações** da conversa (Conversas) há **Enviar compras** e **Enviar saldo**, só para clientes com WhatsApp marcado e só para administradores (é dado financeiro).

- **Enviar compras:** a janela lista os dias em que o cliente comprou (últimos 90 dias, pagamentos de ficha e vendas canceladas ficam de fora). Vem marcado o dia mais recente; dá para marcar **até 5 dias** (`ORDERS_MAX_DAYS`). A prévia acompanha a escolha. Mensagem muito longa vira uma linha por dia (limite de 3000 caracteres).
- **Enviar saldo:** mostra o saldo (`getCustomerBalance`) e a prévia; a frase muda se o cliente deve, tem crédito ou está em dia.
- Os dois entram no Histórico e na conversa do cliente (com o texto). Códigos: `lib/messages/ficha-text.ts` (puro, testado em `tests/ficha-message.test.ts`), `lib/messages/ficha-send.ts`; `GET`/`POST /api/admin/customers/[id]/send-orders` e `.../send-balance`; janela `app/admin/customers/components/SendFichaDialog.tsx`.

### Conversas do WhatsApp: foto do contato e vídeo
- **Foto da pessoa** (lista, cabeçalho e painel do cliente em **WhatsApp → Conversas**): primeiro a foto do **cadastro** do cliente; se não existe ou não carrega, a foto de **perfil do próprio WhatsApp**; sem nenhuma, as iniciais. A do WhatsApp é buscada pelo servidor (`GET /api/admin/whatsapp/avatar/[customerId]`, só administrador; Evolution `/chat/fetchProfilePictureUrl`), **não é gravada** em lugar nenhum e fica na memória do servidor por 6 horas (1 hora quando o contato não tem foto ou a escondeu). Só se baixa imagem de servidor do WhatsApp (`lib/whatsapp-avatar.ts`).
- **Vídeo**: player próprio (`app/admin/whatsapp/components/VideoPlayer.tsx`) no lugar dos controles do navegador: tocar/pausar, barra de progresso com o que já carregou, tempo, volume, velocidade (0,5x a 2x), **ampliar em janela**, **tela cheia** e baixar. Atalhos com o foco no player: espaço/K, ← →, J L, ↑ ↓, M, F, 0 a 9. O vídeo da mensagem e o ampliado seguem do mesmo ponto. Vídeo que o navegador não decodifica (ex.: HEVC de iPhone) mostra "Baixar vídeo".
