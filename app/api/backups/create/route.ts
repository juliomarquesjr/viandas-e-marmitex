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

      let tables = tablesResult.rows.map((r: any) => r.tablename).filter((t: string) => !t.startsWith('_prisma'));
      
      if (tables.length === 0) {
        throw new Error('Nenhuma tabela encontrada no banco de dados');
      }

      // Obter dependências de foreign keys para ordenar tabelas corretamente
      const fkResult = await client.query(`
        SELECT
          tc.table_name as table_name,
          kcu.column_name as column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          tc.constraint_name,
          rc.delete_rule,
          rc.update_rule
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON rc.constraint_name = tc.constraint_name
          AND rc.constraint_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
      `);

      // Criar mapa de dependências
      const dependencies = new Map<string, Set<string>>();
      const allTables = new Set(tables);
      
      for (const row of fkResult.rows) {
        const table = row.table_name;
        const dependsOn = row.foreign_table_name;
        
        if (allTables.has(table) && allTables.has(dependsOn) && table !== dependsOn) {
          if (!dependencies.has(table)) {
            dependencies.set(table, new Set());
          }
          dependencies.get(table)!.add(dependsOn);
        }
      }

      // Ordenar tabelas por dependências (topological sort)
      tables = topologicalSort(tables, dependencies);

      // Obter informações de foreign keys para exportação posterior
      const foreignKeysInfo = fkResult.rows.map((row: any) => ({
        tableName: row.table_name,
        constraintName: row.constraint_name,
        columnName: row.column_name,
        foreignTableName: row.foreign_table_name,
        foreignColumnName: row.foreign_column_name,
        deleteRule: row.delete_rule,
        updateRule: row.update_rule,
      }));

      // Exportar tipos ENUM antes de criar tabelas
      backupContent += `\n--\n-- Types (ENUMs)\n--\n\n`;
      const enumTypesResult = await client.query(`
        SELECT 
          t.typname as enum_name,
          string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) as enum_values
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
        GROUP BY t.typname
        ORDER BY t.typname
      `);

      for (const enumType of enumTypesResult.rows) {
        const values = enumType.enum_values.split(',').map((v: string) => `'${v}'`).join(', ');
        backupContent += `DROP TYPE IF EXISTS "${enumType.enum_name}" CASCADE;\n`;
        backupContent += `CREATE TYPE "${enumType.enum_name}" AS ENUM (${values});\n\n`;
      }

      // Para cada tabela (agora ordenada por dependências)
      for (const tableName of tables) {
        backupContent += `\n--\n-- Table: ${tableName}\n--\n\n`;

        // DROP TABLE
        backupContent += `DROP TABLE IF EXISTS "${tableName}" CASCADE;\n\n`;

        // CREATE TABLE - obter colunas primeiro
        // Para tipos USER-DEFINED (ENUMs), usar udt_name em vez de data_type
        const columnsResult = await client.query(`
          SELECT 
            column_name,
            data_type,
            udt_name,
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
            // Se for USER-DEFINED, usar udt_name (nome do tipo ENUM)
            if (col.data_type === 'USER-DEFINED') {
              typeDef = col.udt_name;
            } else {
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
            }
            
            let colDef = `"${col.column_name}" ${typeDef}`;
            if (col.is_nullable === 'NO') {
              colDef += ' NOT NULL';
            }
            if (col.column_default) {
              // O column_default do PostgreSQL já vem formatado corretamente
              // Pode incluir casts como 'pending'::text, funções como now(), ou valores simples
              // Usar diretamente como vem do banco, pois já está no formato SQL correto
              const defaultVal = col.column_default.trim();
              colDef += ` DEFAULT ${defaultVal}`;
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

      // Foreign Keys (após criar todas as tabelas)
      backupContent += `\n--\n-- Foreign Keys\n--\n\n`;
      
      // Agrupar foreign keys por constraint name (pois uma FK pode ter múltiplas colunas)
      const fkByConstraint = new Map<string, any[]>();
      for (const fk of foreignKeysInfo) {
        if (!fkByConstraint.has(fk.constraintName)) {
          fkByConstraint.set(fk.constraintName, []);
        }
        fkByConstraint.get(fk.constraintName)!.push(fk);
      }

      // Exportar foreign keys
      for (const [constraintName, fkColumns] of fkByConstraint.entries()) {
        const firstFk = fkColumns[0];
        const columns = fkColumns.map(fk => `"${fk.columnName}"`).join(', ');
        const foreignColumns = fkColumns.map(fk => `"${fk.foreignColumnName}"`).join(', ');
        const deleteRule = firstFk.deleteRule ? ` ON DELETE ${firstFk.deleteRule}` : '';
        const updateRule = firstFk.updateRule ? ` ON UPDATE ${firstFk.updateRule}` : '';
        
        backupContent += `ALTER TABLE "${firstFk.tableName}" ADD CONSTRAINT "${constraintName}" FOREIGN KEY (${columns}) REFERENCES "${firstFk.foreignTableName}" (${foreignColumns})${deleteRule}${updateRule};\n`;
      }

      // Índices (exceto primary keys que já foram criados)
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

// Função auxiliar para ordenação topológica (respeitando dependências)
function topologicalSort(tables: string[], dependencies: Map<string, Set<string>>): string[] {
  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(table: string) {
    if (visiting.has(table)) {
      // Ciclo detectado - retornar ordem original
      return tables;
    }
    if (visited.has(table)) {
      return;
    }

    visiting.add(table);
    
    const deps = dependencies.get(table);
    if (deps) {
      for (const dep of deps) {
        if (tables.includes(dep)) {
          visit(dep);
        }
      }
    }

    visiting.delete(table);
    visited.add(table);
    sorted.push(table);
  }

  for (const table of tables) {
    if (!visited.has(table)) {
      visit(table);
    }
  }

  return sorted;
}

// Função auxiliar para formatar bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
