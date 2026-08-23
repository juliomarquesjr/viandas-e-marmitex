"use client";

import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";
import * as React from "react";
import { STAGE_META, STATUS_OF_STAGE, selectableStages, type PreOrderStage } from "../lib/preOrderView";

interface StagePickerProps {
  stage: PreOrderStage;
  disabled?: boolean;
  onChange: (status: string) => void;
}

/**
 * O chip de etapa vira o controle da etapa. O botão de ação do rodapé cobre o
 * caminho normal — daqui dá para ir para qualquer ponto, inclusive voltar um
 * pedido para a fila ou marcar direto como entregue.
 */
export function StagePicker({ stage, disabled, onChange }: StagePickerProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const meta = STAGE_META[stage];
  const options = selectableStages();
  const closed = STATUS_OF_STAGE[stage] === null;

  React.useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>("[data-current='true'], button")?.focus();
  }, [open]);

  const close = React.useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  if (closed) {
    return (
      <span
        className="inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[13px] font-bold"
        style={{ background: "var(--st-bg)", color: "var(--st-fg)" }}
      >
        <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
        {meta.label}
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Etapa: ${meta.label}. Alterar`}
        onClick={() => setOpen((value) => !value)}
        style={{ background: "var(--st-bg)", color: "var(--st-fg)" }}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-full pl-3.5 pr-2.5 text-[13px] font-bold transition-opacity",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2",
          "hover:opacity-85 disabled:opacity-50",
        )}
      >
        <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
        {meta.label}
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            role="menu"
            aria-label="Mudar etapa"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                close();
              }
            }}
            className="absolute left-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] py-1 shadow-dropdown"
          >
            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[color:var(--muted-foreground-strong)]">
              Mudar etapa
            </p>
            {options.map((option) => {
              const optionMeta = STAGE_META[option];
              const Icon = optionMeta.icon;
              const current = option === stage;

              return (
                <button
                  key={option}
                  type="button"
                  role="menuitemradio"
                  aria-checked={current}
                  data-current={current}
                  onClick={() => {
                    setOpen(false);
                    if (!current) onChange(STATUS_OF_STAGE[option] as string);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors",
                    "hover:bg-[color:var(--muted)] focus-visible:bg-[color:var(--muted)] focus-visible:outline-none",
                    current ? "font-semibold text-[color:var(--foreground)]" : "text-[color:var(--foreground)]",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-6 w-6 flex-none items-center justify-center rounded-md"
                    style={{
                      background: `var(--state-${optionMeta.token}-bg)`,
                      color: `var(--state-${optionMeta.token}-fg)`,
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1">{optionMeta.label}</span>
                  {current && <Check className="h-4 w-4 flex-none text-[color:var(--primary)]" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
