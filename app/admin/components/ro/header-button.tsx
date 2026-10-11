"use client";

import { ChefHat } from "lucide-react";
import { useSession } from "next-auth/react";

import { cn } from "@/lib/utils";
import { RO_ABRIR, useRoConfig } from "./use-ro-config";

/** Botão da RO para o cabeçalho (admin e PDV). Só aparece para administrador, com a RO ligada e a posição "No cabeçalho". */
export function RoHeaderButton({ className }: { className?: string }) {
  const { data: session } = useSession();
  const config = useRoConfig();
  if ((session?.user as { role?: string } | undefined)?.role !== "admin") return null;
  if (!config || !config.ligada || config.posicao !== "cabecalho") return null;
  return (
    <button
      type="button"
      data-ro-botao
      onClick={() => window.dispatchEvent(new Event(RO_ABRIR))}
      title="Perguntar à RO"
      aria-label="Abrir a RO, assistente do sistema"
      className={cn(
        "relative flex h-11 w-11 items-center md:h-9 md:w-9 justify-center rounded-lg text-[color:var(--muted-foreground)] transition-all duration-200 hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)] focus:outline-none focus:ring-2 focus:ring-primary/20",
        className,
      )}
    >
      <ChefHat className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
