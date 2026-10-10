"use client";

import { Eye, MessageCircle, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { WhatsAppPhone } from "../../components/messages/WhatsAppPhone";
import { formatMenuMessage } from "@/lib/messages/menu-text";
import { renderTemplate } from "@/lib/messages/render";
import { longDay, type Draft } from "../lib";

interface WhatsAppTemplate {
  enabled: boolean;
  body: string;
  storeName: string;
  signature: string;
}

/** O texto de "Mensagens → Cardápio do dia" e os dados para montá-lo (carrega uma vez). */
function useWhatsAppTemplate() {
  const [state, setState] = useState<WhatsAppTemplate | null | "error">(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/admin/messages", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("falha"))))
      .then((data) => {
        const type = (data.types ?? []).find((t: { key: string }) => t.key === "daily_menu");
        const channel = type?.channels?.whatsapp;
        if (!alive) return;
        if (!channel) return setState("error");
        setState({
          enabled: channel.enabled !== false,
          body: channel.body,
          storeName: data.storeName || "Sabores de Casa",
          signature: data.signature?.enabled && data.signature?.text ? data.signature.text : "",
        });
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

/** "Como o cliente vê": o cardápio no aplicativo e a mensagem de WhatsApp, ao vivo enquanto se edita. */
export function MenuPreview({ draft, day }: { draft: Draft; day: string }) {
  const [view, setView] = useState<"app" | "whatsapp">("app");
  const template = useWhatsAppTemplate();
  const sections = draft.sections
    .map((s) => ({ ...s, items: s.items.filter((i) => i.name.trim()) }))
    .filter((s) => s.items.length > 0);

  // A mensagem exatamente como sai: o modelo de Mensagens com o cardápio deste rascunho no lugar de {cardapio}
  const whatsappText =
    template && template !== "error" && sections.length > 0
      ? renderTemplate(template.body, {
          nome: "Maria",
          loja: template.storeName,
          cardapio: formatMenuMessage({
            date: day,
            title: draft.title.trim() || null,
            note: draft.note.trim() || null,
            sections: sections.map((s) => ({
              name: s.name.trim() || "Itens",
              items: s.items.map((i) => ({ name: i.name.trim(), description: i.description.trim() || null, featured: i.featured, vegetarian: i.vegetarian })),
            })),
          }),
          link_app: typeof window !== "undefined" ? window.location.origin : "",
        }) + (template.signature ? `\n\n${template.signature}` : "")
      : null;

  return (
    <section aria-labelledby="menu-prev" className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 pb-6 pt-5">
      <h2 id="menu-prev" className="mb-3 flex items-center gap-2 px-2 text-sm font-bold text-[color:var(--foreground)]">
        <Eye className="h-4 w-4" aria-hidden="true" />
        Como o cliente vê
      </h2>
      <div className="mx-auto mb-3.5 flex w-[300px] gap-1 rounded-xl bg-[color:var(--card)] p-1" role="tablist" aria-label="Onde o cliente vê">
        {([["app", "No aplicativo", Smartphone], ["whatsapp", "No WhatsApp", MessageCircle]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${view === id ? "bg-primary text-primary-foreground" : "text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)]"}`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {view === "whatsapp" ? (
        <>
          <WhatsAppPhone
            name={template && template !== "error" ? template.storeName : "Sabores de Casa"}
            text={template && template !== "error" ? whatsappText : null}
            empty={template === null ? "Carregando o modelo…" : template === "error" ? "Não foi possível carregar o modelo da mensagem." : "A mensagem aparece aqui conforme você preenche os itens."}
          />
          <p className="mx-auto mt-3 w-[300px] px-1 text-xs leading-relaxed text-[color:var(--muted-foreground)]">
            É o modelo de <strong>Mensagens → Cardápio do dia</strong> com este cardápio no lugar de <code>{"{cardapio}"}</code> (aqui, para “Maria”). Para mudar o texto,{" "}
            <Link href="/admin/settings?tab=mensagens" className="font-semibold text-primary underline">edite o modelo</Link>.
            {template && template !== "error" && !template.enabled && <span className="mt-1 block font-semibold" style={{ color: "var(--state-cobrar-fg)" }}>O envio do cardápio por WhatsApp está desligado nas configurações.</span>}
          </p>
        </>
      ) : (
      /* o aplicativo do cliente tem as próprias cores: a prévia usa as dele */
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
      )}
    </section>
  );
}
