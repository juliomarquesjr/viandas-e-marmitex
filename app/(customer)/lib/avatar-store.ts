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
  /** O administrador gerou a senha: o cliente precisa trocá-la no primeiro acesso. */
  mustChangePassword: boolean;
}

let state: AvatarState = { imageUrl: undefined, mustChangePassword: false };
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
const SERVER_STATE: AvatarState = { imageUrl: undefined, mustChangePassword: false };

const getSnapshot = () => state;
const getServerSnapshot = () => SERVER_STATE;

/** Busca a foto uma vez por visita; chamadas repetidas aproveitam a mesma busca. */
export function loadCustomerAvatar(force = false): Promise<void> {
  if (!force && state.imageUrl !== undefined) return Promise.resolve();
  if (inflight) return inflight;

  inflight = fetch("/api/customer/profile", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .then((profile: { imageUrl?: string | null; mustChangePassword?: boolean } | null) => {
      if (profile) emit({ imageUrl: profile.imageUrl ?? null, mustChangePassword: profile.mustChangePassword === true });
    })
    .catch(() => undefined)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Atualiza a foto em todas as telas (depois de enviar ou remover). */
export function setCustomerAvatar(imageUrl: string | null) {
  emit({ ...state, imageUrl });
}

/** Depois que o cliente troca a senha, libera as outras telas. */
export function setMustChangePassword(mustChangePassword: boolean) {
  emit({ ...state, mustChangePassword });
}

/** Esquece o que sabe, para a próxima conta que entrar não ver a foto da anterior. */
export function resetCustomerAvatar() {
  state = { imageUrl: undefined, mustChangePassword: false };
  inflight = null;
  listeners.forEach((listener) => listener());
}

export function useCustomerAvatar(): { imageUrl: string | null | undefined; loaded: boolean; mustChangePassword: boolean } {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    void loadCustomerAvatar();
  }, []);

  return { imageUrl: snapshot.imageUrl, loaded: snapshot.imageUrl !== undefined, mustChangePassword: snapshot.mustChangePassword };
}
