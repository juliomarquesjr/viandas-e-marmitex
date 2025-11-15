import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function POST(req: Request) {
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
        { error: 'Acesso negado. Apenas administradores podem criar backups.' },
        { status: 403 }
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

    // Gerar nome único do arquivo
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const filename = `backup-viandas-${dateStr}_${timeStr}.sql`;

    console.log('[BACKUP] Iniciando backup do banco de dados...');
    const startTime = Date.now();

    // Conectar ao banco usando cliente PostgreSQL
    client = new Client({
      connectionString: databaseUrl,
    });
    await client.connect();

    // Usar pg_dump via função do PostgreSQL
    // Alternativa: usar COPY para exportar dados
    let backupContent = '';
    
    try {
      // Cabeçalho
      backupContent += `-- PostgreSQL database dump\n`;
      backupContent += `-- Dumped from database: ${new URL(databaseUrl).pathname.slice(1)}\n`;
      backupContent += `-- Dump date: ${now.toISOString()}\n\n`;
      backupContent += `SET statement_timeout = 0;\n`;
      backupContent += `SET lock_timeout = 0;\n`;
      backupContent += `SET idle_in_transaction_session_timeout = 0;\n`;
      backupContent += `SET client_encoding = 'UTF8';\n`;
      backupContent += `SET standard_conforming_strings = on;\n`;
      backupContent += `SELECT pg_catalog.set_config('search_path', '', false);\n\n`;

      // Obter todas as tabelas do schema public
      const tablesResult = await client.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);

      const tables = tablesResult.rows.map((r: any) => r.tablename);
      
      if (tables.length === 0) {
        throw new Error('Nenhuma tabela encontrada no banco de dados');
      }

      // Para cada tabela
      for (const tableName of tables) {
        // Pular tabelas do Prisma
        if (tableName.startsWith('_prisma')) continue;

        backupContent += `\n--\n-- Table: ${tableName}\n--\n\n`;

        // DROP TABLE
        backupContent += `DROP TABLE IF EXISTS "${tableName}" CASCADE;\n\n`;

        // CREATE TABLE - obter colunas primeiro
        const columnsResult = await client.query(`
          SELECT 
            column_name,
            data_type,
            character_maximum_length,
            numeric_precision,
            numeric_scale,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);

        if (columnsResult.rows.length > 0) {
          const columns = columnsResult.rows.map((col: any) => {
            let typeDef = '';
            switch (col.data_type) {
              case 'character varying':
                typeDef = `VARCHAR(${col.character_maximum_length || ''})`;
                break;
              case 'character':
                typeDef = `CHAR(${col.character_maximum_length || ''})`;
                break;
              case 'numeric':
                typeDef = `NUMERIC(${col.numeric_precision || ''},${col.numeric_scale || '0'})`;
                break;
              case 'integer':
                typeDef = 'INTEGER';
                break;
              case 'bigint':
                typeDef = 'BIGINT';
                break;
              case 'boolean':
                typeDef = 'BOOLEAN';
                break;
              case 'text':
                typeDef = 'TEXT';
                break;
              case 'timestamp without time zone':
                typeDef = 'TIMESTAMP';
                break;
              case 'timestamp with time zone':
                typeDef = 'TIMESTAMPTZ';
                break;
              case 'jsonb':
                typeDef = 'JSONB';
                break;
              case 'json':
                typeDef = 'JSON';
                break;
              case 'uuid':
                typeDef = 'UUID';
                break;
              default:
                typeDef = col.data_type.toUpperCase();
            }
            
            let colDef = `"${col.column_name}" ${typeDef}`;
            if (col.is_nullable === 'NO') {
              colDef += ' NOT NULL';
            }
            if (col.column_default) {
              // Garantir que valores DEFAULT sejam tratados corretamente
              // Se o default contém funções ou strings, manter como está
              // Se é um valor simples, pode precisar de aspas
              const defaultVal = col.column_default.trim();
              if (defaultVal.match(/^['"].*['"]$/) || defaultVal.match(/^[A-Z_]+\(/)) {
                // Já é uma string ou função
                colDef += ` DEFAULT ${defaultVal}`;
              } else {
                // Valor simples - manter como está (pode ser número, boolean, etc)
                colDef += ` DEFAULT ${defaultVal}`;
              }
            }
            return colDef;
          }).join(', ');

          backupContent += `CREATE TABLE "${tableName}" (${columns});\n\n`;
        }

        // Dados (usando COPY para melhor performance)
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const rowCount = parseInt(countResult.rows[0].count);

        if (rowCount > 0) {
          backupContent += `--\n-- Data for table ${tableName}\n--\n\n`;

          // Obter colunas
          const colsResult = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
          `, [tableName]);

          const columns = colsResult.rows.map((r: any) => r.column_name);
          const columnNames = columns.map(c => `"${c}"`).join(', ');

          // Exportar dados em lotes
          const batchSize = 500;
          for (let offset = 0; offset < rowCount; offset += batchSize) {
            const dataResult = await client.query(
              `SELECT * FROM "${tableName}" LIMIT $1 OFFSET $2`,
              [batchSize, offset]
            );

            if (dataResult.rows.length > 0) {
              backupContent += `INSERT INTO "${tableName}" (${columnNames}) VALUES\n`;

              const values = dataResult.rows.map((row: any, idx: number) => {
                const rowValues = columns.map(col => {
                  const value = row[col];
                  if (value === null) return 'NULL';
                  if (typeof value === 'string') {
                    // Escapar aspas simples
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

      // Índices
      backupContent += `\n--\n-- Indexes\n--\n\n`;
      const indexesResult = await client.query(`
        SELECT indexdef 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
      `);

      for (const index of indexesResult.rows) {
        if (index.indexdef) {
          backupContent += index.indexdef + ';\n';
        }
      }

    } catch (error: any) {
      console.error('[BACKUP] Erro ao gerar backup:', error);
      throw error;
    } finally {
      if (client) {
        await client.end();
      }
    }

    if (!backupContent || backupContent.length === 0) {
      return NextResponse.json(
        { error: 'Backup vazio ou inválido' },
        { status: 500 }
      );
    }

    // Calcular tamanho
    const sizeBytes = Buffer.byteLength(backupContent, 'utf8');
    const elapsedTime = Date.now() - startTime;
    console.log(`[BACKUP] Backup criado com sucesso: ${formatBytes(sizeBytes)} em ${elapsedTime}ms`);

    // Retornar o arquivo como download direto
    return new NextResponse(backupContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': sizeBytes.toString(),
      },
    });
  } catch (error: any) {
    console.error('[BACKUP] Erro inesperado:', error);
    
    // Fechar conexão se ainda estiver aberta
    if (client) {
      try {
        await client.end();
      } catch (e) {
        // Ignorar erro ao fechar
      }
    }

    return NextResponse.json(
      { error: `Erro ao criar backup: ${error.message}` },
      { status: 500 }
    );
  }
}

// Função auxiliar para formatar bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
