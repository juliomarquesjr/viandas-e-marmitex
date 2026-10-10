## WhatsApp do estabelecimento (Evolution API)

O administrador conecta **um número de WhatsApp do estabelecimento** em **Configurações → WhatsApp**. O sistema só garante a conexão e oferece o envio de mensagens (`sendWhatsAppText`); as mensagens enviadas (por ora, a senha de acesso do cliente) são editadas em WhatsApp → Mensagens (ver `docs/mensagens.md`).

### Como conecta
1. Em Configurações → WhatsApp: "Gerar QR code" (ou "Usar código no celular", informando o telefone).
2. No celular: WhatsApp → Aparelhos conectados → Conectar um aparelho → ler o QR (ou digitar o código).
3. A tela confere a conexão a cada 3 s e troca o QR sozinha a cada 35 s (ele vence em ~40 s). Conectado, mostra número, perfil e desde quando.
4. Já conectado: "Enviar mensagem de teste" (para o próprio número), "Verificar agora" e "Desconectar".

### Como a conexão é garantida
- **Webhook** `POST /api/webhooks/evolution`: a Evolution avisa na hora quando a conexão muda (`CONNECTION_UPDATE`). Protegido por `x-webhook-secret` (= `WHATSAPP_WEBHOOK_SECRET`, configurado na instância ao conectar). Só existe com endereço público em https (em localhost não há webhook).
- **Checagem com o painel aberto:** `/api/notifications` (que o sino do admin consulta) confere o estado se a última checagem tem mais de 5 min (`ensureFresh`, depois de responder).
- **Checagem diária:** `GET /api/cron/whatsapp-health` (Vercel Cron, `vercel.json`, 11:00 UTC), protegido por `CRON_SECRET`.
- **Aviso de queda:** se uma conexão que estava `open` passa a `close`/`connecting` e o administrador não desconectou de propósito, cria um aviso "WhatsApp desconectado" no sino (tipo `whatsapp`, abre Configurações → WhatsApp); some sozinho ao reconectar. Esse aviso não entra na contagem de "pagamentos para conferir" da home.

### Estado e dados
Sem migration: o estado fica em `SystemConfig` (categoria `whatsapp`: estado, última checagem, conectado/desconectado em, número, "quer ficar conectado") e o aviso na tabela `Notification` (`refType=WhatsApp`).

### Variáveis de ambiente
| Variável | Para quê |
|---|---|
| `EVOLUTION_API_URL` | Endereço público da Evolution API (https) |
| `EVOLUTION_API_KEY` | Chave global da Evolution (`AUTHENTICATION_API_KEY`; só no servidor) |
| `WHATSAPP_INSTANCE` | Nome da instância. Padrão `sabores-de-casa`. **Em desenvolvimento use outro** (ex.: `sabores-de-casa-dev`) para não pegar a de produção |
| `WHATSAPP_WEBHOOK_SECRET` | Segredo do webhook |
| `CRON_SECRET` | Segredo da checagem diária (a Vercel envia como `Authorization: Bearer`) |
| `APP_PUBLIC_URL` (opcional) | Endereço público do sistema para o webhook; sem ele usa `NEXTAUTH_URL` |

### Código
`lib/evolution.ts` (cliente HTTP da Evolution v2), `lib/whatsapp-rules.ts` (regras puras, testadas em `tests/whatsapp.test.ts`), `lib/whatsapp-service.ts` (estado, conexão, alertas e envio). APIs do admin (só administrador): `GET /api/admin/whatsapp`, `POST /api/admin/whatsapp/connect`, `/disconnect`, `/test`. (`lib/whatsapp.ts` é outro assunto: links `wa.me` de compartilhamento.)

### Cuidados
A Evolution usa o WhatsApp **não oficial**: o número pode ser banido com envio em massa ou para quem não espera. Para os recursos futuros, enviar só avisos ligados ao que o cliente fez (pedido aceito, pagamento confirmado), com limite de envios.

### Operação (Coolify)
Na Evolution do Coolify, `AUTHENTICATION_API_KEY` é uma **referência** para `SERVICE_PASSWORD_AUTHENTICATIONAPIKEY`: para trocar a chave, troque essa segunda variável e faça o redeploy do serviço.
