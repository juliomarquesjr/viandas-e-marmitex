import { generateBackupContent } from '@/lib/backup/generate';
import { authOptions } from '@/lib/auth';
import { readFile, unlink, writeFile } from 'fs/promises';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { tmpdir } from 'os';
import { join } from 'path';
import { Client } from 'pg';

export async function POST(req: Request) {
  let tempFilePath: string | null = null;
  let autoBackupTempPath: string | null = null;
  let client: Client | null = null;

  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem restaurar backups.' },
        { status: 403 }
      );
    }

    const formData = await req.formData() as unknown as FormData;
    const fileEntry = formData.get('file');
    const file = fileEntry instanceof File ? fileEntry : null;
    const confirmed = String(formData.get('confirmed')) === 'true';
    const autoBackupEnabled = String(formData.get('autoBackup')) === 'true';

    if (!file) {
      return NextResponse.json({ error: 'Arquivo de backup é obrigatório' }, { status: 400 });
    }

    if (!confirmed) {
      return NextResponse.json(
        { error: 'Confirmação é obrigatória. Por favor, confirme explicitamente a restauração.' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.sql')) {
      return NextResponse.json({ error: 'Arquivo deve ser um arquivo SQL (.sql)' }, { status: 400 });
    }

    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Arquivo muito grande. Tamanho máximo: 100MB' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Arquivo vazio' }, { status: 400 });
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json({ error: 'DATABASE_URL não configurada' }, { status: 500 });
    }

    // Backup automático antes de restaurar
    let autoBackupFilename: string | undefined;
    if (autoBackupEnabled) {
      console.log('[RESTORE] Criando backup automático antes de restaurar...');
      const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      autoBackupFilename = `auto-backup-before-restore-${backupTimestamp}.sql`;

      let autoBackupClient: Client | null = null;
      let autoBackupContent = '';

      try {
        autoBackupClient = new Client({ connectionString: databaseUrl });
        await autoBackupClient.connect();
        autoBackupContent = await generateBackupContent(autoBackupClient);
      } catch (error: any) {
        console.error('[RESTORE] Erro ao criar backup automático:', error);
      } finally {
        if (autoBackupClient) await autoBackupClient.end();
      }

      if (autoBackupContent) {
        autoBackupTempPath = join(tmpdir(), `auto-backup-${Date.now()}.sql`);
        await writeFile(autoBackupTempPath, autoBackupContent);
        console.log('[RESTORE] Backup automático salvo:', autoBackupTempPath);
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    tempFilePath = join(tmpdir(), `restore-${Date.now()}-${file.name}`);
    await writeFile(tempFilePath, buffer);

    const fileContent = buffer.toString('utf8');
    if (!fileContent || fileContent.trim().length === 0) {
      return NextResponse.json({ error: 'Arquivo SQL está vazio ou inválido' }, { status: 400 });
    }

    const sqlKeywords = ['CREATE', 'INSERT', 'COPY', 'ALTER', 'DROP'];
    if (!sqlKeywords.some(kw => fileContent.toUpperCase().includes(kw))) {
      return NextResponse.json({ error: 'Arquivo não parece ser um backup SQL válido' }, { status: 400 });
    }

    console.log('[RESTORE] Iniciando restauração do banco de dados...');
    const startTime = Date.now();

    try {
      const sqlContent = await readFile(tempFilePath, 'utf8');

      client = new Client({ connectionString: databaseUrl });
      await client.connect();
      await client.query('SET search_path TO public;');
      await client.query('BEGIN');

      try {
        // Filtrar apenas linhas vazias e comentários.
        // SET standard_conforming_strings é mantido para garantir comportamento correto de strings.
        let processedSQL = sqlContent
          .split('\n')
          .filter(line => {
            const trimmed = line.trim();
            if (!trimmed) return false;
            if (trimmed.startsWith('--')) return false;
            if (trimmed.startsWith('/*')) return false;
            if (trimmed.toUpperCase().startsWith('SET STATEMENT_TIMEOUT')) return false;
            if (trimmed.toUpperCase().startsWith('SET LOCK_TIMEOUT')) return false;
            if (trimmed.toUpperCase().startsWith('SET IDLE_IN_TRANSACTION')) return false;
            if (trimmed.toUpperCase().startsWith('SET CLIENT_ENCODING')) return false;
            return true;
          })
          .join('\n');

        // Parser de comandos SQL: respeita aspas e parênteses aninhados
        const commands: string[] = [];
        let currentCommand = '';
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let parenDepth = 0;

        for (let i = 0; i < processedSQL.length; i++) {
          const char = processedSQL[i];

          if (char === "'" && !inDoubleQuote) {
            // Detecta '' (aspas dobradas = escape de aspas simples em SQL)
            if (inSingleQuote && processedSQL[i + 1] === "'") {
              currentCommand += "''";
              i++; // pula o próximo '
              continue;
            }
            inSingleQuote = !inSingleQuote;
          } else if (char === '"' && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote;
          }

          if (!inSingleQuote && !inDoubleQuote) {
            if (char === '(') parenDepth++;
            if (char === ')') parenDepth--;
          }

          currentCommand += char;

          if (char === ';' && !inSingleQuote && !inDoubleQuote && parenDepth === 0) {
            const cmd = currentCommand.trim();
            if (cmd && !cmd.startsWith('--')) commands.push(cmd);
            currentCommand = '';
          }
        }

        if (currentCommand.trim()) {
          const cmd = currentCommand.trim();
          if (cmd && !cmd.startsWith('--')) commands.push(cmd);
        }

        // Fase 1: DROP TYPE / CREATE TYPE em transação própria
        const typeCommands = commands.filter(cmd => {
          const up = cmd.trim().toUpperCase();
          return up.startsWith('DROP TYPE') || up.startsWith('CREATE TYPE');
        });

        if (typeCommands.length > 0) {
          await client.query('COMMIT');
          await client.query('BEGIN');
          await client.query('SET search_path TO public;');

          for (let idx = 0; idx < typeCommands.length; idx++) {
            const typeCmd = typeCommands[idx];
            const sp = `sp_type_${idx}`;
            try {
              await client.query(`SAVEPOINT ${sp}`);
              await client.query(typeCmd.trim().replace(/;+$/, ''));
              await client.query(`RELEASE SAVEPOINT ${sp}`);
            } catch (err: any) {
              await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
              if (!err.message.toLowerCase().includes('already exists')) {
                console.warn('[RESTORE] Aviso ao criar tipo:', err.message);
              }
            }
          }

          await client.query('COMMIT');
          await client.query('BEGIN');
          await client.query('SET search_path TO public;');
        }

        // Fase 2: demais comandos
        const nonTypeCommands = commands.filter(cmd => {
          const up = cmd.trim().toUpperCase();
          return !up.startsWith('DROP TYPE') && !up.startsWith('CREATE TYPE');
        });

        let savepointCounter = 0;

        for (const command of nonTypeCommands) {
          if (!command) continue;

          const upperCommand = command.toUpperCase().trim();
          if (upperCommand.startsWith('CREATE TABLE') || upperCommand.startsWith('DROP TABLE')) {
            await client.query('SET search_path TO public;');
          }

          const sp = `sp_${savepointCounter++}`;

          try {
            await client.query(`SAVEPOINT ${sp}`);
            await client.query(command.trim().replace(/;+$/, ''));
            await client.query(`RELEASE SAVEPOINT ${sp}`);
          } catch (error: any) {
            try {
              await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
            } catch {
              console.warn('[RESTORE] Rollback para savepoint falhou, reiniciando transação');
              await client.query('ROLLBACK');
              await client.query('BEGIN');
              await client.query('SET search_path TO public;');
              savepointCounter = 0;
            }

            const errorMsg = error.message.toLowerCase();

            if (errorMsg.includes('syntax error')) {
              console.error('[RESTORE] ERRO CRÍTICO: Erro de sintaxe:', command.substring(0, 200));
              await client.query('ROLLBACK');
              throw new Error(`Erro de sintaxe SQL: ${error.message}. Comando: ${command.substring(0, 200)}`);
            }

            if (isIgnorableRestoreError(command, errorMsg)) {
              if (errorMsg.includes('current transaction is aborted')) {
                await client.query('ROLLBACK');
                await client.query('BEGIN');
                await client.query('SET search_path TO public;');
                savepointCounter = 0;
              }
            } else {
              console.error('[RESTORE] Erro crítico:', command.substring(0, 200), error.message);
              await client.query('ROLLBACK');
              throw error;
            }
          }
        }

        await client.query('COMMIT');
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch { /* ignorar */ }
        throw error;
      } finally {
        if (client) await client.end();
      }

      const elapsedTime = Date.now() - startTime;
      console.log(`[RESTORE] Restauração concluída com sucesso em ${elapsedTime}ms`);

      let autoBackupBase64: string | null = null;
      if (autoBackupTempPath) {
        try {
          autoBackupBase64 = (await readFile(autoBackupTempPath)).toString('base64');
        } catch (e) {
          console.warn('[RESTORE] Erro ao ler backup automático:', e);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Backup restaurado com sucesso!',
        autoBackup: autoBackupBase64 && autoBackupFilename
          ? { filename: autoBackupFilename, data: `data:application/sql;base64,${autoBackupBase64}` }
          : null,
        elapsedTime,
      });

    } catch (error: any) {
      console.error('[RESTORE] Erro ao executar restauração:', error);

      let autoBackupBase64: string | null = null;
      if (autoBackupTempPath) {
        try {
          autoBackupBase64 = (await readFile(autoBackupTempPath)).toString('base64');
        } catch { /* ignorar */ }
      }

      return NextResponse.json(
        {
          error: `Erro ao restaurar backup: ${error.message}`,
          autoBackup: autoBackupBase64 && autoBackupFilename
            ? {
                filename: autoBackupFilename,
                data: `data:application/sql;base64,${autoBackupBase64}`,
                message: 'Um backup automático foi criado antes da restauração. Use-o para reverter se necessário.',
              }
            : null,
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('[RESTORE] Erro inesperado:', error);
    return NextResponse.json(
      { error: `Erro ao restaurar backup: ${error.message}` },
      { status: 500 }
    );
  } finally {
    if (client) {
      try { await client.end(); } catch { /* ignorar */ }
    }

    for (const filePath of [tempFilePath, autoBackupTempPath].filter(Boolean) as string[]) {
      try {
        await unlink(filePath);
      } catch { /* ignorar */ }
    }
  }
}

function isIgnorableRestoreError(command: string, errorMsg: string): boolean {
  const upper = command.trim().toUpperCase();

  if (upper.startsWith('DROP ')) return true;

  if (upper.startsWith('CREATE TYPE')) return errorMsg.includes('already exists');

  if (upper.startsWith('CREATE TABLE')) return errorMsg.includes('already exists');

  if (upper.startsWith('CREATE INDEX') || upper.startsWith('CREATE UNIQUE INDEX')) {
    return errorMsg.includes('already exists');
  }

  if (upper.startsWith('ALTER TABLE') && upper.includes('ADD CONSTRAINT')) {
    return errorMsg.includes('already exists') || errorMsg.includes('does not exist');
  }

  if (upper.startsWith('INSERT INTO')) {
    return (
      errorMsg.includes('duplicate key') ||
      errorMsg.includes('already exists') ||
      errorMsg.includes('unique constraint')
    );
  }

  if (upper.startsWith('SET ') || upper.startsWith('SELECT PG_CATALOG')) return true;

  return false;
}
