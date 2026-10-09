"use client";

import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { AlertCircle, AlertTriangle, CalendarClock, Loader2, MoonStar, Plus, RefreshCw, Save, Sparkles, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OnlineOrderingPreview } from "./OnlineOrderingPreview";
import { OnlineOrderingProductsDialog } from "./OnlineOrderingProductsDialog";
import {
  blankWindow,
  callOrdering,
  findOverlaps,
  hasErrors,
  MAX_WINDOWS,
  plural,
  PRESETS,
  serializeWindows,
  toDraft,
  toPayload,
  validateDraft,
  type ApiResult,
  type DraftWindow,
  type OOSnapshot,
} from "./OnlineOrderingShared";
import { OnlineOrderingSoldOut } from "./OnlineOrderingSoldOut";
import { OnlineOrderingWindowCard } from "./OnlineOrderingWindowCard";

function OnlineOrderingSkeleton() {
  return (
    <div className="animate-pulse space-y-6 px-8 py-6" aria-busy="true" aria-label="Carregando pedidos online">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-32 rounded-xl bg-[color:var(--muted)]" />
        <div className="h-32 rounded-xl bg-[color:var(--muted)]" />
      </div>
      <div className="h-20 rounded-xl bg-[color:var(--muted)]" />
      <div className="space-y-3">
        <div className="h-5 w-40 rounded bg-[color:var(--muted)]" />
        <div className="h-56 rounded-2xl bg-[color:var(--muted)]" />
        <div className="h-56 rounded-2xl bg-[color:var(--muted)]" />
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-[color:var(--foreground)]">{title}</h3>
        {children && <p className="mt-0.5 text-sm text-[color:var(--muted-foreground)]">{children}</p>}
      </div>
    </div>
  );
}

export function OnlineOrderingTab({ active }: { active: boolean }) {
  const { showToast } = useToast();

  const [server, setServer] = useState<OOSnapshot | null>(null);
  const [draft, setDraft] = useState<DraftWindow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [actionError, setActionError] = useState<string | null>(null);
  const [busyMaster, setBusyMaster] = useState(false);
  const [busyPause, setBusyPause] = useState(false);
  const [busySold, setBusySold] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [confirmOff, setConfirmOff] = useState(false);
  const [removeKey, setRemoveKey] = useState<string | null>(null);
  const [pickKey, setPickKey] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  // Respostas que chegam fora de ordem não podem desfazer uma mais nova
  const seq = useRef(0);
  const applied = useRef(0);

  const apply = useCallback((reqId: number, data: OOSnapshot) => {
    if (reqId < applied.current) return;
    applied.current = reqId;
    setServer(data);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const reqId = ++seq.current;
    const result = await callOrdering("GET");
    if (result.ok) {
      apply(reqId, result.data);
      setDraft(result.data.windows.map(toDraft));
    } else {
      setLoadError(result.message);
    }
    setLoading(false);
  }, [apply]);

  useEffect(() => {
    void load();
  }, [load]);

  // Mantém "Agora o cliente vê" em dia (abre/fecha com o passar do tempo) sem mexer no que está sendo editado
  useEffect(() => {
    if (!active || !server) return;
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const reqId = ++seq.current;
      const result = await callOrdering("GET");
      if (result.ok) apply(reqId, result.data);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [active, server, apply]);

  const dirty = useMemo(
    () => (server ? serializeWindows(draft) !== serializeWindows(server.windows) : false),
    [draft, server]
  );

  // Avisa antes de fechar a página com alterações não salvas
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const eligibleIds = useMemo(
    () => new Set((server?.products ?? []).filter((p) => p.eligible).map((p) => p.id)),
    [server]
  );
  const errorsByKey = useMemo(() => {
    const map = new Map<string, ReturnType<typeof validateDraft>>();
    for (const w of draft) map.set(w.key, validateDraft(w, eligibleIds));
    return map;
  }, [draft, eligibleIds]);
  const invalidCount = useMemo(
    () => [...errorsByKey.values()].filter(hasErrors).length,
    [errorsByKey]
  );
  const overlaps = useMemo(() => findOverlaps(draft), [draft]);

  const inWindowIds = useMemo(() => {
    const ids = new Set<string>();
    for (const w of server?.windows ?? []) for (const id of w.productIds) ids.add(id);
    return ids;
  }, [server]);

  const noOpenDay = useMemo(
    () => !draft.some((w) => w.active && w.weekdays.length > 0),
    [draft]
  );

  const updateWindow = (key: string, patch: Partial<DraftWindow>) => {
    setSaveError(null);
    setDraft((prev) => prev.map((w) => (w.key === key ? { ...w, ...patch } : w)));
  };

  const addWindows = (list: DraftWindow[]) => {
    setSaveError(null);
    setDraft((prev) => [...prev, ...list].slice(0, Math.max(prev.length, MAX_WINDOWS)));
    setShowPresets(false);
  };

  const duplicateWindow = (key: string) => {
    setSaveError(null);
    setDraft((prev) => {
      if (prev.length >= MAX_WINDOWS) return prev;
      const i = prev.findIndex((w) => w.key === key);
      if (i < 0) return prev;
      const src = prev[i];
      const copy = blankWindow({
        name: `${src.name.trim()} (cópia)`.slice(0, 60),
        weekdays: [...src.weekdays],
        startMinute: src.startMinute,
        endMinute: src.endMinute,
        active: src.active,
        productIds: [...src.productIds],
      });
      return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)];
    });
  };

  const removeWindow = (key: string) => {
    setSaveError(null);
    setDraft((prev) => prev.filter((w) => w.key !== key));
    setRemoveKey(null);
  };

  /** Ações que salvam na hora (interruptor, pausa, esgotou hoje). */
  const runInstant = async (body: unknown): Promise<ApiResult> => {
    setActionError(null);
    const reqId = ++seq.current;
    const result = await callOrdering("PUT", body);
    if (result.ok) apply(reqId, result.data);
    else {
      setActionError(result.network ? "Não salvou. Tente de novo." : result.message);
      showToast(result.network ? "Não salvou. Tente de novo." : result.message, "error");
    }
    return result;
  };

  const setEnabled = async (value: boolean) => {
    setBusyMaster(true);
    const result = await runInstant({ enabled: value });
    setBusyMaster(false);
    if (result.ok) showToast(value ? "Pedidos pelo app ligados" : "Pedidos pelo app desligados", "success");
  };

  const setPause = async (pause: "until_tomorrow" | null) => {
    setBusyPause(true);
    const result = await runInstant({ pause });
    setBusyPause(false);
    if (result.ok) {
      showToast(pause ? "Pedidos pausados até amanhã" : "Voltou a receber pedidos", "success");
    }
  };

  const setSoldOut = async (productId: string, value: boolean) => {
    setBusySold((prev) => new Set(prev).add(productId));
    await runInstant({ soldOut: { productId, value } });
    setBusySold((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  };

  const saveWindows = async () => {
    if (invalidCount > 0 || saving) return;
    setSaving(true);
    setSaveError(null);
    const reqId = ++seq.current;
    const result = await callOrdering("PUT", { windows: toPayload(draft) });
    if (result.ok) {
      apply(reqId, result.data);
      setDraft(result.data.windows.map(toDraft));
      showToast("Horários salvos", "success");
    } else {
      setSaveError(result.network ? "Não salvou. Tente de novo." : result.message);
    }
    setSaving(false);
  };

  const discard = () => {
    if (!server) return;
    setSaveError(null);
    setDraft(server.windows.map(toDraft));
  };

  if (loading && !server) return <OnlineOrderingSkeleton />;

  if (!server) {
    return (
      <div className="px-8 py-10">
        <div
          role="alert"
          className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 text-center"
        >
          <AlertCircle className="h-8 w-8" style={{ color: "var(--state-cobrar)" }} aria-hidden="true" />
          <p className="text-sm font-medium text-[color:var(--foreground)]">
            Não deu para carregar os pedidos online.
          </p>
          {loadError && <p className="text-sm text-[color:var(--muted-foreground)]">{loadError}</p>}
          <Button type="button" className="min-h-[44px]" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Tentar de novo
          </Button>
        </div>
      </div>
    );
  }

  const paused = Boolean(server.pausedUntil);
  const pickWindow = pickKey ? draft.find((w) => w.key === pickKey) : undefined;
  const removeWindowDraft = removeKey ? draft.find((w) => w.key === removeKey) : undefined;
  const atLimit = draft.length >= MAX_WINDOWS;

  return (
    <div className={`space-y-8 px-8 py-6 ${dirty ? "pb-28" : ""}`}>
      {actionError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
          style={{ background: "var(--state-cobrar-bg)", color: "var(--state-cobrar-fg)" }}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {actionError}
        </div>
      )}

      {/* Interruptor mestre + pré-visualização */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Label htmlFor="oo-enabled" className="cursor-pointer text-base font-semibold leading-snug">
                Receber pedidos dos clientes pelo app
              </Label>
              <p className="mt-1.5 text-sm text-[color:var(--muted-foreground)]">
                Quando está desligado, o cliente vê “sem pedidos online” e não consegue pedir. Ligar ou
                desligar vale na hora.
              </p>
            </div>
            <div className="flex min-h-[44px] flex-shrink-0 items-center gap-2">
              {busyMaster && <Loader2 className="h-4 w-4 animate-spin text-[color:var(--muted-foreground)]" aria-hidden="true" />}
              <Switch
                id="oo-enabled"
                checked={server.enabled}
                disabled={busyMaster}
                onCheckedChange={(v) => (v ? void setEnabled(true) : setConfirmOff(true))}
              />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-[color:var(--foreground)]" aria-live="polite">
            {server.enabled ? "Ligado" : "Desligado"}
          </p>
        </div>

        <OnlineOrderingPreview preview={server.preview} dirty={dirty} />
      </div>

      {/* Hoje não */}
      <section aria-label="Hoje não" className="space-y-3">
        <SectionTitle icon={MoonStar} title="Hoje não">
          Não vai dar para atender hoje? Pause e os pedidos voltam sozinhos amanhã.
        </SectionTitle>
        {paused ? (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
            style={{ background: "var(--state-pronto-bg)", color: "var(--state-pronto-fg)" }}
          >
            <p className="text-sm font-semibold" role="status">
              Pausado até amanhã
            </p>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] bg-[color:var(--card)]"
              onClick={() => void setPause(null)}
              loading={busyPause}
            >
              Voltar a receber agora
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px]"
              onClick={() => void setPause("until_tomorrow")}
              loading={busyPause}
              disabled={!server.enabled}
            >
              Pausar pedidos até amanhã
            </Button>
            {!server.enabled && (
              <span className="text-sm text-[color:var(--muted-foreground)]">
                Ligue os pedidos pelo app para usar a pausa.
              </span>
            )}
          </div>
        )}
      </section>

      {/* Horários */}
      <section aria-labelledby="oo-windows-title" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h3 id="oo-windows-title" className="text-base font-semibold text-[color:var(--foreground)]">
                Horários de pedidos
              </h3>
              <p className="mt-0.5 text-sm text-[color:var(--muted-foreground)]">
                Em que dias e horas o cliente pode pedir, e quais produtos ficam à venda em cada horário.
              </p>
            </div>
          </div>
          {draft.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                className="min-h-[44px]"
                onClick={() => setShowPresets((v) => !v)}
                aria-expanded={showPresets}
                aria-controls="oo-presets"
                disabled={atLimit}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Usar um modelo
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px]"
                onClick={() => addWindows([blankWindow()])}
                disabled={atLimit}
                title={atLimit ? "Limite de 20 horários" : undefined}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Adicionar horário
              </Button>
            </div>
          )}
        </div>

        {server.enabled && noOpenDay && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm"
            style={{ background: "var(--state-pronto-bg)", color: "var(--state-pronto-fg)" }}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Os pedidos estão ligados, mas nenhum horário está ativo em algum dia. Enquanto for assim, o cliente vai
            ver “fechado”.
          </p>
        )}

        {(showPresets || draft.length === 0) && (
          <div
            id="oo-presets"
            className="rounded-xl border border-dashed border-[color:var(--border-dark)] bg-[color:var(--muted)]/40 p-4"
          >
            <p className="text-sm font-medium text-[color:var(--foreground)]">
              {draft.length === 0 ? "Ainda não há horários. Comece por um modelo." : "Escolha um modelo para adicionar"}
            </p>
            <p className="mt-0.5 text-xs text-[color:var(--muted-foreground)]">
              Você pode mudar tudo depois. Depois de criar, marque os produtos de cada horário.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addWindows(p.build())}
                  className="min-h-[56px] rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-left transition-colors hover:bg-[color:var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <span className="block text-sm font-semibold text-[color:var(--foreground)]">{p.label}</span>
                  <span className="block text-xs text-[color:var(--muted-foreground)]">{p.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {draft.length > 0 && (
          <div className="space-y-4">
            {draft.map((w, i) => (
              <OnlineOrderingWindowCard
                key={w.key}
                window={w}
                index={i}
                errors={errorsByKey.get(w.key) ?? {}}
                overlapsWith={[...new Set(overlaps.get(w.key) ?? [])]}
                canDuplicate={!atLimit}
                onChange={(patch) => updateWindow(w.key, patch)}
                onPickProducts={() => setPickKey(w.key)}
                onDuplicate={() => duplicateWindow(w.key)}
                onRemove={() => setRemoveKey(w.key)}
              />
            ))}
            {draft.some((w) => w.productIds.some((id) => !eligibleIds.has(id))) && (
              <p className="text-xs text-[color:var(--muted-foreground)]">
                Dica: produtos que ficaram inativos ou sem preço no cadastro não podem ser pedidos pelo app.
              </p>
            )}
          </div>
        )}
        {atLimit && (
          <p className="text-sm text-[color:var(--muted-foreground)]">Você chegou ao limite de {MAX_WINDOWS} horários.</p>
        )}
      </section>

      {/* Esgotou hoje */}
      <OnlineOrderingSoldOut
        products={server.products}
        soldOutIds={server.soldOutToday}
        inWindowIds={inWindowIds}
        busyIds={busySold}
        onToggle={(id, v) => void setSoldOut(id, v)}
      />

      {/* Confirmação: desligar */}
      <Dialog open={confirmOff} onOpenChange={setConfirmOff}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Desligar os pedidos pelo app?</DialogTitle>
            <DialogDescription>
              O cliente passa a ver “sem pedidos online” e não consegue pedir até você ligar de novo.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 text-sm text-[color:var(--foreground)]">
            Os pedidos que já chegaram continuam normais. Seus horários ficam guardados.
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setConfirmOff(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-[44px]"
              onClick={() => {
                setConfirmOff(false);
                void setEnabled(false);
              }}
            >
              Desligar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação: remover horário */}
      <Dialog open={Boolean(removeWindowDraft)} onOpenChange={(open) => !open && setRemoveKey(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remover este horário?</DialogTitle>
            <DialogDescription>
              {removeWindowDraft ? `“${removeWindowDraft.name.trim() || "Horário sem nome"}” será tirado da lista.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 text-sm text-[color:var(--foreground)]">
            Os produtos continuam no cadastro. A mudança só vale depois de você tocar em “Salvar horários”.
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setRemoveKey(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-[44px]"
              onClick={() => removeKey && removeWindow(removeKey)}
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escolher produtos */}
      {pickWindow && (
        <OnlineOrderingProductsDialog
          key={pickWindow.key}
          windowName={pickWindow.name}
          products={server.products}
          initialIds={pickWindow.productIds}
          onClose={() => setPickKey(null)}
          onConfirm={(ids) => {
            updateWindow(pickWindow.key, { productIds: ids });
            setPickKey(null);
          }}
        />
      )}

      {/* Rodapé de salvar horários */}
      {active && (dirty || saving) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div
            className="pointer-events-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border-dark)] bg-[color:var(--card)] px-4 py-3 shadow-2xl"
            role="region"
            aria-label="Salvar horários"
          >
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-[color:var(--foreground)]">Você tem alterações não salvas</p>
              {saveError ? (
                <p role="alert" className="mt-0.5 font-medium" style={{ color: "var(--state-cobrar-fg)" }}>
                  {saveError}
                </p>
              ) : invalidCount > 0 ? (
                <p role="status" className="mt-0.5" style={{ color: "var(--state-cobrar-fg)" }}>
                  Falta acertar {plural(invalidCount, "horário", "horários")} antes de salvar. Veja os avisos nos cartões.
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" className="min-h-[44px]" onClick={discard} disabled={saving}>
                <Undo2 className="h-4 w-4" aria-hidden="true" />
                Descartar
              </Button>
              <Button
                type="button"
                className="min-h-[44px]"
                onClick={() => void saveWindows()}
                disabled={invalidCount > 0}
                loading={saving}
              >
                {!saving && <Save className="h-4 w-4" aria-hidden="true" />}
                {saving ? "Salvando..." : "Salvar horários"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
