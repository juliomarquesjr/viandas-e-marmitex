"use client";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Ban, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { formatPrice, plural, type OOProduct } from "./OnlineOrderingShared";

interface Props {
  products: OOProduct[];
  soldOutIds: string[];
  /** Produtos que estão em algum horário já salvo */
  inWindowIds: Set<string>;
  busyIds: Set<string>;
  onToggle: (productId: string, value: boolean) => void;
}

const COLLAPSED_COUNT = 8;

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function OnlineOrderingSoldOut({ products, soldOutIds, inWindowIds, busyIds, onToggle }: Props) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const soldSet = useMemo(() => new Set(soldOutIds), [soldOutIds]);

  const rows = useMemo(() => {
    const candidates = products.filter((p) => inWindowIds.has(p.id) || soldSet.has(p.id));
    const needle = fold(query.trim());
    const filtered = needle ? candidates.filter((p) => fold(p.name).includes(needle)) : candidates;
    // Os que esgotaram vão para o topo
    return [...filtered].sort((a, b) => {
      const sa = soldSet.has(a.id) ? 0 : 1;
      const sb = soldSet.has(b.id) ? 0 : 1;
      return sa - sb || a.name.localeCompare(b.name, "pt-BR");
    });
  }, [products, inWindowIds, soldSet, query]);

  const totalCandidates = useMemo(
    () => products.filter((p) => inWindowIds.has(p.id) || soldSet.has(p.id)).length,
    [products, inWindowIds, soldSet]
  );

  const searching = query.trim().length > 0;
  const soldCount = soldOutIds.length;
  const visible = showAll || searching ? rows : rows.slice(0, Math.max(COLLAPSED_COUNT, soldCount));

  return (
    <section aria-labelledby="oo-soldout-title" className="space-y-3">
      <div>
        <h3 id="oo-soldout-title" className="text-base font-semibold text-[color:var(--foreground)]">
          Esgotou hoje
        </h3>
        <p className="mt-0.5 text-sm text-[color:var(--muted-foreground)]">
          Acabou um produto? Marque aqui e ele sai do app agora. Amanhã ele volta sozinho.
        </p>
      </div>

      {totalCandidates === 0 ? (
        <p className="rounded-xl border border-dashed border-[color:var(--border)] px-4 py-6 text-center text-sm text-[color:var(--muted-foreground)]">
          Os produtos dos seus horários aparecem aqui depois que você salvar os horários.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-[color:var(--foreground)]" aria-live="polite">
              {soldCount === 0 ? "Nada esgotado hoje" : `${plural(soldCount, "produto esgotado", "produtos esgotados")} hoje`}
            </p>
            {totalCandidates > COLLAPSED_COUNT && (
              <div className="w-full sm:w-64">
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

          {rows.length === 0 ? (
            <p className="py-4 text-center text-sm text-[color:var(--muted-foreground)]">Nenhum produto com esse nome.</p>
          ) : (
            <ul className="divide-y divide-[color:var(--border)] overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
              {visible.map((p) => {
                const sold = soldSet.has(p.id);
                return (
                  <li
                    key={p.id}
                    className="flex min-h-[56px] items-center gap-3 px-3 py-2"
                    style={sold ? { background: "var(--state-cobrar-bg)" } : undefined}
                  >
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt=""
                        loading="lazy"
                        className="h-10 w-10 flex-shrink-0 rounded-lg border border-[color:var(--border)] object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[color:var(--muted)] text-xs font-semibold text-[color:var(--muted-foreground)]"
                        aria-hidden="true"
                      >
                        {p.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-medium"
                        style={{ color: sold ? "var(--state-cobrar-fg)" : "var(--foreground)" }}
                      >
                        {p.name}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: sold ? "var(--state-cobrar-fg)" : "var(--muted-foreground)" }}
                      >
                        {sold ? (
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <Ban className="h-3 w-3" aria-hidden="true" />
                            Esgotado hoje
                          </span>
                        ) : (
                          formatPrice(p.priceCents)
                        )}
                      </p>
                    </div>
                    <div className="flex min-h-[44px] items-center gap-2">
                      <label
                        htmlFor={`oo-soldout-${p.id}`}
                        className="cursor-pointer text-sm"
                        style={{ color: sold ? "var(--state-cobrar-fg)" : "var(--foreground)" }}
                      >
                        Esgotou hoje
                      </label>
                      <Switch
                        id={`oo-soldout-${p.id}`}
                        checked={sold}
                        disabled={busyIds.has(p.id)}
                        onCheckedChange={(v) => onToggle(p.id, v)}
                        aria-label={`${p.name}: esgotou hoje`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {!searching && rows.length > visible.length && (
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setShowAll(true)}>
              Ver todos os {rows.length} produtos
            </Button>
          )}
          {!searching && showAll && rows.length > COLLAPSED_COUNT && (
            <Button type="button" variant="ghost" className="min-h-[44px]" onClick={() => setShowAll(false)}>
              Mostrar menos
            </Button>
          )}
        </>
      )}
    </section>
  );
}
