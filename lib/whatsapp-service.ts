// O WhatsApp do estabelecimento: um número só, conectado pelo administrador.
//
// Estado guardado em SystemConfig (categoria "whatsapp"). A conexão é verificada de três jeitos:
// a Evolution avisa por webhook quando muda; qualquer tela do admin aberta confere de vez em quando
// (`ensureFresh`); e uma checagem diária (cron) pega o resto. Quando cai uma conexão que estava boa,
// o administrador recebe um aviso no sino.

import { createNotification, resolveNotificationsFor } from '@/lib/notifications';
import prisma from '@/lib/prisma';
import {
  connectInstance,
  connectionState,
  createInstance,
  EvolutionError,
  findInstance,
  instanceName,
  isEvolutionConfigured,
  logoutInstance,
  sendText,
  setWebhook,
  type QrResult,
} from './evolution';
import { formatPhoneBR, isStale, normalizeBrazilNumber, publicWebhookUrl, shouldAlertDisconnect, type WhatsAppState } from './whatsapp-rules';

const CATEGORY = 'whatsapp';
const KEYS = {
  state: 'whatsapp_state',
  checkedAt: 'whatsapp_checked_at',
  connectedAt: 'whatsapp_connected_at',
  disconnectedAt: 'whatsapp_disconnected_at',
  wanted: 'whatsapp_wanted',
  number: 'whatsapp_number',
} as const;

/** Com uma tela do admin aberta, confere a conexão se a última checagem tem mais que isso. */
const FRESH_MS = 5 * 60_000;
export const ALERT_REF_TYPE = 'WhatsApp';

async function readAll(): Promise<Record<string, string | null>> {
  const rows = await prisma.systemConfig.findMany({ where: { key: { in: Object.values(KEYS) } } });
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

async function write(values: Partial<Record<keyof typeof KEYS, string | null>>) {
  await Promise.all(
    (Object.entries(values) as [keyof typeof KEYS, string | null][]).map(([name, value]) =>
      prisma.systemConfig.upsert({
        where: { key: KEYS[name] },
        update: { value },
        create: { key: KEYS[name], value, type: 'text', category: CATEGORY },
      })
    )
  );
}

export interface WhatsAppStatus {
  /** A Evolution está configurada neste ambiente (endereço e chave)? */
  configured: boolean;
  instance: string;
  state: WhatsAppState;
  number: string | null;
  numberLabel: string;
  profileName: string | null;
  profilePicUrl: string | null;
  /** Quando o sistema conferiu pela última vez. */
  checkedAt: string | null;
  connectedAt: string | null;
  disconnectedAt: string | null;
  /** Aviso automático de queda ligado (o administrador conectou e não desconectou de propósito). */
  watching: boolean;
  /** A Evolution consegue avisar o sistema na hora (só existe com endereço público em https). */
  realtime: boolean;
  /** Se a Evolution não respondeu, o motivo em texto simples (o estado mostrado é o último conhecido). */
  error: string | null;
}

const appUrl = () => process.env.APP_PUBLIC_URL || process.env.NEXTAUTH_URL;

function describeError(error: unknown): string {
  if (error instanceof EvolutionError) {
    if (error.code === 'unauthorized') return 'A chave da Evolution API foi recusada. Confira EVOLUTION_API_KEY.';
    if (error.code === 'unreachable' || error.code === 'server') return 'A Evolution API não respondeu agora. Tente de novo em instantes.';
    return error.message;
  }
  return 'Algo deu errado ao falar com a Evolution API.';
}

/** Grava o que a Evolution informou e avisa o administrador se uma conexão boa caiu. */
export async function recordState(next: WhatsAppState, extra: { number?: string | null } = {}): Promise<void> {
  const saved = await readAll();
  const previous = (saved[KEYS.state] as WhatsAppState | null) ?? null;
  const now = new Date().toISOString();
  const patch: Partial<Record<keyof typeof KEYS, string | null>> = { state: next, checkedAt: now };

  if (next === 'open') {
    if (previous !== 'open') patch.connectedAt = now;
    patch.wanted = 'true';
    if (extra.number) patch.number = extra.number;
  } else if (previous === 'open' && (next === 'close' || next === 'connecting')) {
    patch.disconnectedAt = now;
  }
  await write(patch);

  if (next === 'open') {
    await resolveNotificationsFor(ALERT_REF_TYPE, 'instance').catch(() => undefined);
  } else if (shouldAlertDisconnect(previous, next, saved[KEYS.wanted] === 'true')) {
    const open = await prisma.notification.findFirst({ where: { refType: ALERT_REF_TYPE, refId: 'instance', resolvedAt: null }, select: { id: true } });
    if (!open) {
      await createNotification({
        type: 'whatsapp',
        title: 'WhatsApp desconectado',
        message: 'O número do estabelecimento saiu do ar. Reconecte em Configurações → WhatsApp para voltar a enviar mensagens.',
        refType: ALERT_REF_TYPE,
        refId: 'instance',
      });
    }
  }
}

/** Estado atual, perguntando à Evolution. Sem ela (ou com erro), devolve o último estado conhecido. */
export async function getStatus(): Promise<WhatsAppStatus> {
  const name = instanceName();
  const saved = await readAll();
  const base: WhatsAppStatus = {
    configured: isEvolutionConfigured(),
    instance: name,
    state: (saved[KEYS.state] as WhatsAppState | null) ?? 'unknown',
    number: saved[KEYS.number],
    numberLabel: formatPhoneBR(saved[KEYS.number]),
    profileName: null,
    profilePicUrl: null,
    checkedAt: saved[KEYS.checkedAt],
    connectedAt: saved[KEYS.connectedAt],
    disconnectedAt: saved[KEYS.disconnectedAt],
    watching: saved[KEYS.wanted] === 'true',
    realtime: publicWebhookUrl(appUrl()) !== null && Boolean(process.env.WHATSAPP_WEBHOOK_SECRET),
    error: null,
  };
  if (!base.configured) return base;

  try {
    const instance = await findInstance(name);
    if (!instance) {
      await recordState('not_created');
      return { ...base, state: 'not_created', checkedAt: new Date().toISOString() };
    }
    await recordState(instance.state, { number: instance.number });
    const number = instance.number ?? base.number;
    return {
      ...base,
      state: instance.state,
      number,
      numberLabel: formatPhoneBR(number),
      profileName: instance.profileName,
      profilePicUrl: instance.profilePicUrl,
      checkedAt: new Date().toISOString(),
      watching: instance.state === 'open' ? true : base.watching,
    };
  } catch (error) {
    return { ...base, error: describeError(error) };
  }
}

/** Para as telas do admin: confere a conexão só se a última checagem estiver velha. Nunca quebra quem chamou. */
export async function ensureFresh(): Promise<void> {
  if (!isEvolutionConfigured()) return;
  try {
    const saved = await readAll();
    if (saved[KEYS.wanted] !== 'true') return;
    if (!isStale(saved[KEYS.checkedAt], new Date(), FRESH_MS)) return;
    await recordState(await connectionState(instanceName()));
  } catch {
    // a Evolution fora do ar não pode derrubar a tela que pediu a checagem
  }
}

export interface ConnectResult extends QrResult {
  state: WhatsAppState;
}

/** Começa (ou retoma) a conexão: garante a instância e o webhook e devolve um QR code novo. */
export async function startConnection(options: { phone?: string } = {}): Promise<ConnectResult> {
  const name = instanceName();
  const number = options.phone ? normalizeBrazilNumber(options.phone) : null;
  if (options.phone && !number) throw new EvolutionError('bad_request', 'Informe o telefone com DDD, por exemplo (62) 99999-8888.');

  let instance = await findInstance(name);
  let qr: QrResult | null = null;
  if (!instance) {
    qr = await createInstance(name);
    instance = await findInstance(name);
  }
  if (instance?.state === 'open') {
    await recordState('open', { number: instance.number });
    return { state: 'open', qr: null, pairingCode: null };
  }

  const hook = publicWebhookUrl(appUrl());
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (hook && secret) await setWebhook(name, hook, secret).catch(() => undefined);

  // O QR que veio junto da criação ainda vale; sem ele (ou para o código de pareamento) pede outro
  const fresh = !qr || number ? await connectInstance(name, number ?? undefined) : qr;
  await recordState('connecting');
  return { state: 'connecting', qr: fresh.qr, pairingCode: fresh.pairingCode };
}

/** Desconecta de propósito: o aviso automático de queda fica desligado até conectar de novo. */
export async function disconnect(): Promise<void> {
  const name = instanceName();
  try {
    await logoutInstance(name);
  } catch (error) {
    // já estava desconectado ou a instância nem existe: o resultado é o mesmo
    if (!(error instanceof EvolutionError) || (error.code !== 'not_found' && error.code !== 'bad_request')) throw error;
  }
  await write({ state: 'close', wanted: 'false', disconnectedAt: new Date().toISOString(), checkedAt: new Date().toISOString() });
  await resolveNotificationsFor(ALERT_REF_TYPE, 'instance').catch(() => undefined);
}

/** Manda uma mensagem de teste para o próprio número conectado, para provar que o envio funciona. */
export async function sendTestMessage(): Promise<{ number: string }> {
  const instance = await findInstance(instanceName());
  if (!instance || instance.state !== 'open' || !instance.number) {
    throw new EvolutionError('bad_request', 'O WhatsApp não está conectado.');
  }
  await sendText(instance.name, instance.number, '✅ Teste de conexão do Sabores de Casa: o WhatsApp do estabelecimento está funcionando.');
  return { number: instance.number };
}

/**
 * Envio de mensagem para um cliente (base para os recursos futuros). Só envia com o WhatsApp conectado;
 * o telefone é normalizado. Lança erro se não puder enviar: quem chama decide o que fazer.
 */
export async function sendWhatsAppText(phone: string, text: string): Promise<string | null> {
  const number = normalizeBrazilNumber(phone);
  if (!number) throw new EvolutionError('bad_request', 'Telefone inválido.');
  const state = await connectionState(instanceName());
  if (state !== 'open') throw new EvolutionError('bad_request', 'O WhatsApp do estabelecimento não está conectado.');
  return sendText(instanceName(), number, text);
}

export { describeError as describeWhatsAppError };
