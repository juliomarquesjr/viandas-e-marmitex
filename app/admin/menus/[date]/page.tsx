"use client";

import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { isValidDay } from "@/lib/daily-menu";
import { AlertCircle, ArrowLeft, BookOpen, RefreshCw, Save, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/layout";
import { MenuPreview } from "../components/MenuPreview";
import { SectionsEditor } from "../components/SectionsEditor";
import { api, emptyDraft, filledItems, fingerprint, longDay, menuApi, toDraft, toPayload, type Draft, type MenuDTO } from "../lib";

export default function MenuEditorPage() {
  const params = useParams<{ date: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const day = params.date;
  const copyFrom = search.get("copiar");
  const validDay = isValidDay(day);

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [baseline, setBaseline] = useState(() => fingerprint(emptyDraft()));
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!validDay) return;
    setLoading(true);
    setLoadError(null);
    const found = await api<{ menu: MenuDTO | null }>(menuApi(day));
    if (!found.ok) {
      setLoadError(found.message);
      setLoading(false);
      return;
    }
    if (found.data.menu) {
      const loaded = toDraft(found.data.menu);
      setDraft(loaded);
      setBaseline(fingerprint(loaded));
      setExists(true);
    } else if (copyFrom && isValidDay(copyFrom)) {
      // cópia de outro dia: começa como rascunho e já conta como "com mudanças" (ainda não foi salvo)
      const source = await api<{ menu: MenuDTO | null }>(menuApi(copyFrom));
      if (source.ok && source.data.menu) {
        setDraft(toDraft(source.data.menu, true));
        setBaseline("");
      } else {
        setDraft(emptyDraft());
        setBaseline(fingerprint(emptyDraft()));
        showToast("Não deu para copiar o cardápio escolhido. Começando em branco.", "warning");
      }
      setExists(false);
    } else {
      const blank = emptyDraft();
      setDraft(blank);
      setBaseline(fingerprint(blank));
      setExists(false);
    }
    setLoading(false);
  }, [day, validDay, copyFrom, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => fingerprint(draft) !== baseline, [draft, baseline]);

  // Avisa antes de fechar a página com mudanças não salvas
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const go = (to: string) => {
    if (dirty) setLeaveTo(to);
    else router.push(to);
  };

  const patch = (changes: Partial<Draft>) => {
    setSaveError(null);
    setDraft((d) => ({ ...d, ...changes }));
  };

  const save = async () => {
    if (saving) return;
    if (draft.status === "published" && filledItems(draft) === 0) {
      setSaveError("Para publicar, coloque pelo menos um item no cardápio.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    const result = await api<{ menu: MenuDTO }>(menuApi(day), { method: "PUT", body: JSON.stringify(toPayload(draft)) });
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.message);
      return;
    }
    const saved = toDraft(result.data.menu);
    setDraft(saved);
    setBaseline(fingerprint(saved));
    setExists(true);
    showToast(result.data.menu.status === "published" ? "Cardápio publicado" : "Rascunho salvo", "success");
    // a cópia deixa de ser "cópia": o endereço passa a ser o do cardápio salvo
    if (copyFrom) router.replace(`/admin/menus/${day}`);
  };

  const discard = () => {
    setSaveError(null);
    void load();
  };

  const remove = async () => {
    setDeleting(true);
    const result = await api<{ ok: true }>(menuApi(day), { method: "DELETE" });
    setDeleting(false);
    if (result.ok) {
      showToast("Cardápio apagado", "success");
      setBaseline(fingerprint(draft)); // sai sem perguntar
      router.push("/admin/menus");
    } else {
      setConfirmDelete(false);
      setSaveError(result.message);
    }
  };

  if (!validDay) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cardápio" icon={BookOpen} />
        <p className="px-6 text-sm text-[color:var(--muted-foreground)]">
          Esse dia não existe. <Link href="/admin/menus" className="font-semibold text-primary underline">Voltar para os cardápios</Link>
        </p>
      </div>
    );
  }

  const count = filledItems(draft);
  const sectionCount = draft.sections.filter((s) => s.items.some((i) => i.name.trim())).length;
  const published = draft.status === "published";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Cardápio de ${longDay(day)}`}
        description={`${count} ${count === 1 ? "item" : "itens"} em ${sectionCount} ${sectionCount === 1 ? "seção" : "seções"}${dirty ? " · há mudanças não salvas" : ""}`}
        icon={BookOpen}
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Cardápios", href: "/admin/menus" }, { label: longDay(day) }]}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => go("/admin/menus")}>
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Voltar
            </Button>
            {dirty && !loading && (
              <Button size="sm" variant="outline" onClick={discard} disabled={saving}>
                <Undo2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Descartar mudanças
              </Button>
            )}
            <Button size="sm" onClick={() => void save()} loading={saving} disabled={loading || (!dirty && exists)}>
              {!saving && <Save className="mr-1.5 h-4 w-4" aria-hidden="true" />}
              {saving ? "Salvando..." : published ? "Salvar e publicar" : "Salvar rascunho"}
            </Button>
          </>
        }
      />

      <div className="px-6 pb-10">
        {loadError ? (
          <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 text-center">
            <AlertCircle className="h-8 w-8" style={{ color: "var(--state-cobrar)" }} aria-hidden="true" />
            <p className="text-sm font-medium text-[color:var(--foreground)]">Não deu para carregar este cardápio.</p>
            <p className="text-sm text-[color:var(--muted-foreground)]">{loadError}</p>
            <Button type="button" className="min-h-[44px]" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Tentar de novo
            </Button>
          </div>
        ) : loading ? (
          <div className="animate-pulse space-y-5" aria-busy="true" aria-label="Carregando o cardápio">
            <div className="h-40 rounded-2xl bg-[color:var(--muted)]" />
            <div className="h-72 rounded-2xl bg-[color:var(--muted)]" />
          </div>
        ) : (
          <div className="grid items-start gap-6 min-[1180px]:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-5">
              {saveError && (
                <div role="alert" className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: "var(--state-cobrar-bg)", color: "var(--state-cobrar-fg)" }}>
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {saveError}
                </div>
              )}

              <section aria-labelledby="menu-day" className="space-y-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 sm:px-6">
                <h2 id="menu-day" className="text-base font-semibold">
                  Dia e título
                </h2>
                <div className="flex flex-wrap gap-4">
                  <div className="w-full sm:w-52">
                    <Label htmlFor="menu-date" className="mb-1.5 block text-sm font-semibold">
                      Dia do cardápio
                    </Label>
                    <Input id="menu-date" type="date" value={day} onChange={(e) => e.target.value && go(`/admin/menus/${e.target.value}`)} className="min-h-[44px]" />
                  </div>
                  <div className="min-w-[14rem] flex-1">
                    <Label htmlFor="menu-title" className="mb-1.5 block text-sm font-semibold">
                      Título <span className="font-normal text-[color:var(--muted-foreground)]">(opcional)</span>
                    </Label>
                    <Input id="menu-title" value={draft.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Ex.: Sexta da feijoada" maxLength={80} className="min-h-[44px]" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="menu-note" className="mb-1.5 block text-sm font-semibold">
                    Observação para o cliente <span className="font-normal text-[color:var(--muted-foreground)]">(opcional)</span>
                  </Label>
                  <Input id="menu-note" value={draft.note} onChange={(e) => patch({ note: e.target.value })} placeholder="Ex.: Cardápio sujeito a alteração conforme o estoque do dia." maxLength={200} className="min-h-[44px]" />
                </div>
              </section>

              <h2 className="pt-1 text-base font-semibold">Seções e itens</h2>
              <SectionsEditor draft={draft} onChange={(sections) => patch({ sections })} />
            </div>

            <aside className="space-y-5 min-[1180px]:self-stretch">
              <section aria-labelledby="menu-pub" className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
                <h2 id="menu-pub" className="text-base font-semibold">
                  Publicação
                </h2>
                <p className="mb-3 mt-1 text-sm text-[color:var(--muted-foreground)]">Só o publicado aparece para o cliente.</p>
                <div className="flex gap-2" role="group" aria-label="Situação do cardápio">
                  <Button type="button" className="min-h-[44px] flex-1" variant={published ? "default" : "outline"} aria-pressed={published} onClick={() => patch({ status: "published" })}>
                    Publicado
                  </Button>
                  <Button type="button" className="min-h-[44px] flex-1" variant={!published ? "default" : "outline"} aria-pressed={!published} onClick={() => patch({ status: "draft", notifyCustomers: false })}>
                    Rascunho
                  </Button>
                </div>

                <div className="mt-4 space-y-1">
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm">
                    <Switch checked={draft.showOrderButton} onCheckedChange={(v) => patch({ showOrderButton: v })} />
                    <span>Mostrar o botão “Fazer pedido” neste cardápio</span>
                  </label>
                  <label className={`flex min-h-[44px] items-center gap-3 text-sm ${published ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-[color:var(--primary)]"
                      checked={draft.notifyCustomers}
                      disabled={!published}
                      onChange={(e) => patch({ notifyCustomers: e.target.checked })}
                    />
                    <span>Avisar no sino do cliente quando publicar</span>
                  </label>
                </div>

                {exists && (
                  <Button type="button" variant="ghost" className="mt-3 min-h-[44px] w-full justify-start" style={{ color: "var(--state-cobrar-fg)" }} onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Apagar este cardápio
                  </Button>
                )}
              </section>

              <div className="min-[1180px]:sticky min-[1180px]:top-4">
                <MenuPreview draft={draft} day={day} />
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Sair com mudanças */}
      <Dialog open={leaveTo !== null} onOpenChange={(open) => !open && setLeaveTo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sair sem salvar?</DialogTitle>
            <DialogDescription>Você mexeu neste cardápio e ainda não salvou.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 text-sm">Se sair agora, essas mudanças serão perdidas.</div>
          <DialogFooter className="flex-wrap">
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setLeaveTo(null)}>
              Continuar editando
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-[44px]"
              onClick={() => {
                const to = leaveTo;
                setBaseline(fingerprint(draft)); // libera a saída
                setLeaveTo(null);
                if (to) setTimeout(() => router.push(to), 0);
              }}
            >
              Sair sem salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apagar */}
      <Dialog open={confirmDelete} onOpenChange={(open) => !open && !deleting && setConfirmDelete(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apagar este cardápio?</DialogTitle>
            <DialogDescription>O cardápio de {longDay(day)} deixa de existir, inclusive para o cliente.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 text-sm">Isso não tem volta. Para só tirar do ar, use “Rascunho”.</div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" className="min-h-[44px]" onClick={() => void remove()} loading={deleting}>
              Apagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
