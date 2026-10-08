import * as Ably from 'ably';

// Tempo real da área do cliente (ver plans/tempo-real-area-cliente.md).
//
// O servidor só publica um sinal ("algo mudou") no Ably; o navegador do cliente ouve o canal dele
// e busca os dados de novo nas APIs de sempre. Nada sensível passa pelo Ably.
// Sem ABLY_API_KEY nada disso roda e a área do cliente segue só com o polling.

export type CustomerEvent = 'pre-order.updated' | 'ficha.updated' | 'payment-intent.reviewed';
/** Canal dos funcionários: o sino do admin se atualiza quando uma notificação nasce ou é resolvida. */
export type StaffEvent = 'notification.changed';

const PUBLISH_TIMEOUT_MS = 2000;

let client: Ably.Rest | null = null;

export function isRealtimeConfigured(): boolean {
  return Boolean(process.env.ABLY_API_KEY);
}

export function getRealtimeClient(): Ably.Rest | null {
  const key = process.env.ABLY_API_KEY;
  if (!key) return null;
  client ??= new Ably.Rest({ key });
  return client;
}

export const customerChannel = (customerId: string) => `customer:${customerId}`;
export const STAFF_NOTIFICATIONS_CHANNEL = 'staff:notifications';

async function publish(channel: string, event: string, data: Record<string, string>): Promise<void> {
  const rest = getRealtimeClient();
  if (!rest) return;

  try {
    await Promise.race([
      rest.channels.get(channel).publish(event, data),
      new Promise<void>((resolve) => setTimeout(resolve, PUBLISH_TIMEOUT_MS)),
    ]);
  } catch (error) {
    console.error('Realtime publish failed:', event, error);
  }
}

/**
 * Avisa o cliente que algo mudou. Chamar DEPOIS de gravar no banco.
 * Nunca lança erro e nunca demora mais que PUBLISH_TIMEOUT_MS: se falhar, o polling cobre.
 */
export async function publishToCustomer(
  customerId: string | null | undefined,
  event: CustomerEvent,
  data: Record<string, string> = {}
): Promise<void> {
  if (!customerId) return;
  await publish(customerChannel(customerId), event, data);
}

/** Avisa o painel dos funcionários (admin e PDV). Mesmas regras de publishToCustomer. */
export async function publishToStaff(event: StaffEvent, data: Record<string, string> = {}): Promise<void> {
  await publish(STAFF_NOTIFICATIONS_CHANNEL, event, data);
}
