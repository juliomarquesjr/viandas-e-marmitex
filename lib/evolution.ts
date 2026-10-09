// Cliente da Evolution API v2 (só servidor: a chave nunca vai para o navegador).
//
// Variáveis: EVOLUTION_API_URL (endereço público, ex.: https://whatsapp.exemplo.com.br) e
// EVOLUTION_API_KEY (a chave global). A instância do estabelecimento é WHATSAPP_INSTANCE
// (padrão "sabores-de-casa"; no ambiente de desenvolvimento use outro nome para não pegar a de produção).

import { mapEvolutionState, numberFromJid, type WhatsAppState } from './whatsapp-rules';

export type EvolutionErrorCode = 'not_configured' | 'unreachable' | 'unauthorized' | 'not_found' | 'bad_request' | 'server';

export class EvolutionError extends Error {
  constructor(
    public code: EvolutionErrorCode,
    message: string,
    public status = 0
  ) {
    super(message);
    this.name = 'EvolutionError';
  }
}

const TIMEOUT_MS = 15_000;

function settings() {
  const url = process.env.EVOLUTION_API_URL?.trim().replace(/\/+$/, '');
  const key = process.env.EVOLUTION_API_KEY?.trim();
  return url && key ? { url, key } : null;
}

export const isEvolutionConfigured = () => settings() !== null;

export const instanceName = () => process.env.WHATSAPP_INSTANCE?.trim() || 'sabores-de-casa';

async function request<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const cfg = settings();
  if (!cfg) throw new EvolutionError('not_configured', 'A Evolution API não está configurada neste ambiente.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.url}${path}`, {
      method,
      headers: { apikey: cfg.key, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      const detail = (json as { response?: { message?: unknown }; message?: unknown } | null) ?? {};
      const raw = detail.response?.message ?? detail.message;
      const message = Array.isArray(raw) ? raw.join(', ') : typeof raw === 'string' ? raw : `Erro ${res.status} da Evolution API.`;
      if (res.status === 401 || res.status === 403) throw new EvolutionError('unauthorized', 'A chave da Evolution API foi recusada.', res.status);
      if (res.status === 404) throw new EvolutionError('not_found', message, res.status);
      if (res.status >= 500) throw new EvolutionError('server', message, res.status);
      throw new EvolutionError('bad_request', message, res.status);
    }
    return json as T;
  } catch (error) {
    if (error instanceof EvolutionError) throw error;
    throw new EvolutionError('unreachable', 'Não deu para falar com a Evolution API agora.');
  } finally {
    clearTimeout(timer);
  }
}

export interface EvolutionInstance {
  name: string;
  state: WhatsAppState;
  number: string | null;
  profileName: string | null;
  profilePicUrl: string | null;
}

interface RawInstance {
  name?: string;
  connectionStatus?: string;
  ownerJid?: string | null;
  number?: string | null;
  profileName?: string | null;
  profilePicUrl?: string | null;
}

/** A instância e o perfil do número conectado; `null` se ela ainda não existe. */
export async function findInstance(name: string): Promise<EvolutionInstance | null> {
  const list = await request<RawInstance[] | null>('GET', `/instance/fetchInstances?instanceName=${encodeURIComponent(name)}`).catch((e) => {
    if (e instanceof EvolutionError && e.code === 'not_found') return null;
    throw e;
  });
  const raw = Array.isArray(list) ? list.find((i) => i.name === name) : null;
  if (!raw) return null;
  return {
    name,
    state: mapEvolutionState(raw.connectionStatus),
    number: numberFromJid(raw.ownerJid) ?? (raw.number ? raw.number.replace(/\D/g, '') || null : null),
    profileName: raw.profileName ?? null,
    profilePicUrl: raw.profilePicUrl ?? null,
  };
}

export async function connectionState(name: string): Promise<WhatsAppState> {
  const res = await request<{ instance?: { state?: string } }>('GET', `/instance/connectionState/${encodeURIComponent(name)}`);
  return mapEvolutionState(res?.instance?.state);
}

export interface QrResult {
  /** Imagem do QR code, pronta para <img src>. */
  qr: string | null;
  /** Código de 8 letras para parear sem QR (só quando se informa o número). */
  pairingCode: string | null;
}

const asDataUrl = (base64: unknown) =>
  typeof base64 === 'string' && base64 ? (base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`) : null;

export async function createInstance(name: string): Promise<QrResult> {
  const res = await request<{ qrcode?: { base64?: string; pairingCode?: string | null } }>('POST', '/instance/create', {
    instanceName: name,
    integration: 'WHATSAPP-BAILEYS',
    qrcode: true,
  });
  return { qr: asDataUrl(res?.qrcode?.base64), pairingCode: res?.qrcode?.pairingCode ?? null };
}

/** Novo QR code (ou código de pareamento, se `number` vier com DDI+DDD). */
export async function connectInstance(name: string, number?: string): Promise<QrResult> {
  const query = number ? `?number=${encodeURIComponent(number)}` : '';
  const res = await request<{ base64?: string; pairingCode?: string | null }>('GET', `/instance/connect/${encodeURIComponent(name)}${query}`);
  return { qr: asDataUrl(res?.base64), pairingCode: res?.pairingCode ?? null };
}

export async function logoutInstance(name: string): Promise<void> {
  await request('DELETE', `/instance/logout/${encodeURIComponent(name)}`);
}

export async function setWebhook(name: string, url: string, secret: string): Promise<void> {
  await request('POST', `/webhook/set/${encodeURIComponent(name)}`, {
    webhook: {
      enabled: true,
      url,
      webhookByEvents: false,
      webhookBase64: false,
      headers: { 'x-webhook-secret': secret },
      events: ['CONNECTION_UPDATE'],
    },
  });
}

export async function sendText(name: string, number: string, text: string): Promise<void> {
  await request('POST', `/message/sendText/${encodeURIComponent(name)}`, { number, text });
}
