"use client";

import * as React from "react";

/** O "agora" que se atualiza sozinho (a cada minuto por padrão), para o "há X min" não ficar parado. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);

  return now;
}
