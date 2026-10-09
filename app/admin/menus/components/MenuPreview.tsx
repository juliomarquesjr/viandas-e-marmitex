"use client";

import { Eye } from "lucide-react";
import { longDay, type Draft } from "../lib";

/** "Como o cliente vê": o cardápio como aparece no aplicativo, ao vivo enquanto se edita. */
export function MenuPreview({ draft, day }: { draft: Draft; day: string }) {
  const sections = draft.sections
    .map((s) => ({ ...s, items: s.items.filter((i) => i.name.trim()) }))
    .filter((s) => s.items.length > 0);

  return (
    <section aria-labelledby="menu-prev" className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 pb-6 pt-5">
      <h2 id="menu-prev" className="mb-3.5 flex items-center gap-2 px-2 text-sm font-bold text-[color:var(--foreground)]">
        <Eye className="h-4 w-4" aria-hidden="true" />
        Como o cliente vê
      </h2>
      {/* o aplicativo do cliente tem as próprias cores: a prévia usa as dele */}
      <div className="mx-auto w-[290px] overflow-hidden rounded-[36px] border-8 border-slate-900 bg-[#f7f5f4] text-[#231c1f]">
        <div className="border-b border-[#e6e0de] bg-white px-3.5 py-3 text-[15px] font-bold">Sabores de Casa</div>
        <div className="px-3.5 pb-2 pt-3.5">
          <p className="text-xl font-bold leading-tight">{draft.title.trim() || "Cardápio"}</p>
          <p className="mt-0.5 text-xs text-[#5d5257]">{longDay(day)}</p>
        </div>
        <div className="mx-3 mb-3 overflow-hidden rounded-2xl border border-[#e6e0de] bg-white">
          {sections.length === 0 ? (
            <p className="px-3.5 py-6 text-center text-xs text-[#5d5257]">Os itens aparecem aqui conforme você preenche.</p>
          ) : (
            sections.map((s) => (
              <div key={s.key}>
                <p className="px-3.5 pb-1 pt-3 text-xs font-bold uppercase tracking-wider text-[#c62339]">{s.name.trim() || "Itens"}</p>
                {s.items.map((i) => (
                  <div key={i.key} className="border-t border-[#f0ebe9] px-3.5 py-1.5 text-[13px] leading-snug">
                    <span className={i.featured ? "font-bold" : ""}>
                      {i.featured && "★ "}
                      {i.name}
                    </span>
                    {i.vegetarian && <span className="ml-1.5 rounded-full bg-[#dff3ea] px-1.5 py-px text-[11px] font-bold text-[#16765a]">Vegetariano</span>}
                    {i.description.trim() && <span className="block text-xs text-[#5d5257]">{i.description}</span>}
                  </div>
                ))}
              </div>
            ))
          )}
          {draft.note.trim() && <p className="border-t border-[#f0ebe9] bg-[#f7f5f4] px-3.5 py-2 text-[11px] text-[#5d5257]">{draft.note}</p>}
        </div>
      </div>
    </section>
  );
}
