// Acesso ao banco da RO: SOMENTE LEITURA, em três camadas.
//
// 1. O cliente usado aqui recusa (no código) qualquer operação que não seja de leitura: create, update, delete,
//    upsert e afins lançam erro antes de chegar ao banco.
// 2. Toda consulta roda numa transação marcada como somente leitura. O próprio PostgreSQL recusa qualquer
//    escrita nela, mesmo uma consulta crua, e há um tempo máximo por consulta.
// 3. Opcional, a mais forte: se existir a variável RO_DATABASE_URL (um usuário do banco que só tem SELECT),
//    a RO usa essa conexão em vez da normal.
//
// A RO escolhe ferramentas prontas (tools.ts); nenhuma SQL escrita pela IA chega aqui. Um teste automático
// (tests/ro-somente-leitura.test.ts) trava qualquer escrita nova nos arquivos da RO.

import { PrismaClient } from '@/lib/generated/prisma';
import basePrisma from '@/lib/prisma';

const OPERACOES_DE_LEITURA = new Set(['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy']);

function criarCliente() {
  const url = process.env.RO_DATABASE_URL;
  const base = url ? new PrismaClient({ datasources: { db: { url } } }) : basePrisma;
  return base.$extends({
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          if (!OPERACOES_DE_LEITURA.has(operation)) {
            throw new Error(`A RO só lê dados: ${model}.${operation} foi bloqueado.`);
          }
          return query(args);
        },
      },
    },
  });
}

type ClienteLeitura = ReturnType<typeof criarCliente>;
const globalParaRo = globalThis as unknown as { __roCliente?: ClienteLeitura };
const cliente: ClienteLeitura = globalParaRo.__roCliente ?? criarCliente();
if (process.env.NODE_ENV !== 'production') globalParaRo.__roCliente = cliente;

/** O que as ferramentas recebem: o cliente dentro da transação somente leitura. */
export type Leitura = Parameters<Parameters<ClienteLeitura['$transaction']>[0]>[0];

const TEMPO_MAXIMO_MS = 8000;

export async function lerSomente<T>(fn: (db: Leitura) => Promise<T>): Promise<T> {
  return cliente.$transaction(
    async (tx) => {
      // a partir daqui o PostgreSQL recusa qualquer escrita, e nenhuma consulta passa do tempo máximo
      await tx.$queryRaw`SELECT set_config('transaction_read_only', 'on', true), set_config('statement_timeout', ${String(TEMPO_MAXIMO_MS)}, true)`;
      return fn(tx);
    },
    { timeout: 20_000, maxWait: 5_000 },
  );
}
