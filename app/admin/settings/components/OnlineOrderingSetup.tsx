"use client";

import { PRESETS, type Preset } from "./OnlineOrderingShared";

interface Props {
  onPreset: (preset: Preset) => void;
}

/** Primeiro uso: nenhum horário ainda. Três passos, o primeiro já ativo. */
export function OnlineOrderingSetup({ onPreset }: Props) {
  return (
    <section aria-labelledby="oo-setup-title" className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
      <div className="px-5 py-5 sm:px-6">
        <h3 id="oo-setup-title" className="text-xl font-bold text-[color:var(--foreground)]">
          Deixe seus clientes pedirem pelo app
        </h3>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[color:var(--muted-foreground)]">
          Em três passos: você escolhe quando abre, quais produtos entram e só então liga. Enquanto estiver desligado,
          ninguém consegue pedir.
        </p>
      </div>

      <ol>
        <li className="flex gap-4 border-t border-[color:var(--border)] px-5 py-5 sm:px-6">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white" aria-hidden="true">
            1
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-base font-bold text-[color:var(--foreground)]">Escolha um modelo de horário</h4>
            <p className="mb-3.5 mt-1 text-sm text-[color:var(--muted-foreground)]">Dá para mudar tudo depois.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPreset(p)}
                  className={`min-h-[72px] rounded-xl border bg-[color:var(--card)] px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    p.id === "blank" ? "border-dashed border-[color:var(--border-dark)]" : "border-[color:var(--border-dark)]"
                  }`}
                >
                  <span className="block text-[15px] font-bold text-[color:var(--foreground)]">{p.label}</span>
                  <span className="mt-1 block text-sm text-[color:var(--muted-foreground)]">{p.description}</span>
                </button>
              ))}
            </div>
          </div>
        </li>
        <li className="flex gap-4 border-t border-[color:var(--border)] px-5 py-5 opacity-60 sm:px-6">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--muted)] text-sm font-bold text-[color:var(--muted-foreground)]" aria-hidden="true">
            2
          </span>
          <div>
            <h4 className="text-base font-bold text-[color:var(--foreground)]">Marque os produtos de cada horário</h4>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">Abre junto com o passo 1.</p>
          </div>
        </li>
        <li className="flex gap-4 border-t border-[color:var(--border)] px-5 py-5 opacity-60 sm:px-6">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--muted)] text-sm font-bold text-[color:var(--muted-foreground)]" aria-hidden="true">
            3
          </span>
          <div>
            <h4 className="text-base font-bold text-[color:var(--foreground)]">Ligue os pedidos</h4>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
              O interruptor no topo mostra como o cliente vai enxergar o app.
            </p>
          </div>
        </li>
      </ol>
    </section>
  );
}
