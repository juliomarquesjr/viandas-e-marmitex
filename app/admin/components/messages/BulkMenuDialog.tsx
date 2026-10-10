"use client";

import { AlertCircle, CheckCircle2, Clock, Loader2, MessageCircle, Send } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";

interface Recipient {
  id: string;
  name: string;
  receivedAt: string | null;
}

interface Overview {
  menu: { date: string; title: string | null; items: number } | null;
  whatsapp: { ready: boolean; reason: string | null; fixHref: string | null };
  activeCustomers: number;
  withWhatsapp: number;
  recipients: Recipient[];
}

type Phase = "loading" | "ready" | "sending" | "done";
interface Failure {
  id: string;
  name: string;
  error: string;
}

/** Uma mensagem a cada 6 a 12 segundos: ritmo de gente, para o WhatsApp não bloquear o número. */
const MIN_DELAY_MS = 6000;
const MAX_DELAY_MS = 12000;
const AVERAGE_SECONDS = 9;

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const randomDelay = () => MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
const minutesLabel = (count: number) => {
  const minutes = Math.max(1, Math.round((count * AVERAGE_SECONDS) / 60));
  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
};

function Box({ tone, children }: { tone: "warn" | "bad" | "info" | "ok" | "muted"; children: React.ReactNode }) {
  const style = {
    warn: "border-amber-300 bg-amber-50 text-amber-900",
    bad: "border-rose-200 bg-rose-50 text-rose-900",
    info: "border-blue-200 bg-blue-50 text-blue-900",
    ok: "border-green-200 bg-green-50 text-green-900",
    muted: "border-slate-200 bg-slate-50 text-slate-700",
  }[tone];
  const Icon = tone === "ok" ? CheckCircle2 : tone === "warn" ? Clock : AlertCircle;
  return (
    <div className={`flex gap-3 rounded-xl border px-3 py-2.5 text-sm leading-relaxed ${style}`} role={tone === "bad" ? "alert" : undefined}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

/** Envia o cardápio de hoje a todos os clientes com WhatsApp, um por vez, com intervalo entre as mensagens. */
export function BulkMenuDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [overview, setOverview] = React.useState<Overview | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<Phase>("loading");
  const [skipReceived, setSkipReceived] = React.useState(true);

  const [sent, setSent] = React.useState(0);
  const [failures, setFailures] = React.useState<Failure[]>([]);
  const [total, setTotal] = React.useState(0);
  const [current, setCurrent] = React.useState<string | null>(null);
  const [stopReason, setStopReason] = React.useState<string | null>(null);
  const [paused, setPaused] = React.useState(false);

  const stopRef = React.useRef(false);
  const pausedRef = React.useRef(false);
  const runningRef = React.useRef(false);

  const load = React.useCallback(async (quiet = false) => {
    if (!quiet) {
      setPhase("loading");
      setLoadError(null);
    }
    try {
      const res = await fetch("/api/admin/menu-broadcast", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Não foi possível verificar o envio.");
      setOverview(body as Overview);
      if (!quiet) setPhase("ready");
    } catch (err) {
      if (!quiet) setLoadError(err instanceof Error ? err.message : "Erro ao verificar o envio.");
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    setSent(0);
    setFailures([]);
    setStopReason(null);
    setPaused(false);
    pausedRef.current = false;
    stopRef.current = false;
    void load();
  }, [open, load]);

  // Fechar a aba no meio do envio interrompe: avisa antes
  React.useEffect(() => {
    if (phase !== "sending") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  const pending = React.useMemo(
    () => (overview ? overview.recipients.filter((r) => !skipReceived || !r.receivedAt) : []),
    [overview, skipReceived]
  );
  const alreadyReceived = overview ? overview.recipients.filter((r) => r.receivedAt).length : 0;

  const run = async (queue: Recipient[]) => {
    if (runningRef.current || queue.length === 0) return;
    runningRef.current = true;
    stopRef.current = false;
    setPhase("sending");
    setTotal(queue.length);
    setSent(0);
    setFailures([]);
    setStopReason(null);

    let okCount = 0;
    const failed: Failure[] = [];
    let consecutiveErrors = 0;

    for (let i = 0; i < queue.length; i++) {
      while (pausedRef.current && !stopRef.current) await wait(300);
      if (stopRef.current) break;
      const person = queue[i];
      setCurrent(person.name);
      try {
        const res = await fetch(`/api/admin/customers/${person.id}/send-menu`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force: !skipReceived }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Erro ao enviar.");
        consecutiveErrors = 0;
        if (body.status === "sent") {
          okCount += 1;
          setSent(okCount);
        } else if (body.status === "already_received") {
          // alguém enviou por outro lado nesse meio tempo: conta como feito
          okCount += 1;
          setSent(okCount);
        } else if (body.status === "unavailable" || body.status === "no_menu") {
          setStopReason(body.reason ?? "O envio não pode continuar.");
          break;
        } else {
          const error = body.status === "failed" ? body.result?.error ?? "Não enviado." : body.reason ?? "Não enviado.";
          failed.push({ id: person.id, name: person.name, error });
          setFailures([...failed]);
        }
      } catch (err) {
        consecutiveErrors += 1;
        failed.push({ id: person.id, name: person.name, error: err instanceof Error ? err.message : "Erro ao enviar." });
        setFailures([...failed]);
        if (consecutiveErrors >= 3) {
          setStopReason("Sem conexão com o servidor. Confira a internet e retome o envio.");
          break;
        }
      }
      if (i < queue.length - 1 && !stopRef.current) await wait(randomDelay());
    }

    runningRef.current = false;
    setCurrent(null);
    setPhase("done");
    void load(true); // atualiza quem já recebeu, para "tentar de novo" e reabrir contarem certo
  };

  const retryFailed = () => {
    const ids = new Set(failures.map((f) => f.id));
    void run((overview?.recipients ?? []).filter((r) => ids.has(r.id)));
  };

  const stop = () => {
    stopRef.current = true;
    pausedRef.current = false;
    setPaused(false);
    setStopReason((r) => r ?? "Envio interrompido. Quem já recebeu não recebe de novo ao retomar.");
  };

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const sending = phase === "sending";
  const processed = sent + failures.length;
  const pct = total ? Math.round((processed / total) * 100) : 0;
  const left = Math.max(0, total - processed);
  const unreachable = overview && (!overview.menu || !overview.whatsapp.ready);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !sending && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg" onInteractOutside={(e) => sending && e.preventDefault()} onEscapeKeyDown={(e) => sending && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}>
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            {sending ? "Enviando o cardápio…" : phase === "done" ? "Envio concluído" : "Enviar cardápio de hoje para todos"}
          </DialogTitle>
          <DialogDescription>{sending ? "Mantenha esta janela aberta até terminar." : "Pelo WhatsApp do estabelecimento, para quem tem o número marcado como WhatsApp."}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto px-6 py-4">
          {loadError ? (
            <Box tone="bad">{loadError}</Box>
          ) : phase === "loading" || !overview ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Verificando…</div>
          ) : sending ? (
            <>
              <div className="flex justify-between text-sm"><strong>{processed} de {total}</strong><span className="text-slate-500">{paused ? "pausado" : `faltam cerca de ${minutesLabel(left)}`}</span></div>
              <div className="h-3 overflow-hidden rounded-full bg-green-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all" style={{ width: `${pct}%` }} /></div>
              <p className="flex items-center gap-2 text-sm text-slate-600">{paused ? <Clock className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}{current ? <>{paused ? "Pausado antes de " : "Enviando para "}<strong className="text-slate-900">{current}</strong>…</> : "Terminando…"}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-slate-200 px-2 py-2"><b className="block text-2xl text-green-600">{sent}</b><span className="text-xs text-slate-500">enviados</span></div>
                <div className="rounded-xl border border-slate-200 px-2 py-2"><b className={`block text-2xl ${failures.length ? "text-rose-600" : "text-slate-900"}`}>{failures.length}</b><span className="text-xs text-slate-500">com erro</span></div>
                <div className="rounded-xl border border-slate-200 px-2 py-2"><b className="block text-2xl">{left}</b><span className="text-xs text-slate-500">faltam</span></div>
              </div>
            </>
          ) : phase === "done" ? (
            <>
              {stopReason && <Box tone="bad">{stopReason}</Box>}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-slate-200 px-2 py-2"><b className="block text-2xl text-green-600">{sent}</b><span className="text-xs text-slate-500">enviados</span></div>
                <div className="rounded-xl border border-slate-200 px-2 py-2"><b className={`block text-2xl ${failures.length ? "text-rose-600" : "text-slate-900"}`}>{failures.length}</b><span className="text-xs text-slate-500">com erro</span></div>
                <div className="rounded-xl border border-slate-200 px-2 py-2"><b className="block text-2xl text-slate-500">{Math.max(0, total - sent - failures.length)}</b><span className="text-xs text-slate-500">não enviados</span></div>
              </div>
              {failures.length === 0 && !stopReason && <Box tone="ok"><strong>{sent} {sent === 1 ? "cliente recebeu" : "clientes receberam"} o cardápio.</strong><br />Tudo certo. O resultado de cada envio está em Configurações → Mensagens → Histórico.</Box>}
              {failures.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Quem não recebeu</p>
                  <ul className="max-h-44 divide-y divide-slate-100 overflow-y-auto text-sm">
                    {failures.map((f) => (<li key={f.id} className="flex items-start gap-2 py-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden /><span><strong>{f.name}</strong><br /><span className="text-xs text-slate-500">{f.error}</span></span></li>))}
                  </ul>
                </div>
              )}
            </>
          ) : unreachable ? (
            !overview.menu ? (
              <Box tone="warn"><strong>O cardápio de hoje ainda não foi publicado.</strong><br />Publique o de hoje (clique no dia de hoje na semana) e tente de novo.</Box>
            ) : (
              <Box tone="bad"><strong>{overview.whatsapp.reason}</strong>{overview.whatsapp.fixHref && <>{" "}<Link href={overview.whatsapp.fixHref} className="font-semibold underline">Resolver</Link></>}</Box>
            )
          ) : (
            <>
              <div className="flex items-baseline gap-3"><b className="text-4xl leading-none text-green-600">{pending.length}</b><span className="text-sm leading-snug text-slate-600">{pending.length === 1 ? "cliente vai receber" : "clientes vão receber"}<br />(têm telefone marcado como WhatsApp)</span></div>
              <div className="divide-y divide-slate-100 text-sm">
                <div className="flex justify-between py-2"><span>Clientes ativos</span><b>{overview.activeCustomers}</b></div>
                <div className="flex justify-between py-2"><span>Sem WhatsApp marcado (não recebem)</span><b className="text-slate-500">{Math.max(0, overview.activeCustomers - overview.withWhatsapp)}</b></div>
              </div>
              {alreadyReceived > 0 && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] border-blue-600 bg-blue-50 px-3 py-2.5 text-sm leading-snug">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-blue-600" checked={skipReceived} onChange={(e) => setSkipReceived(e.target.checked)} />
                  <span><strong>Pular quem já recebeu o cardápio hoje</strong><br /><span className="text-slate-600">{alreadyReceived} já {alreadyReceived === 1 ? "recebeu" : "receberam"}. {skipReceived ? `Restam ${pending.length} para enviar agora.` : "Todos vão receber de novo."}</span></span>
                </label>
              )}
              {pending.length === 0 ? (
                <Box tone="muted"><strong>Todo mundo já recebeu hoje.</strong><br />{overview.withWhatsapp} de {overview.withWhatsapp} clientes com WhatsApp receberam o cardápio de hoje.</Box>
              ) : (
                <Box tone="warn">Enviamos <strong>uma mensagem a cada 6 a 12 segundos</strong>, para o WhatsApp não bloquear o número. {pending.length} {pending.length === 1 ? "cliente leva" : "clientes levam"} cerca de <strong>{minutesLabel(pending.length)}</strong>. Mantenha esta janela aberta até terminar.</Box>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <div className="ml-auto flex gap-2">
            {sending ? (
              <>
                <Button type="button" variant="outline" onClick={togglePause}>{paused ? "Continuar" : "Pausar"}</Button>
                <Button type="button" variant="outline" onClick={stop} className="border-rose-200 text-rose-700">Parar envio</Button>
              </>
            ) : phase === "done" ? (
              <>
                {failures.length > 0 && !stopReason && <Button type="button" variant="outline" onClick={retryFailed} className="border-green-300 text-green-800">Tentar de novo os {failures.length}</Button>}
                <Button type="button" onClick={onClose}>Concluir</Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={onClose}>{unreachable ? "Fechar" : "Cancelar"}</Button>
                {!unreachable && overview && (
                  <Button type="button" onClick={() => void run(pending)} disabled={pending.length === 0} className="bg-green-600 hover:bg-green-700">
                    <Send className="mr-2 h-4 w-4" />Enviar para {pending.length} {pending.length === 1 ? "cliente" : "clientes"}
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
