"use client";

import * as React from "react";

export type AdminThemeMode = "light" | "dark";
export type AdminThemeAccent = "blue" | "emerald" | "amber" | "rose" | "violet";

export interface AdminThemePreferences {
  mode: AdminThemeMode;
  accent: AdminThemeAccent;
}

interface AdminThemeAccentOption {
  id: AdminThemeAccent;
  label: string;
  primary: string;
  hover: string;
  rgb: string;
}

interface AdminThemeContextValue {
  preferences: AdminThemePreferences;
  resolvedTheme: AdminThemePreferences & { accentOption: AdminThemeAccentOption };
  setMode: (mode: AdminThemeMode) => void;
  setAccent: (accent: AdminThemeAccent) => void;
  resetPreferences: () => void;
}

const STORAGE_KEY = "admin-theme-preferences";

const DEFAULT_PREFERENCES: AdminThemePreferences = {
  mode: "light",
  accent: "blue",
};

export const ADMIN_THEME_ACCENTS: AdminThemeAccentOption[] = [
  { id: "blue", label: "Azul", primary: "#2563eb", hover: "#1d4ed8", rgb: "37 99 235" },
  { id: "emerald", label: "Verde", primary: "#059669", hover: "#047857", rgb: "5 150 105" },
  { id: "amber", label: "Ambar", primary: "#d97706", hover: "#b45309", rgb: "217 119 6" },
  { id: "rose", label: "Rosa", primary: "#e11d48", hover: "#be123c", rgb: "225 29 72" },
  { id: "violet", label: "Violeta", primary: "#7c3aed", hover: "#6d28d9", rgb: "124 58 237" },
];

const AdminThemeContext = React.createContext<AdminThemeContextValue | undefined>(undefined);

function isThemeMode(value: unknown): value is AdminThemeMode {
  return value === "light" || value === "dark";
}

function isThemeAccent(value: unknown): value is AdminThemeAccent {
  return ADMIN_THEME_ACCENTS.some((accent) => accent.id === value);
}

function readStoredPreferences(): AdminThemePreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  try {
    const rawValue = window.sessionStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return DEFAULT_PREFERENCES;
    }

    const parsed = JSON.parse(rawValue) as Partial<AdminThemePreferences>;

    return {
      mode: isThemeMode(parsed.mode) ? parsed.mode : DEFAULT_PREFERENCES.mode,
      accent: isThemeAccent(parsed.accent) ? parsed.accent : DEFAULT_PREFERENCES.accent,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = React.useState<AdminThemePreferences>(() => readStoredPreferences());

  React.useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Ignora indisponibilidade do sessionStorage sem quebrar a UI.
    }
  }, [preferences]);

  const setMode = React.useCallback((mode: AdminThemeMode) => {
    setPreferences((current) => ({ ...current, mode }));
  }, []);

  const setAccent = React.useCallback((accent: AdminThemeAccent) => {
    setPreferences((current) => ({ ...current, accent }));
  }, []);

  const resetPreferences = React.useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  const accentOption = React.useMemo(
    () =>
      ADMIN_THEME_ACCENTS.find((accent) => accent.id === preferences.accent) ??
      ADMIN_THEME_ACCENTS[0],
    [preferences.accent],
  );

  React.useEffect(() => {
    const root = document.documentElement;

    root.setAttribute("data-admin-theme-scope", "");
    root.setAttribute("data-admin-theme", preferences.mode);
    root.setAttribute("data-admin-accent", preferences.accent);
    root.style.setProperty("--admin-accent-primary", accentOption.primary);
    root.style.setProperty("--admin-accent-hover", accentOption.hover);
    root.style.setProperty("--admin-accent-rgb", accentOption.rgb);

    return () => {
      root.removeAttribute("data-admin-theme-scope");
      root.removeAttribute("data-admin-theme");
      root.removeAttribute("data-admin-accent");
      root.style.removeProperty("--admin-accent-primary");
      root.style.removeProperty("--admin-accent-hover");
      root.style.removeProperty("--admin-accent-rgb");
    };
  }, [accentOption.hover, accentOption.primary, accentOption.rgb, preferences.accent, preferences.mode]);

  const value = React.useMemo<AdminThemeContextValue>(
    () => ({
      preferences,
      resolvedTheme: {
        ...preferences,
        accentOption,
      },
      setMode,
      setAccent,
      resetPreferences,
    }),
    [accentOption, preferences, resetPreferences, setAccent, setMode],
  );

  return (
    <AdminThemeContext.Provider value={value}>
      <div
        data-admin-theme-scope=""
        data-admin-theme={preferences.mode}
        data-admin-accent={preferences.accent}
        className="min-h-screen bg-background text-foreground transition-colors duration-200"
        style={
          {
            "--admin-accent-primary": accentOption.primary,
            "--admin-accent-hover": accentOption.hover,
            "--admin-accent-rgb": accentOption.rgb,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = React.useContext(AdminThemeContext);

  if (!context) {
    throw new Error("useAdminTheme must be used within an AdminThemeProvider");
  }

  return context;
}
