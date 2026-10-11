# Assistente RO

A RO responde perguntas do administrador sobre clientes, ficha, vendas, pedidos, despesas e cardápio. Fica no botão flutuante do admin (um painel lateral no computador, tela cheia no celular). **Só o administrador usa** (`requireAdmin`); o perfil PDV não vê o botão nem consegue chamar a API.

## Como responde

1. **Atalhos sem IA** (`lib/ai/ro/router.ts`): frases comuns e curtas ("vendas de hoje", "quem está devendo?", um nome solto, um telefone) são entendidas por regras. Isso é mais rápido, não gasta a cota gratuita da Gemini e mantém a RO útil quando a cota acaba.
2. **IA escolhe a ferramenta** (`lib/ai/ro/gemini.ts`): o resto vai para a Gemini com *function calling*. Ela só escolhe uma das ferramentas e os argumentos; **nenhuma SQL vem da IA**. Tenta `gemini-2.5-flash` e, se a cota acabar ou o serviço estiver ocupado, `gemini-2.5-flash-lite` (cada modelo tem a própria cota). `RO_MODELOS` troca a lista.
3. **A ferramenta consulta e monta a resposta** (`lib/ai/ro/tools.ts`): texto em markdown simples + blocos (cartões de cliente, tabelas, números, opções para tocar). O texto sai do código, então os números não dependem da IA.

Ferramentas: `buscar_cliente`, `ficha_cliente`, `clientes_devendo`, `clientes_inativos`, `clientes_top`, `vendas`, `produtos_mais_vendidos`, `pedidos_em_aberto`, `despesas`, `lucro`, `cardapio`, `whatsapp_nao_lidas`, `produto_buscar`, `esclarecer`, `ajuda`.

## Regras de negócio

- **Venda** = pedido não cancelado que não é pagamento de ficha. **Inclui o fiado** (`invoice`).
- **À vista** = dinheiro, PIX, débito e crédito. **Entrou no caixa** = à vista + pagamentos de ficha.
- **Saldo da ficha** = compras pendentes (fora pagamento de ficha) menos pagamentos de ficha, a mesma conta de `getCustomerBalance`.
- **Lucro de caixa** = entrou no caixa − despesas. **Resultado das vendas** = vendido (com fiado) − despesas.
- Dia = dia de Brasília (`lib/ai/ro/periods.ts`).

## Busca de cadastros

`lib/ai/ro/customer-index.ts`: sem acento, palavras soltas em qualquer ordem ("ingrid albuquerque" acha "Ingrid Oliveira de Albuquerque"), erro de digitação leve, telefone só pelos dígitos (com ou sem 55 e DDD), e-mail e parte do CPF. Com vários candidatos a RO lista e pergunta qual; sem nenhum, diz como tentar de novo.

## Somente leitura

A RO **nunca grava** no banco de dados do sistema. Camadas (`lib/ai/ro/db.ts`):

1. O cliente de banco da RO só aceita operações de leitura (`find*`, `count`, `aggregate`, `groupBy`).
2. Toda consulta roda numa transação marcada como somente leitura, com tempo máximo.
3. Opcional: `RO_DATABASE_URL` aponta para um usuário do banco que só tem SELECT.

`tests/ro-somente-leitura.test.ts` trava, no código, qualquer escrita nova nos arquivos da RO. A única exceção é `settings-admin.ts`, que grava as configurações da própria RO e só é usado pela tela de configurações.

## Limites e configurações

Em **Configurações → Assistente RO** (`SystemConfig`, sem migration): ligar/desligar, botão flutuante, jeito de falar (divertida ou direta), limite de perguntas por dia por pessoa (padrão 150) e teste da conexão com a Gemini. Além disso há um limite de 40 perguntas a cada 10 minutos por pessoa. Erros voltam como `{ erro: { codigo, mensagem, tentarEm } }` e a tela mostra o motivo com "Tentar de novo".

## Histórico

A conversa fica no navegador de cada pessoa (`localStorage`, últimas 40 mensagens); "Nova conversa" apaga.

## Código

`lib/ai/ro/*` (servidor), `app/api/ai/chat/route.ts`, `app/api/admin/ro/*`, `app/admin/components/ro-assistant.tsx` e `ro/*` (tela), `app/admin/settings/components/RoTab.tsx`. Testes: `tests/ro*.test.ts`.
