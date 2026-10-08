"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * A foto do cliente, em um lugar só. O cabeçalho, o menu lateral e o Perfil leem daqui, então
 * trocar ou remover a foto atualiza todos ao mesmo tempo, sem recarregar nada.
 *
 * `undefined` quer dizer "ainda não sei" (a busca está em andamento); `null`, "não tem foto".
 */
interface AvatarState {
  imageUrl: string | null | undefined;
}

let state: AvatarState = { imageUrl: undefined };
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit(next: AvatarState) {
  state = next;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// O React compara o resultado entre chamadas: o valor do servidor precisa ser sempre o mesmo objeto
const SERVER_STATE: AvatarState = { imageUrl: undefined };

const getSnapshot = () => state;
const getServerSnapshot = () => SERVER_STATE;

/** Busca a foto uma vez por visita; chamadas repetidas aproveitam a mesma busca. */
export function loadCustomerAvatar(force = false): Promise<void> {
  if (!force && state.imageUrl !== undefined) return Promise.resolve();
  if (inflight) return inflight;

  inflight = fetch("/api/customer/profile", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((profile: { imageUrl?: string | null } | null) => {
      if (profile) emit({ imageUrl: profile.imageUrl ?? null });
    })
    .catch(() => undefined)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Atualiza a foto em todas as telas (depois de enviar ou remover). */
export function setCustomerAvatar(imageUrl: string | null) {
  emit({ imageUrl });
}

/** Esquece o que sabe, para a próxima conta que entrar não ver a foto da anterior. */
export function resetCustomerAvatar() {
  state = { imageUrl: undefined };
  inflight = null;
  listeners.forEach((listener) => listener());
}

export function useCustomerAvatar(): { imageUrl: string | null | undefined; loaded: boolean } {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    void loadCustomerAvatar();
  }, []);

  return { imageUrl: snapshot.imageUrl, loaded: snapshot.imageUrl !== undefined };
}
