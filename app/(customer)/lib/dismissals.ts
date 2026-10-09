/**
 * O que o cliente dispensou (avisos do sino e cartões de pagamento) é guardado no servidor, para
 * valer em todos os aparelhos e sobreviver à limpeza do armazenamento do navegador. Aqui fica a
 * ida até lá: o que ainda não chegou espera numa fila local e é reenviado a cada busca de avisos.
 */

const URL = "/api/customer/dismissals";
const QUEUE_KEY = "customer:dismissals-unsynced";
const BACKFILL_KEY = "customer:dismissals-backfilled";
const QUEUE_MAX = 300;
const BATCH = 100;

function readQueue(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

function writeQueue(keys: string[]) {
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(keys.slice(-QUEUE_MAX)));
  } catch {
    /* sem armazenamento: o envio acontece agora ou não acontece */
  }
}

let flushing: Promise<void> | null = null;

/** Envia o que está na fila. Se falhar (sem rede, tabela ainda não criada), tenta de novo na próxima. */
export function flushDismissals(): Promise<void> {
  if (flushing) return flushing;
  const queue = readQueue();
  if (queue.length === 0) return Promise.resolve();
  flushing = (async () => {
    let rest = queue;
    while (rest.length > 0) {
      const batch = rest.slice(0, BATCH);
      const response = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: batch }),
        cache: "no-store",
      });
      if (!response.ok) return;
      rest = rest.slice(BATCH);
      // o que chegou sai da fila; o que entrou enquanto isso continua nela
      const sent = new Set(batch);
      writeQueue(readQueue().filter((key) => !sent.has(key)));
    }
  })()
    .catch(() => undefined)
    .finally(() => {
      flushing = null;
    });
  return flushing;
}

/** O cliente dispensou: guarda na fila e manda para o servidor. */
export function syncDismissed(keys: string[]): void {
  if (keys.length === 0) return;
  writeQueue([...new Set([...readQueue(), ...keys])]);
  void flushDismissals();
}

/** O cliente desfez: tira da fila e pede ao servidor para esquecer. */
export function syncUndo(keys: string[]): Promise<void> {
  if (keys.length === 0) return Promise.resolve();
  const undone = new Set(keys);
  writeQueue(readQueue().filter((key) => !undone.has(key)));
  return fetch(URL, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keys }),
    cache: "no-store",
  })
    .then(() => undefined)
    .catch(() => undefined);
}

/**
 * Dispensas feitas antes desta mudança só existem no aparelho: sobe uma vez para o servidor.
 * `scope` separa quem já subiu o quê (avisos e cartões usam o mesmo mecanismo).
 */
export function backfillOnce(scope: string, keys: string[]): void {
  try {
    const done = window.localStorage.getItem(`${BACKFILL_KEY}:${scope}`);
    if (done) return;
    window.localStorage.setItem(`${BACKFILL_KEY}:${scope}`, "1");
  } catch {
    return;
  }
  syncDismissed(keys);
}
