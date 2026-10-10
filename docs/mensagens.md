## Mensagens enviadas ao cliente

O administrador edita os textos que o sistema envia (WhatsApp e e-mail) em **WhatsApp → Mensagens**: textos (texto, assunto, liga/desliga por canal, prévia, "Enviar teste para mim", "Restaurar texto padrão", assinatura única) e **WhatsApp → Histórico** (quem recebeu, por qual canal e se deu certo).

### Tipos de mensagem
Ficam em `lib/messages/registry.ts`: nome, variáveis, texto padrão por canal. Hoje:
**Endereço do link (`{link_app}`):** configurável em **Configurações → Marca → Links das mensagens** (`branding_app_url`). Aceita `meusite.com.br` ou `https://meusite.com.br/app`; o sistema grava com `https://` e sem barra no fim, e recusa o que não for endereço (validação na tela e em `PUT /api/config`). Em branco, vale o padrão do sistema (`APP_PUBLIC_URL`, depois `NEXTAUTH_URL`). Vale para todas as mensagens abaixo. O link de redefinir senha por e-mail continua usando o endereço do sistema (`NEXTAUTH_URL`), porque precisa apontar para onde o sistema realmente está. Código: `lib/messages/app-url.ts`, `appUrl()` em `lib/messages/service.ts`.

- `customer_password` — **Senha de acesso** (WhatsApp e e-mail). Variáveis: `{nome}` (primeiro nome), `{usuario}` (e-mail ou telefone), `{senha}`, `{loja}`, `{link_app}`.
- `customer_password_reset` — **Link para redefinir senha** (só e-mail, não pode ser desligada). Usada por "Esqueci minha senha". Variáveis: `{nome}`, `{link}`, `{validade}`, `{loja}`.

- `daily_menu` — **Cardápio do dia** (só WhatsApp). Variáveis: `{nome}`, `{loja}`, `{cardapio}` (preenchida pelo sistema com o cardápio publicado de hoje, por seção, com ⭐ no destaque e "(vegetariano)"; cardápio grande é cortado com "…e mais N itens"), `{link_app}` (endereço da área do cliente, com https://).

- `customer_orders` — **Resumo das compras** (só WhatsApp, manual, só administrador). Variáveis: `{nome}`, `{loja}`, `{compras}` (preenchida pelo sistema com as compras dos dias escolhidos: itens, total do dia e "(na ficha)" quando ainda não foi paga), `{link_app}`.
- `customer_balance` — **Saldo da ficha** (só WhatsApp, manual, só administrador). Variáveis: `{nome}`, `{loja}`, `{saldo}` (valor sem sinal), `{situacao}` (a frase pronta: valor em aberto, crédito ou ficha em dia), `{link_app}`.

Pedido aceito/recusado, pronto, pagamento confirmado e lembrete de saldo aparecem como "em breve".

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
