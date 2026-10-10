## Conversas do WhatsApp com os clientes

O menu lateral separa o **atendimento** (feito por uma pessoa) do que o sistema **envia sozinho** (só administrador):
- **WhatsApp**: **Conversas** e **Respostas rápidas**.
- **Envios automáticos**: **Mensagens automáticas** (os textos de senha, cardápio…, antes em Configurações) e **Histórico de envios**.

A conexão do número continua em Configurações → WhatsApp.

### Como funciona
- A Evolution API avisa o sistema a cada mensagem (`MESSAGES_UPSERT`, `SEND_MESSAGE`, `MESSAGES_UPDATE`, além de `CONNECTION_UPDATE`) em `POST /api/webhooks/evolution` (mesmo segredo). O webhook é atualizado sozinho uma vez por versão (`ensureChatWebhook`, chave `whatsapp_webhook_events`); só funciona com endereço público https (em localhost não chega).
- As mensagens ficam na tabela `WhatsAppMessage`, ligadas ao cliente pelo telefone (DDD + últimos 8 dígitos, ignora o nono dígito; só clientes **ativos** com WhatsApp marcado). Número desconhecido, grupos, status e reações **não** entram.
- O que o sistema envia (senha, cardápio, redefinição) também entra, com a marca "Enviado pelo sistema". Texto com dado sensível (senha, link) **não é guardado**: fica só o tipo.
- Mensagens enviadas pelo celular do estabelecimento aparecem (mesmo número). O administrador responde pela tela (`POST /api/admin/whatsapp/conversations/[customerId]/messages`).
- Entregue e lida (✓✓) vêm do `MESSAGES_UPDATE`. Fotos, áudios e outros tipos aparecem só identificados ("Foto", "Áudio").
- Prazo: mensagens com mais de **180 dias** são apagadas aos poucos (`pruneOld`). Apagar o cliente apaga a conversa.

### Telas
- `/admin/whatsapp/conversas` (`?cliente=<id>` abre direto): lista (busca, Não lidas, Aguardando resposta), conversa (envio com Enter, emojis, respostas rápidas, "Enviar cardápio" e "Enviar senha") e dados do cliente. O item do menu mostra quantas conversas têm mensagem nova.
- "Ver conversa" na ficha do cliente e no menu suspenso da tabela (cartões também), só para quem tem WhatsApp marcado.
- Painel do cliente (à direita, a partir de 1280 px): **saldo da ficha** (devendo em vermelho com "−", crédito em verde com "+"; mesma conta de `getCustomerBalance`) e **últimas compras e pagamentos agrupados por data** (`GET .../conversations/[customerId]/ficha`). Em telas menores o saldo aparece no topo da conversa.
- Topo da conversa: menu **Ações** (Abrir ficha completa, Enviar cardápio, Enviar senha de acesso).
- `/admin/whatsapp/respostas`, `/admin/whatsapp/mensagens` e `/admin/whatsapp/historico`: ver abaixo e `docs/mensagens.md`.

### Respostas rápidas
Textos prontos do atendimento (`WhatsAppQuickReply`: nome, texto, **atalho opcional** único e `{nome}` = primeiro nome do cliente). Gerenciador em **WhatsApp → Respostas rápidas** (criar, editar, apagar, buscar, exemplos). Na conversa: botões das primeiras respostas e, ao digitar **/** (no começo ou depois de um espaço), uma lista com a busca ("/ped"…) que filtra por atalho, nome ou texto; ↑↓ escolhe, Enter/Tab insere, Esc fecha. API: `/api/admin/whatsapp/quick-replies` (+ `/[id]`, `/examples`); regras em `lib/whatsapp-quick-replies.ts`. O endereço antigo `/admin/settings?tab=mensagens` redireciona.

### API (administrador)
`GET /api/admin/whatsapp/conversations?q&filter`, `GET /api/admin/whatsapp/conversations/[customerId]?before`, `POST .../read`, `POST .../messages`, `GET /api/admin/whatsapp/unread`.

### Banco
Migrations `20261010200000_add_whatsapp_messages` (tabela `WhatsAppMessage` e chave para `Customer`, `ON DELETE CASCADE`) e `20261010210000_add_whatsapp_quick_replies` (tabela `WhatsAppQuickReply`). As duas só criam tabelas. Em produção, aplicar antes do deploy.

### Código
`lib/whatsapp-chat.ts` (leitura do webhook e rótulos, puro, testado em `tests/whatsapp-chat.test.ts`), `lib/whatsapp-chat-service.ts` (banco), `app/admin/whatsapp/*`.
