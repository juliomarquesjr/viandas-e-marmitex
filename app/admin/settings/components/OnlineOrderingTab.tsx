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
import { AlertCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OnlineOrderingSetup } from "./OnlineOrderingSetup";
import {
  blankWindow,
  callOrdering,
  MAX_WINDOWS,
  nowInSaoPaulo,
  PRESETS,
  toDraft,
  toPayload,
  type ApiResult,
  type DraftWindow,
  type OOProduct,
  type OOSnapshot,
  type Preset,
} from "./OnlineOrderingShared";
import { OnlineOrderingSoldOut } from "./OnlineOrderingSoldOut";
import { OnlineOrderingStatus } from "./OnlineOrderingStatus";
import { OnlineOrderingWeek } from "./OnlineOrderingWeek";
import { OnlineOrderingWindowPanel } from "./OnlineOrderingWindowPanel";

function OnlineOrderingSkeleton() {
  return (
    <div className="animate-pulse space-y-6 px-4 py-6 sm:px-8" aria-busy="true" aria-label="Carregando pedidos online">
      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="h-44 flex-1 rounded-2xl bg-[color:var(--muted)]" />
        <div className="h-44 rounded-2xl bg-[color:var(--muted)] lg:w-[300px]" />
      </div>
      <div className="h-80 rounded-2xl bg-[color:var(--muted)]" />
      <div className="h-40 rounded-2xl bg-[color:var(--muted)]" />
    </div>
  );
}

/** Horário em edição no painel lateral; os demais de um modelo esperam na fila. */
interface Editing {
  draft: DraftWindow;
  isNew: boolean;
}

export function OnlineOrderingTab({ active }: { active: boolean }) {
  const { showToast } = useToast();

  const [server, setServer] = useState<OOSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [actionError, setActionError] = useState<string | null>(null);
  const [busyMaster, setBusyMaster] = useState(false);
  const [busyPause, setBusyPause] = useState(false);
  const [busySold, setBusySold] = useState<Set<string>>(new Set());
  const [busyWindows, setBusyWindows] = useState<Set<string>>(new Set());

  const [editing, setEditing] = useState<Editing | null>(null);
  const [queue, setQueue] = useState<DraftWindow[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [panelSaving, setPanelSaving] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  const [presetsOpen, setPresetsOpen] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

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
    if (result.ok) apply(reqId, result.data);
    else setLoadError(result.message);
    setLoading(false);
  }, [apply]);

  useEffect(() => {
    void load();
  }, [load]);

  // Mantém "agora" e a situação da loja em dia (abre/fecha com o passar do tempo)
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

  const inWindowIds = useMemo(() => {
    const ids = new Set<string>();
    for (const w of server?.windows ?? []) for (const id of w.productIds) ids.add(id);
    return ids;
  }, [server]);

  // O que o cliente consegue pedir agora: produtos dos horários abertos neste minuto, menos os esgotados
  const openProducts = useMemo<OOProduct[]>(() => {
    if (!server?.preview.open) return [];
    const now = nowInSaoPaulo(server.preview.serverNow);
    const sold = new Set(server.soldOutToday);
    const ids = new Set<string>();
    for (const w of server.windows) {
      if (w.active && w.weekdays.includes(now.weekday) && w.startMinute <= now.minute && now.minute < w.endMinute) {
        for (const id of w.productIds) if (!sold.has(id)) ids.add(id);
      }
    }
    return server.products.filter((p) => ids.has(p.id) && p.eligible);
  }, [server]);

  const savedDrafts = useMemo(() => (server?.windows ?? []).map(toDraft), [server]);

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
    if (result.ok) showToast(pause ? "Pedidos pausados até amanhã" : "Voltou a receber pedidos", "success");
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

  /** Os horários são salvos juntos: manda a lista inteira já com a mudança. */
  const saveList = async (list: DraftWindow[]): Promise<ApiResult> => {
    const reqId = ++seq.current;
    const result = await callOrdering("PUT", { windows: toPayload(list) });
    if (result.ok) apply(reqId, result.data);
    return result;
  };

  const openEdit = (id: string) => {
    const found = savedDrafts.find((w) => w.id === id);
    if (!found) return;
    setPanelError(null);
    setQueue([]);
    setQueueTotal(0);
    setEditing({ draft: found, isNew: false });
  };

  const openNew = () => {
    setPanelError(null);
    setQueue([]);
    setQueueTotal(0);
    setEditing({ draft: blankWindow(), isNew: true });
  };

  const openPreset = (preset: Preset) => {
    const [first, ...rest] = preset.build();
    if (!first) return;
    setPanelError(null);
    setQueue(rest);
    setQueueTotal(rest.length + 1);
    setEditing({ draft: first, isNew: true });
  };

  const duplicateFrom = (draft: DraftWindow) => {
    if (savedDrafts.length >= MAX_WINDOWS) {
      setPanelError(`Você chegou ao limite de ${MAX_WINDOWS} horários.`);
      return;
    }
    setPanelError(null);
    setQueue([]);
    setQueueTotal(0);
    setEditing({
      draft: blankWindow({
        name: `${draft.name.trim()} (cópia)`.slice(0, 60),
        weekdays: [...draft.weekdays],
        startMinute: draft.startMinute,
        endMinute: draft.endMinute,
        active: draft.active,
        productIds: [...draft.productIds],
      }),
      isNew: true,
    });
  };

  const closePanel = () => {
    setEditing(null);
    setQueue([]);
    setQueueTotal(0);
    setPanelError(null);
  };

  const saveFromPanel = async (draft: DraftWindow) => {
    if (!server) return;
    setPanelSaving(true);
    setPanelError(null);
    const exists = draft.id ? savedDrafts.some((w) => w.id === draft.id) : false;
    const list = exists ? savedDrafts.map((w) => (w.id === draft.id ? draft : w)) : [...savedDrafts, draft];
    if (list.length > MAX_WINDOWS) {
      setPanelError(`Você chegou ao limite de ${MAX_WINDOWS} horários.`);
      setPanelSaving(false);
      return;
    }
    const result = await saveList(list);
    setPanelSaving(false);
    if (!result.ok) {
      setPanelError(result.network ? "Não salvou. Tente de novo." : result.message);
      return;
    }
    showToast("Horário salvo", "success");
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      setQueue(rest);
      setEditing({ draft: next, isNew: true });
    } else {
      closePanel();
    }
  };

  const toggleActive = async (id: string, value: boolean) => {
    setBusyWindows((prev) => new Set(prev).add(id));
    setActionError(null);
    const result = await saveList(savedDrafts.map((w) => (w.id === id ? { ...w, active: value } : w)));
    setBusyWindows((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (!result.ok) {
      const message = result.network ? "Não salvou. Tente de novo." : result.message;
      setActionError(message);
      showToast(message, "error");
    }
  };

  const confirmRemove = async () => {
    if (!removeId) return;
    setRemoving(true);
    const result = await saveList(savedDrafts.filter((w) => w.id !== removeId));
    setRemoving(false);
    if (result.ok) {
      showToast("Horário removido", "success");
      setRemoveId(null);
      if (editing?.draft.id === removeId) closePanel();
    } else {
      const message = result.network ? "Não salvou. Tente de novo." : result.message;
      setActionError(message);
      showToast(message, "error");
      setRemoveId(null);
    }
  };

  if (loading && !server) return <OnlineOrderingSkeleton />;

  if (!server) {
    return (
      <div className="px-4 py-10 sm:px-8">
        <div
          role="alert"
          className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 text-center"
        >
          <AlertCircle className="h-8 w-8" style={{ color: "var(--state-cobrar)" }} aria-hidden="true" />
          <p className="text-sm font-medium text-[color:var(--foreground)]">Não deu para carregar os pedidos online.</p>
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
  const removeTarget = removeId ? server.windows.find((w) => w.id === removeId) : undefined;
  const noWindows = server.windows.length === 0;

  return (
    <div className="space-y-6 px-3 py-5 sm:space-y-7 sm:px-8 sm:py-7">
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

      <OnlineOrderingStatus
        enabled={server.enabled}
        paused={paused}
        preview={server.preview}
        soldOutCount={server.soldOutToday.length}
        openProducts={openProducts}
        busyMaster={busyMaster}
        busyPause={busyPause}
        onToggleEnabled={(v) => (v ? void setEnabled(true) : setConfirmOff(true))}
        onPause={() => void setPause("until_tomorrow")}
        onResume={() => void setPause(null)}
      />

      {noWindows ? (
        <OnlineOrderingSetup onPreset={openPreset} />
      ) : (
        <>
          <OnlineOrderingWeek
            windows={server.windows}
            serverNow={server.preview.serverNow}
            busyIds={busyWindows}
            onEdit={openEdit}
            onToggleActive={(id, v) => void toggleActive(id, v)}
            onAdd={openNew}
            onPresets={() => setPresetsOpen(true)}
          />
          <OnlineOrderingSoldOut
            products={server.products}
            soldOutIds={server.soldOutToday}
            inWindowIds={inWindowIds}
            busyIds={busySold}
            onToggle={(id, v) => void setSoldOut(id, v)}
          />
        </>
      )}

      {/* Painel lateral: editar ou criar um horário */}
      {editing && (
        <OnlineOrderingWindowPanel
          key={editing.draft.key}
          window={editing.draft}
          isNew={editing.isNew}
          products={server.products}
          others={savedDrafts}
          step={queueTotal > 1 ? { index: queueTotal - queue.length, total: queueTotal } : undefined}
          saving={panelSaving}
          error={panelError}
          onSave={(d) => void saveFromPanel(d)}
          onClose={closePanel}
          onRemove={editing.draft.id ? () => setRemoveId(editing.draft.id ?? null) : undefined}
          onDuplicate={duplicateFrom}
        />
      )}

      {/* Modelos de horário (quando já existem horários) */}
      <Dialog open={presetsOpen} onOpenChange={setPresetsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Usar um modelo</DialogTitle>
            <DialogDescription>O modelo abre no painel para você marcar os produtos antes de salvar.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 px-6 py-5 sm:grid-cols-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPresetsOpen(false);
                  openPreset(p);
                }}
                className="min-h-[72px] rounded-xl border border-[color:var(--border-dark)] bg-[color:var(--card)] px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <span className="block text-[15px] font-bold text-[color:var(--foreground)]">{p.label}</span>
                <span className="mt-1 block text-sm text-[color:var(--muted-foreground)]">{p.description}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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
      <Dialog open={Boolean(removeTarget)} onOpenChange={(open) => !open && !removing && setRemoveId(null)}>
        <DialogContent className="z-[111] max-w-md" overlayClassName="z-[110]">
          <DialogHeader>
            <DialogTitle>Remover este horário?</DialogTitle>
            <DialogDescription>
              {removeTarget ? `“${removeTarget.name.trim() || "Horário sem nome"}” deixa de valer para o cliente.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 text-sm text-[color:var(--foreground)]">
            Os produtos continuam no cadastro. A remoção vale na hora.
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setRemoveId(null)} disabled={removing}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" className="min-h-[44px]" onClick={() => void confirmRemove()} loading={removing}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
