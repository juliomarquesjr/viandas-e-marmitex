# Assistente RO

A RO responde perguntas do administrador sobre clientes, ficha, vendas, pedidos, despesas e cardápio. Fica no botão flutuante ou no cabeçalho do admin e do PDV (a escolha é feita em Configurações → Assistente RO) e abre como um painel lateral no computador e em tela cheia no celular. **Só o administrador usa** (`requireAdmin`); o perfil PDV não vê o botão nem consegue chamar a API.

## Como responde

1. **Resposta pela conversa** (`lib/ai/ro/contexto.ts`): "e o telefone dela?", "o segundo", "e a outra Ingrid?" são resolvidos com a lista de clientes da resposta anterior (o navegador devolve o contexto `Clientes citados: 1) Nome (id …); 2) …`). Com mais de um cliente na tela e sem dizer qual, a RO pergunta qual (nunca escolhe o primeiro).
2. **Atalhos sem IA** (`lib/ai/ro/router.ts`): frases comuns e curtas ("vendas de hoje", "quem está devendo?", "quanto vendi no pix", "preço da marmita", um nome solto, um telefone) são entendidas por regras. Isso é mais rápido, não gasta a cota gratuita da Gemini e mantém a RO útil quando a cota acaba. Regras importantes:
   - O ramo "nome solto" só vale se o que sobrou da frase parece mesmo um nome: palavras de assunto (pix, troco, marmita, pedido, preço, ticket, senha, chave…), pronomes e referências (ele, outro, segunda…) nunca viram nome de cliente.
   - Pedidos para alterar algo ("cancela", "cobra", "apaga", "dá baixa", "muda o telefone"…) recebem recusa curta dizendo a tela do menu que faz aquilo; pedidos por senha, chave, prompt ou SQL recebem uma recusa curta. Sem gastar IA.
   - Duas datas na mesma frase ("hoje e ontem") ou período que o atalho não entende vão para a IA, para não responder só metade.
   - Pequenos erros de digitação nas palavras-chave ("vnedas", "dispesas") são corrigidos.
3. **IA escolhe a ferramenta** (`lib/ai/ro/gemini.ts`): o resto vai para a Gemini com *function calling*. Ela só escolhe uma das ferramentas e os argumentos; **nenhuma SQL vem da IA**. Modelos padrão: `gemini-3.5-flash` e, se a cota acabar, o modelo não existir mais ou o serviço estiver ocupado, `gemini-3.5-flash-lite` (cada modelo tem a própria cota). `RO_MODELOS` troca a lista (separada por vírgula). Modelo que dá 404 é pulado por 10 minutos e aparece como "não existe mais" em Configurações; se algum modelo deu cota, o erro devolvido é de cota (não 502). Tempo máximo de 20 s por chamada. O prompt traz o mapa das telas reais do menu (`MAPA_DE_TELAS`) e a regra de esclarecer quando há vários clientes.
4. **A ferramenta consulta e monta a resposta** (`lib/ai/ro/tools.ts`): texto em markdown simples + blocos (cartões de cliente, tabelas, números, opções para tocar). O texto sai do código, então os números não dependem da IA. Quando a pergunta tem uma parte que a ferramenta não faz, a IA escreve uma frase curta dizendo isso e o texto vai antes do resultado.

Ferramentas: `buscar_cliente`, `ficha_cliente`, `clientes_devendo` (com `valor_minimo`), `clientes_credito`, `clientes_inativos`, `clientes_top`, `vendas` (com `forma` de pagamento e `cliente`), `produtos_mais_vendidos` (com `produto` e `dia_da_semana`), `pedidos_em_aberto`, `despesas`, `lucro`, `cardapio`, `whatsapp_nao_lidas`, `produto_buscar`, `esclarecer`, `ajuda`.

## Regras de negócio

- **Venda** = pedido não cancelado que não é pagamento de ficha. **Inclui o fiado** (`invoice`).
- **À vista** = dinheiro, PIX, débito e crédito. **Entrou no caixa** = à vista + pagamentos de ficha. Os pagamentos de ficha contam assim que são lançados, mesmo antes de confirmados (é como o app os cria); por isso o "lucro de caixa" da RO pode ser maior que o do relatório de lucros, que só conta os confirmados. A resposta de lucro avisa isso.
- **Saldo da ficha** = compras pendentes (fora pagamento de ficha) menos pagamentos de ficha, a mesma conta de `getCustomerBalance`.
- **Lucro de caixa** = entrou no caixa − despesas. **Resultado das vendas** = vendido (com fiado) − despesas.
- **Dia** = dia de Brasília (`lib/ai/ro/periods.ts`). **Exceção: despesas.** `Expense.date` é uma data pura gravada às 00:00 UTC; a RO compara por dia (`limitesDeDespesa`), não pelo instante de Brasília, senão a despesa do dia D cairia no dia D-1.
- **Períodos**: `de` e `ate` sem `periodo` valem como intervalo (só `de` = até hoje; só `ate` = desde o começo); data que não existe (31/11) volta como pedido de data; `ano_passado` existe. "Tele entrega" (taxa) não entra no ranking de produtos; a receita do ranking é sem desconto.

## Busca de cadastros

`lib/ai/ro/customer-index.ts`: sem acento, palavras soltas em qualquer ordem ("ingrid albuquerque" acha "Ingrid Oliveira de Albuquerque"), erro de digitação (inclusive duas letras trocadas de lugar: "ingird", "shiela"), telefone inteiro ou só o final ("8021", "termina em 8021"), e-mail inteiro ou pedaço ("bruna17567", "gmail") e parte do CPF.

- **Achar de verdade ≠ parecer**: "Achei: X" só aparece quando as palavras batem (iguais ou o começo do nome). Só semelhança de letras vira "Não achei X. Será que é…?" com lista.
- **Total real**: com mais cadastros do que cabem, a RO diz o total e pede mais letras; com 1 ou 2 letras pede pelo menos 3.
- **Também tem**: quando o achado único tem outro cadastro que começa igual ou tem o mesmo telefone, a RO mostra os dois.
- **Homônimos**: o botão "Ver ficha" envia `ficha do cliente <Nome> [id:<uuid>]`; o atalho abre a ficha pelo id e o id não aparece na conversa.
- O nome na frase é o primeiro nome, ou primeiro + último quando outro cliente tem o mesmo primeiro nome.

## Somente leitura

A RO **nunca grava** no banco de dados do sistema. Camadas (`lib/ai/ro/db.ts`):

1. O cliente de banco da RO só aceita operações de leitura (`find*`, `count`, `aggregate`, `groupBy`).
2. As ferramentas recebem o cliente "embrulhado": `$queryRawUnsafe`, `$executeRaw`, `$executeRawUnsafe`, `$transaction` e afins lançam erro. Só existe o `$queryRaw` escrito como modelo de texto (valores separados), que é o que as ferramentas usam.
3. Toda consulta roda numa transação marcada como somente leitura, com tempo máximo por consulta (8 s) e por espera de trava.
4. **Recomendado em produção**: `RO_DATABASE_URL` aponta para um usuário do banco que só tem SELECT nas tabelas e colunas usadas (exemplo pronto, não aplicado, em `docs/ro-papel-somente-leitura.sql`). Sem a variável, a RO usa o usuário do sistema (as camadas 1 a 3 protegem) e, em produção, um aviso aparece uma vez no log. Os testes de segurança mostraram que, com um usuário que é superusuário do banco, uma SQL escrita à mão poderia ter efeitos fora das tabelas (ler arquivos do servidor do banco, por exemplo); nenhum caminho do produto deixa a IA escrever SQL, mas só o papel restrito elimina esse risco.

Testes: `tests/ro-somente-leitura.test.ts` varre `lib/ai/ro/**`, `app/admin/components/ro/**`, a tela e as rotas e trava escrita (Prisma e SQL, em qualquer combinação de maiúsculas, colchetes ou concatenação), imports do Prisma fora de `db.ts`/`settings.ts`/`settings-admin.ts`, `eval`, `Reflect`, `Prisma.sql`, `COPY`, `set_config` fora do `db.ts` etc. `tests/ro-leitura-banco.test.ts` (opcional) tenta escrever de verdade num banco de TESTE e confere que tudo falha: `RO_TEST_DATABASE_URL=postgresql://… npm test`. A única exceção de escrita é `settings-admin.ts`, que grava as configurações da própria RO e só é usado pela tela de configurações.

## Limites, privacidade e configurações

Em **Configurações → Assistente RO** (`SystemConfig`, sem migration): ligar/desligar, onde fica o botão (flutuante, cabeçalho ou escondido), jeito de falar (divertida ou direta), limite de perguntas por dia por pessoa (padrão 150, de 10 a 1000; valor fora disso volta erro 400 com o motivo e só o que mudou é gravado) e o teste da conexão (uma pergunta mínima a cada modelo; o resultado vem em frase simples, com os detalhes técnicos recolhidos em "Detalhes").

- Há um limite de 40 perguntas a cada 10 minutos por pessoa (conta só depois de validar o corpo; a espera informada é o tempo real até o fim da janela) e o limite diário (contado antes de qualquer espera e devolvido se a pergunta falhar por culpa do sistema). Ambos ficam na memória de cada instância do servidor: na Vercel são "melhor esforço".
- Corpo da requisição acima de 64 KB é recusado. Nenhuma resposta da conversa nem das rotas de configuração fica em cache (`Cache-Control: no-store`, inclusive nos erros).
- **Privacidade**: as perguntas livres (as que não são atalho) vão para a Google (Gemini): o que a pessoa digitou, as últimas mensagens e, no contexto, só o **primeiro nome e o id** dos clientes citados (texto solto do navegador é descartado). Telefone, e-mail, saldo e CPF dos cadastros não são enviados por conta própria, nem os resultados das ferramentas. A chave gratuita pode não ter a mesma proteção de privacidade de uma chave paga (decisão do dono). A tela de configurações explica isso.
- Erros voltam como `{ erro: { codigo, mensagem, tentarEm } }` e a tela mostra o motivo com "Tentar de novo" (escondido quando não adianta, como no limite do dia, e com contagem regressiva nos de espera curta).
- O log nunca grava o texto de erro de banco ou da IA (só o tipo e o código).

## Painel (tela)

`app/admin/components/ro-assistant.tsx` e `ro/*`: o foco volta ao botão que abriu ao fechar; Esc fecha de qualquer lugar (sem atrapalhar menus abertos); no celular a RO é modal (`aria-modal` e o resto da página `inert`); "Cadastro", "WhatsApp" e a engrenagem fecham a RO ao navegar; um `ErrorBoundary` impede que um erro da RO derrube o admin; resposta sem texto vira mensagem de erro; "Parar" mostra "Parei. Quer tentar de novo?"; "Copiar" leva clientes, números e tabelas; alvos de toque de 44 px no celular; as tabelas largas mostram um degradê quando há mais colunas. Ao sair do sistema, as conversas guardadas no navegador são apagadas.

## Histórico

A conversa fica no navegador de cada pessoa (`localStorage`, últimas 40 mensagens); "Nova conversa" apaga, e sair do sistema também.

## Código

`lib/ai/ro/*` (servidor), `app/api/ai/chat/route.ts`, `app/api/admin/ro/*`, `app/admin/components/ro-assistant.tsx` e `ro/*` (tela), `app/admin/settings/components/RoTab.tsx`. Testes: `tests/ro*.test.ts`.
