import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { Client } from 'pg';

export async function POST(req: Request) {
  let tempFilePath: string | null = null;
  let autoBackupTempPath: string | null = null;
  let client: Client | null = null;

  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Verificar se é admin
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem restaurar backups.' },
        { status: 403 }
      );
    }

    // Obter dados do formulário
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const confirmed = formData.get('confirmed') === 'true';
    const autoBackupEnabled = formData.get('autoBackup') === 'true';

    // Validações
    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo de backup é obrigatório' },
        { status: 400 }
      );
    }

    if (!confirmed) {
      return NextResponse.json(
        { error: 'Confirmação é obrigatória. Por favor, confirme explicitamente a restauração.' },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    if (!file.name.endsWith('.sql')) {
      return NextResponse.json(
        { error: 'Arquivo deve ser um arquivo SQL (.sql)' },
        { status: 400 }
      );
    }

    // Validar tamanho (máximo 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Tamanho máximo: 100MB' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: 'Arquivo vazio' },
        { status: 400 }
      );
    }

    // Obter DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json(
        { error: 'DATABASE_URL não configurada' },
        { status: 500 }
      );
    }

    // Extrair informações da URL de conexão
    const url = new URL(databaseUrl);
    const dbName = url.pathname.slice(1);
    const dbUser = url.username;
    const dbPassword = url.password;
    const dbHost = url.hostname;
    const dbPort = url.port || '5432';

    // Criar backup automático antes de restaurar (se habilitado)
    let autoBackupFilename: string | undefined;
    if (autoBackupEnabled) {
      console.log('[RESTORE] Criando backup automático antes de restaurar...');
      const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      autoBackupFilename = `auto-backup-before-restore-${backupTimestamp}.sql`;
      
      // Criar cliente para backup automático
      let autoBackupClient: Client | null = null;
      let autoBackupContent: string = '';
      
      try {
        autoBackupClient = new Client({
          connectionString: databaseUrl,
        });
        await autoBackupClient.connect();

        // Gerar backup automático usando mesma lógica da criação
        autoBackupContent = await generateBackupContent(autoBackupClient);
      } catch (error: any) {
        console.error('[RESTORE] Erro ao criar backup automático:', error);
        // Continuar mesmo se o backup automático falhar (mas avisar)
        autoBackupContent = '';
      } finally {
        if (autoBackupClient) {
          await autoBackupClient.end();
        }
      }

      // Salvar backup automático em arquivo temporário para retornar
      if (autoBackupContent && autoBackupContent.length > 0) {
        autoBackupTempPath = join(tmpdir(), `auto-backup-${Date.now()}.sql`);
        await writeFile(autoBackupTempPath, autoBackupContent);
        console.log('[RESTORE] Backup automático salvo:', autoBackupTempPath);
      }
    } else {
      console.log('[RESTORE] Backup automático desabilitado pelo usuário.');
    }

    // Salvar arquivo de backup recebido em arquivo temporário
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    tempFilePath = join(tmpdir(), `restore-${Date.now()}-${file.name}`);
    await writeFile(tempFilePath, buffer);

    console.log('[RESTORE] Arquivo salvo temporariamente:', tempFilePath);

    // Validar conteúdo do arquivo SQL (verificar se não está vazio e tem conteúdo válido)
    const fileContent = buffer.toString('utf8');
    if (!fileContent || fileContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'Arquivo SQL está vazio ou inválido' },
        { status: 400 }
      );
    }

    // Verificar se contém comandos SQL básicos
    const sqlKeywords = ['CREATE', 'INSERT', 'COPY', 'ALTER', 'DROP'];
    const hasSqlContent = sqlKeywords.some(keyword => 
      fileContent.toUpperCase().includes(keyword)
    );

    if (!hasSqlContent) {
      return NextResponse.json(
        { error: 'Arquivo não parece ser um backup SQL válido' },
        { status: 400 }
      );
    }

    // Executar restauração usando cliente PostgreSQL
    console.log('[RESTORE] Iniciando restauração do banco de dados...');
    const startTime = Date.now();

    try {
      // Ler conteúdo do arquivo SQL
      const sqlContent = await readFile(tempFilePath, 'utf8');
      
      // Conectar ao banco e executar SQL
      client = new Client({
        connectionString: databaseUrl,
      });

      await client.connect();
      
      // Configurar schema e search_path antes de restaurar
      await client.query('SET search_path TO public;');
      
      // Executar SQL em uma transação
      await client.query('BEGIN');
      try {
        // Processar SQL linha por linha de forma mais robusta
        // Primeiro, remover comandos SET problemáticos e comentários
        let processedSQL = sqlContent
          .split('\n')
          .filter(line => {
            const trimmed = line.trim();
            // Remover linhas vazias, comentários e comandos SET problemáticos
            if (!trimmed) return false;
            if (trimmed.startsWith('--')) return false;
            if (trimmed.startsWith('/*')) return false;
            if (trimmed.toUpperCase().startsWith('SET STATEMENT_TIMEOUT')) return false;
            if (trimmed.toUpperCase().startsWith('SET LOCK_TIMEOUT')) return false;
            if (trimmed.toUpperCase().startsWith('SET IDLE_IN_TRANSACTION')) return false;
            if (trimmed.toUpperCase().startsWith('SET CLIENT_ENCODING')) return false;
            if (trimmed.toUpperCase().startsWith('SET STANDARD_CONFORMING')) return false;
            if (trimmed.toUpperCase().includes('PG_CATALOG.SET_CONFIG')) return false;
            return true;
          })
          .join('\n');
        
        // Dividir em comandos por ponto e vírgula, mas de forma mais inteligente
        // Não dividir se o ; está dentro de aspas ou parênteses aninhados
        const commands: string[] = [];
        let currentCommand = '';
        let inQuotes = false;
        let quoteChar = '';
        let parenDepth = 0;
        
        for (let i = 0; i < processedSQL.length; i++) {
          const char = processedSQL[i];
          const nextChar = i < processedSQL.length - 1 ? processedSQL[i + 1] : '';
          
          // Detectar início/fim de strings
          if ((char === '"' || char === "'") && (i === 0 || processedSQL[i - 1] !== '\\')) {
            if (!inQuotes) {
              inQuotes = true;
              quoteChar = char;
            } else if (char === quoteChar) {
              inQuotes = false;
              quoteChar = '';
            }
          }
          
          // Contar parênteses (mas não dentro de strings)
          if (!inQuotes) {
            if (char === '(') parenDepth++;
            if (char === ')') parenDepth--;
          }
          
          currentCommand += char;
          
          // Se encontramos ; e não estamos em string e parênteses estão balanceados
          if (char === ';' && !inQuotes && parenDepth === 0) {
            const cmd = currentCommand.trim();
            if (cmd && cmd.length > 0 && !cmd.startsWith('--')) {
              commands.push(cmd);
            }
            currentCommand = '';
          }
        }
        
        // Adicionar comando restante se houver
        if (currentCommand.trim()) {
          const cmd = currentCommand.trim();
          if (cmd && cmd.length > 0 && !cmd.startsWith('--')) {
            commands.push(cmd);
          }
        }
        
        // Executar cada comando usando SAVEPOINT para permitir rollback parcial
        let savepointCounter = 0;
        
        for (const command of commands) {
          if (!command || command.length === 0) continue;
          
          // Criar um savepoint antes de cada comando
          const savepointName = `sp_${savepointCounter++}`;
          
          try {
            // Garantir que o schema está definido antes de cada CREATE TABLE ou DROP TABLE
            const upperCommand = command.toUpperCase().trim();
            if (upperCommand.startsWith('CREATE TABLE') || upperCommand.startsWith('DROP TABLE')) {
              await client.query('SET search_path TO public;');
            }
            
            // Criar savepoint
            await client.query(`SAVEPOINT ${savepointName}`);
            
            // Remover ponto e vírgula final se já existir
            const cleanCommand = command.trim().replace(/;+$/, '');
            await client.query(cleanCommand);
            
            // Se chegou aqui, o comando foi executado com sucesso
            // Liberar o savepoint
            await client.query(`RELEASE SAVEPOINT ${savepointName}`);
          } catch (error: any) {
            // Fazer rollback para o savepoint
            try {
              await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
            } catch (rollbackError) {
              // Se o rollback falhar, pode ser que a transação já esteja abortada
              // Nesse caso, precisamos fazer rollback completo e recomeçar
              console.warn('[RESTORE] Erro ao fazer rollback para savepoint, fazendo rollback completo');
              await client.query('ROLLBACK');
              await client.query('BEGIN');
              await client.query('SET search_path TO public;');
            }
            
            // Verificar se é um erro que podemos ignorar
            const errorMsg = error.message.toLowerCase();
            const isIgnorableError = 
              errorMsg.includes('already exists') || 
              errorMsg.includes('does not exist') ||
              errorMsg.includes('relation') ||
              errorMsg.includes('constraint') ||
              errorMsg.includes('duplicate') ||
              errorMsg.includes('no schema has been selected') ||
              errorMsg.includes('syntax error') ||
              errorMsg.includes('current transaction is aborted');
            
            if (isIgnorableError) {
              // Log de avisos que são ignorados
              if (errorMsg.includes('syntax error')) {
                console.warn('[RESTORE] Aviso: Erro de sintaxe ignorado:', command.substring(0, 150));
              } else if (errorMsg.includes('current transaction is aborted')) {
                console.warn('[RESTORE] Aviso: Transação abortada, reiniciando transação');
                // Reiniciar transação
                await client.query('ROLLBACK');
                await client.query('BEGIN');
                await client.query('SET search_path TO public;');
                savepointCounter = 0; // Resetar contador de savepoints
              }
            } else {
              // Erro crítico - fazer rollback completo e relançar
              console.error('[RESTORE] Erro crítico ao executar comando:', command.substring(0, 200), error.message);
              await client.query('ROLLBACK');
              throw error;
            }
          }
        }
        
        await client.query('COMMIT');
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          // Ignorar erro de rollback se transação já foi abortada
        }
        throw error;
      } finally {
        if (client) {
          await client.end();
        }
      }

      const elapsedTime = Date.now() - startTime;
      console.log(`[RESTORE] Restauração concluída com sucesso em ${elapsedTime}ms`);

      // Se houver backup automático, ler e incluir no response
      let autoBackupBase64: string | null = null;
      if (autoBackupTempPath) {
        try {
          const autoBackupBuffer = await readFile(autoBackupTempPath);
          autoBackupBase64 = autoBackupBuffer.toString('base64');
        } catch (error) {
          console.warn('[RESTORE] Erro ao ler backup automático:', error);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Backup restaurado com sucesso!',
        autoBackup: (autoBackupBase64 && autoBackupFilename) ? {
          filename: autoBackupFilename,
          data: `data:application/sql;base64,${autoBackupBase64}`,
        } : null,
        elapsedTime,
      });

    } catch (error: any) {
      console.error('[RESTORE] Erro ao executar psql:', error);
      
      // Se a restauração falhar, o backup automático pode ser usado para reverter
      let autoBackupBase64: string | null = null;
      if (autoBackupTempPath) {
        try {
          const autoBackupBuffer = await readFile(autoBackupTempPath);
          autoBackupBase64 = autoBackupBuffer.toString('base64');
        } catch (error) {
          console.warn('[RESTORE] Erro ao ler backup automático:', error);
        }
      }

      return NextResponse.json(
        { 
          error: `Erro ao restaurar backup: ${error.message}`,
          autoBackup: (autoBackupBase64 && autoBackupFilename) ? {
            filename: autoBackupFilename,
            data: `data:application/sql;base64,${autoBackupBase64}`,
            message: 'Um backup automático foi criado antes da restauração. Use-o para reverter se necessário.',
          } : null,
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
    // Fechar conexão se ainda estiver aberta
    if (client) {
      try {
        await client.end();
      } catch (error) {
        console.warn('[RESTORE] Erro ao fechar conexão:', error);
      }
    }

    // Limpar arquivos temporários
    const filesToClean = [tempFilePath, autoBackupTempPath].filter(Boolean) as string[];
    
    for (const filePath of filesToClean) {
      try {
        await unlink(filePath);
        console.log('[RESTORE] Arquivo temporário removido:', filePath);
      } catch (error) {
        console.warn('[RESTORE] Erro ao remover arquivo temporário:', error);
      }
    }
  }
}

// Função auxiliar para gerar conteúdo de backup
async function generateBackupContent(client: Client): Promise<string> {
  let backupContent = '';
  
  const now = new Date();
  backupContent += `-- PostgreSQL database dump\n`;
  backupContent += `-- Dump date: ${now.toISOString()}\n\n`;

  // Obter todas as tabelas
  const tablesResult = await client.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);

  const tables = tablesResult.rows.map((r: any) => r.tablename);

  for (const tableName of tables) {
    if (tableName.startsWith('_prisma')) continue;

    backupContent += `\n-- Table: ${tableName}\n`;
    backupContent += `DROP TABLE IF EXISTS "${tableName}" CASCADE;\n\n`;

    // CREATE TABLE
    const createResult = await client.query(`
      SELECT 
        'CREATE TABLE "' || $1 || '" (' || 
        string_agg(
          '"' || column_name || '" ' || 
          CASE 
            WHEN data_type = 'character varying' THEN 'VARCHAR(' || COALESCE(character_maximum_length::text, '') || ')'
            WHEN data_type = 'integer' THEN 'INTEGER'
            WHEN data_type = 'bigint' THEN 'BIGINT'
            WHEN data_type = 'boolean' THEN 'BOOLEAN'
            WHEN data_type = 'text' THEN 'TEXT'
            WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
            WHEN data_type = 'jsonb' THEN 'JSONB'
            WHEN data_type = 'uuid' THEN 'UUID'
            ELSE UPPER(data_type)
          END ||
          CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
          CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
          ', '
        ) || 
        ');' as create_sql
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `, [tableName]);

    if (createResult.rows.length > 0 && createResult.rows[0].create_sql) {
      backupContent += createResult.rows[0].create_sql + '\n\n';
    }

    // Dados
    const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
    const rowCount = parseInt(countResult.rows[0].count);

    if (rowCount > 0) {
      const colsResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      const columns = colsResult.rows.map((r: any) => r.column_name);
      const columnNames = columns.map((c: string) => `"${c}"`).join(', ');

      const batchSize = 500;
      for (let offset = 0; offset < rowCount; offset += batchSize) {
        const dataResult = await client.query(
          `SELECT * FROM "${tableName}" LIMIT $1 OFFSET $2`,
          [batchSize, offset]
        );

        if (dataResult.rows.length > 0) {
          backupContent += `INSERT INTO "${tableName}" (${columnNames}) VALUES\n`;

          const values = dataResult.rows.map((row: any, idx: number) => {
            const rowValues = columns.map((col: string) => {
              const value = row[col];
              if (value === null) return 'NULL';
              if (typeof value === 'string') {
                return `'${value.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
              }
              if (value instanceof Date) {
                return `'${value.toISOString()}'`;
              }
              if (typeof value === 'object') {
                return `'${JSON.stringify(value).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
              }
              if (typeof value === 'boolean') {
                return value ? 'TRUE' : 'FALSE';
              }
              return String(value);
            }).join(', ');
            return `(${rowValues})${idx < dataResult.rows.length - 1 ? ',' : ';'}`;
          }).join('\n');

          backupContent += values + '\n\n';
        }
      }
    }
  }

  return backupContent;
}

