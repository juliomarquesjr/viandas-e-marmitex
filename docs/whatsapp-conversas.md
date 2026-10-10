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
- Entregue e lida (✓✓) vêm do `MESSAGES_UPDATE`. Outros tipos (localização, etc.) aparecem só identificados.
- **Fotos, figurinhas, áudios, vídeos e documentos** aparecem na própria conversa (foto com ampliação, player de áudio e vídeo, documento para baixar). O arquivo **não é guardado no sistema**: é buscado na Evolution só quando a mensagem aparece na tela, por `GET /api/admin/whatsapp/media/[id]` (só administrador), que chama `POST /chat/getBase64FromMediaMessage/{instância}` com o id da mensagem. Só tipos conhecidos são exibidos (SVG, HTML e afins viram download); limite de 16 MB (acima, "veja no celular"); aceita `Range` para avançar áudio e vídeo (cache em memória de poucos minutos só para isso). Se a Evolution ou o WhatsApp já descartou o arquivo, a tela mostra "Arquivo indisponível" com "Tentar de novo". Código: `lib/whatsapp-media.ts` (puro, testado), `lib/whatsapp-media-service.ts`, `app/admin/whatsapp/components/MessageMedia.tsx`.
- Prazo: mensagens com mais de **180 dias** são apagadas aos poucos (`pruneOld`). Apagar o cliente apaga a conversa.

### Telas
- `/admin/whatsapp/conversas` (`?cliente=<id>` abre direto): lista (busca, Não lidas, Aguardando resposta), conversa (envio com Enter, emojis, respostas rápidas, "Enviar cardápio" e "Enviar senha") e dados do cliente. O campo de mensagem tem 4 linhas. O número de conversas com mensagem nova aparece em **qualquer tela do admin**: no item do menu, no botão do menu no celular e no título da aba (`NotificationsProvider`, consulta a cada 20 s e ao voltar para a aba).
- "Ver conversa" na ficha do cliente e no menu suspenso da tabela (cartões também), só para quem tem WhatsApp marcado.
- Painel do cliente (à direita, a partir de 1280 px): **saldo da ficha** (devendo em vermelho com "−", crédito em verde com "+"; mesma conta de `getCustomerBalance`) e **últimas compras e pagamentos agrupados por data** (`GET .../conversations/[customerId]/ficha`): mostra as 2 últimas e o botão **Exibir mais 5** acrescenta cinco por vez. Em telas menores o saldo aparece no topo da conversa.
- Topo da conversa: menu **Ações** (Abrir ficha completa, Enviar cardápio, **Enviar compras**, **Enviar saldo**, Enviar senha de acesso; ver `docs/mensagens.md`).
- `/admin/whatsapp/respostas`, `/admin/whatsapp/mensagens` e `/admin/whatsapp/historico`: ver abaixo e `docs/mensagens.md`.

### Respostas rápidas
Textos prontos do atendimento (`WhatsAppQuickReply`: nome, texto, **atalho opcional** único e `{nome}` = primeiro nome do cliente). Gerenciador em **WhatsApp → Respostas rápidas** (criar, editar, apagar, buscar, exemplos). Na conversa: botões das primeiras respostas e, ao digitar **/** (no começo ou depois de um espaço), uma lista com a busca ("/ped"…) que filtra por atalho, nome ou texto; ↑↓ escolhe, Enter/Tab insere, Esc fecha. API: `/api/admin/whatsapp/quick-replies` (+ `/[id]`, `/examples`); regras em `lib/whatsapp-quick-replies.ts`. O endereço antigo `/admin/settings?tab=mensagens` redireciona.

### API (administrador)
`GET /api/admin/whatsapp/conversations?q&filter`, `GET /api/admin/whatsapp/conversations/[customerId]?before`, `POST .../read`, `POST .../messages`, `GET /api/admin/whatsapp/unread`.

### Banco
Migrations `20261010200000_add_whatsapp_messages` (tabela `WhatsAppMessage` e chave para `Customer`, `ON DELETE CASCADE`) e `20261010210000_add_whatsapp_quick_replies` (tabela `WhatsAppQuickReply`). As duas só criam tabelas. Em produção, aplicar antes do deploy.

### Código
`lib/whatsapp-chat.ts` (leitura do webhook e rótulos, puro, testado em `tests/whatsapp-chat.test.ts`), `lib/whatsapp-chat-service.ts` (banco), `app/admin/whatsapp/*`.
