// Conversas do WhatsApp com os clientes (servidor): guarda o que a Evolution avisa e o que o sistema envia,
// e responde às telas (lista, conversa, não lidas). Só clientes cadastrados com WhatsApp marcado.

import prisma from '@/lib/prisma';
import { instanceName, isEvolutionConfigured, setWebhook } from '@/lib/evolution';
import { publishToStaff } from '@/lib/realtime';
import { sendWhatsAppText } from '@/lib/whatsapp-service';
import { normalizeBrazilNumber, publicWebhookUrl } from '@/lib/whatsapp-rules';
import { sameBrazilNumber, type ChatMessageType, type ChatStatus, type ParsedMessage } from '@/lib/whatsapp-chat';

const RETENTION_DAYS = 180;
const WEBHOOK_VERSION = 'chat1';
const WEBHOOK_KEY = 'whatsapp_webhook_events';

export interface MessageRow {
  id: string;
  fromMe: boolean;
  type: string;
  body: string | null;
  systemType: string | null;
  status: string;
  error: string | null;
  sentByName: string | null;
  createdAt: string;
}

const toRow = (m: {
  id: string; fromMe: boolean; type: string; body: string | null; systemType: string | null; status: string; error: string | null; sentByName: string | null; createdAt: Date;
}): MessageRow => ({ ...m, createdAt: m.createdAt.toISOString() });

/** Cliente ativo cujo telefone (marcado como WhatsApp) é este número. */
export async function matchCustomer(number: string): Promise<{ id: string; name: string } | null> {
  const tail = number.replace(/\D/g, '').slice(-8);
  if (tail.length < 8) return null;
  const rows = await prisma.$queryRaw<{ id: string; name: string; phone: string }[]>`
    SELECT "id", "name", "phone" FROM "Customer"
    WHERE "active" = true AND "phoneIsWhatsapp" = true AND regexp_replace("phone", '\\D', '', 'g') LIKE ${'%' + tail}`;
  const hit = rows.find((r) => sameBrazilNumber(r.phone, number));
  return hit ? { id: hit.id, name: hit.name } : null;
}

export interface NewMessage {
  externalId?: string | null;
  customerId: string;
  number: string;
  fromMe: boolean;
  type?: ChatMessageType | string;
  body?: string | null;
  systemType?: string | null;
  status?: ChatStatus;
  error?: string | null;
  sentByName?: string | null;
  at?: Date;
}

/** Grava (ou completa, se o mesmo id já chegou por outro caminho) uma mensagem da conversa. */
export async function recordMessage(input: NewMessage) {
  const data = {
    customerId: input.customerId,
    number: input.number,
    fromMe: input.fromMe,
    type: input.type ?? 'text',
    body: input.body ?? null,
    systemType: input.systemType ?? null,
    status: input.status ?? 'sent',
    error: input.error ?? null,
    sentByName: input.sentByName ?? null,
    createdAt: input.at ?? new Date(),
    // o que o estabelecimento mesmo enviou já nasce "visto"
    readAt: input.fromMe ? (input.at ?? new Date()) : null,
  };
  if (input.externalId) {
    return prisma.whatsAppMessage.upsert({
      where: { externalId: input.externalId },
      // o aviso do webhook chega junto do envio do sistema: o que o sistema já sabe (quem enviou, tipo) prevalece
      update: { ...(input.systemType ? { systemType: input.systemType, body: data.body } : {}), ...(input.sentByName ? { sentByName: input.sentByName } : {}) },
      create: { ...data, externalId: input.externalId },
    });
  }
  return prisma.whatsAppMessage.create({ data });
}

/** Mensagem que chegou pelo webhook: guarda se for de um cliente cadastrado. */
export async function handleWebhookMessage(parsed: ParsedMessage): Promise<boolean> {
  const customer = await matchCustomer(parsed.number);
  if (!customer) return false;
  await recordMessage({ externalId: parsed.externalId, customerId: customer.id, number: parsed.number, fromMe: parsed.fromMe, type: parsed.type, body: parsed.body, at: parsed.at });
  if (!parsed.fromMe) void publishToStaff('notification.changed'); // o sino e as telas buscam de novo
  if (Math.random() < 0.02) void pruneOld();
  return true;
}

export async function applyStatus(externalId: string, status: ChatStatus) {
  // só avança (enviada → entregue → lida); "falhou" vale sempre
  const order: Record<ChatStatus, number> = { failed: 0, sent: 1, delivered: 2, read: 3 };
  const row = await prisma.whatsAppMessage.findUnique({ where: { externalId }, select: { status: true, fromMe: true } });
  if (!row || !row.fromMe) return;
  if (status !== 'failed' && order[status] <= (order[row.status as ChatStatus] ?? 1)) return;
  await prisma.whatsAppMessage.update({ where: { externalId }, data: { status } });
}

export async function pruneOld() {
  await prisma.whatsAppMessage.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - RETENTION_DAYS * 86_400_000) } } });
}

/** Na primeira vez (ou depois de uma versão nova), manda a Evolution avisar também as mensagens. */
export async function ensureChatWebhook(): Promise<void> {
  if (!isEvolutionConfigured()) return;
  try {
    const done = await prisma.systemConfig.findUnique({ where: { key: WEBHOOK_KEY } });
    if (done?.value === WEBHOOK_VERSION) return;
    const hook = publicWebhookUrl(process.env.APP_PUBLIC_URL || process.env.NEXTAUTH_URL);
    const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (!hook || !secret) return; // sem endereço público (ex.: computador local) não há como receber
    await setWebhook(instanceName(), hook, secret);
    await prisma.systemConfig.upsert({
      where: { key: WEBHOOK_KEY },
      update: { value: WEBHOOK_VERSION },
      create: { key: WEBHOOK_KEY, value: WEBHOOK_VERSION, type: 'text', category: 'whatsapp' },
    });
  } catch (error) {
    console.error('ensureChatWebhook:', error);
  }
}

export interface ConversationItem {
  customerId: string;
  name: string;
  phone: string | null;
  lastType: string;
  lastBody: string | null;
  lastFromMe: boolean;
  lastSystemType: string | null;
  lastAt: string;
  unread: number;
}

/** Conversas (uma por cliente), da mais recente para a mais antiga. */
export async function listConversations(opts: { q?: string; filter?: 'all' | 'unread' | 'awaiting' } = {}): Promise<ConversationItem[]> {
  const last = await prisma.$queryRaw<
    { customerId: string; body: string | null; type: string; fromMe: boolean; systemType: string | null; createdAt: Date }[]
  >`SELECT DISTINCT ON ("customerId") "customerId", "body", "type", "fromMe", "systemType", "createdAt"
    FROM "WhatsAppMessage" WHERE "customerId" IS NOT NULL ORDER BY "customerId", "createdAt" DESC`;
  if (last.length === 0) return [];
  const ids = last.map((l) => l.customerId);
  const [customers, unread] = await Promise.all([
    prisma.customer.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, phone: true } }),
    prisma.whatsAppMessage.groupBy({ by: ['customerId'], where: { customerId: { in: ids }, fromMe: false, readAt: null }, _count: { _all: true } }),
  ]);
  const byId = new Map(customers.map((c) => [c.id, c]));
  const unreadBy = new Map(unread.map((u) => [u.customerId as string, u._count._all]));

  let matches: Set<string> | null = null;
  const q = opts.q?.trim();
  if (q) {
    const digits = q.replace(/\D/g, '');
    const found = await prisma.whatsAppMessage.findMany({ where: { customerId: { in: ids }, body: { contains: q, mode: 'insensitive' } }, select: { customerId: true }, distinct: ['customerId'], take: 200 });
    matches = new Set(found.map((f) => f.customerId as string));
    for (const c of customers) {
      if (c.name.toLowerCase().includes(q.toLowerCase()) || (digits.length >= 3 && (c.phone ?? '').replace(/\D/g, '').includes(digits))) matches.add(c.id);
    }
  }

  return last
    .filter((l) => byId.has(l.customerId))
    .map<ConversationItem>((l) => {
      const c = byId.get(l.customerId)!;
      return {
        customerId: l.customerId,
        name: c.name,
        phone: c.phone,
        lastType: l.type,
        lastBody: l.body,
        lastFromMe: l.fromMe,
        lastSystemType: l.systemType,
        lastAt: l.createdAt.toISOString(),
        unread: unreadBy.get(l.customerId) ?? 0,
      };
    })
    .filter((c) => (!matches || matches.has(c.customerId)) && (opts.filter === 'unread' ? c.unread > 0 : opts.filter === 'awaiting' ? !c.lastFromMe : true))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
    .slice(0, 200);
}

export async function unreadTotal(): Promise<number> {
  const rows = await prisma.whatsAppMessage.findMany({ where: { fromMe: false, readAt: null, customerId: { not: null } }, distinct: ['customerId'], select: { customerId: true } });
  return rows.length; // conversas com mensagem nova (o número do menu)
}

const PAGE = 40;

/** As últimas mensagens da conversa em ordem de leitura (antigas primeiro); `before` traz as anteriores. */
export async function getThread(customerId: string, before?: Date) {
  const rows = await prisma.whatsAppMessage.findMany({
    where: { customerId, ...(before ? { createdAt: { lt: before } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: PAGE + 1,
  });
  const more = rows.length > PAGE;
  return { messages: rows.slice(0, PAGE).reverse().map(toRow), more };
}

export async function markConversationRead(customerId: string) {
  await prisma.whatsAppMessage.updateMany({ where: { customerId, fromMe: false, readAt: null }, data: { readAt: new Date() } });
}

/** O administrador escreve pelo sistema: envia e grava na conversa. */
export async function sendChatMessage(customer: { id: string; name: string; phone: string | null; phoneIsWhatsapp: boolean }, text: string, sentByName: string) {
  const number = customer.phoneIsWhatsapp && customer.phone ? normalizeBrazilNumber(customer.phone) : null;
  if (!number) throw new Error('Este cliente não tem WhatsApp marcado.');
  const externalId = await sendWhatsAppText(number, text);
  return toRow(await recordMessage({ externalId, customerId: customer.id, number, fromMe: true, body: text, sentByName }));
}
