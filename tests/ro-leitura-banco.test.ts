import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Teste de integração (opcional): confere de verdade, num banco de TESTE, que a RO não consegue escrever.
// Só roda se a variável RO_TEST_DATABASE_URL existir. Nunca aponte para o banco de produção.
//   RO_TEST_DATABASE_URL='postgresql://postgres:postgres@localhost:5434/viandas' npm test
// Nada é gravado: todas as tentativas abaixo precisam FALHAR, e o nome do cliente tem de continuar igual.

const URL_DE_TESTE = process.env.RO_TEST_DATABASE_URL;

describe('a RO não escreve no banco de verdade', { skip: URL_DE_TESTE ? false : 'defina RO_TEST_DATABASE_URL para rodar' }, () => {
  it('bloqueia escrita pelo cliente, SQL escrita à mão e SQL de escrita dentro do banco', async () => {
    process.env.DATABASE_URL = URL_DE_TESTE;
    delete process.env.RO_DATABASE_URL;
    const { lerSomente } = await import('../lib/ai/ro/db');

    const antes = await lerSomente((db) => db.customer.findFirst({ select: { id: true, name: true } }));
    assert.ok(antes, 'o banco de teste precisa ter pelo menos um cliente');
    const id = antes.id;

    const deveFalhar = async (rotulo: string, fn: () => Promise<unknown>) => {
      await assert.rejects(fn, Error, `NÃO bloqueou: ${rotulo}`);
    };
    // 1) o cliente de leitura recusa operações de escrita
    await deveFalhar('update', () => lerSomente((db) => (db.customer as any).update({ where: { id }, data: { name: 'HACK' } })));
    await deveFalhar('delete', () => lerSomente((db) => (db.customer as any).delete({ where: { id } })));
    await deveFalhar('createMany', () => lerSomente((db) => (db.customer as any).createMany({ data: [] })));
    await deveFalhar('upsert por colchetes', () => lerSomente((db) => (db.customer as any)['up' + 'sert']({ where: { id }, update: {}, create: {} })));
    // 2) os atalhos de SQL escrita à mão não existem
    await deveFalhar('$queryRawUnsafe', () => lerSomente((db) => (db as any).$queryRawUnsafe(`UPDATE "Customer" SET name = 'HACK' WHERE id = '${id}'`)));
    await deveFalhar('$executeRaw', () => lerSomente((db) => (db as any).$executeRaw`UPDATE "Customer" SET name = 'HACK' WHERE id = ${id}`));
    await deveFalhar('$executeRawUnsafe', () => lerSomente((db) => (db as any).$executeRawUnsafe(`DELETE FROM "Customer"`)));
    // 3) mesmo SQL de modelo de texto esbarra na transação somente leitura do PostgreSQL
    await deveFalhar('UPDATE no banco', () => lerSomente((db) => db.$queryRaw`UPDATE "Customer" SET name = 'HACK' WHERE id = ${id} RETURNING id`));
    await deveFalhar('DELETE no banco', () => lerSomente((db) => db.$queryRaw`DELETE FROM "WhatsAppQuickReply" RETURNING id`));
    await deveFalhar('DROP no banco', () => lerSomente((db) => db.$queryRaw`DROP TABLE "WhatsAppQuickReply"`));
    await deveFalhar('sair do modo leitura', () => lerSomente((db) => db.$queryRaw`SET TRANSACTION READ WRITE`));

    const depois = await lerSomente((db) => db.customer.findUnique({ where: { id }, select: { name: true } }));
    assert.equal(depois?.name, antes.name, 'o cliente foi alterado!');
  });

  it('uma consulta que passa do tempo máximo é cancelada', { timeout: 30_000 }, async () => {
    process.env.DATABASE_URL = URL_DE_TESTE;
    const { lerSomente } = await import('../lib/ai/ro/db');
    await assert.rejects(() => lerSomente((db) => db.$queryRaw`SELECT pg_sleep(12)`), Error, 'a consulta lenta não foi cancelada');
  });
});
