## Fuso horário e "o dia" do negócio

O dia do negócio é o **dia em Brasília** (UTC-3, sem horário de verão desde 2019). O servidor (Vercel) roda em **UTC**, onde o dia vira às 21h de Brasília. Uma venda feita às 22:12 de Brasília é 01:12 UTC do dia seguinte.

### O erro que isso causava
Filtros que montavam o dia em UTC (ou no fuso do servidor) deixavam as vendas depois das 21h de fora do dia certo: na tela de Vendas, a venda das 22:12 só aparecia filtrando o dia seguinte. O mesmo valia para "hoje" calculado no navegador com `new Date().toISOString().split("T")[0]`, que devolve o dia em UTC.

### A regra
Toda conta de início e fim de dia usa `lib/date-range.ts`:

| Função | Para quê |
|---|---|
| `startOfDaySP(dia)`, `endOfDaySP(dia)` | Instante do começo e do fim do dia ("AAAA-MM-DD") em Brasília |
| `parseDayRange(inicio, fim)` | Filtro `createdAt` pronto para o Prisma (`null` sem filtro, `'invalid'` se não for data) |
| `noonOfDaySP(dia)` | Meio-dia de Brasília, para data informada à mão (venda retroativa) |
| `dateStringSP(data)` | O dia ("AAAA-MM-DD") em que o instante cai em Brasília, em qualquer servidor ou aparelho |
| `todaySP()` | Hoje em Brasília (no lugar de `new Date().toISOString().split("T")[0]`) |
| `localDateString(data)` | Dia local de uma data montada no aparelho (`new Date(ano, mês, 1)`) |

**Não use** `new Date(y, m, d)` no servidor para montar um dia, nem `toISOString().split("T")[0]` para "hoje".

### Onde já vale
Vendas (`/api/orders`, inclusive a data de venda retroativa do PDV), pré-pedidos, relatório de fechamento do cliente, resumo de tele-entrega, relatório de lucros, última entrada do cliente, e os "hoje" e os intervalos padrão das telas (PDV, impressão de vendas do dia, orçamento, despesas, lucros, fechamento).

A área do cliente já seguia a mesma regra (`lib/customer-date-range.ts`).

### Pedido online
As janelas de horário do pedido online (dia da semana e minuto do dia) são sempre calculadas em Brasília no servidor: `weekdayAndMinuteSP` e `lib/ordering.ts`. Domingo às 21h de Brasília já é segunda 00:00 em UTC, por isso há testes de borda (`npm test`). Ver [pedido-online.md](./pedido-online.md).

### Exceção
**Despesas** guardam só uma data (à meia-noite UTC), sem hora. O corte por dia continua em UTC.

### Como conferir
Com o servidor em UTC (`TZ=UTC`), crie uma venda às 22:12 de Brasília: ela aparece no filtro do próprio dia e não no do dia seguinte.
