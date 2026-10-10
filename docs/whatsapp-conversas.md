## Conversas do WhatsApp com os clientes

Menu **WhatsApp** (só administrador): **Conversas**, **Mensagens** (textos prontos, antes em Configurações) e **Histórico** (envios). A conexão do número continua em Configurações → WhatsApp.

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
- `/admin/whatsapp/mensagens` e `/admin/whatsapp/historico`: ver `docs/mensagens.md`. O endereço antigo `/admin/settings?tab=mensagens` redireciona.

### API (administrador)
`GET /api/admin/whatsapp/conversations?q&filter`, `GET /api/admin/whatsapp/conversations/[customerId]?before`, `POST .../read`, `POST .../messages`, `GET /api/admin/whatsapp/unread`.

### Banco
Migration `20261010200000_add_whatsapp_messages` (só cria a tabela `WhatsAppMessage` e a chave para `Customer`, com `ON DELETE CASCADE`). Em produção, aplicar antes do deploy.

### Código
`lib/whatsapp-chat.ts` (leitura do webhook e rótulos, puro, testado em `tests/whatsapp-chat.test.ts`), `lib/whatsapp-chat-service.ts` (banco), `app/admin/whatsapp/*`.
