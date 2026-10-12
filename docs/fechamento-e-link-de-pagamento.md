# Fechamento por WhatsApp/e-mail e link de pagamento

## Enviar o fechamento ao cliente
Na ficha do cliente (**Admin → Clientes → cliente**): **Relatório de Fechamento** → escolher o período → **Visualizar e enviar**.

A janela mostra o PDF **página por página, exatamente como será enviado**, e deixa escolher:
- **WhatsApp**: só se o cliente tem o telefone marcado como WhatsApp e o WhatsApp do estabelecimento está conectado. O PDF vai como **documento**, com o texto do modelo de legenda.
- **E-mail**: só se o cliente tem e-mail e o e-mail do estabelecimento está configurado. O PDF vai **anexo**.
- **Link de pagamento PIX** (ligado por padrão quando há saldo a pagar): entra no texto da mensagem. O administrador pode copiar o link ou desligá-lo.

Se um canal falha, o outro segue e o resultado de cada um aparece ("Tentar de novo só o que falhou").

O PDF segue as mesmas opções do relatório impresso (saldo devedor, saldo do período, total de pagamentos), mostra o **Valor a Pagar** e, quando há valor e chave PIX, leva o **QR code** desse valor.

### Como funciona
- O PDF é montado **no navegador** do administrador (`PDFGenerator.generateCustomerClosingReportWithPreview`, `lib/pdf-generator.ts`: html2canvas + jsPDF). As imagens das páginas da prévia vêm do próprio arquivo, e cada página leva só a sua fatia, então o arquivo cresce com o conteúdo (não com o número de páginas).
- O servidor recebe esse mesmo PDF (`POST /api/admin/customers/[id]/send-closing`, só administrador) e confere: é PDF de verdade (`%PDF-`), cabe no limite (3,3 MB) e o período é válido. Quem monta os textos e envia é `lib/messages/closing-send.ts` por cima de `sendCustomerMessage` (`lib/messages/service.ts`), com **anexo** nos dois canais.
- `GET` da mesma rota devolve quem pode receber, o motivo quando não pode, o saldo e o texto exato de cada canal.
- WhatsApp: `sendDocument` em `lib/evolution.ts` (Evolution API `/message/sendMedia`). Legenda acima de 1000 caracteres vai como texto separado, logo depois do documento.
- O texto de cada canal é editável em **WhatsApp → Mensagens** (tipo `customer_closing`). O histórico guarda só destino mascarado e resultado; o texto, que leva o link, nunca é gravado.

## Link de pagamento (PIX)
Um endereço `…/pagar/<código>` que abre a **página de PIX da ficha do cliente, sem login**, no visual da área do cliente: saldo em aberto, **Pagar com PIX** (pagar tudo ou outro valor, QR code, copia e cola) e **Já paguei**.

- O **"Já paguei" gera o mesmo aviso** da área do cliente: um `PaymentIntent` pendente e a notificação no sino do administrador, que confere no banco e confirma. Não mexe no saldo. Código: `lib/payment-intent-service.ts`, usado pela área do cliente (`/api/customer/payment-intents`) e pela página do link (`/api/pay/[código]`).
- O código é **assinado** (HMAC com `PAYMENT_LINK_SECRET`, ou `NEXTAUTH_SECRET` se não existir) e leva só o cliente e a validade (45 dias). Não há tabela nova. Adulterado, de outro cliente ou vencido não abre nada (`lib/payment-link.ts`, testado em `tests/payment-link.test.ts`). Quem quiser invalidar todos os links troca `PAYMENT_LINK_SECRET`.
- A página mostra sempre o **saldo de agora** (não o do dia em que o link foi enviado) e só o primeiro nome do cliente. Cliente em dia vê "Sua ficha está em dia". Link vencido ou inválido mostra uma mensagem pedindo um novo.
- Proteções: `noindex`, `no-referrer`, `Cache-Control: no-store` nas respostas e limite de requisições por IP (60/min para ver, 12/min para avisar). A regra da área do cliente continua valendo: no máximo 3 avisos pendentes e o mesmo valor repetido em 15 minutos conta como um só toque.
- O link também pode ser enviado sozinho: **Link de pagamento (PIX)** em Ações Rápidas do cliente (copiar, WhatsApp, e-mail; tipo `customer_payment_link`).
- Rotas: `/pagar` está em `CUSTOMER_PATHS` e no `matcher` de `middleware.ts` (liberada sem sessão) e é tela "sem navegação" em `CustomerShell`.

## Variáveis de ambiente
- `PAYMENT_LINK_SECRET` (opcional): chave dos links. Sem ela vale `NEXTAUTH_SECRET`.
- `APP_PUBLIC_URL` (ou `NEXTAUTH_URL`): endereço que vai dentro do link.
