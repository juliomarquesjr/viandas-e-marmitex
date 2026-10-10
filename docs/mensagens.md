## Mensagens enviadas ao cliente

O administrador edita os textos que o sistema envia (WhatsApp e e-mail) em **Configurações → Mensagens**: aba **Modelos** (texto, assunto, liga/desliga por canal, prévia, "Enviar teste para mim", "Restaurar texto padrão", assinatura única) e aba **Histórico** (quem recebeu, por qual canal e se deu certo).

### Tipos de mensagem
Ficam em `lib/messages/registry.ts`: nome, variáveis, texto padrão por canal. Hoje:
- `customer_password` — **Senha de acesso** (WhatsApp e e-mail). Variáveis: `{nome}` (primeiro nome), `{usuario}` (e-mail ou telefone), `{senha}`, `{loja}`, `{link_app}`.
- `customer_password_reset` — **Link para redefinir senha** (só e-mail, não pode ser desligada). Usada por "Esqueci minha senha". Variáveis: `{nome}`, `{link}`, `{validade}`, `{loja}`.

Pedido aceito/recusado, pronto, pagamento confirmado, lembrete de saldo e cardápio do dia aparecem como "em breve".

**Para criar um tipo novo:** acrescente a entrada em `MESSAGE_TYPES` (variáveis, `required`, textos padrão) e, onde o fato acontece, chame `sendCustomerMessage({ typeKey, customer, channels, values })` de `lib/messages/service.ts`. A tela de edição e o histórico já funcionam para ele.

### Regras
- Só o texto editado fica gravado (`MessageTemplate`, único por tipo+canal); sem registro vale o texto padrão do código.
- Validação (`lib/messages/render.ts`): variável desconhecida é recusada, `{senha}`/`{link}` são obrigatórias, limites de tamanho (WhatsApp 1000, e-mail 5000, assunto 150).
- O histórico (`MessageLog`) guarda tipo, canal, cliente, destino **mascarado**, resultado e erro. **Nunca o texto nem a senha.** Registros com mais de 90 dias são apagados a cada envio.
- A assinatura (`SystemConfig` `messages_signature` / `messages_signature_enabled`) é acrescentada ao fim de todas as mensagens.
- Um canal só é oferecido se o cliente tem o contato **e** o canal funciona: WhatsApp conectado, e-mail configurado (Configurações → Email) e modelo ligado. Se um canal falha, o outro segue e cada resultado é mostrado.

### Senha de acesso do cliente
- **Cadastro/edição** (`CustomerFormDialog`): botão **Gerar senha** (`lib/messages/password.ts`, ex.: `Kp7m-Rx4a9Q`, sem caracteres ambíguos), copiar, "Gerar outra", "Pedir para trocar a senha no primeiro acesso" e "Avisar o cliente por" WhatsApp/e-mail. Ao salvar, `POST/PUT /api/customers` grava e envia (`sendPassword: ['whatsapp','email']`) e devolve `messageResults`.
- **Enviar senha de acesso** (menu da lista, cartão, resumo e ficha do cliente): `SendPasswordDialog` gera uma senha nova no servidor (`POST /api/admin/customers/[id]/send-password`), envia e mostra o resultado; "Tentar de novo" reenvia a **mesma** senha (o servidor confere com o hash). Cliente sem e-mail nem WhatsApp: só copiar.
- **WhatsApp do cliente:** `Customer.phoneIsWhatsapp` (padrão `false`), marcado pelo administrador no cadastro ou pelo próprio cliente em Perfil → Dados. Um ícone aparece ao lado do telefone.
- **Troca no primeiro acesso:** `Customer.mustChangePassword`. Com ele ligado, a área do cliente leva a Perfil → Segurança e não libera as outras telas até o cliente definir uma senha própria (`PUT /api/customer/profile` desliga a marca).

### APIs (administrador, exceto onde indicado)
`GET /api/admin/messages`, `PUT|DELETE /api/admin/messages/[type]/[channel]`, `POST .../test`, `PUT /api/admin/messages/signature`, `GET /api/admin/messages/log`, `GET /api/admin/messages/channels?type=` (staff).

### Banco
Migration `20261010140000_add_messages_and_whatsapp_flag`: só acrescenta (2 colunas com padrão em `Customer` e as tabelas `MessageTemplate` e `MessageLog`). Em produção, aplicar **antes** de publicar o código: `prisma migrate deploy`.

### Código
`lib/messages/{registry,render,password,service,customer-password}.ts` (regras puras testadas em `tests/messages.test.ts`), `app/admin/settings/components/MessagesTab.tsx`, `app/admin/customers/components/SendPasswordDialog.tsx`.
