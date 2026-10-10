"use client";

import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import { addDaysToDay, todaySP } from "@/lib/date-range";
import { AlertCircle, BookOpen, Copy, MessageCircle, Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BulkMenuDialog } from "../components/messages/BulkMenuDialog";
import { PageHeader } from "../components/layout";
import { MenuTable, type MenuTab } from "./components/MenuTable";
import { NewMenuDialog } from "./components/NewMenuDialog";
import { WeekStrip } from "./components/WeekStrip";
import { api, mondayOf, menuApi, toPayload, toDraft, type MenuDTO, type MenuSummary } from "./lib";

const HISTORY_DAYS = 120;
const AHEAD_DAYS = 45;

export default function MenusPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const today = useMemo(() => todaySP(), []);
  const [monday, setMonday] = useState(() => mondayOf(todaySP()));
  const [menus, setMenus] = useState<MenuSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<MenuTab>("recent");
  const [dialog, setDialog] = useState<{ mode: "new" | "copy"; source?: string } | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const from = addDaysToDay(today, -HISTORY_DAYS);
    const to = addDaysToDay(today, AHEAD_DAYS);
    const result = await api<{ menus: MenuSummary[] }>(`/api/admin/menus?from=${from}&to=${to}`);
    if (result.ok) setMenus(result.data.menus);
    else setError(result.message);
    setLoading(false);
  }, [today]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDay = useMemo(() => new Map(menus.map((m) => [m.date, m])), [menus]);

  const listed = useMemo(() => {
    const recentFrom = addDaysToDay(today, -7);
    const filtered =
      tab === "drafts"
        ? menus.filter((m) => m.status === "draft")
        : tab === "past"
          ? menus.filter((m) => m.date < today)
          : menus.filter((m) => m.date >= recentFrom);
    return filtered; // a API já devolve do mais novo ao mais antigo
  }, [menus, tab, today]);

  // Primeiro dia livre de hoje em diante: é o que o "Novo cardápio" sugere
  const suggestedDay = useMemo(() => {
    let day = today;
    for (let i = 0; i < AHEAD_DAYS && byDay.has(day); i++) day = addDaysToDay(day, 1);
    return day;
  }, [byDay, today]);

  const open = (day: string, copyFrom?: string) => router.push(`/admin/menus/${day}${copyFrom ? `?copiar=${copyFrom}` : ""}`);

  const publish = async (day: string) => {
    setPublishing(day);
    const found = await api<{ menu: MenuDTO | null }>(menuApi(day));
    if (!found.ok || !found.data.menu) {
      setPublishing(null);
      showToast(found.ok ? "Cardápio não encontrado." : found.message, "error");
      return;
    }
    const draft = toDraft(found.data.menu);
    const saved = await api<{ menu: MenuDTO }>(menuApi(day), {
      method: "PUT",
      body: JSON.stringify(toPayload({ ...draft, status: "published" })),
    });
    setPublishing(null);
    if (saved.ok) {
      showToast("Cardápio publicado", "success");
      void load();
    } else {
      showToast(saved.message, "error");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cardápios"
        description="Monte o cardápio de cada dia. O cliente vê o de hoje e consulta os anteriores."
        icon={BookOpen}
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Cardápios" }]}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)} className="border-green-300 bg-green-50 text-green-800 hover:bg-green-100">
              <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Enviar cardápio para todos
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDialog({ mode: "copy" })} disabled={menus.length === 0}>
              <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Copiar de outro dia
            </Button>
            <Button size="sm" onClick={() => setDialog({ mode: "new" })}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Novo cardápio
            </Button>
          </>
        }
      />

      <div className="space-y-6 pb-8">
        {error ? (
          <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 text-center">
            <AlertCircle className="h-8 w-8" style={{ color: "var(--state-cobrar)" }} aria-hidden="true" />
            <p className="text-sm font-medium text-[color:var(--foreground)]">Não deu para carregar os cardápios.</p>
            <p className="text-sm text-[color:var(--muted-foreground)]">{error}</p>
            <Button type="button" className="min-h-[44px]" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Tentar de novo
            </Button>
          </div>
        ) : loading && menus.length === 0 ? (
          <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Carregando cardápios">
            <div className="h-64 rounded-2xl bg-[color:var(--muted)]" />
            <div className="h-72 rounded-2xl bg-[color:var(--muted)]" />
          </div>
        ) : (
          <>
            <WeekStrip
              monday={monday}
              today={today}
              byDay={byDay}
              onOpen={(day) => open(day)}
              onWeek={(delta) => setMonday((m) => addDaysToDay(m, delta * 7))}
              onThisWeek={() => setMonday(mondayOf(today))}
            />
            <MenuTable
              tab={tab}
              onTab={setTab}
              today={today}
              menus={listed}
              publishing={publishing}
              onOpen={(day) => open(day)}
              onDuplicate={(day) => setDialog({ mode: "copy", source: day })}
              onPublish={(day) => void publish(day)}
            />
          </>
        )}
      </div>

      <BulkMenuDialog open={bulkOpen} onClose={() => setBulkOpen(false)} />

      {dialog && (
        <NewMenuDialog
          mode={dialog.mode}
          suggestedDay={suggestedDay}
          sources={menus}
          presetSource={dialog.source}
          onClose={() => setDialog(null)}
          onConfirm={(day, copyFrom) => open(day, copyFrom)}
        />
      )}
    </div>
  );
}
