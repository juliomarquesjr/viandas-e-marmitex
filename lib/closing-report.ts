/**
 * O valor que o fechamento cobra.
 *
 * As duas vias do relatório — térmica e A4 — imprimem o mesmo QR, e o QR tem
 * valor fixo: se cada via calculasse a cobrança por conta própria, o cliente
 * pagaria um número diferente do que está escrito no papel que recebeu.
 */

/** O bastante do relatório para saber quanto se cobra. */
export type ClosingReportBalance = {
  summary: { debtBalanceCents: number };
  monthlySummary?: Array<{ finalBalanceCents: number }>;
};

/**
 * O "Valor a Pagar" impresso no relatório.
 *
 * O resumo mensal acumula saldo mês a mês, então a última linha é a dívida
 * corrente — é esse número que aparece em destaque. Sem resumo mensal (período
 * sem movimento, ou cálculo que falhou no servidor), cai no saldo devedor até
 * o fim do período, que é a mesma conta por outro caminho.
 *
 * Pode voltar negativo: aí o cliente tem crédito e não há nada a cobrar.
 */
export function amountDueCents(report: ClosingReportBalance): number {
  const months = report.monthlySummary;
  if (months && months.length > 0) {
    return months[months.length - 1].finalBalanceCents;
  }
  return report.summary.debtBalanceCents;
}
