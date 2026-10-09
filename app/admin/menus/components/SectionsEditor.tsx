"use client";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { blankItem, blankSection, SECTION_SUGGESTIONS, type Draft, type DraftItem, type DraftSection } from "../lib";

interface Props {
  draft: Draft;
  onChange: (sections: DraftSection[]) => void;
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const iconBtn =
  "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-[color:var(--muted-foreground)] transition-colors hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)] disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

/** Seções e itens do cardápio: nome, descrição, destaque, vegetariano, ordem e remoção. */
export function SectionsEditor({ draft, onChange }: Props) {
  const { sections } = draft;
  const focusKey = useRef<string | null>(null);
  const [openDesc, setOpenDesc] = useState<ReadonlySet<string>>(new Set());

  const setSection = (index: number, patch: Partial<DraftSection>) =>
    onChange(sections.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const setItem = (si: number, key: string, patch: Partial<DraftItem>) =>
    setSection(si, { items: sections[si].items.map((it) => (it.key === key ? { ...it, ...patch } : it)) });

  // só um destaque por cardápio: marcar um tira o outro
  const toggleFeatured = (si: number, key: string) => {
    const on = !sections[si].items.find((i) => i.key === key)?.featured;
    onChange(sections.map((s, i) => ({ ...s, items: s.items.map((it) => ({ ...it, featured: on && i === si && it.key === key })) })));
  };

  const addItem = (si: number, afterKey?: string) => {
    const item = blankItem();
    focusKey.current = item.key;
    const items = sections[si].items;
    const at = afterKey ? items.findIndex((i) => i.key === afterKey) + 1 : items.length;
    setSection(si, { items: [...items.slice(0, at), item, ...items.slice(at)] });
  };

  const addSection = (name = "") => {
    const section = blankSection(name);
    focusKey.current = section.items[0].key;
    onChange([...sections, section]);
  };

  const used = new Set(sections.map((s) => s.name.trim().toLowerCase()));
  const suggestions = SECTION_SUGGESTIONS.filter((n) => !used.has(n.toLowerCase()));

  return (
    <div className="space-y-5">
      {sections.map((section, si) => (
        <section key={section.key} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]" aria-label={`Seção ${section.name || si + 1}`}>
          <div className="flex items-center gap-1.5 border-b border-[color:var(--border)] px-4 py-3">
            <Input
              value={section.name}
              onChange={(e) => setSection(si, { name: e.target.value })}
              placeholder="Nome da seção (ex.: Pratos principais)"
              aria-label="Nome da seção"
              maxLength={60}
              className="min-h-[44px] max-w-[280px] font-bold"
            />
            <span className="flex-1 whitespace-nowrap pl-1 text-sm text-[color:var(--muted-foreground)]">
              {section.items.filter((i) => i.name.trim()).length} itens
            </span>
            <button type="button" className={iconBtn} onClick={() => onChange(move(sections, si, si - 1))} disabled={si === 0} aria-label="Subir seção">
              <ArrowUp className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" className={iconBtn} onClick={() => onChange(move(sections, si, si + 1))} disabled={si === sections.length - 1} aria-label="Descer seção">
              <ArrowDown className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" className={iconBtn} onClick={() => onChange(sections.filter((_, i) => i !== si))} aria-label="Remover seção">
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <ul>
            {section.items.map((item, ii) => (
              <li key={item.key} className="flex items-start gap-1.5 border-b border-[color:var(--border)] px-3 py-2 last:border-b-0">
                <div className="flex flex-col pt-0.5">
                  <button type="button" className="flex h-[22px] w-9 items-center justify-center rounded text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] disabled:opacity-30" onClick={() => setSection(si, { items: move(section.items, ii, ii - 1) })} disabled={ii === 0} aria-label="Subir item">
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" className="flex h-[22px] w-9 items-center justify-center rounded text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] disabled:opacity-30" onClick={() => setSection(si, { items: move(section.items, ii, ii + 1) })} disabled={ii === section.items.length - 1} aria-label="Descer item">
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-[10rem] flex-1">
                    <Input
                      ref={(el) => {
                        if (el && focusKey.current === item.key) {
                          focusKey.current = null;
                          el.focus();
                        }
                      }}
                      value={item.name}
                      onChange={(e) => setItem(si, item.key, { name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (item.name.trim()) addItem(si, item.key);
                        }
                      }}
                      placeholder="Nome do item"
                      aria-label="Nome do item"
                      maxLength={80}
                      className="min-h-[44px] font-bold"
                    />
                    </div>
                    <button
                      type="button"
                      aria-pressed={item.featured}
                      aria-label="Destaque do dia"
                      title="Destaque do dia (só um por cardápio)"
                      onClick={() => toggleFeatured(si, item.key)}
                      className={`min-h-[40px] rounded-full border px-3 text-xs font-bold transition-colors ${
                        item.featured ? "border-amber-500 bg-amber-100 text-amber-900" : "border-[color:var(--border-dark)] bg-[color:var(--card)] text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]"
                      }`}
                    >
                      ★ Destaque
                    </button>
                    <button
                      type="button"
                      aria-pressed={item.vegetarian}
                      onClick={() => setItem(si, item.key, { vegetarian: !item.vegetarian })}
                      className={`min-h-[40px] rounded-full border px-3 text-xs font-bold transition-colors ${
                        item.vegetarian ? "border-green-500 bg-green-100 text-green-900" : "border-[color:var(--border-dark)] bg-[color:var(--card)] text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]"
                      }`}
                    >
                      Vegetariano
                    </button>
                    {!item.description && !openDesc.has(item.key) && (
                      <button
                        type="button"
                        onClick={() => setOpenDesc((prev) => new Set(prev).add(item.key))}
                        className="min-h-[40px] px-1 text-xs font-semibold text-primary hover:underline"
                      >
                        + Descrição
                      </button>
                    )}
                  </div>
                  {(item.description || openDesc.has(item.key)) && (
                    <Input
                      value={item.description}
                      onChange={(e) => setItem(si, item.key, { description: e.target.value })}
                      placeholder="Descrição (opcional)"
                      aria-label="Descrição do item"
                      maxLength={160}
                      className="min-h-[40px] text-sm"
                    />
                  )}
                </div>
                <button
                  type="button"
                  className={iconBtn}
                  onClick={() => setSection(si, { items: section.items.length > 1 ? section.items.filter((i) => i.key !== item.key) : [blankItem()] })}
                  aria-label="Remover item"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => addItem(si)}
            className="flex min-h-[48px] w-full items-center gap-2.5 rounded-b-2xl border-t border-[color:var(--border)] px-4 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Adicionar item
            <span className="ml-auto text-xs font-normal text-[color:var(--muted-foreground)]">Enter no nome adiciona outro</span>
          </button>
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className="min-h-[44px] border-dashed" onClick={() => addSection(suggestions[0] ?? "")}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Adicionar seção
        </Button>
        {suggestions.length > 1 &&
          suggestions.slice(1, 4).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => addSection(name)}
              className="min-h-[36px] rounded-full border border-[color:var(--border)] bg-[color:var(--muted)]/60 px-3 text-xs font-semibold text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]"
            >
              + {name}
            </button>
          ))}
      </div>
    </div>
  );
}
