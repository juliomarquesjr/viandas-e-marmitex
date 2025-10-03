const FORBIDDEN_PATTERNS = [
  /;\s*$/i,
  /;.+/i,
  /\bINSERT\b/i,
  /\bUPDATE\b/i,
  /\bDELETE\b/i,
  /\bUPSERT\b/i,
  /\bDROP\b/i,
  /\bALTER\b/i,
  /\bTRUNCATE\b/i,
  /\bCREATE\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /\bMERGE\b/i,
  /(?<!-)--(?!-)/,
  /\/\*/,
];

// Funções SQL inválidas no PostgreSQL
const INVALID_FUNCTIONS = [
  /\bdate\s*\(/i, // date() não existe no PostgreSQL
  /\btime\s*\(/i, // time() não existe no PostgreSQL
  /\bdatetime\s*\(/i, // datetime() não existe no PostgreSQL
];

// Mapeamento de funções inválidas para funções válidas
const FUNCTION_CORRECTIONS = new Map([
  [/date\s*\(/gi, 'DATE_TRUNC(\'day\', '],
  [/time\s*\(/gi, 'CAST('],
  [/datetime\s*\(/gi, 'CAST('],
]);

const ALLOWED_START = [/^select\s/i, /^with\s/i];

const RESERVED_KEYWORDS = new Set(
  [
    "SELECT",
    "FROM",
    "WHERE",
    "GROUP",
    "BY",
    "ORDER",
    "LIMIT",
    "OFFSET",
    "JOIN",
    "INNER",
    "LEFT",
    "RIGHT",
    "FULL",
    "ON",
    "AS",
    "AND",
    "OR",
    "NOT",
    "NULL",
    "COUNT",
    "SUM",
    "AVG",
    "MIN",
    "MAX",
    "CASE",
    "WHEN",
    "THEN",
    "END",
    "DISTINCT",
    "HAVING",
    "LIKE",
    "ILIKE",
    "IN",
    "BETWEEN",
  ]
);

const IDENTIFIER_REGEX = /\b([A-Za-z_][A-Za-z0-9_]*)\b/g;

export function correctInvalidFunctions(sql: string): string {
  let correctedSql = sql;
  
  for (const [invalidPattern, replacement] of FUNCTION_CORRECTIONS) {
    correctedSql = correctedSql.replace(invalidPattern, replacement);
  }
  
  return correctedSql;
}

export function validateSelectQuery(sql: string): string {
  if (!sql || typeof sql !== "string") {
    throw new Error("Consulta SQL vazia ou inválida");
  }
  
  // Remover ponto e vírgula do final automaticamente
  let trimmed = sql.trim();
  if (trimmed.endsWith(';')) {
    trimmed = trimmed.slice(0, -1).trim();
  }

  const startsCorrectly = ALLOWED_START.some((pattern) => pattern.test(trimmed));
  if (!startsCorrectly) {
    throw new Error("A consulta precisa começar com SELECT ou WITH");
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new Error("A consulta contém comandos não permitidos");
    }
  }

  // Verificar funções inválidas no PostgreSQL
  for (const pattern of INVALID_FUNCTIONS) {
    if (pattern.test(trimmed)) {
      throw new Error("A consulta contém funções SQL inválidas para PostgreSQL. Use DATE_TRUNC, CAST ou outras funções suportadas.");
    }
  }

  // Verificar se ainda há ponto e vírgula no meio da consulta (não permitido)
  if (trimmed.includes(';')) {
    throw new Error("Não use ponto e vírgula na consulta");
  }

  return trimmed;
}

export function applySafeLimit(sql: string, limit = 200): string {
  const hasLimit = /\blimit\s+\d+/i.test(sql);
  if (hasLimit) {
    return sql;
  }
  return `${sql} LIMIT ${limit}`;
}

function shouldQuote(word: string): boolean {
  if (!/[A-Z]/.test(word)) {
    return false;
  }
  if (word.toUpperCase() === word) {
    return false;
  }
  if (RESERVED_KEYWORDS.has(word.toUpperCase())) {
    return false;
  }
  return true;
}

export function quoteIdentifiers(sql: string): string {
  const segments = sql.split(/(".*?"|'.*?'|`.*?`)/g);

  return segments
    .map((segment, index) => {
      const isQuoted = index % 2 === 1;
      if (isQuoted) {
        return segment;
      }

      return segment.replace(IDENTIFIER_REGEX, (match, word) => {
        if (!shouldQuote(word)) {
          return match;
        }
        return `"${word}"`;
      });
    })
    .join("");
}

export function normalizeRowValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(normalizeRowValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, innerValue]) => [key, normalizeRowValue(innerValue)])
    );
  }
  return value;
}

export function formatRowsForModel(rows: Array<Record<string, unknown>>, maxPreview = 10): string {
  const preview = rows.slice(0, maxPreview).map((row) => normalizeRowValue(row));
  return JSON.stringify(preview, null, 2);
}

