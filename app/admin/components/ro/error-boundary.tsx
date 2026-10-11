"use client";

import { Component, type ReactNode } from "react";
import { limparHistoricoRo } from "./historico";

/** Um erro dentro da RO nunca derruba o admin: mostra um aviso pequeno e deixa tentar de novo. */
export class RoErrorBoundary extends Component<{ children: ReactNode }, { quebrou: boolean }> {
  state = { quebrou: false };

  static getDerivedStateFromError() {
    return { quebrou: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[RO][tela]", error instanceof Error ? error.name : "erro");
  }

  render() {
    if (!this.state.quebrou) return this.props.children;
    return (
      <div role="alert" className="fixed bottom-4 right-4 z-[100] max-w-xs rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-950 shadow-lg dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100">
        <p className="font-semibold">A RO deu um problema.</p>
        <p className="mt-0.5">O resto do sistema continua normal.</p>
        <button
          type="button"
          onClick={() => {
            limparHistoricoRo();
            this.setState({ quebrou: false });
          }}
          className="mt-2 inline-flex h-11 items-center rounded-lg border border-rose-300 bg-white px-3 font-semibold text-rose-800 dark:bg-transparent dark:text-rose-100"
        >
          Abrir a RO de novo
        </button>
      </div>
    );
  }
}
