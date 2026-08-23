"use client";

import { AuthThemeProvider } from "@/app/components/AuthThemeProvider";
import { BrandBackdrop } from "@/app/components/BrandBackdrop";
import { Button } from "@/app/components/ui/button";
import type { VersionStatusResponse } from "@/lib/version-metadata";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Tempo mínimo em tela. Não é progresso falso: só evita o piscar quando as duas
 * verificações respondem em poucas dezenas de milissegundos.
 */
const MIN_VISIBLE_MS = 900;

type StepStatus = "pending" | "done" | "failed";

interface BootSteps {
  server: StepStatus;
  session: StepStatus;
}

const INITIAL_STEPS: BootSteps = { server: "pending", session: "pending" };

function StepRow({ status, label }: { status: StepStatus; label: string }) {
  return (
    <div className="flex items-center gap-3">
      {status === "done" ? (
        <Check className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.4} />
      ) : status === "failed" ? (
        <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
      ) : (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
      )}
      <span
        className={
          status === "failed"
            ? "text-red-500"
            : status === "done"
              ? "text-[color:var(--muted-foreground)]"
              : "text-[color:var(--foreground)]"
        }
      >
        {label}
      </span>
    </div>
  );
}

function BootScreen() {
  const router = useRouter();
  const [steps, setSteps] = useState<BootSteps>(INITIAL_STEPS);
  const [version, setVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    const boot = async () => {
      setSteps(INITIAL_STEPS);
      setError(null);

      // 1. O servidor responde? /api/version é público e não depende de sessão.
      try {
        const versionResponse = await fetch("/api/version");

        if (!versionResponse.ok) {
          throw new Error(String(versionResponse.status));
        }

        const versionData: VersionStatusResponse = await versionResponse.json();

        if (cancelled) return;

        setVersion(versionData.version ?? null);
        setSteps((current) => ({ ...current, server: "done" }));
      } catch {
        if (cancelled) return;

        setSteps((current) => ({ ...current, server: "failed" }));
        setError("O servidor não respondeu. Verifique a conexão e tente de novo.");
        return;
      }

      // 2. Já existe sessão? É o que decide para onde ir.
      let destination = "/auth/login";

      try {
        const sessionResponse = await fetch("/api/auth/session");

        if (!sessionResponse.ok) {
          throw new Error(String(sessionResponse.status));
        }

        const sessionData = await sessionResponse.json();

        if (cancelled) return;

        if (sessionData?.user) {
          destination = sessionData.user.role === "pdv" ? "/pdv" : "/admin";
        }

        setSteps((current) => ({ ...current, session: "done" }));
      } catch {
        if (cancelled) return;

        setSteps((current) => ({ ...current, session: "failed" }));
        setError("Não foi possível verificar a sessão. Tente de novo.");
        return;
      }

      const remaining = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt));

      window.setTimeout(() => {
        if (!cancelled) {
          router.replace(destination);
        }
      }, remaining);
    };

    void boot();

    return () => {
      cancelled = true;
    };
  }, [attempt, router]);

  const completed = Object.values(steps).filter((status) => status === "done").length;
  const progress = (completed / 2) * 100;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <BrandBackdrop />

      <div className="relative z-10 w-full max-w-[452px]">
        <div className="flex items-center gap-3.5">
          <Image
            src="/img/icon.png"
            alt=""
            width={46}
            height={46}
            className="rounded-full"
            priority
          />
          <div className="flex flex-col gap-1">
            <span className="text-[17px] font-semibold tracking-tight text-[color:var(--foreground)]">
              Comida Caseira
            </span>
            <span className="font-mono text-[11.5px] uppercase tracking-[0.06em] text-[color:var(--auth-fg-subtle)]">
              {error ? "Falha ao iniciar" : "Iniciando"}
            </span>
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-3.5 font-mono text-[13px]">
          <StepRow status={steps.server} label="Conectando ao servidor" />
          <StepRow status={steps.session} label="Verificando sessão" />
        </div>

        <div className="mt-10 h-0.5 overflow-hidden bg-[color:var(--border)]">
          <div
            className={`h-full transition-[width] duration-500 ease-out ${
              error ? "bg-red-500" : "bg-primary"
            }`}
            style={{ width: `${error ? 100 : progress}%` }}
          />
        </div>

        <div className="mt-[18px] flex items-center justify-between font-mono text-[11.5px] text-[color:var(--auth-fg-subtle)]">
          <span>Comida Caseira</span>
          {version ? <span className="tabular-nums">v{version}</span> : null}
        </div>

        {error ? (
          <div className="mt-8 flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-[color:var(--muted-foreground)]">{error}</p>
            <Button
              type="button"
              className="h-12 w-full"
              onClick={() => setAttempt((current) => current + 1)}
            >
              Tentar novamente
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function RedirectPage() {
  return (
    <AuthThemeProvider>
      <BootScreen />
    </AuthThemeProvider>
  );
}
