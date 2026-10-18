"use client";

import { cn } from "@/lib/utils";
import { MessageCircle } from "lucide-react";

interface CustomerNoticeSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  customerName?: string | null;
  className?: string;
}

/**
 * "Avisar o cliente pelo WhatsApp": a pergunta que o operador responde por pedido. Só é mostrada
 * quando o cliente tem WhatsApp cadastrado; os textos de cada etapa ficam em WhatsApp → Mensagens.
 */
export function CustomerNoticeSwitch({ checked, onChange, disabled, customerName, className }: CustomerNoticeSwitchProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2.5", className)}>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[color:var(--foreground)]">
          <MessageCircle className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
          Avisar o cliente pelo WhatsApp
        </p>
        <p className="mt-0.5 text-[11.5px] leading-snug text-[color:var(--muted-foreground)]">
          {checked
            ? `${customerName?.trim() || "O cliente"} recebe uma mensagem a cada etapa do pedido.`
            : "Desligado: o cliente só acompanha pelo aplicativo."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="Avisar o cliente pelo WhatsApp a cada etapa do pedido"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 flex-none rounded-full transition-colors before:absolute before:-inset-x-1 before:-inset-y-2.5 before:content-['']",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 disabled:opacity-50",
          checked ? "bg-primary" : "bg-slate-400 dark:bg-slate-500",
        )}
      >
        <span
          className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")}
        />
      </button>
    </div>
  );
}
