// Busca a foto de perfil do WhatsApp de um cliente (servidor). Nada é gravado no banco nem em arquivo:
// a foto fica só na memória do servidor por algumas horas, para a tela de conversas não pedir à Evolution a cada abertura.

import prisma from '@/lib/prisma';
import { EvolutionError, fetchProfilePictureUrl, instanceName } from '@/lib/evolution';
import { AVATAR_MAX_BYTES, AVATAR_TTL_ERROR_MS, AVATAR_TTL_HIT_MS, AVATAR_TTL_MISS_MS, avatarContentType, isAllowedAvatarUrl } from '@/lib/whatsapp-avatar';
import { normalizeBrazilNumber } from '@/lib/whatsapp-rules';

export interface AvatarFile {
  data: Buffer;
  contentType: string;
}

interface Entry {
  until: number;
  file: AvatarFile | null;
}

const MAX_ENTRIES = 300;
const MAX_PARALLEL = 4;
const FETCH_TIMEOUT_MS = 8000;
const cache = new Map<string, Entry>();
const inFlight = new Map<string, Promise<AvatarFile | null>>();
let running = 0;
const waiting: (() => void)[] = [];

function remember(customerId: string, file: AvatarFile | null, ttl: number) {
  const now = Date.now();
  for (const [key, entry] of cache) if (entry.until <= now) cache.delete(key);
  while (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
  cache.set(customerId, { until: now + ttl, file });
}

/** No máximo poucas buscas ao mesmo tempo: a lista de conversas pede várias fotos juntas. */
async function limited<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((resolve) => waiting.push(resolve));
  running += 1;
  try {
    return await task();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
}

async function download(url: string): Promise<AvatarFile | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'error', cache: 'no-store' });
    if (!res.ok) return null;
    const contentType = avatarContentType(res.headers.get('content-type'));
    if (!contentType) return null;
    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared > AVATAR_MAX_BYTES) return null;
    const data = Buffer.from(await res.arrayBuffer());
    return data.length > 0 && data.length <= AVATAR_MAX_BYTES ? { data, contentType } : null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolve(customerId: string): Promise<AvatarFile | null> {
  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { phone: true, phoneIsWhatsapp: true } });
  if (!customer) return null;
  // o número da última mensagem é o que o WhatsApp realmente usa; o cadastro vale se ainda não houve conversa
  const last = await prisma.whatsAppMessage.findFirst({ where: { customerId }, orderBy: { createdAt: 'desc' }, select: { number: true } });
  const number = last?.number ?? (customer.phoneIsWhatsapp ? normalizeBrazilNumber(customer.phone) : null);
  if (!number) {
    remember(customerId, null, AVATAR_TTL_MISS_MS);
    return null;
  }
  try {
    const url = await fetchProfilePictureUrl(instanceName(), number);
    if (!url || !isAllowedAvatarUrl(url)) {
      remember(customerId, null, AVATAR_TTL_MISS_MS);
      return null;
    }
    const file = await download(url);
    remember(customerId, file, file ? AVATAR_TTL_HIT_MS : AVATAR_TTL_MISS_MS);
    return file;
  } catch (error) {
    // Evolution fora do ar ou sem configuração: não guarda por muito tempo
    if (!(error instanceof EvolutionError)) console.error('whatsapp avatar:', error instanceof Error ? error.name : 'erro');
    remember(customerId, null, AVATAR_TTL_ERROR_MS);
    return null;
  }
}

/** A foto de perfil do WhatsApp do cliente, ou null se ele não tem (ou escondeu) a foto. */
export async function loadAvatar(customerId: string): Promise<AvatarFile | null> {
  const hit = cache.get(customerId);
  if (hit && hit.until > Date.now()) return hit.file;
  const pending = inFlight.get(customerId);
  if (pending) return pending;
  const task = limited(() => resolve(customerId)).finally(() => inFlight.delete(customerId));
  inFlight.set(customerId, task);
  return task;
}
