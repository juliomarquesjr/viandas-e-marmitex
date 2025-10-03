import { SQL_VALIDATION_RULES } from './ro/postgresql-guide';

export interface ValidationResult {
  isValid: boolean;
  correctedSql?: string;
  errors: string[];
  warnings: string[];
}

export function validatePostgreSQL(sql: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Remover ponto e vírgula do final automaticamente
  let correctedSql = sql.trim();
  if (correctedSql.endsWith(';')) {
    correctedSql = correctedSql.slice(0, -1).trim();
  }

  // Verificar funções inválidas
  for (const rule of SQL_VALIDATION_RULES) {
    if (rule.pattern.test(sql)) {
      errors.push(rule.error);
      correctedSql = rule.fix(correctedSql);
    }
  }

  // Verificar se usa aspas duplas para nomes de tabelas/colunas
  const tableNames = ['Order', 'Customer', 'Product', 'Category', 'OrderItem', 'PreOrder', 'PreOrderItem', 'CustomerProductPreset', 'SystemConfig', 'User'];
  for (const tableName of tableNames) {
    const unquotedPattern = new RegExp(`\\b${tableName}\\b`, 'g');
    if (unquotedPattern.test(correctedSql) && !correctedSql.includes(`"${tableName}"`)) {
      warnings.push(`Tabela ${tableName} deve estar entre aspas duplas: "${tableName}"`);
      correctedSql = correctedSql.replace(unquotedPattern, `"${tableName}"`);
    }
  }

  // Verificar se tem LIMIT
  if (!/\bLIMIT\s+\d+/i.test(correctedSql)) {
    warnings.push('Considere adicionar LIMIT para consultas grandes');
  }

  // Verificar se usa JOINs explícitos (apenas para consultas com múltiplas tabelas)
  const hasMultipleTables = (correctedSql.match(/FROM\s+[^,]+,\s*[^,]+/i) || []).length > 0;
  if (hasMultipleTables) {
    warnings.push('Considere usar JOINs explícitos em vez de vírgulas para múltiplas tabelas');
  }

  // Verificar se converte centavos para reais
  if (correctedSql.includes('Cents') && !correctedSql.includes('/100.0')) {
    warnings.push('Considere converter centavos para reais dividindo por 100.0');
  }

  return {
    isValid: errors.length === 0,
    correctedSql: errors.length > 0 ? correctedSql : undefined,
    errors,
    warnings
  };
}

export function getPostgreSQLSuggestions(sql: string): string[] {
  const suggestions: string[] = [];
  
  if (sql.includes('date(')) {
    suggestions.push('Use DATE_TRUNC(\'day\', campo) em vez de date(campo)');
  }
  
  if (sql.includes('time(')) {
    suggestions.push('Use CAST(campo AS TIME) em vez de time(campo)');
  }
  
  if (sql.includes('datetime(')) {
    suggestions.push('Use CAST(campo AS TIMESTAMP) em vez de datetime(campo)');
  }
  
  if (sql.includes('getdate()')) {
    suggestions.push('Use NOW() em vez de getdate()');
  }
  
  if (sql.includes('curdate()')) {
    suggestions.push('Use CURRENT_DATE em vez de curdate()');
  }
  
  return suggestions;
}
