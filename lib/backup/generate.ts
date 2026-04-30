import { Client } from 'pg';

export async function generateBackupContent(client: Client): Promise<string> {
  const now = new Date();
  let content = '';

  content += `-- PostgreSQL database dump\n`;
  content += `-- Dump date: ${now.toISOString()}\n\n`;
  content += `SET statement_timeout = 0;\n`;
  content += `SET lock_timeout = 0;\n`;
  content += `SET idle_in_transaction_session_timeout = 0;\n`;
  content += `SET client_encoding = 'UTF8';\n`;
  content += `SET standard_conforming_strings = on;\n`;
  content += `SELECT pg_catalog.set_config('search_path', '', false);\n\n`;

  const tablesResult = await client.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);

  let tables = tablesResult.rows
    .map((r: any) => r.tablename as string)
    .filter((t: string) => !t.startsWith('_prisma'));

  if (tables.length === 0) {
    throw new Error('Nenhuma tabela encontrada no banco de dados');
  }

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

  const dependencies = new Map<string, Set<string>>();
  const allTables = new Set(tables);

  for (const row of fkResult.rows) {
    const table = row.table_name;
    const dependsOn = row.foreign_table_name;
    if (allTables.has(table) && allTables.has(dependsOn) && table !== dependsOn) {
      if (!dependencies.has(table)) dependencies.set(table, new Set());
      dependencies.get(table)!.add(dependsOn);
    }
  }

  tables = topologicalSort(tables, dependencies);

  const foreignKeysInfo = fkResult.rows.map((row: any) => ({
    tableName: row.table_name,
    constraintName: row.constraint_name,
    columnName: row.column_name,
    foreignTableName: row.foreign_table_name,
    foreignColumnName: row.foreign_column_name,
    deleteRule: row.delete_rule,
    updateRule: row.update_rule,
  }));

  const constraintsResult = await client.query(`
    SELECT
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      kcu.ordinal_position
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
    ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position
  `);

  const pkColumns = new Map<string, string[]>();
  const uniqueConstraints = new Map<string, Array<{ constraintName: string; columns: string[] }>>();

  for (const row of constraintsResult.rows) {
    if (row.constraint_type === 'PRIMARY KEY') {
      if (!pkColumns.has(row.table_name)) pkColumns.set(row.table_name, []);
      pkColumns.get(row.table_name)!.push(row.column_name);
    } else {
      if (!uniqueConstraints.has(row.table_name)) uniqueConstraints.set(row.table_name, []);
      const existing = uniqueConstraints.get(row.table_name)!;
      const found = existing.find(uq => uq.constraintName === row.constraint_name);
      if (found) {
        found.columns.push(row.column_name);
      } else {
        existing.push({ constraintName: row.constraint_name, columns: [row.column_name] });
      }
    }
  }

  // ENUMs antes das tabelas
  content += `\n--\n-- Types (ENUMs)\n--\n\n`;
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
    content += `DROP TYPE IF EXISTS "${enumType.enum_name}" CASCADE;\n`;
    content += `CREATE TYPE "${enumType.enum_name}" AS ENUM (${values});\n\n`;
  }

  for (const tableName of tables) {
    content += `\n--\n-- Table: ${tableName}\n--\n\n`;
    content += `DROP TABLE IF EXISTS "${tableName}" CASCADE;\n\n`;

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
      const columnDefs = columnsResult.rows.map((col: any) => {
        let typeDef = '';

        if (col.data_type === 'USER-DEFINED') {
          // FIX #1: aspas duplas obrigatórias para preservar o case do ENUM (ex: "PaymentMethod")
          typeDef = `"${col.udt_name}"`;
        } else {
          switch (col.data_type) {
            case 'character varying':
              typeDef = col.character_maximum_length
                ? `VARCHAR(${col.character_maximum_length})`
                : 'VARCHAR';
              break;
            case 'character':
              typeDef = col.character_maximum_length
                ? `CHAR(${col.character_maximum_length})`
                : 'CHAR';
              break;
            case 'numeric':
              if (col.numeric_precision != null && col.numeric_scale != null) {
                typeDef = `NUMERIC(${col.numeric_precision},${col.numeric_scale})`;
              } else if (col.numeric_precision != null) {
                typeDef = `NUMERIC(${col.numeric_precision})`;
              } else {
                typeDef = 'NUMERIC';
              }
              break;
            case 'integer': typeDef = 'INTEGER'; break;
            case 'bigint': typeDef = 'BIGINT'; break;
            case 'boolean': typeDef = 'BOOLEAN'; break;
            case 'text': typeDef = 'TEXT'; break;
            case 'timestamp without time zone': typeDef = 'TIMESTAMP'; break;
            case 'timestamp with time zone': typeDef = 'TIMESTAMPTZ'; break;
            case 'jsonb': typeDef = 'JSONB'; break;
            case 'json': typeDef = 'JSON'; break;
            case 'uuid': typeDef = 'UUID'; break;
            default: typeDef = col.data_type.toUpperCase();
          }
        }

        let colDef = `"${col.column_name}" ${typeDef}`;
        if (col.is_nullable === 'NO') colDef += ' NOT NULL';
        if (col.column_default) colDef += ` DEFAULT ${col.column_default.trim()}`;
        return colDef;
      });

      const pks = pkColumns.get(tableName);
      if (pks && pks.length > 0) {
        columnDefs.push(`PRIMARY KEY (${pks.map(c => `"${c}"`).join(', ')})`);
      }

      for (const uq of uniqueConstraints.get(tableName) ?? []) {
        columnDefs.push(`CONSTRAINT "${uq.constraintName}" UNIQUE (${uq.columns.map(c => `"${c}"`).join(', ')})`);
      }

      content += `CREATE TABLE "${tableName}" (\n  ${columnDefs.join(',\n  ')}\n);\n\n`;
    }

    const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
    const rowCount = parseInt(countResult.rows[0].count);

    if (rowCount > 0) {
      content += `--\n-- Data for table ${tableName}\n--\n\n`;

      const colsResult = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      const columns = colsResult.rows.map((r: any) => r.column_name as string);
      const columnNames = columns.map(c => `"${c}"`).join(', ');

      const batchSize = 500;
      for (let offset = 0; offset < rowCount; offset += batchSize) {
        const dataResult = await client.query(
          `SELECT * FROM "${tableName}" LIMIT $1 OFFSET $2`,
          [batchSize, offset]
        );

        if (dataResult.rows.length > 0) {
          content += `INSERT INTO "${tableName}" (${columnNames}) VALUES\n`;

          const values = dataResult.rows.map((row: any, idx: number) => {
            const rowValues = columns.map(col => serializeValue(row[col])).join(', ');
            return `(${rowValues})${idx < dataResult.rows.length - 1 ? ',' : ';'}`;
          }).join('\n');

          content += values + '\n\n';
        }
      }
    }
  }

  content += `\n--\n-- Foreign Keys\n--\n\n`;

  const fkByConstraint = new Map<string, any[]>();
  for (const fk of foreignKeysInfo) {
    if (!fkByConstraint.has(fk.constraintName)) fkByConstraint.set(fk.constraintName, []);
    fkByConstraint.get(fk.constraintName)!.push(fk);
  }

  for (const [, fkCols] of fkByConstraint.entries()) {
    const first = fkCols[0];
    const cols = fkCols.map((fk: any) => `"${fk.columnName}"`).join(', ');
    const foreignCols = fkCols.map((fk: any) => `"${fk.foreignColumnName}"`).join(', ');
    const deleteRule = first.deleteRule ? ` ON DELETE ${first.deleteRule}` : '';
    const updateRule = first.updateRule ? ` ON UPDATE ${first.updateRule}` : '';
    content += `ALTER TABLE "${first.tableName}" ADD CONSTRAINT "${first.constraintName}" FOREIGN KEY (${cols}) REFERENCES "${first.foreignTableName}" (${foreignCols})${deleteRule}${updateRule};\n`;
  }

  content += `\n--\n-- Indexes\n--\n\n`;
  const indexesResult = await client.query(`
    SELECT indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname NOT LIKE '%_pkey'
  `);

  for (const index of indexesResult.rows) {
    if (index.indexdef) content += index.indexdef + ';\n';
  }

  return content;
}

function serializeValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';

  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';

  if (typeof value === 'number') return String(value);

  if (value instanceof Date) return `'${value.toISOString()}'`;

  if (typeof value === 'string') {
    // FIX #2: com standard_conforming_strings = on, backslash é literal.
    // Apenas aspas simples precisam ser escapadas (dobradas).
    return `'${value.replace(/'/g, "''")}'`;
  }

  if (typeof value === 'object') {
    const json = JSON.stringify(value);
    // FIX #2: mesmo para JSON, apenas escapar aspas simples
    return `'${json.replace(/'/g, "''")}'`;
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

export function topologicalSort(tables: string[], dependencies: Map<string, Set<string>>): string[] {
  const sorted: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(table: string) {
    if (visiting.has(table) || visited.has(table)) return;

    visiting.add(table);
    for (const dep of dependencies.get(table) ?? []) {
      if (tables.includes(dep)) visit(dep);
    }
    visiting.delete(table);
    visited.add(table);
    sorted.push(table);
  }

  for (const table of tables) visit(table);

  return sorted;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
