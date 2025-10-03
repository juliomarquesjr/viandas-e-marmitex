export const SQL_FEEDBACK_PROMPT = `
SISTEMA DE FEEDBACK PARA GERAÇÃO SQL:

Quando a IA gerar SQL incorreta, use este prompt para ensinar:

"ATENÇÃO: A consulta SQL gerada contém erros PostgreSQL. 

ERRO DETECTADO: [descrever o erro específico]

CORREÇÃO NECESSÁRIA:
- Em vez de: [SQL incorreta]
- Use: [SQL correta]

REGRAS POSTGRESQL LEMBRADAS:
- NUNCA use date(), time(), datetime(), getdate(), curdate()
- Use DATE_TRUNC('day', campo) para extrair data
- Use aspas duplas para nomes: "Order", "createdAt"
- Sempre inclua LIMIT para consultas grandes
- Use JOINs explícitos em vez de vírgulas

EXEMPLO CORRETO PARA ESTE CASO:
[exemplo específico baseado no erro]

Por favor, gere uma nova consulta SQL seguindo as regras PostgreSQL."
`;

export function generateFeedbackPrompt(originalSql: string, errors: string[], correctedSql?: string): string {
  let feedback = "ATENÇÃO: A consulta SQL gerada contém erros PostgreSQL.\n\n";
  
  if (errors.length > 0) {
    feedback += "ERROS DETECTADOS:\n";
    errors.forEach((error, index) => {
      feedback += `${index + 1}. ${error}\n`;
    });
    feedback += "\n";
  }
  
  if (correctedSql) {
    feedback += `SQL ORIGINAL: ${originalSql}\n`;
    feedback += `SQL CORRIGIDA: ${correctedSql}\n\n`;
  }
  
  feedback += "REGRAS POSTGRESQL LEMBRADAS:\n";
  feedback += "- NUNCA use date(), time(), datetime(), getdate(), curdate()\n";
  feedback += "- Use DATE_TRUNC('day', campo) para extrair data\n";
  feedback += "- Use aspas duplas para nomes: \"Order\", \"createdAt\"\n";
  feedback += "- Sempre inclua LIMIT para consultas grandes\n";
  feedback += "- Use JOINs explícitos em vez de vírgulas\n";
  feedback += "- Para centavos: campo/100.0 para converter para reais\n\n";
  
  feedback += "Por favor, gere uma nova consulta SQL seguindo as regras PostgreSQL.";
  
  return feedback;
}
