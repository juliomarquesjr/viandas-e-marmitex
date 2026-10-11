import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';

// A RO só pode ler o banco. Estes testes olham o código-fonte e travam qualquer escrita nova nos arquivos da RO,
// inclusive as formas de esconder uma escrita (maiúsculas, colchetes, desestruturar, concatenar SQL, outros clientes de banco).

const RAIZ = join(__dirname, '..');
const lerArquivo = (rel: string) => readFileSync(join(RAIZ, rel), 'utf8');

/**
 * Tira os comentários sem tocar nos textos: "/*" dentro de uma string não apaga código de verdade.
 * Percorre o arquivo letra a letra sabendo quando está dentro de aspas, crase ou comentário.
 */
export function semComentarios(codigo: string): string {
  let saida = '';
  let i = 0;
  let aspas: string | null = null;
  while (i < codigo.length) {
    const c = codigo[i];
    const prox = codigo[i + 1];
    if (aspas) {
      saida += c;
      if (c === '\\') {
        saida += prox ?? '';
        i += 2;
        continue;
      }
      if (c === aspas || (c === '\n' && aspas !== '`')) aspas = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      aspas = c;
      saida += c;
      i++;
    } else if (c === '/' && prox === '/') {
      while (i < codigo.length && codigo[i] !== '\n') i++;
    } else if (c === '/' && prox === '*') {
      const fim = codigo.indexOf('*/', i + 2);
      i = fim === -1 ? codigo.length : fim + 2;
      saida += ' ';
    } else {
      saida += c;
      i++;
    }
  }
  return saida;
}

function varrer(dir: string, achados: string[] = []): string[] {
  for (const nome of readdirSync(join(RAIZ, dir))) {
    const rel = join(dir, nome);
    if (statSync(join(RAIZ, rel)).isDirectory()) {
      if (!['node_modules', 'generated', '.next'].includes(nome)) varrer(rel, achados);
    } else if (/\.(ts|tsx)$/.test(nome)) achados.push(rel);
  }
  return achados;
}

const DIR_RO = 'lib/ai/ro';
/** Tudo que é da RO, em qualquer subpasta e inclusive .tsx. */
const ARQUIVOS_DA_RO = [...varrer(DIR_RO), ...varrer('app/admin/components/ro'), 'app/admin/components/ro-assistant.tsx', 'app/api/ai/chat/route.ts', ...varrer('app/api/admin/ro')];
/** Os únicos que podem falar com o Prisma: o acesso de leitura e as configurações da própria RO. */
const PODEM_USAR_PRISMA = new Set([join(DIR_RO, 'db.ts'), join(DIR_RO, 'settings.ts'), join(DIR_RO, 'settings-admin.ts')]);
/** Único que grava (as configurações da própria RO), usado só pela tela de configurações. */
const ARQUIVO_DE_ESCRITA = join(DIR_RO, 'settings-admin.ts');
const DB = join(DIR_RO, 'db.ts');
/** Arquivos do servidor que consultam dados do negócio. */
const ARQUIVOS_DE_DADOS = varrer(DIR_RO).filter((f) => !/\/(router|gemini|settings|settings-admin|settings-tipos)\.ts$/.test(f) && !f.endsWith('/gemini.ts'));

const ESCRITAS_DO_PRISMA = [
  /\.\s*(?:create|createMany|createManyAndReturn|update|updateMany|upsert|delete|deleteMany)\s*(?:\?\.)?\s*(?:<[^>]*>)?\s*\(/,
  /\[\s*['"`]\s*(?:create|createMany|createManyAndReturn|update|updateMany|upsert|delete|deleteMany)\s*['"`]\s*\]/,
  /\{[^}]*\b(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\b[^}]*\}\s*=\s*(?:db|tx|prisma|cliente|this)\b/,
  /\b(?:db|tx|prisma|basePrisma|cliente)(?:\s*\.\s*\w+)?\s*\[/, // acesso computado a métodos do banco
];

/** SQL de escrita, em qualquer combinação de maiúsculas. Palavras soltas ("delete" num texto) não contam: precisa ser comando. */
const SQL_DE_ESCRITA = [
  /\binsert\s+into\b/i,
  /\bupdate\s+["`\w.]+\s+set\b/i,
  /\bdelete\s+from\b/i,
  /\btruncate\s+(?:table\s+)?["`\w]/i,
  /\bdrop\s+(?:table|schema|database|index|view|role|extension)\b/i,
  /\balter\s+(?:table|system|role|database|schema|user)\b/i,
  /\bcreate\s+(?:table|temp|temporary|extension|role|user|index|or\s+replace|function|schema|database)\b/i,
  /\bgrant\s+\w+(?:\s*,\s*\w+)*\s+on\b/i,
  /\brevoke\s+\w+/i,
  /\bcopy\s+(?:\(|["\w]+\s+(?:to|from)\b)/i,
  /\bpg_(?:read_file|ls_dir|terminate_backend|cancel_backend|reload_conf)\b/i,
  /\blo_(?:import|export|create|from_bytea)\b/i,
  /\bset\s+(?:session|local\s+)?(?:role|session\s+authorization)\b/i,
];

const PERIGOS_FORA_DO_DB = [/\$queryRawUnsafe/, /\$executeRaw/, /\$runCommandRaw/, /\bPrisma\s*\.\s*(?:sql|raw|join)\b/, /\beval\s*\(/, /\bnew\s+Function\b/, /\bReflect\b/, /\bset_config\b/, /\$transaction\s*\(\s*\[/];

const IMPORTA_PRISMA = /(?:from|import\s*\(|require\s*\()\s*['"]([^'"]*)['"]/g;
const CAMINHO_DO_PRISMA = /(?:^|\/)prisma$|@prisma\/client|generated\/prisma|(?:^|\/)lib\/prisma\b/;

describe('a RO só lê o banco', () => {
  it('encontra os arquivos da RO em qualquer subpasta e inclusive .tsx', () => {
    for (const esperado of [join(DIR_RO, 'tools.ts'), join(DIR_RO, 'db.ts'), 'app/admin/components/ro/blocos.tsx', 'app/admin/components/ro-assistant.tsx', 'app/api/ai/chat/route.ts']) {
      assert.ok(ARQUIVOS_DA_RO.includes(esperado), `${esperado} fora da varredura`);
    }
    assert.ok(ARQUIVOS_DA_RO.length >= 20);
  });

  it('o removedor de comentários não é enganado por "/*" dentro de texto', () => {
    const armadilha = 'const a = "/*"; db.customer.update({}); const b = "*/";';
    assert.match(semComentarios(armadilha), /\.update\(/);
    assert.doesNotMatch(semComentarios('x(); // db.customer.update()\n/* db.customer.delete() */ y();'), /update|delete/);
  });

  it('nenhum arquivo da RO tem escrita no banco (Prisma ou SQL, em qualquer forma)', () => {
    for (const arquivo of ARQUIVOS_DA_RO.filter((f) => f !== ARQUIVO_DE_ESCRITA)) {
      const codigo = semComentarios(lerArquivo(arquivo));
      for (const padrao of [...ESCRITAS_DO_PRISMA, ...SQL_DE_ESCRITA]) assert.ok(!padrao.test(codigo), `${arquivo} tem uma escrita proibida: ${padrao}`);
    }
  });

  it('os padrões de busca pegam as escritas escondidas que o teste antigo deixava passar', () => {
    const casos = [
      'db.customer["update"](x)',
      'db.customer.update?.(x)',
      'db.customer.update<X>(x)',
      'const { update } = db.customer',
      'db.customer[`up${"date"}`](x)',
      'update "Customer" set name = 1',
      'DELETE FROM "Order"',
      'delete from "Order"',
      'COPY (SELECT 1) TO PROGRAM \'x\'',
      "INSERT INTO t VALUES (1)",
      'TRUNCATE "Order"',
    ];
    for (const caso of casos) assert.ok([...ESCRITAS_DO_PRISMA, ...SQL_DE_ESCRITA].some((p) => p.test(caso)), `não pegou: ${caso}`);
    // texto comum não dispara
    for (const inocente of ['deleta o cliente', "'delete', 'drop'", 'Copiar a resposta', 'atualiza o preço']) {
      assert.ok(![...ESCRITAS_DO_PRISMA, ...SQL_DE_ESCRITA].some((p) => p.test(inocente)), `disparou à toa: ${inocente}`);
    }
  });

  it('só o db.ts menciona $executeRaw, $queryRawUnsafe, Reflect, set_config e afins (e só para bloquear)', () => {
    for (const arquivo of ARQUIVOS_DA_RO.filter((f) => f !== DB)) {
      const codigo = semComentarios(lerArquivo(arquivo));
      for (const padrao of PERIGOS_FORA_DO_DB) assert.ok(!padrao.test(codigo), `${arquivo} usa algo proibido fora do db.ts: ${padrao}`);
    }
  });

  it('nenhum arquivo da RO importa o Prisma por fora do acesso de leitura (nem por caminho relativo)', () => {
    for (const arquivo of ARQUIVOS_DA_RO.filter((f) => !PODEM_USAR_PRISMA.has(f))) {
      const codigo = semComentarios(lerArquivo(arquivo));
      for (const m of codigo.matchAll(IMPORTA_PRISMA)) assert.ok(!CAMINHO_DO_PRISMA.test(m[1]), `${arquivo} importa ${m[1]}`);
    }
    // e a regra pega as formas de escrever o caminho
    for (const ruim of ['@/lib/prisma', '../../prisma', '../prisma', '@prisma/client', '@/lib/generated/prisma', '../../lib/generated/prisma']) assert.ok(CAMINHO_DO_PRISMA.test(ruim), ruim);
    for (const bom of ['./db', '@/lib/date-range', './prisma-nao']) assert.ok(!CAMINHO_DO_PRISMA.test(bom), bom);
  });

  it('as ferramentas usam só o acesso de leitura (db.ts)', () => {
    const tools = semComentarios(lerArquivo(join(DIR_RO, 'tools.ts')));
    assert.ok(/lerSomente/.test(tools));
    assert.ok(!/@\/lib\/prisma/.test(tools));
  });

  it('o cliente de leitura só libera operações de leitura, bloqueia os atalhos de SQL escrita e a transação é somente leitura', () => {
    const db = lerArquivo(DB);
    const lista = /OPERACOES_DE_LEITURA = new Set\(\[(.*?)\]\)/.exec(db)?.[1] ?? '';
    const ops = [...lista.matchAll(/'(\w+)'/g)].map((m) => m[1]);
    assert.deepEqual(ops.sort(), ['aggregate', 'count', 'findFirst', 'findFirstOrThrow', 'findMany', 'findUnique', 'findUniqueOrThrow', 'groupBy']);
    const bloqueados = /METODOS_BLOQUEADOS = new Set\(\[([\s\S]*?)\]\)/.exec(db)?.[1] ?? '';
    for (const metodo of ['$queryRawUnsafe', '$executeRaw', '$executeRawUnsafe', '$transaction', '$extends']) assert.ok(bloqueados.includes(`'${metodo}'`), `${metodo} não está bloqueado`);
    assert.ok(!bloqueados.includes("'$queryRaw'"), 'o $queryRaw por modelo de texto é o que as ferramentas usam');
    assert.ok(db.includes("set_config('transaction_read_only', 'on', true)"));
    assert.ok(db.includes('statement_timeout') && db.includes('lock_timeout'));
    assert.ok(db.includes('RO_DATABASE_URL'));
    assert.match(db, /console\.warn\(['"`]\[RO\] RO_DATABASE_URL/);
    assert.match(db, /fn\(somenteLeitura\(tx\)\)/, 'as ferramentas devem receber o cliente embrulhado');
  });

  it('as ferramentas só usam $queryRaw como modelo de texto (valores separados), nunca texto montado', () => {
    for (const arquivo of ARQUIVOS_DE_DADOS) {
      const codigo = semComentarios(lerArquivo(arquivo));
      for (const m of codigo.matchAll(/\.\$queryRaw(?!Unsafe)(?:<[^`(]*>)?(.)/g)) assert.equal(m[1], '`', `${arquivo} chama $queryRaw sem ser modelo de texto`);
    }
  });

  it('os arquivos de dados da RO não leem senhas, tokens nem configurações do sistema', () => {
    assert.ok(ARQUIVOS_DE_DADOS.includes(join(DIR_RO, 'tools.ts')) && ARQUIVOS_DE_DADOS.includes(join(DIR_RO, 'customer-index.ts')));
    for (const arquivo of ARQUIVOS_DE_DADOS) {
      const codigo = semComentarios(lerArquivo(arquivo));
      for (const proibido of [/password/i, /systemConfig/i, /PasswordResetToken/i, /tokenHash/i, /nfChaveAcesso/i, /barcode/i]) assert.ok(!proibido.test(codigo), `${arquivo} menciona ${proibido}`);
    }
  });

  it('só a tela de configurações grava as configurações da RO', () => {
    const usos = [...varrer('app'), ...varrer('lib')].filter((f) => f !== ARQUIVO_DE_ESCRITA && /from ['"][^'"]*settings-admin['"]/.test(lerArquivo(f)));
    assert.deepEqual(usos, [join('app', 'api', 'admin', 'ro', 'settings', 'route.ts')]);
  });

  it('a rota da conversa exige administrador, não aceita SQL e nenhuma resposta fica em cache', () => {
    const rota = lerArquivo('app/api/ai/chat/route.ts');
    assert.ok(rota.includes('requireAdmin()'));
    assert.ok(!/\$queryRaw|\$executeRaw|prisma/i.test(semComentarios(rota)), 'a rota fala com o banco diretamente');
    assert.match(rota, /Cache-Control['"]:\s*['"]no-store/);
    assert.match(rota, /const falha = [\s\S]*SEM_CACHE/, 'as respostas de erro também levam no-store');
    for (const arquivo of ['app/api/admin/ro/settings/route.ts', 'app/api/admin/ro/status/route.ts']) {
      const codigo = lerArquivo(arquivo);
      assert.ok(codigo.includes('requireAdmin()'), arquivo);
      assert.match(codigo, /no-store/, arquivo);
      assert.match(codigo, /semCache\(auth\.error\)/, `${arquivo}: o erro de login também não pode ficar em cache`);
    }
  });

  it('a rota confere o corpo antes de gastar o limite, limita o tamanho e devolve o crédito na falha', () => {
    const rota = lerArquivo('app/api/ai/chat/route.ts');
    assert.ok(rota.indexOf('limparMensagens(') < rota.indexOf('checkUserRateLimit('), 'o limite de 40/10 min só conta depois de validar');
    assert.match(rota, /MAX_CORPO/);
    assert.match(rota, /devolverCredito\(\)/);
    assert.match(rota, /resetAt - Date\.now\(\)/, 'a espera dita é o tempo real até o fim da janela');
    // o limite do dia é lido e somado sem nenhum await no meio
    const trecho = rota.slice(rota.indexOf('const usadas ='), rota.indexOf('usoDiario.set(chaveDia, usadas + 1)'));
    assert.doesNotMatch(trecho, /await/);
  });

  it('a conversa guardada no navegador é apagada ao sair do sistema', () => {
    assert.match(lerArquivo('app/admin/components/layout/UserMenu.tsx'), /limparHistoricoRo\(\);\s*\n\s*\n?\s*await signOut/);
    assert.match(lerArquivo('app/admin/components/ro/historico.ts'), /ro:chat:v1:/);
  });

  it('o relatório de arquivos varridos lista a RO inteira', () => {
    // evita que uma pasta nova fique de fora sem ninguém perceber
    const pastas = new Set(ARQUIVOS_DA_RO.map((f) => relative(RAIZ, join(RAIZ, f)).split('/').slice(0, 3).join('/')));
    for (const pasta of ['lib/ai/ro', 'app/admin/components', 'app/api/ai', 'app/api/admin']) assert.ok([...pastas].some((p) => p.startsWith(pasta)), pasta);
  });
});
