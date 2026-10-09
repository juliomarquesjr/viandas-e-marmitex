"use client";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { plural, type OOProduct } from "./OnlineOrderingShared";

interface Props {
  products: OOProduct[];
  soldOutIds: string[];
  /** Produtos que estão em algum horário já salvo */
  inWindowIds: Set<string>;
  busyIds: Set<string>;
  onToggle: (productId: string, value: boolean) => void;
}

const COLLAPSED_COUNT = 16;

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function OnlineOrderingSoldOut({ products, soldOutIds, inWindowIds, busyIds, onToggle }: Props) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const soldSet = useMemo(() => new Set(soldOutIds), [soldOutIds]);

  const candidates = useMemo(
    () => products.filter((p) => inWindowIds.has(p.id) || soldSet.has(p.id)),
    [products, inWindowIds, soldSet]
  );

  const rows = useMemo(() => {
    const needle = fold(query.trim());
    const filtered = needle ? candidates.filter((p) => fold(p.name).includes(needle)) : candidates;
    // Os que esgotaram vão para o começo
    return [...filtered].sort((a, b) => {
      const sa = soldSet.has(a.id) ? 0 : 1;
      const sb = soldSet.has(b.id) ? 0 : 1;
      return sa - sb || a.name.localeCompare(b.name, "pt-BR");
    });
  }, [candidates, soldSet, query]);

  const searching = query.trim().length > 0;
  const soldCount = soldOutIds.length;
  const visible = showAll || searching ? rows : rows.slice(0, Math.max(COLLAPSED_COUNT, soldCount));

  return (
    <section
      aria-labelledby="oo-soldout-title"
      className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 pb-5 pt-5 sm:px-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <h3 id="oo-soldout-title" className="text-base font-semibold text-[color:var(--foreground)]">
            Esgotou hoje
          </h3>
          <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
            Acabou um produto? Toque nele: some do app agora e volta sozinho amanhã.
          </p>
        </div>
        {candidates.length > COLLAPSED_COUNT && (
          <div className="w-full sm:w-60">
            <label htmlFor="oo-soldout-search" className="sr-only">
              Buscar produto
            </label>
            <Input
              id="oo-soldout-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar produto"
              leftIcon={<Search className="h-4 w-4" aria-hidden="true" />}
              className="min-h-[44px]"
              autoComplete="off"
            />
          </div>
        )}
      </div>

      {candidates.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-[color:var(--border)] px-4 py-6 text-center text-sm text-[color:var(--muted-foreground)]">
          Os produtos dos seus horários aparecem aqui depois que você salvar um horário.
        </p>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-[color:var(--muted-foreground)]">Nenhum produto com esse nome.</p>
      ) : (
        <>
          <ul className="mt-4 flex flex-wrap gap-2.5">
            {visible.map((p) => {
              const sold = soldSet.has(p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-pressed={sold}
                    disabled={busyIds.has(p.id)}
                    onClick={() => onToggle(p.id, !sold)}
                    title={sold ? "Esgotado hoje. Toque para liberar de novo." : "Toque para marcar como esgotado hoje."}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
                    style={
                      sold
                        ? { background: "var(--state-cobrar-bg)", borderColor: "var(--state-cobrar)", color: "var(--state-cobrar-fg)", fontWeight: 700 }
                        : { background: "var(--card)", borderColor: "var(--border-dark)", color: "var(--foreground)" }
                    }
                  >
                    {sold && <X className="h-4 w-4" aria-hidden="true" />}
                    <span className={sold ? "line-through" : undefined}>{p.name}</span>
                    {sold && <span className="sr-only">(esgotado hoje)</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {!searching && rows.length > visible.length && (
            <Button type="button" variant="outline" className="mt-3 min-h-[44px]" onClick={() => setShowAll(true)}>
              Ver todos os {rows.length} produtos
            </Button>
          )}
          {!searching && showAll && rows.length > COLLAPSED_COUNT && (
            <Button type="button" variant="ghost" className="mt-3 min-h-[44px]" onClick={() => setShowAll(false)}>
              Mostrar menos
            </Button>
          )}
        </>
      )}

      <p className="mt-4 text-sm text-[color:var(--muted-foreground)]" aria-live="polite">
        {soldCount === 0 ? "Nada esgotado hoje." : `${plural(soldCount, "produto esgotado", "produtos esgotados")} hoje. Voltam amanhã.`}
      </p>
    </section>
  );
}
