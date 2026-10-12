// Envio do fechamento da ficha (PDF) e do link de pagamento pelo WhatsApp e pelo e-mail (servidor).
//
// O PDF é montado no navegador do administrador, que o vê na prévia antes de enviar: é exatamente esse arquivo
// que chega ao cliente. Aqui ficam as regras: quem pode receber, o texto, o link de pagamento e o envio.

import { getCustomerBalance } from '@/lib/customer-balance';
import { paymentLinkFor } from '@/lib/payment-link';
import { ensureFresh } from '@/lib/whatsapp-service';
import { describeBalance } from './ficha-text';
import { maskEmail, maskPhone } from './render';
import {
  channelReadiness,
  composeCustomerMessage,
  customerChannels,
  sendCustomerMessage,
  type ChannelResult,
  type CustomerContact,
  type MessageAttachment,
} from './service';
import { MESSAGE_CHANNELS, type MessageChannel } from './registry';

export const CUSTOMER_CLOSING = 'customer_closing';
export const CUSTOMER_PAYMENT_LINK = 'customer_payment_link';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Maior PDF aceito (já decodificado): o corpo do pedido na hospedagem passa de 4 MB com o base64. */
export const PDF_MAX_BYTES = 3_300_000;
const MAX_PERIOD_DAYS = 800;

export interface ClosingPeriod {
  startDate: string;
  endDate: string;
}

function realDay(value: string): Date | null {
  if (!DAY.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
}

/** Datas "AAAA-MM-DD" que existem, em ordem e num intervalo que cabe num fechamento. */
export function parsePeriod(start: unknown, end: unknown): ClosingPeriod | null {
  if (typeof start !== 'string' || typeof end !== 'string') return null;
  const a = realDay(start);
  const b = realDay(end);
  if (!a || !b || a > b) return null;
  if ((b.getTime() - a.getTime()) / 86_400_000 > MAX_PERIOD_DAYS) return null;
  return { startDate: start, endDate: end };
}

const br = (day: string) => day.split('-').reverse().join('/');

/** "01/09/2026 a 30/09/2026" */
export function periodLabel(period: ClosingPeriod): string {
  return `${br(period.startDate)} a ${br(period.endDate)}`;
}

/** O bloco do link de pagamento que entra na mensagem do fechamento. */
export function paymentBlock(link: string): string {
  return `💸 *Pague pelo PIX*, direto do seu celular, sem precisar entrar na conta:\n${link}`;
}

export interface ChannelOption {
  /** O cliente tem este canal cadastrado (WhatsApp marcado, e-mail preenchido). */
  available: boolean;
  /** Destino já mascarado. */
  recipient: string | null;
  /** O canal do estabelecimento está funcionando e o modelo ligado. */
  ready: boolean;
  /** Por que não dá para enviar (cliente sem o canal ou canal fora do ar). */
  reason: string | null;
  fixHref: string | null;
}

async function channelOption(typeKey: string, channel: MessageChannel, customer: CustomerContact): Promise<ChannelOption> {
  const to = customerChannels(customer)[channel];
  const recipient = !to ? null : channel === 'whatsapp' ? maskPhone(to) : maskEmail(to);
  if (!to) {
    return { available: false, recipient, ready: false, reason: channel === 'whatsapp' ? 'O cliente não tem um WhatsApp cadastrado.' : 'O cliente não tem e-mail cadastrado.', fixHref: null };
  }
  const readiness = await channelReadiness(typeKey, channel);
  return { available: true, recipient, ready: readiness.ready, reason: readiness.reason, fixHref: readiness.fixHref };
}

async function balanceInfo(customerId: string, includeLink: boolean) {
  const { balanceCents } = await getCustomerBalance(customerId);
  const text = describeBalance(balanceCents);
  const link = includeLink && balanceCents > 0 ? paymentLinkFor(customerId) : null;
  return { balanceCents, kind: text.kind, text, link };
}

const closingValues = (period: ClosingPeriod, info: Awaited<ReturnType<typeof balanceInfo>>) => ({
  periodo: periodLabel(period),
  saldo: info.text.value,
  situacao: info.text.sentence,
  pagamento: info.link ? paymentBlock(info.link) : '',
});

export interface ClosingPrepared {
  balanceCents: number;
  kind: 'owes' | 'credit' | 'even';
  /** O link que iria na mensagem (só quando há saldo a pagar e o administrador escolheu incluir). */
  paymentLink: string | null;
  channels: Record<MessageChannel, ChannelOption>;
  /** O texto exato que o cliente recebe em cada canal. */
  preview: { whatsapp: string | null; email: { subject: string; body: string } | null };
}

/** O que a janela de envio precisa: quem pode receber, em que condições e o texto de cada canal. */
export async function prepareClosing(customer: CustomerContact, period: ClosingPeriod, includeLink: boolean): Promise<ClosingPrepared> {
  await ensureFresh();
  const info = await balanceInfo(customer.id, includeLink);
  const values = closingValues(period, info);
  const [whatsapp, email] = await Promise.all(MESSAGE_CHANNELS.map((c) => channelOption(CUSTOMER_CLOSING, c, customer)));
  const compose = (channel: MessageChannel) => composeCustomerMessage(CUSTOMER_CLOSING, channel, customer, values);
  return {
    balanceCents: info.balanceCents,
    kind: info.kind,
    paymentLink: info.link,
    channels: { whatsapp, email },
    preview: {
      whatsapp: whatsapp.available ? (await compose('whatsapp')).body : null,
      email: email.available ? await compose('email') : null,
    },
  };
}

export type SendValidation = { ok: true; bytes: number } | { ok: false; status: 400 | 413; error: string };

/** Confere que o que veio é mesmo um PDF e que cabe no envio. */
export function validatePdfBase64(value: unknown): SendValidation {
  if (typeof value !== 'string' || value.length === 0) return { ok: false, status: 400, error: 'O PDF não chegou. Gere a prévia de novo.' };
  if (value.length > Math.ceil((PDF_MAX_BYTES * 4) / 3) + 8) {
    return { ok: false, status: 413, error: 'O PDF ficou grande demais para enviar. Use um período menor.' };
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return { ok: false, status: 400, error: 'O arquivo do PDF veio com defeito. Gere a prévia de novo.' };
  const bytes = Buffer.from(value, 'base64');
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') return { ok: false, status: 400, error: 'O arquivo enviado não é um PDF.' };
  if (bytes.length > PDF_MAX_BYTES) return { ok: false, status: 413, error: 'O PDF ficou grande demais para enviar. Use um período menor.' };
  return { ok: true, bytes: bytes.length };
}

/** Nome do arquivo, sem acento nem símbolo: "fechamento-maria-souza-2026-09-01-2026-09-30.pdf" */
export function closingFileName(customerName: string, period: ClosingPeriod): string {
  const slug = customerName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `fechamento-${slug || 'cliente'}-${period.startDate}-${period.endDate}.pdf`;
}

export interface SendClosingInput {
  period: ClosingPeriod;
  channels: MessageChannel[];
  includeLink: boolean;
  pdfBase64: string;
}

/** Envia o PDF do fechamento pelos canais escolhidos. Um canal que falha não impede o outro. */
export async function sendClosing(customer: CustomerContact, input: SendClosingInput): Promise<ChannelResult[]> {
  const info = await balanceInfo(customer.id, input.includeLink);
  const attachment: MessageAttachment = { fileName: closingFileName(customer.name, input.period), mimetype: 'application/pdf', base64: input.pdfBase64 };
  return sendCustomerMessage({ typeKey: CUSTOMER_CLOSING, customer, channels: input.channels, values: closingValues(input.period, info), attachment });
}

// ---------- link de pagamento sozinho ----------

export interface PaymentLinkPrepared {
  balanceCents: number;
  /** Só existe quando há saldo a pagar. */
  link: string | null;
  channels: Record<MessageChannel, ChannelOption>;
  preview: { whatsapp: string | null; email: { subject: string; body: string } | null };
}

const linkValues = (info: Awaited<ReturnType<typeof balanceInfo>>) => ({ saldo: info.text.value, link_pagamento: info.link ?? '' });

export async function preparePaymentLink(customer: CustomerContact): Promise<PaymentLinkPrepared> {
  await ensureFresh();
  const info = await balanceInfo(customer.id, true);
  const [whatsapp, email] = await Promise.all(MESSAGE_CHANNELS.map((c) => channelOption(CUSTOMER_PAYMENT_LINK, c, customer)));
  const compose = (channel: MessageChannel) => composeCustomerMessage(CUSTOMER_PAYMENT_LINK, channel, customer, linkValues(info));
  return {
    balanceCents: info.balanceCents,
    link: info.link,
    channels: { whatsapp, email },
    preview: {
      whatsapp: info.link && whatsapp.available ? (await compose('whatsapp')).body : null,
      email: info.link && email.available ? await compose('email') : null,
    },
  };
}

export type SendLinkOutcome = { status: 'sent'; results: ChannelResult[] } | { status: 'nothing_to_pay'; reason: string };

export async function sendPaymentLink(customer: CustomerContact, channels: MessageChannel[]): Promise<SendLinkOutcome> {
  const info = await balanceInfo(customer.id, true);
  if (!info.link) return { status: 'nothing_to_pay', reason: 'A ficha deste cliente não tem saldo a pagar.' };
  const results = await sendCustomerMessage({ typeKey: CUSTOMER_PAYMENT_LINK, customer, channels, values: linkValues(info) });
  return { status: 'sent', results };
}
