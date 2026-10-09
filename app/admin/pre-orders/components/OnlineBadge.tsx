"use client";

import { cn } from "@/lib/utils";
import { Clock, Globe } from "lucide-react";
import { formatElapsed, isExpiredAwaiting, type PreOrder } from "../lib/preOrderView";

/** Marca os pedidos que o cliente fez pela área dele, em qualquer etapa. */
export function OnlineBadge({ className }: { className?: string }) {
  return (
    <span
      title="Pedido feito pelo cliente, pela área dele"
      className={cn(
        "inline-flex flex-none items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold leading-none",
        className,
      )}
      style={{ background: "var(--state-producao-bg)", color: "var(--state-producao-fg)" }}
    >
      <Globe className="h-3 w-3" aria-hidden="true" />
      Online
    </span>
  );
}

/**
 * "há 7 min" de espera e, passado o prazo, o selo "Expirado". Quem usa passa o
 * `now` da tela (atualizado a cada minuto), então não há relógio próprio aqui.
 */
export function AwaitingWait({
  preOrder,
  now,
  className,
}: {
  preOrder: Pick<PreOrder, "source" | "approval" | "createdAt">;
  now: Date;
  className?: string;
}) {
  const expired = isExpiredAwaiting(preOrder, now);

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className="inline-flex items-center gap-1 text-[11.5px] font-bold tabular-nums"
        style={{ color: "var(--state-pronto-fg)" }}
      >
        <Clock className="h-3 w-3" aria-hidden="true" />
        {formatElapsed(preOrder.createdAt, now) ?? "agora"}
      </span>
      {expired && (
        <span
          title="Passou do prazo de resposta: só dá para recusar"
          className="rounded-full px-2 py-0.5 text-[11px] font-bold leading-none"
          style={{ background: "var(--state-cobrar-bg)", color: "var(--state-cobrar-fg)" }}
        >
          Expirado
        </span>
      )}
    </span>
  );
}
