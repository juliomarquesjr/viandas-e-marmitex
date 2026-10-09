"use client";

import { useSyncExternalStore } from "react";

/** Mesmo corte do customer.css: a partir de 860 px o app usa o trilho lateral e painéis lado a lado. */
const DESKTOP_QUERY = "(min-width: 860px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false
  );
}
