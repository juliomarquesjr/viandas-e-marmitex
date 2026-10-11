"use client";

import { useCallback, useEffect, useState } from "react";
import type { RoPosicao } from "@/lib/ai/ro/settings-tipos";

export interface RoConfigTela {
  ligada: boolean;
  posicao: RoPosicao;
}

/** Evento que qualquer botão da RO (cabeçalho do admin ou do PDV) dispara para abrir a gaveta. */
export const RO_ABRIR = "ro-abrir";

/** Lê as configurações da RO e relê quando a tela de configurações muda algo. Só o administrador consegue ler (os outros ficam com "desligada"). */
export function useRoConfig(): RoConfigTela | null {
  const [config, setConfig] = useState<RoConfigTela | null>(null);
  const ler = useCallback(() => {
    fetch("/api/admin/ro/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((c: { ligada?: boolean; posicao?: RoPosicao } | null) => {
        if (c) setConfig({ ligada: c.ligada !== false, posicao: c.posicao === "cabecalho" || c.posicao === "nenhum" ? c.posicao : "flutuante" });
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    ler();
    window.addEventListener("ro-settings-changed", ler);
    return () => window.removeEventListener("ro-settings-changed", ler);
  }, [ler]);
  return config;
}
