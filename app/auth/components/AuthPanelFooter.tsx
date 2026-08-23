"use client";

import type { VersionStatusResponse } from "@/lib/version-metadata";
import * as React from "react";

/**
 * Rodapé do painel de login, com a mesma anatomia do DialogFooter do sistema:
 * borda superior de 2px sobre superfície cinza.
 */
export function AuthPanelFooter() {
  const [version, setVersion] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    fetch("/api/version")
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error(String(response.status)))
      )
      .then((data: VersionStatusResponse) => {
        if (!cancelled) {
          setVersion(data.version);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVersion(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex shrink-0 items-center justify-between border-t-2 border-[color:var(--border)] bg-[color:var(--auth-footer-bg)] px-8 py-3.5 text-xs text-[color:var(--auth-fg-subtle)] sm:px-11">
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
        Sistema online
      </span>
      {version ? <span className="font-mono tabular-nums">v{version}</span> : null}
    </div>
  );
}
