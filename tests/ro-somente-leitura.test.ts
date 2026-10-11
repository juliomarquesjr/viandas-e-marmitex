import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

// A RO só pode ler o banco. Estes testes olham o código-fonte e travam qualquer escrita nova nos arquivos da RO.

const RAIZ = join(__dirname, '..');
const lerArquivo = (rel: string) => readFileSync(join(RAIZ, rel), 'utf8');
const semComentarios = (codigo: string) => codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/([^:'"`])\/\/.*$/gm, '$1');

const DIR_RO = 'lib/ai/ro';
const arquivosRo = readdirSync(join(RAIZ, DIR_RO)).filter((f) => f.endsWith('.ts'));
/** Único arquivo que grava (as configurações da própria RO), usado só pela tela de configurações. */
const ARQUIVO_DE_ESCRITA = 'settings-admin.ts';

const ESCRITAS = [/\.\s*(create|createMany|createManyAndReturn|update|updateMany|upsert|delete|deleteMany)\s*\(/, /\$executeRaw/, /\$queryRawUnsafe/, /\$executeRawUnsafe/, /\b(INSERT|UPDATE|DELETE|TRUNCATE|DROP|ALTER|GRANT|REVOKE)\b/];

function varrer(dir: string, achados: string[] = []): string[] {
  for (const nome of readdirSync(join(RAIZ, dir))) {
    const rel = join(dir, nome);
    if (statSync(join(RAIZ, rel)).isDirectory()) {
      if (!['node_modules', 'generated', '.next'].includes(nome)) varrer(rel, achados);
    } else if (/\.(ts|tsx)$/.test(nome)) achados.push(rel);
  }
  return achados;
}

describe('a RO só lê o banco', () => {
  it('nenhum arquivo da conversa da RO tem escrita no banco', () => {
    for (const arquivo of arquivosRo.filter((f) => f !== ARQUIVO_DE_ESCRITA)) {
      const codigo = semComentarios(lerArquivo(join(DIR_RO, arquivo)));
      for (const padrao of ESCRITAS) assert.ok(!padrao.test(codigo), `${arquivo} tem uma escrita proibida: ${padrao}`);
    }
  });

  it('as ferramentas usam só o acesso de leitura (db.ts), nunca o Prisma direto', () => {
    const tools = semComentarios(lerArquivo(`${DIR_RO}/tools.ts`));
    assert.ok(!/@\/lib\/prisma/.test(tools), 'tools.ts importa o Prisma normal');
    assert.ok(/lerSomente/.test(tools));
    for (const arquivo of ['chat.ts', 'router.ts', 'gemini.ts', 'customer-index.ts']) {
      assert.ok(!/@\/lib\/prisma/.test(semComentarios(lerArquivo(`${DIR_RO}/${arquivo}`))), `${arquivo} importa o Prisma normal`);
    }
  });

  it('o cliente de leitura só libera operações de leitura e a transação é somente leitura', () => {
    const db = lerArquivo(`${DIR_RO}/db.ts`);
    const lista = /OPERACOES_DE_LEITURA = new Set\(\[(.*?)\]\)/.exec(db)?.[1] ?? '';
    const ops = [...lista.matchAll(/'(\w+)'/g)].map((m) => m[1]);
    assert.deepEqual(ops.sort(), ['aggregate', 'count', 'findFirst', 'findFirstOrThrow', 'findMany', 'findUnique', 'findUniqueOrThrow', 'groupBy']);
    assert.ok(db.includes("set_config('transaction_read_only', 'on', true)"));
    assert.ok(db.includes('statement_timeout'));
  });

  it('as ferramentas não leem senhas, tokens nem configurações do sistema', () => {
    const tools = semComentarios(lerArquivo(`${DIR_RO}/tools.ts`));
    for (const proibido of [/password/i, /systemConfig/i, /PasswordResetToken/i, /tokenHash/i, /nfChaveAcesso/i]) assert.ok(!proibido.test(tools), `tools.ts menciona ${proibido}`);
  });

  it('só a tela de configurações grava as configurações da RO', () => {
    const usos = [...varrer('app'), ...varrer('lib')].filter((f) => f !== join(DIR_RO, ARQUIVO_DE_ESCRITA) && /from ['"][^'"]*settings-admin['"]/.test(lerArquivo(f)));
    assert.deepEqual(usos, [join('app', 'api', 'admin', 'ro', 'settings', 'route.ts')]);
  });

  it('a rota da conversa exige administrador e não aceita SQL', () => {
    const rota = lerArquivo('app/api/ai/chat/route.ts');
    assert.ok(rota.includes('requireAdmin()'));
    assert.ok(!/\$queryRaw|\$executeRaw|prisma/i.test(semComentarios(rota)), 'a rota fala com o banco diretamente');
  });
});
