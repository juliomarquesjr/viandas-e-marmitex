// Mensagens enviadas ao cliente: modelos editáveis, envio por WhatsApp/e-mail e histórico (servidor).
//
// O histórico guarda quem recebeu (mascarado), por qual canal e se deu certo. Nunca guarda o texto,
// porque ele pode conter senha ou link de acesso.

import prisma from '@/lib/prisma';
import { EmailService } from '@/lib/email';
import { isEvolutionConfigured } from '@/lib/evolution';
import { describeWhatsAppError, getStatus, sendWhatsAppText } from '@/lib/whatsapp-service';
import { recordMessage } from '@/lib/whatsapp-chat-service';
import { normalizeBrazilNumber } from '@/lib/whatsapp-rules';
import type { SystemConfig } from '@/lib/types';
import {
  CHANNEL_LABEL,
  getMessageType,
  MESSAGE_CHANNELS,
  MESSAGE_LIMITS,
  type MessageChannel,
  type MessageTypeDef,
} from './registry';
import { stripFormatting } from './format';
import { APP_URL_KEY, parseAppUrl } from './app-url';
import { emailBodyToHtml, maskEmail, maskPhone, renderTemplate, type TemplateInput } from './render';

const LOG_RETENTION_DAYS = 90;
const SIGNATURE_KEYS = { text: 'messages_signature', enabled: 'messages_signature_enabled' } as const;

export interface CustomerContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  phoneIsWhatsapp: boolean;
}

export interface StoredTemplate extends TemplateInput {
  /** false = ainda é o texto padrão do sistema. */
  customized: boolean;
}

/** Texto do canal: o que o administrador salvou ou, se nunca mexeu, o padrão. */
export async function loadTemplate(typeKey: string, channel: MessageChannel): Promise<StoredTemplate | null> {
  const type = getMessageType(typeKey);
  const fallback = type?.defaults[channel];
  if (!type || !fallback) return null;
  const row = await prisma.messageTemplate.findUnique({ where: { typeKey_channel: { typeKey, channel } } });
  if (!row) return { enabled: true, subject: fallback.subject ?? null, body: fallback.body, customized: false };
  return { enabled: type.alwaysOn ? true : row.enabled, subject: row.subject, body: row.body, customized: true };
}

export async function saveTemplate(typeKey: string, channel: MessageChannel, value: TemplateInput, userId: string | null) {
  await prisma.messageTemplate.upsert({
    where: { typeKey_channel: { typeKey, channel } },
    update: { enabled: value.enabled, subject: value.subject, body: value.body, updatedBy: userId },
    create: { typeKey, channel, enabled: value.enabled, subject: value.subject, body: value.body, updatedBy: userId },
  });
}

/** Volta ao texto padrão (apaga a versão do administrador). */
export async function resetTemplate(typeKey: string, channel: MessageChannel) {
  await prisma.messageTemplate.deleteMany({ where: { typeKey, channel } });
}

async function readConfigs(keys: string[]): Promise<Record<string, string | null>> {
  const rows = await prisma.systemConfig.findMany({ where: { key: { in: keys } } });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function storeName(): Promise<string> {
  const { branding_system_title } = await readConfigs(['branding_system_title']);
  return branding_system_title?.trim() || 'Sabores de Casa';
}

export async function getSignature(): Promise<{ text: string; enabled: boolean }> {
  const saved = await readConfigs(Object.values(SIGNATURE_KEYS));
  return { text: saved[SIGNATURE_KEYS.text] ?? '', enabled: saved[SIGNATURE_KEYS.enabled] === 'true' };
}

export async function saveSignature(text: string, enabled: boolean) {
  const clean = text.replace(/\r\n/g, '\n').trim().slice(0, MESSAGE_LIMITS.SIGNATURE);
  await Promise.all(
    [
      [SIGNATURE_KEYS.text, clean],
      [SIGNATURE_KEYS.enabled, String(enabled)],
    ].map(([key, value]) =>
      prisma.systemConfig.upsert({ where: { key }, update: { value }, create: { key, value, type: 'text', category: 'messages' } })
    )
  );
  return { text: clean, enabled };
}

/** Endereço dos links das mensagens: o de Configurações → Marca; em branco, o padrão do sistema. */
async function appUrl(): Promise<string> {
  const configured = (await readConfigs([APP_URL_KEY]))[APP_URL_KEY];
  const saved = configured ? parseAppUrl(configured) : null;
  return saved ?? (process.env.APP_PUBLIC_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

// ---------- prontidão dos canais ----------

export interface ChannelReadiness {
  ready: boolean;
  /** Por que não dá para enviar agora (mostrado ao administrador). */
  reason: string | null;
  /** Para onde levar o administrador para resolver. */
  fixHref: string | null;
}

const EMAIL_KEYS = ['email_enabled', 'email_smtp_host', 'email_smtp_user', 'email_smtp_password', 'email_from_address'];

async function emailReadiness(): Promise<ChannelReadiness> {
  const c = await readConfigs(EMAIL_KEYS);
  if (c.email_enabled !== 'true') return { ready: false, reason: 'O envio de e-mail está desligado nas configurações.', fixHref: '/admin/settings?tab=email' };
  if (!c.email_smtp_host || !c.email_smtp_user || !c.email_smtp_password || !c.email_from_address) {
    return { ready: false, reason: 'O e-mail do estabelecimento ainda não está configurado.', fixHref: '/admin/settings?tab=email' };
  }
  return { ready: true, reason: null, fixHref: null };
}

async function whatsappReadiness(): Promise<ChannelReadiness> {
  const fixHref = '/admin/settings?tab=whatsapp';
  if (!isEvolutionConfigured()) return { ready: false, reason: 'O WhatsApp não está configurado neste ambiente.', fixHref };
  const status = await getStatus();
  if (status.state === 'open') return { ready: true, reason: null, fixHref: null };
  if (status.error && status.state === 'unknown') return { ready: false, reason: 'Não foi possível confirmar a conexão do WhatsApp agora.', fixHref };
  return { ready: false, reason: 'O WhatsApp do estabelecimento está desconectado.', fixHref };
}

/** Pode enviar este tipo por este canal agora? (modelo ligado + canal configurado e funcionando) */
export async function channelReadiness(typeKey: string, channel: MessageChannel): Promise<ChannelReadiness> {
  const template = await loadTemplate(typeKey, channel);
  if (!template) return { ready: false, reason: 'Este tipo de mensagem não usa este canal.', fixHref: null };
  if (!template.enabled) {
    return { ready: false, reason: `O modelo de ${CHANNEL_LABEL[channel]} está desligado.`, fixHref: '/admin/whatsapp/mensagens' };
  }
  return channel === 'whatsapp' ? whatsappReadiness() : emailReadiness();
}

/** Quais canais o cliente tem como destino (independe de o canal estar funcionando). */
export function customerChannels(customer: Pick<CustomerContact, 'email' | 'phone' | 'phoneIsWhatsapp'>): Record<MessageChannel, string | null> {
  return {
    whatsapp: customer.phoneIsWhatsapp && customer.phone ? normalizeBrazilNumber(customer.phone) : null,
    email: customer.email?.trim() || null,
  };
}

// ---------- envio ----------

export interface ChannelResult {
  channel: MessageChannel;
  ok: boolean;
  /** Destino já mascarado. */
  recipient: string;
  error?: string;
  at: string;
}

async function composeText(type: MessageTypeDef, channel: MessageChannel, values: Record<string, string>) {
  const template = await loadTemplate(type.key, channel);
  if (!template) throw new Error('Este tipo de mensagem não usa este canal.');
  let body = renderTemplate(template.body, values);
  const signature = await getSignature();
  if (signature.enabled && signature.text) body = `${body}\n\n${signature.text}`;
  return { body, subject: template.subject ? renderTemplate(template.subject, values) : '' };
}

/** Envia pelo canal. No WhatsApp devolve o id e o texto, para a conversa do cliente. */
async function deliver(type: MessageTypeDef, channel: MessageChannel, to: string, values: Record<string, string>) {
  const { body, subject } = await composeText(type, channel, values);
  if (channel === 'whatsapp') {
    const externalId = await sendWhatsAppText(to, body);
    return { externalId, body };
  }
  const configs = (await prisma.systemConfig.findMany({ where: { category: 'email' } })) as SystemConfig[];
  const mailer = new EmailService();
  await mailer.configure(configs);
  await mailer.sendEmail({ to, subject, html: emailBodyToHtml(body, values.loja), text: stripFormatting(body) });
  return null;
}

function friendlyError(channel: MessageChannel, error: unknown): string {
  if (channel === 'whatsapp') return describeWhatsAppError(error);
  const message = error instanceof Error ? error.message : '';
  if (/desabilitado|incompleta|não configurado/i.test(message)) return message;
  return 'O servidor de e-mail não respondeu ou recusou a mensagem.';
}

/** Valores automáticos de toda mensagem ao cliente (nome, loja, usuário, endereço do app) mais os do tipo. */
export async function buildValues(customer: CustomerContact, extra: Record<string, string>): Promise<Record<string, string>> {
  return {
    nome: customer.name.trim().split(/\s+/)[0] || customer.name,
    loja: await storeName(),
    usuario: customer.email?.trim() || customer.phone?.replace(/\D/g, '') || '',
    link_app: await appUrl(), // com https://, para o WhatsApp deixar o link clicável
    ...extra,
  };
}

/** O texto exato que o cliente receberia por este canal (para a prévia antes de enviar). */
export async function previewCustomerMessage(typeKey: string, channel: MessageChannel, customer: CustomerContact, extra: Record<string, string>): Promise<string> {
  const type = getMessageType(typeKey);
  if (!type) throw new Error('Tipo de mensagem desconhecido.');
  return (await composeText(type, channel, await buildValues(customer, extra))).body;
}

export interface SendInput {
  typeKey: string;
  customer: CustomerContact;
  channels: MessageChannel[];
  /** Valores específicos do tipo (ex.: senha). Os automáticos (nome, loja, usuário, link) são preenchidos aqui. */
  values: Record<string, string>;
}

/** Envia pelos canais pedidos. Um canal que falha não impede o outro; cada resultado volta separado. */
export async function sendCustomerMessage(input: SendInput): Promise<ChannelResult[]> {
  const type = getMessageType(input.typeKey);
  if (!type) throw new Error('Tipo de mensagem desconhecido.');
  const destinations = customerChannels(input.customer);
  const values = await buildValues(input.customer, input.values);

  const results: ChannelResult[] = [];
  for (const channel of MESSAGE_CHANNELS.filter((c) => input.channels.includes(c))) {
    const to = destinations[channel];
    const at = new Date().toISOString();
    const recipient = !to ? '—' : channel === 'whatsapp' ? maskPhone(to) : maskEmail(to);
    let result: ChannelResult;
    if (!to) {
      result = { channel, ok: false, recipient, error: channel === 'whatsapp' ? 'O cliente não tem um WhatsApp cadastrado.' : 'O cliente não tem e-mail cadastrado.', at };
    } else {
      try {
        const ready = await channelReadiness(type.key, channel);
        if (!ready.ready) throw new Error(ready.reason ?? 'Canal indisponível.');
        const sent = await deliver(type, channel, to, values);
        result = { channel, ok: true, recipient, at };
        if (channel === 'whatsapp' && sent) {
          // entra na conversa do cliente; texto com dado sensível (senha, link) nunca é guardado
          const sensitive = type.variables.some((v) => v.sensitive);
          await recordMessage({ externalId: sent.externalId, customerId: input.customer.id, number: normalizeBrazilNumber(to) ?? to, fromMe: true, body: sensitive ? null : sent.body, systemType: type.key }).catch(() => undefined);
        }
      } catch (error) {
        result = { channel, ok: false, recipient, error: friendlyError(channel, error), at };
      }
    }
    results.push(result);
    await logMessage(type.key, input.customer, result);
  }
  return results;
}

async function logMessage(typeKey: string, customer: CustomerContact, result: ChannelResult) {
  try {
    await prisma.messageLog.create({
      data: {
        typeKey,
        channel: result.channel,
        customerId: customer.id,
        customerName: customer.name,
        recipient: result.recipient,
        status: result.ok ? 'sent' : 'failed',
        error: result.error ?? null,
      },
    });
    // limpeza oportunista: o histórico guarda só os últimos meses
    await prisma.messageLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - LOG_RETENTION_DAYS * 86_400_000) } } });
  } catch (error) {
    console.error('mensagens: falha ao gravar o histórico:', error);
  }
}

/** Registro de um envio feito fora do `sendCustomerMessage` (ex.: link de redefinição pelo "esqueci a senha"). */
export async function logExternalSend(typeKey: string, channel: MessageChannel, customer: CustomerContact, ok: boolean, error?: string) {
  const to = customerChannels(customer)[channel];
  await logMessage(typeKey, customer, {
    channel,
    ok,
    error,
    recipient: !to ? '—' : channel === 'whatsapp' ? maskPhone(to) : maskEmail(to),
    at: new Date().toISOString(),
  });
}

/** Teste: manda o modelo (com valores de exemplo) para o próprio administrador. Não entra no histórico. */
export async function sendTest(typeKey: string, channel: MessageChannel, adminEmail: string | null): Promise<{ recipient: string }> {
  const type = getMessageType(typeKey);
  if (!type) throw new Error('Tipo de mensagem desconhecido.');
  const ready = await channelReadiness(typeKey, channel);
  // o teste vale mesmo com o modelo desligado: só o canal precisa funcionar
  const channelOnly = channel === 'whatsapp' ? await whatsappReadiness() : await emailReadiness();
  if (!channelOnly.ready) throw new Error(channelOnly.reason ?? ready.reason ?? 'Canal indisponível.');

  const values = { ...Object.fromEntries(type.variables.map((v) => [v.key, v.sample])), loja: await storeName() };
  if (channel === 'whatsapp') {
    const status = await getStatus();
    if (!status.number) throw new Error('Não foi possível descobrir o número conectado.');
    await sendWhatsAppText(status.number, (await composeText(type, channel, values)).body);
    return { recipient: maskPhone(status.number) };
  }
  if (!adminEmail) throw new Error('Seu usuário não tem e-mail cadastrado para receber o teste.');
  const { body, subject } = await composeText(type, channel, values);
  const configs = (await prisma.systemConfig.findMany({ where: { category: 'email' } })) as SystemConfig[];
  const mailer = new EmailService();
  await mailer.configure(configs);
  await mailer.sendEmail({ to: adminEmail, subject: `[Teste] ${subject}`, html: emailBodyToHtml(body, values.loja), text: stripFormatting(body) });
  return { recipient: maskEmail(adminEmail) };
}
