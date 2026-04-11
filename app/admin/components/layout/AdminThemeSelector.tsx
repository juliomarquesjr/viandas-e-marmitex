"use client";

import * as React from "react";
import { Moon, Palette, RotateCcw, Sun } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { cn } from "@/lib/utils";
import { ADMIN_THEME_ACCENTS, useAdminTheme, type AdminThemeMode } from "./AdminThemeProvider";

const MODE_OPTIONS: Array<{ id: AdminThemeMode; label: string; icon: typeof Sun }> = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
];

export function AdminThemeSelector() {
  const { preferences, setAccent, setMode, resetPreferences } = useAdminTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200",
            "hover:bg-[color:var(--muted)] focus:outline-none focus:ring-2 focus:ring-primary/20",
            "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
          )}
          title="Aparencia"
          aria-label="Abrir seletor de aparencia"
        >
          <Palette className="h-5 w-5" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 rounded-xl border-[color:var(--border)] p-0 shadow-lg">
        <div className="border-b border-[color:var(--border)] px-4 py-3">
          <p className="text-sm font-semibold text-[color:var(--foreground)]">Aparencia do admin</p>
          <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
            Ajuste a cor principal e o modo visual desta sessao.
          </p>
        </div>

        <div className="space-y-5 px-4 py-4">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                Modo
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {MODE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = preferences.mode === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setMode(option.id)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)] hover:bg-[color:var(--muted)]"
                    )}
                    aria-pressed={selected}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
              Cor principal
            </span>

            <div className="grid grid-cols-5 gap-2">
              {ADMIN_THEME_ACCENTS.map((accent) => {
                const selected = preferences.accent === accent.id;

                return (
                  <button
                    key={accent.id}
                    type="button"
                    onClick={() => setAccent(accent.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-2 transition-all duration-200",
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-[color:var(--border)] hover:bg-[color:var(--muted)]"
                    )}
                    aria-label={`Selecionar cor ${accent.label}`}
                    aria-pressed={selected}
                    title={accent.label}
                  >
                    <span
                      className={cn(
                        "h-8 w-8 rounded-full border-2 shadow-sm transition-transform duration-200",
                        selected ? "scale-105 border-white" : "border-white/70"
                      )}
                      style={{ backgroundColor: accent.primary }}
                    />
                    <span className="text-[11px] font-medium text-[color:var(--foreground)]">
                      {accent.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between border-t border-[color:var(--border)] px-4 py-3">
          <p className="text-xs text-[color:var(--muted-foreground)]">
            As escolhas ficam salvas apenas nesta sessao.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetPreferences}
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            Restaurar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
