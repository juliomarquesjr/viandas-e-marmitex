"use client";

import * as React from "react";

export type AuthThemeMode = "light" | "dark";

export const AUTH_THEME_STORAGE_KEY = "auth:theme";

/** Tema de partida quando o usuário ainda não escolheu nenhum. */
export const DEFAULT_AUTH_THEME_MODE: AuthThemeMode = "light";

interface AuthThemeContextValue {
  mode: AuthThemeMode;
  setMode: (mode: AuthThemeMode) => void;
  toggleMode: () => void;
}

const AuthThemeContext = React.createContext<AuthThemeContextValue | undefined>(undefined);

function isThemeMode(value: unknown): value is AuthThemeMode {
  return value === "light" || value === "dark";
}

/**
 * Roda antes da primeira pintura e escreve o tema em <html>. Fica no layout raiz
 * porque a splash (`/` e `/redirect`) também usa o escopo; sozinho o atributo não
 * muda nada — só vale onde existe um `[data-auth-theme-scope]`.
 *
 * Sem escolha salva o tema é claro, independente do tema do sistema operacional:
 * o escuro é opt-in pelo botão.
 */
export const AUTH_THEME_BOOTSTRAP_SCRIPT = `(function(){try{var m=window.localStorage.getItem(${JSON.stringify(
  AUTH_THEME_STORAGE_KEY
)});if(m!=="light"&&m!=="dark"){m=${JSON.stringify(
  DEFAULT_AUTH_THEME_MODE
)};}document.documentElement.setAttribute("data-auth-theme",m);}catch(e){}})();`;

function resolveInitialMode(): AuthThemeMode {
  if (typeof window === "undefined") {
    return DEFAULT_AUTH_THEME_MODE;
  }

  const fromRoot = document.documentElement.getAttribute("data-auth-theme");

  if (isThemeMode(fromRoot)) {
    return fromRoot;
  }

  try {
    const stored = window.localStorage.getItem(AUTH_THEME_STORAGE_KEY);

    if (isThemeMode(stored)) {
      return stored;
    }
  } catch {
    // Sem armazenamento: segue com o padrão.
  }

  return DEFAULT_AUTH_THEME_MODE;
}

export function AuthThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<AuthThemeMode>(DEFAULT_AUTH_THEME_MODE);

  React.useLayoutEffect(() => {
    const initialMode = resolveInitialMode();

    document.documentElement.setAttribute("data-auth-theme", initialMode);
    setModeState(initialMode);
  }, []);

  const setMode = React.useCallback((nextMode: AuthThemeMode) => {
    setModeState(nextMode);
    document.documentElement.setAttribute("data-auth-theme", nextMode);

    try {
      window.localStorage.setItem(AUTH_THEME_STORAGE_KEY, nextMode);
    } catch {
      // A escolha vale para esta sessão mesmo sem conseguir persistir.
    }
  }, []);

  const toggleMode = React.useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  const value = React.useMemo<AuthThemeContextValue>(
    () => ({ mode, setMode, toggleMode }),
    [mode, setMode, toggleMode]
  );

  return (
    <AuthThemeContext.Provider value={value}>
      <div
        data-auth-theme-scope=""
        className="min-h-screen bg-background text-foreground transition-colors duration-200"
      >
        {children}
      </div>
    </AuthThemeContext.Provider>
  );
}

export function useAuthTheme() {
  const context = React.useContext(AuthThemeContext);

  if (!context) {
    throw new Error("useAuthTheme precisa estar dentro de um AuthThemeProvider");
  }

  return context;
}
