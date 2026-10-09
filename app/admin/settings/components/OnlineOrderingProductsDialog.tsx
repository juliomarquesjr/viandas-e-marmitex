"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Check, Info, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { formatPrice, plural, type OOProduct } from "./OnlineOrderingShared";

interface Props {
  windowName: string;
  products: OOProduct[];
  initialIds: string[];
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
}

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

interface Group {
  id: string;
  name: string;
  items: OOProduct[];
}

function ProductPhoto({ product }: { product: OOProduct }) {
  return product.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.imageUrl}
      alt=""
      loading="lazy"
      className="h-10 w-10 flex-shrink-0 rounded-lg border border-[color:var(--border)] object-cover"
    />
  ) : (
    <div
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[color:var(--muted)] text-xs font-semibold text-[color:var(--muted-foreground)]"
      aria-hidden="true"
    >
      {product.name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function OnlineOrderingProductsDialog({ windowName, products, initialIds, onConfirm, onClose }: Props) {
  const [query, setQuery] = useState("");
  // Só entram na seleção os produtos que o servidor aceita
  const [initial] = useState<Set<string>>(
    () => new Set(initialIds.filter((id) => products.some((p) => p.id === id && p.eligible)))
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial));
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const changed = selected.size !== initial.size || [...selected].some((id) => !initial.has(id));

  // Fechar pelo X ou Esc descarta a seleção; se houve mudança, pergunta antes
  const requestClose = () => {
    if (changed) setConfirmDiscard(true);
    else onClose();
  };

  const groups = useMemo<Group[]>(() => {
    const needle = fold(query.trim());
    const map = new Map<string, Group>();
    for (const p of products) {
      const gid = p.category?.id ?? "__none";
      if (!map.has(gid)) map.set(gid, { id: gid, name: p.category?.name ?? "Sem categoria", items: [] });
      map.get(gid)!.items.push(p);
    }
    const list = [...map.values()].sort((a, b) =>
      a.id === "__none" ? 1 : b.id === "__none" ? -1 : a.name.localeCompare(b.name, "pt-BR")
    );
    return list
      .map((g) => ({ ...g, items: needle ? g.items.filter((p) => fold(p.name).includes(needle)) : g.items }))
      .filter((g) => g.items.length > 0);
  }, [products, query]);

  const totalByGroup = useMemo(() => {
    const totals = new Map<string, { eligible: number }>();
    for (const p of products) {
      const gid = p.category?.id ?? "__none";
      const t = totals.get(gid) ?? { eligible: 0 };
      if (p.eligible) t.eligible += 1;
      totals.set(gid, t);
    }
    return totals;
  }, [products]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const markGroup = (g: Group, value: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of g.items) {
        if (!p.eligible) continue;
        if (value) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });

  return (
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle>Escolher produtos</DialogTitle>
          <DialogDescription>
            Quais produtos o cliente pode pedir no horário “{windowName.trim() || "sem nome"}”.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 border-b border-[color:var(--border)] px-6 py-4">
          <div>
            <label htmlFor="oo-product-search" className="sr-only">
              Buscar produto pelo nome
            </label>
            <Input
              id="oo-product-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar produto pelo nome"
              leftIcon={<Search className="h-4 w-4" aria-hidden="true" />}
              className="min-h-[44px]"
              autoComplete="off"
            />
          </div>
          <p className="flex items-start gap-2 text-xs text-[color:var(--muted-foreground)]">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            Preço e estoque vêm do cadastro de Produtos. A seleção só vale depois de tocar em “Concluir”.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {groups.length === 0 ? (
            <p className="py-10 text-center text-sm text-[color:var(--muted-foreground)]">
              {products.length === 0 ? "Nenhum produto cadastrado." : "Nenhum produto com esse nome."}
            </p>
          ) : (
            <div className="space-y-6">
              {groups.map((g) => {
                const eligibleTotal = totalByGroup.get(g.id)?.eligible ?? 0;
                const chosen = g.items.filter((p) => selected.has(p.id)).length;
                const chosenInGroup = products.filter(
                  (p) => (p.category?.id ?? "__none") === g.id && selected.has(p.id)
                ).length;
                const hasEligibleHere = g.items.some((p) => p.eligible);
                return (
                  <section key={g.id} aria-labelledby={`oo-cat-${g.id}`}>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 id={`oo-cat-${g.id}`} className="text-sm font-semibold text-[color:var(--foreground)]">
                        {g.name}{" "}
                        <span className="font-normal text-[color:var(--muted-foreground)]" aria-live="polite">
                          · {chosenInGroup} de {eligibleTotal}
                        </span>
                      </h3>
                      {hasEligibleHere && (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="min-h-[44px]"
                            onClick={() => markGroup(g, true)}
                            aria-label={`Marcar todos de ${g.name}`}
                          >
                            Marcar todos
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="min-h-[44px]"
                            onClick={() => markGroup(g, false)}
                            disabled={chosen === 0}
                            aria-label={`Limpar ${g.name}`}
                          >
                            Limpar
                          </Button>
                        </div>
                      )}
                    </div>
                    <ul className="space-y-1.5">
                      {g.items.map((p) => {
                        const isOn = selected.has(p.id);
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={isOn}
                              disabled={!p.eligible}
                              onClick={() => toggle(p.id)}
                              className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed ${
                                !p.eligible
                                  ? "border-[color:var(--border)] bg-[color:var(--muted)]/50 opacity-70"
                                  : isOn
                                    ? "border-primary bg-primary/10"
                                    : "border-[color:var(--border)] bg-[color:var(--card)] hover:bg-[color:var(--muted)]"
                              }`}
                            >
                              <span
                                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 ${
                                  isOn ? "border-primary bg-primary text-white" : "border-[color:var(--border-dark)]"
                                }`}
                                aria-hidden="true"
                              >
                                {isOn && <Check className="h-4 w-4" />}
                              </span>
                              <ProductPhoto product={p} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-[color:var(--foreground)]">
                                  {p.name}
                                </span>
                                <span className="block text-xs text-[color:var(--muted-foreground)]">
                                  {p.eligible
                                    ? formatPrice(p.priceCents)
                                    : `${p.reason ?? "Não disponível para pedido online"}`}
                                  {p.eligible && p.stockEnabled && p.stock <= 0 ? " · sem estoque" : ""}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap">
          {confirmDiscard ? (
            <>
              <p role="alert" className="text-sm font-medium text-[color:var(--foreground)]">
                Fechar sem concluir? A seleção que você fez será perdida.
              </p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setConfirmDiscard(false)}>
                  Continuar escolhendo
                </Button>
                <Button type="button" variant="destructive" className="min-h-[44px]" onClick={onClose}>
                  Descartar
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-[color:var(--foreground)]" aria-live="polite">
                {plural(selected.size, "selecionado", "selecionados")}
              </p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" className="min-h-[44px]" onClick={requestClose}>
                  Cancelar
                </Button>
                <Button type="button" className="min-h-[44px]" onClick={() => onConfirm([...selected])}>
                  Concluir
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
