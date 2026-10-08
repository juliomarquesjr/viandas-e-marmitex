// Navegador: ouve um canal do Ably pelo canal de eventos nativo (EventSource), sem biblioteca.
// Serve à área do cliente e ao painel do admin; cada um passa a sua rota de token.
//
// O token só deixa ouvir o canal que a rota escolheu e vale 1 hora. A conexão pede outro antes de
// vencer e, se cair, tenta de novo com espera crescente. Sem chave no servidor (a rota responde
// 204) ou sem sessão (401/403), não conecta e quem chamou segue só com o polling.

const ABLY_EVENT_STREAM = 'https://realtime.ably.io/event-stream';
/** Pede outro token um pouco antes de o atual vencer. */
const RENEW_MARGIN_MS = 5 * 60 * 1000;
const RETRY_MIN_MS = 5_000;
const RETRY_MAX_MS = 60_000;

interface TokenResponse {
  token: string;
  expires: number;
  channel: string;
}

export interface EventStreamOptions {
  /** Rota do servidor que emite o token do canal. */
  tokenUrl: string;
  /** Chega o nome de cada evento publicado no canal. */
  onEvent: (name: string) => void;
  /** Avisa quando a conexão abre ou cai (as telas ajustam o polling). */
  onConnectedChange?: (connected: boolean) => void;
}

/** Abre a conexão e devolve a função que a encerra. */
export function openEventStream({ tokenUrl, onEvent, onConnectedChange }: EventStreamOptions): () => void {
  let stopped = false;
  let source: EventSource | null = null;
  let timer: number | undefined;
  let retryMs = RETRY_MIN_MS;

  const disconnect = () => {
    source?.close();
    source = null;
    window.clearTimeout(timer);
  };

  const retryLater = () => {
    timer = window.setTimeout(connect, retryMs);
    retryMs = Math.min(retryMs * 2, RETRY_MAX_MS);
  };

  const connect = async () => {
    disconnect();
    try {
      const response = await fetch(tokenUrl, { cache: 'no-store' });
      // Sem chave (204) ou sem permissão: sem tempo real, e não adianta tentar de novo
      if (response.status === 204 || response.status === 401 || response.status === 403) return;
      if (!response.ok) throw new Error(`token ${response.status}`);
      const { token, expires, channel } = (await response.json()) as TokenResponse;
      if (stopped) return;

      const url = `${ABLY_EVENT_STREAM}?${new URLSearchParams({ channels: channel, v: '1.2', accessToken: token })}`;
      const es = new EventSource(url);
      source = es;

      es.onopen = () => {
        retryMs = RETRY_MIN_MS;
        onConnectedChange?.(true);
      };
      es.onmessage = (message) => {
        try {
          const name = (JSON.parse(message.data) as { name?: string }).name;
          if (name) onEvent(name);
        } catch {
          // mensagem que não é nossa: ignora
        }
      };
      // Token vencido ou rede caída: fecha, avisa (a tela volta ao polling rápido) e tenta de novo
      es.onerror = () => {
        onConnectedChange?.(false);
        disconnect();
        if (!stopped) retryLater();
      };

      // Renova antes de o token vencer
      timer = window.setTimeout(connect, Math.max(RETRY_MIN_MS, expires - Date.now() - RENEW_MARGIN_MS));
    } catch {
      if (!stopped) retryLater();
    }
  };

  void connect();

  return () => {
    stopped = true;
    disconnect();
    onConnectedChange?.(false);
  };
}
