"use client";

import { Moon, Sun } from "lucide-react";
import { useAuthTheme } from "@/app/components/AuthThemeProvider";

export function AuthThemeToggle() {
  const { mode, toggleMode } = useAuthTheme();
  const isDark = mode === "dark";

  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={isDark ? "Mudar para o tema claro" : "Mudar para o tema escuro"}
      title={isDark ? "Tema claro" : "Tema escuro"}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[color:var(--auth-tile-border)] bg-[color:var(--auth-tile-bg)] text-[color:var(--muted-foreground)] transition-colors duration-200 hover:text-[color:var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]"
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
