"use client";

import { Button } from "@/app/components/ui/button";
import { Copy, Pencil } from "lucide-react";
import { dayMonth, weekdayShort, type MenuSummary } from "../lib";

export type MenuTab = "recent" | "past" | "drafts";

interface Props {
  tab: MenuTab;
  onTab: (tab: MenuTab) => void;
  today: string;
  menus: MenuSummary[];
  publishing: string | null;
  onOpen: (day: string) => void;
  onDuplicate: (day: string) => void;
  onPublish: (day: string) => void;
}

const TABS: { id: MenuTab; label: string }[] = [
  { id: "recent", label: "Próximos e recentes" },
  { id: "past", label: "Anteriores" },
  { id: "drafts", label: "Rascunhos" },
];

/** Todos os cardápios, do mais novo ao mais antigo, com as ações de cada um. */
export function MenuTable({ tab, onTab, today, menus, publishing, onOpen, onDuplicate, onPublish }: Props) {
  return (
    <section aria-labelledby="menus-all" className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
      <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-5 sm:px-6">
        <h2 id="menus-all" className="pb-3 text-base font-semibold text-[color:var(--foreground)]">
          Todos os cardápios
        </h2>
        <div role="tablist" aria-label="Filtro da lista" className="flex">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => onTab(t.id)}
              className={`mr-5 min-h-[44px] whitespace-nowrap border-b-2 px-1 text-sm last:mr-0 ${
                tab === t.id
                  ? "border-primary font-bold text-primary"
                  : "border-transparent font-medium text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {menus.length === 0 ? (
        <p className="border-t border-[color:var(--border)] px-6 py-10 text-center text-sm text-[color:var(--muted-foreground)]">
          {tab === "drafts" ? "Nenhum rascunho." : "Nenhum cardápio por aqui ainda."}
        </p>
      ) : (
        <div className="overflow-x-auto border-t border-[color:var(--border)]">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                <th className="px-4 py-2.5 sm:px-6">Dia</th>
                <th className="px-4 py-2.5">Pratos principais</th>
                <th className="px-4 py-2.5">Itens</th>
                <th className="px-4 py-2.5">Situação</th>
                <th className="px-4 py-2.5 text-right sm:px-6">Ações</th>
              </tr>
            </thead>
            <tbody>
              {menus.map((m) => {
                const isToday = m.date === today;
                const published = m.status === "published";
                return (
                  <tr key={m.date} className={`border-t border-[color:var(--border)] ${isToday ? "bg-primary/5" : ""}`}>
                    <td className="whitespace-nowrap px-4 py-3.5 sm:px-6">
                      <strong>
                        {weekdayShort(m.date)}, {dayMonth(m.date)}
                      </strong>
                      {isToday && <span className="ml-2 text-xs font-bold text-primary">hoje</span>}
                    </td>
                    <td className="px-4 py-3.5 text-[color:var(--foreground)]">{m.mains.length > 0 ? m.mains.join(", ") : <span className="text-[color:var(--muted-foreground)]">Sem itens</span>}</td>
                    <td className="px-4 py-3.5">{m.itemCount}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className="inline-flex rounded-full px-2.5 py-1 text-xs font-bold"
                        style={{
                          background: `var(--state-${published ? "faturado" : "pronto"}-bg)`,
                          color: `var(--state-${published ? "faturado" : "pronto"}-fg)`,
                        }}
                      >
                        {published ? "Publicado" : "Rascunho"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right sm:px-6">
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" className="min-h-[40px]" onClick={() => onOpen(m.date)}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          Editar
                        </Button>
                        {!published && (
                          <Button type="button" className="min-h-[40px]" onClick={() => onPublish(m.date)} loading={publishing === m.date}>
                            Publicar
                          </Button>
                        )}
                        <Button type="button" variant="ghost" className="min-h-[40px]" onClick={() => onDuplicate(m.date)}>
                          <Copy className="h-4 w-4" aria-hidden="true" />
                          Duplicar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
