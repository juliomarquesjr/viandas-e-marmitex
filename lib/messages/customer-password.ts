// Senha de acesso do cliente: gerar, gravar e avisar o cliente (servidor).

import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { MIN_PASSWORD_LENGTH } from '@/lib/customer-password-reset';
import { isMessageChannel, MESSAGE_CHANNELS, type MessageChannel } from './registry';
import { generatePassword } from './password';
import { channelReadiness, customerChannels, sendCustomerMessage, type ChannelReadiness, type ChannelResult, type CustomerContact } from './service';
import { maskEmail, maskPhone } from './render';

const TYPE = 'customer_password';

export const parseChannels = (value: unknown): MessageChannel[] =>
  Array.isArray(value) ? MESSAGE_CHANNELS.filter((c) => value.includes(c) && isMessageChannel(c)) : [];

export async function loadContact(id: string): Promise<CustomerContact | null> {
  return prisma.customer.findUnique({ where: { id }, select: { id: true, name: true, email: true, phone: true, phoneIsWhatsapp: true } });
}

export interface ChannelOption extends ChannelReadiness {
  /** O cliente tem este contato? (WhatsApp: telefone marcado como WhatsApp) */
  has: boolean;
  /** Destino mascarado, para mostrar ao administrador. */
  to: string | null;
}

/** Para a janela de envio: o que o cliente tem e o que está funcionando agora. */
export async function passwordOptions(customer: CustomerContact): Promise<Record<MessageChannel, ChannelOption>> {
  const destinations = customerChannels(customer);
  const out = {} as Record<MessageChannel, ChannelOption>;
  for (const channel of MESSAGE_CHANNELS) {
    const to = destinations[channel];
    const readiness = to ? await channelReadiness(TYPE, channel) : { ready: false, reason: null, fixHref: null };
    out[channel] = { ...readiness, has: Boolean(to), to: !to ? null : channel === 'whatsapp' ? maskPhone(to) : maskEmail(to) };
  }
  return out;
}

/** Gera a senha, grava (com troca obrigatória no primeiro acesso) e devolve em texto, só desta vez. */
export async function createAndStorePassword(customerId: string, requireChange = true): Promise<string> {
  const password = generatePassword();
  await prisma.customer.update({ where: { id: customerId }, data: { password: await bcrypt.hash(password, 10), mustChangePassword: requireChange } });
  return password;
}

/** Reenvio: só aceita a senha que já está gravada (a mesma que foi mostrada ao administrador). */
export async function matchesStoredPassword(customerId: string, password: string): Promise<boolean> {
  if (password.length < MIN_PASSWORD_LENGTH) return false;
  const row = await prisma.customer.findUnique({ where: { id: customerId }, select: { password: true } });
  return Boolean(row?.password && (await bcrypt.compare(password, row.password)));
}

export async function sendPasswordMessage(customer: CustomerContact, password: string, channels: MessageChannel[]): Promise<ChannelResult[]> {
  if (channels.length === 0) return [];
  return sendCustomerMessage({ typeKey: TYPE, customer, channels, values: { senha: password } });
}
