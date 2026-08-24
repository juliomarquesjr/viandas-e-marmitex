import { Customer } from "../types";
import { formatCurrency } from "../constants";
import type { Cycle } from "./cycle";

/**
 * A cobrança por WhatsApp.
 *
 * O diálogo de fechamento só sabia enviar por e-mail, e apenas 4 dos 48
 * clientes têm e-mail cadastrado — todos os 48 têm telefone. Aqui a conta do
 * mês vira uma mensagem pronta, aberta no WhatsApp Web ou no aplicativo.
 */

/** Só os dígitos, com DDI 55, no formato que o `wa.me` espera. */
export function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export function buildBillingMessage(
  customer: Customer,
  cycle: Cycle,
  totalBalanceCents: number
) {
  const monthName = cycle.label.split(" de ")[0];
  const firstName = customer.name.trim().split(/\s+/)[0];
  const previousCents = totalBalanceCents - cycle.openCents;

  const lines = [
    `Olá, ${firstName}! Segue o resumo da sua ficha em ${monthName}.`,
    "",
    `Dias com consumo: ${cycle.daysWithConsumption}`,
    `Consumo no mês: ${formatCurrency(cycle.fichaCents)}`,
  ];

  if (cycle.paymentsCents > 0) {
    lines.push(`Pagamentos recebidos: ${formatCurrency(cycle.paymentsCents)}`);
  }

  lines.push("", `Total de ${monthName}: ${formatCurrency(cycle.openCents)}`);

  if (previousCents > 0) {
    lines.push(
      `Saldo de meses anteriores: ${formatCurrency(previousCents)}`,
      `Total em aberto: ${formatCurrency(totalBalanceCents)}`
    );
  } else if (previousCents < 0) {
    lines.push(`Crédito a seu favor: ${formatCurrency(Math.abs(previousCents))}`);
  }

  lines.push("", "Qualquer dúvida é só chamar. Obrigado pela preferência!");

  return lines.join("\n");
}

export function buildWhatsappUrl(
  customer: Customer,
  cycle: Cycle,
  totalBalanceCents: number
) {
  const number = whatsappNumber(customer.phone);
  if (!number) return null;
  const text = buildBillingMessage(customer, cycle, totalBalanceCents);
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/** A prévia impressa do ciclo, reaproveitando as rotas de impressão já prontas. */
export function buildPreviewUrl(customerId: string, cycle: Cycle) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const startDate = `${cycle.year}-${pad(cycle.month + 1)}-01`;
  const endDate = `${cycle.year}-${pad(cycle.month + 1)}-${pad(cycle.daysInMonth)}`;

  const params = new URLSearchParams({
    customerId,
    startDate,
    endDate,
    showDebtBalance: "true",
    showPeriodBalance: "true",
    showPaymentsTotal: "true",
  });

  return `/print/customer-report?${params.toString()}`;
}
