// Acesso ao banco da RO: SOMENTE LEITURA, em quatro camadas.
//
// 1. O cliente usado aqui recusa (no código) qualquer operação que não seja de leitura: create, update, delete,
//    upsert e afins lançam erro antes de chegar ao banco.
// 2. As ferramentas recebem o cliente "embrulhado": só o `$queryRaw` escrito como modelo de texto (com valores
//    separados, como nas ferramentas) existe. `$queryRawUnsafe`, `$executeRaw`, `$executeRawUnsafe` e afins lançam erro.
// 3. Toda consulta roda numa transação marcada como somente leitura. O próprio PostgreSQL recusa qualquer escrita
//    nela, e há tempo máximo por consulta e por espera de trava.
// 4. A mais forte (recomendada em produção): se existir a variável RO_DATABASE_URL (um usuário do banco que só tem
//    SELECT nas tabelas usadas, veja docs/ro-papel-somente-leitura.sql), a RO usa essa conexão em vez da normal.
//    Sem ela, a RO usa o mesmo usuário do sistema e as camadas 1 a 3 são o que protege.
//
// A RO escolhe ferramentas prontas (tools.ts); nenhuma SQL escrita pela IA chega aqui. Um teste automático
// (tests/ro-somente-leitura.test.ts) trava qualquer escrita nova nos arquivos da RO.

import { PrismaClient } from '@/lib/generated/prisma';
import basePrisma from '@/lib/prisma';

const OPERACOES_DE_LEITURA = new Set(['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy']);

/** Partes do cliente que a RO não usa e que poderiam escrever ou mudar o estado da conexão. */
const METODOS_BLOQUEADOS = new Set(['$queryRawUnsafe', '$executeRaw', '$executeRawUnsafe', '$runCommandRaw', '$transaction', '$extends', '$use', '$on', '$connect', '$disconnect']);

let avisouSemPapel = false;

/** Conexão "pooler" (Neon) exige pgbouncer=true no Prisma; se o endereço da RO veio sem isso, acrescenta. */
function ajustarUrl(url: string | undefined): string | undefined {
  if (!url || !/-pooler[.\-]/.test(url) || /[?&]pgbouncer=/.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}pgbouncer=true`;
}

function criarCliente() {
  const url = ajustarUrl(process.env.RO_DATABASE_URL);
  if (!url && process.env.NODE_ENV === 'production' && !avisouSemPapel) {
    avisouSemPapel = true;
    console.warn('[RO] RO_DATABASE_URL não está definida: a RO usa o mesmo usuário do banco do sistema (só a trava de código e a transação somente leitura protegem). Veja docs/assistente-ro.md.');
  }
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

/** Embrulha o cliente da transação: os métodos que escrevem ou soltam SQL escrita à mão lançam erro. */
function somenteLeitura(tx: Leitura): Leitura {
  return new Proxy(tx, {
    get(alvo, propriedade) {
      if (typeof propriedade === 'string' && METODOS_BLOQUEADOS.has(propriedade)) {
        throw new Error(`A RO só lê dados: ${propriedade} foi bloqueado.`);
      }
      const valor = Reflect.get(alvo, propriedade);
      return typeof valor === 'function' && propriedade === '$queryRaw' ? valor.bind(alvo) : valor;
    },
  });
}

export async function lerSomente<T>(fn: (db: Leitura) => Promise<T>): Promise<T> {
  return cliente.$transaction(
    async (tx) => {
      // a partir daqui o PostgreSQL recusa qualquer escrita, e nenhuma consulta passa do tempo máximo
      await tx.$queryRaw`SELECT set_config('transaction_read_only', 'on', true), set_config('statement_timeout', ${String(TEMPO_MAXIMO_MS)}, true), set_config('lock_timeout', '2000', true), set_config('idle_in_transaction_session_timeout', '20000', true)`;
      return fn(somenteLeitura(tx));
    },
    { timeout: 20_000, maxWait: 5_000 },
  );
}
