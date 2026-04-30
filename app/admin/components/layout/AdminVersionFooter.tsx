"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { VersionStatusResponse } from "@/lib/version-metadata";

/**
 * Rodapé da área admin: versão real do ambiente (GET /api/version).
 */
export function AdminVersionFooter({ collapsed }: { collapsed?: boolean }) {
  const [data, setData] = React.useState<VersionStatusResponse | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/version")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json: VersionStatusResponse) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) {
          setData({
            app: "—",
            version: "—",
            commitSha: "unknown",
            buildTime: "unknown",
            environment: "dev",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shortSha =
    data?.commitSha &&
    data.commitSha !== "unknown" &&
    data.commitSha.length > 7
      ? data.commitSha.slice(0, 7)
      : data?.commitSha !== "unknown" && data?.commitSha
        ? data.commitSha
        : null;

  const title = data
    ? `Build: ${data.buildTime}\nAmbiente: ${data.environment}${data.commitSha !== "unknown" ? `\nCommit: ${data.commitSha}` : ""}`
    : undefined;

  const versionLabel = data?.version ?? "…";

  if (collapsed) {
    return (
      <div
        className="text-center text-xs text-[color:var(--muted-foreground)] font-mono tabular-nums"
        title={title}
      >
        {versionLabel}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "text-center text-xs text-[color:var(--muted-foreground)]",
        "flex flex-col gap-0.5 items-center"
      )}
      title={title}
    >
      <div>
        <span className="font-medium">Comida Caseira</span>
        <span className="mx-1">•</span>
        <span className="tabular-nums">{versionLabel}</span>
        {shortSha ? (
          <>
            <span className="mx-1">•</span>
            <span className="font-mono">{shortSha}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
