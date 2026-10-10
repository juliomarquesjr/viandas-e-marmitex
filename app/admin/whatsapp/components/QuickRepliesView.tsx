"use client";

import { WhatsAppBubble } from "@/app/admin/components/messages/WhatsAppBubble";
import { DeleteConfirmDialog } from "@/app/components/DeleteConfirmDialog";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { useToast } from "@/app/components/Toast";
import { EMOJI_GROUPS } from "@/lib/messages/format";
import { applyQuickReply, filterQuickReplies, QUICK_LIMITS, type QuickReply } from "@/lib/whatsapp-quick-replies";
import { Loader2, Pencil, Plus, Search, Smile, Trash2, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Reply = QuickReply;
interface Draft {
  id: string | null;
  title: string;
  text: string;
  shortcut: string;
}

const EMPTY: Draft = { id: null, title: "", text: "", shortcut: "" };

/** WhatsApp → Respostas rápidas: os textos que o atendente insere na conversa (pelo botão ou digitando "/"). */
export function QuickRepliesView() {
  const { showToast } = useToast();
  const [replies, setReplies] = useState<Reply[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Reply | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/whatsapp/quick-replies", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Não foi possível carregar.");
      setReplies(body.replies);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(draft.id ? `/api/admin/whatsapp/quick-replies/${draft.id}` : "/api/admin/whatsapp/quick-replies", {
        method: draft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: draft.title, text: draft.text, shortcut: draft.shortcut }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Não foi possível salvar.");
      setDraft(null);
      showToast(draft.id ? "Resposta atualizada" : "Resposta criada", "success");
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    const res = await fetch(`/api/admin/whatsapp/quick-replies/${toDelete.id}`, { method: "DELETE" });
    setToDelete(null);
    if (res.ok) {
      showToast("Resposta apagada", "success");
      await load();
    } else showToast("Não foi possível apagar", "error");
  };

  const addExamples = async () => {
    const res = await fetch("/api/admin/whatsapp/quick-replies/examples", { method: "POST" });
    if (res.ok) await load();
    else showToast("Não foi possível criar os exemplos", "error");
  };

  const insertAtCursor = (value: string) => {
    const el = textRef.current;
    const start = el?.selectionStart ?? draft?.text.length ?? 0;
    const end = el?.selectionEnd ?? start;
    setDraft((d) => (d ? { ...d, text: d.text.slice(0, start) + value + d.text.slice(end) } : d));
    window.requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + value.length, start + value.length);
    });
  };

  const shown = replies ? filterQuickReplies(replies, query) : [];

  return (
    <div className="space-y-4 [&_button:not(:disabled)]:cursor-pointer">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-h-[40px] w-full max-w-sm items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-500 focus-within:border-primary">
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, atalho ou texto" aria-label="Buscar resposta" className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
        </label>
        <Button type="button" onClick={() => { setFormError(null); setDraft(EMPTY); }} className="ml-auto">
          <Plus className="mr-1.5 h-4 w-4" />
          Nova resposta
        </Button>
      </div>

      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
        {error ? (
          <p className="p-6 text-sm text-rose-700" role="alert">{error}</p>
        ) : replies === null ? (
          <div className="flex justify-center py-12 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : replies.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Zap className="mx-auto mb-3 h-9 w-9 text-slate-300" aria-hidden />
            <p className="font-semibold text-slate-800">Nenhuma resposta rápida ainda</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Crie textos prontos para responder mais rápido. Na conversa, digite <b>/</b> para buscar e inserir.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button type="button" onClick={() => { setFormError(null); setDraft(EMPTY); }}>Criar a primeira</Button>
              <Button type="button" variant="outline" onClick={addExamples}>Adicionar exemplos</Button>
            </div>
          </div>
        ) : shown.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">Nenhuma resposta encontrada.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {shown.map((r) => (
              <li key={r.id} className="flex items-start gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-sm text-slate-900">{r.title}</b>
                    {r.shortcut ? <code className="rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-700">/{r.shortcut}</code> : <span className="text-xs text-slate-400">sem atalho</span>}
                  </div>
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-slate-600">{r.text}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => { setFormError(null); setDraft({ id: r.id, title: r.title, text: r.text, shortcut: r.shortcut ?? "" }); }} aria-label={`Editar ${r.title}`}><Pencil className="h-4 w-4" /></Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setToDelete(r)} aria-label={`Apagar ${r.title}`} className="text-rose-600"><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={draft !== null} onOpenChange={(v) => !v && !saving && setDraft(null)}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}>
                <Zap className="h-5 w-5 text-primary" />
              </div>
              {draft?.id ? "Editar resposta rápida" : "Nova resposta rápida"}
            </DialogTitle>
            <DialogDescription>Um texto pronto para inserir na conversa com o cliente.</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="space-y-4 overflow-y-auto px-6 py-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <div className="space-y-1.5">
                  <label htmlFor="qr-title" className="text-xs font-medium uppercase tracking-wide text-slate-500">Nome</label>
                  <Input id="qr-title" value={draft.title} maxLength={QUICK_LIMITS.TITLE} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Ex.: Pedido em separação" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="qr-shortcut" className="text-xs font-medium uppercase tracking-wide text-slate-500">Atalho <span className="font-normal normal-case text-slate-400">(opcional)</span></label>
                  <div className="flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-primary">
                    <span className="pl-3 font-mono text-sm text-slate-400">/</span>
                    <input id="qr-shortcut" value={draft.shortcut} maxLength={QUICK_LIMITS.SHORTCUT + 1} onChange={(e) => setDraft({ ...draft, shortcut: e.target.value })} placeholder="pedido" className="h-10 w-full bg-transparent px-1.5 font-mono text-sm outline-none" />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="qr-text" className="text-xs font-medium uppercase tracking-wide text-slate-500">Texto</label>
                  <span className={`text-xs ${draft.text.length > QUICK_LIMITS.TEXT ? "text-rose-600" : "text-slate-400"}`}>{draft.text.length}/{QUICK_LIMITS.TEXT}</span>
                </div>
                <div className="relative">
                  <Textarea id="qr-text" ref={textRef} rows={5} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} placeholder="Oi, {nome}! …" className="text-[15px] leading-relaxed" />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => insertAtCursor("{nome}")} title="Primeiro nome do cliente" className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-xs text-slate-700 hover:bg-slate-100">{"{nome}"}</button>
                    <button type="button" onClick={() => setEmojiOpen((v) => !v)} aria-expanded={emojiOpen} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100"><Smile className="h-3.5 w-3.5" />Emojis</button>
                    <span className="text-xs text-slate-400">*negrito* · _itálico_ · ~tachado~</span>
                  </div>
                  {emojiOpen && (
                    <div className="absolute left-0 top-full z-20 mt-1 w-[22rem] max-w-full rounded-xl border border-slate-200 bg-white p-3 shadow-lg" role="group" aria-label="Emojis">
                      {EMOJI_GROUPS.map((g) => (
                        <div key={g.name} className="mb-2 last:mb-0">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g.name}</p>
                          <div className="flex flex-wrap gap-0.5">
                            {g.emojis.map((e) => <button key={e} type="button" aria-label={`Inserir ${e}`} onClick={() => { insertAtCursor(e); setEmojiOpen(false); }} className="flex h-9 w-9 items-center justify-center rounded-md text-xl hover:bg-slate-100">{e}</button>)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {draft.text.trim() && (
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Como o cliente vê (para “Maria”)</p>
                  <WhatsAppBubble text={applyQuickReply(draft.text, "Maria Souza")} />
                </div>
              )}
              {formError && <p className="text-sm text-rose-700" role="alert">{formError}</p>}
            </div>
          )}
          <DialogFooter>
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="outline" onClick={() => setDraft(null)} disabled={saving}>Cancelar</Button>
              <Button type="button" onClick={save} disabled={saving || !draft?.title.trim() || !draft?.text.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={toDelete !== null} onOpenChange={(v) => !v && setToDelete(null)} title="Apagar resposta rápida" description={`Apagar “${toDelete?.title}”? Isso não afeta mensagens já enviadas.`} confirmText="Apagar" onConfirm={() => void remove()} />
    </div>
  );
}
