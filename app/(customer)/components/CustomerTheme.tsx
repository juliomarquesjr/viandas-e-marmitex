"use client";

import * as React from "react";
import {
  CUSTOMER_THEME_STORAGE_KEY,
  DEFAULT_CUSTOMER_THEME,
  type CustomerThemeChoice,
  type CustomerThemeMode,
} from "../lib/theme";

export type { CustomerThemeChoice, CustomerThemeMode };

interface CustomerThemeContextValue {
  choice: CustomerThemeChoice;
  /** O tema que está na tela agora, já resolvido quando a escolha é "auto". */
  mode: CustomerThemeMode;
  setChoice: (choice: CustomerThemeChoice) => void;
  /** Atalho do botão sol/lua: alterna para o oposto do que está na tela. */
  toggle: () => void;
}

const CustomerThemeContext = React.createContext<CustomerThemeContextValue | undefined>(undefined);

function isChoice(value: unknown): value is CustomerThemeChoice {
  return value === "light" || value === "dark" || value === "auto";
}

function readStoredChoice(): CustomerThemeChoice {
  const fromRoot = document.documentElement.getAttribute("data-customer-theme");
  if (isChoice(fromRoot)) return fromRoot;
  try {
    const stored = window.localStorage.getItem(CUSTOMER_THEME_STORAGE_KEY);
    if (isChoice(stored)) return stored;
  } catch {
    // Sem armazenamento: segue o aparelho.
  }
  return DEFAULT_CUSTOMER_THEME;
}

function useSystemPrefersDark() {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const onChange = (event: MediaQueryListEvent) => setDark(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return dark;
}

export function CustomerThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoiceState] = React.useState<CustomerThemeChoice>(DEFAULT_CUSTOMER_THEME);
  const systemDark = useSystemPrefersDark();

  React.useLayoutEffect(() => {
    const initial = readStoredChoice();
    document.documentElement.setAttribute("data-customer-theme", initial);
    setChoiceState(initial);
  }, []);

  const setChoice = React.useCallback((next: CustomerThemeChoice) => {
    setChoiceState(next);
    document.documentElement.setAttribute("data-customer-theme", next);
    try {
      if (next === "auto") window.localStorage.removeItem(CUSTOMER_THEME_STORAGE_KEY);
      else window.localStorage.setItem(CUSTOMER_THEME_STORAGE_KEY, next);
    } catch {
      // A escolha vale para esta visita mesmo sem conseguir salvar.
    }
  }, []);

  const mode: CustomerThemeMode = choice === "auto" ? (systemDark ? "dark" : "light") : choice;

  const toggle = React.useCallback(() => {
    setChoice(mode === "dark" ? "light" : "dark");
  }, [mode, setChoice]);

  const value = React.useMemo(() => ({ choice, mode, setChoice, toggle }), [choice, mode, setChoice, toggle]);

  return <CustomerThemeContext.Provider value={value}>{children}</CustomerThemeContext.Provider>;
}

export function useCustomerTheme() {
  const context = React.useContext(CustomerThemeContext);
  if (!context) {
    throw new Error("useCustomerTheme precisa estar dentro de um CustomerThemeProvider");
  }
  return context;
}
