"use client";

import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { EMOJI_GROUPS } from "@/lib/messages/format";
import { applyQuickReply, type QuickReply } from "@/lib/whatsapp-quick-replies";
import {
  audienceCounts,
  audienceMembers,
  BROADCAST_TEXT_MAX,
  minutesLabel,
  randomDelay,
  type AudienceId,
  type BroadcastRecipient,
} from "@/lib/whatsapp-broadcast";
import { AlertCircle, CheckCircle2, Clock, Loader2, Megaphone, Search, Send, Smile, Zap } from "lucide-react";
import Link from "next/link";
import * as React from "react";

interface MenuOverview {
  menu: { date: string; title: string | null; items: number } | null;
  whatsapp: { ready: boolean; reason: string | null; fixHref: string | null };
  recipients: { id: string; receivedAt: string | null }[];
}

type Mode = "menu" | "text";
type Phase = "loading" | "ready" | "sending" | "done";
interface Failure {
  id: string;
  name: string;
  error: string;
}
/** O que aconteceu com um cliente: "stop" interrompe a fila inteira (ex.: sem cardápio, WhatsApp fora). */
type Outcome = { kind: "sent" } | { kind: "failed"; error: string } | { kind: "stop"; reason: string };

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const firstName = (name: string) => name.trim().split(/\s+/)[0] || "cliente";

const AUDIENCES: { id: AudienceId; label: string; hint: string }[] = [
  { id: "all", label: "Todos com WhatsApp", hint: "Clientes ativos" },
  { id: "debt", label: "Quem está devendo", hint: "Ficha em aberto" },
  { id: "idle", label: "Não pediram hoje", hint: "Sem compra desde a meia-noite" },
  { id: "pick", label: "Escolher clientes…", hint: "Marcar um a um na lista" },
];

function Box({ tone, children }: { tone: "warn" | "bad" | "ok" | "muted"; children: React.ReactNode }) {
  const style = {
    warn: "border-amber-300 bg-amber-50 text-amber-900",
    bad: "border-rose-200 bg-rose-50 text-rose-900",
    ok: "border-green-200 bg-green-50 text-green-900",
    muted: "border-slate-200 bg-slate-50 text-slate-700",
  }[tone];
  const Icon = tone === "ok" ? CheckCircle2 : tone === "warn" ? Clock : AlertCircle;
  return (
    <div className={`flex gap-3 rounded-xl border px-3 py-2.5 text-[13px] leading-relaxed ${style}`} role={tone === "bad" ? "alert" : undefined}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

function Counter({ value, label, tone = "text-slate-900" }: { value: number; label: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 px-2 py-2 text-center">
      <b className={`block text-2xl ${tone}`}>{value}</b>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

/**
 * Envio em massa da tela Conversas: o cardápio de hoje ou uma mensagem escrita na hora, para todos os clientes
 * com WhatsApp ou só para um público (quem deve, quem não pediu hoje, ou clientes escolhidos).
 * Cada cliente recebe sozinho, um de cada vez, com intervalo entre as mensagens.
 */
export function BulkSendDialog({ open, onClose, onSent }: { open: boolean; onClose: () => void; onSent?: () => void }) {
  const [phase, setPhase] = React.useState<Phase>("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [people, setPeople] = React.useState<BroadcastRecipient[]>([]);
  const [menuInfo, setMenuInfo] = React.useState<MenuOverview | null>(null);
  const [replies, setReplies] = React.useState<QuickReply[]>([]);

  const [mode, setMode] = React.useState<Mode>("menu");
  const [audience, setAudience] = React.useState<AudienceId>("all");
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [pickQuery, setPickQuery] = React.useState("");
  const [skipReceived, setSkipReceived] = React.useState(true);
  const [text, setText] = React.useState("");
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [repliesOpen, setRepliesOpen] = React.useState(false);

  const [sent, setSent] = React.useState(0);
  const [failures, setFailures] = React.useState<Failure[]>([]);
  const [total, setTotal] = React.useState(0);
  const [current, setCurrent] = React.useState<string | null>(null);
  const [stopReason, setStopReason] = React.useState<string | null>(null);
  const [paused, setPaused] = React.useState(false);
  const [lastRun, setLastRun] = React.useState<{ mode: Mode; text: string; force: boolean }>({ mode: "menu", text: "", force: false });

  const stopRef = React.useRef(false);
  const pausedRef = React.useRef(false);
  const runningRef = React.useRef(false);
  const textArea = React.useRef<HTMLTextAreaElement>(null);

  const load = React.useCallback(async (quiet = false) => {
    if (!quiet) {
      setPhase("loading");
      setLoadError(null);
    }
    const [audiences, menu] = await Promise.allSettled([
      fetch("/api/admin/whatsapp/broadcast", { cache: "no-store" }).then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || "Não foi possível carregar os clientes.");
        return body as { recipients: BroadcastRecipient[] };
      }),
      fetch("/api/admin/menu-broadcast", { cache: "no-store" }).then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || "Não foi possível verificar o cardápio.");
        return body as MenuOverview;
      }),
    ]);
    if (menu.status === "fulfilled") setMenuInfo(menu.value);
    if (audiences.status === "fulfilled") {
      setPeople(audiences.value.recipients);
      if (!quiet) setPhase("ready");
    } else if (!quiet) {
      setLoadError(audiences.reason instanceof Error ? audiences.reason.message : "Erro ao carregar os clientes.");
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
    setAudience("all");
    setPicked(new Set());
    setPickQuery("");
    setSkipReceived(true);
    void load();
    fetch("/api/admin/whatsapp/quick-replies", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { replies?: QuickReply[] } | null) => b?.replies && setReplies(b.replies))
      .catch(() => undefined);
  }, [open, load]);

  // Fechar a aba no meio do envio interrompe: avisa antes
  React.useEffect(() => {
    if (phase !== "sending") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  const receivedAt = React.useMemo(() => new Map((menuInfo?.recipients ?? []).map((r) => [r.id, r.receivedAt])), [menuInfo]);
  const counts = React.useMemo(() => audienceCounts(people), [people]);
  const members = React.useMemo(() => audienceMembers(people, audience, picked), [people, audience, picked]);
  const alreadyReceived = mode === "menu" ? members.filter((m) => receivedAt.get(m.id)).length : 0;
  const queue = mode === "menu" && skipReceived ? members.filter((m) => !receivedAt.get(m.id)) : members;
  const visiblePeople = React.useMemo(() => {
    const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const q = fold(pickQuery.trim());
    return q ? people.filter((p) => fold(p.name).includes(q)) : people;
  }, [people, pickQuery]);

  const cleanText = text.replace(/\r\n/g, "\n").trim();
  const textTooLong = text.length > BROADCAST_TEXT_MAX;
  const previewName = queue[0]?.name ?? "Maria";

  const insertAtCursor = (snippet: string) => {
    const el = textArea.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + snippet + text.slice(end);
    setText(next);
    window.setTimeout(() => {
      el?.focus();
      el?.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 0);
  };

  const sendOne = async (person: BroadcastRecipient, kind: Mode, body: string, force: boolean): Promise<Outcome> => {
    if (kind === "menu") {
      const res = await fetch(`/api/admin/customers/${person.id}/send-menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erro ao enviar.");
      // "já recebeu" = alguém enviou por outro lado nesse meio tempo: conta como feito
      if (data.status === "sent" || data.status === "already_received") return { kind: "sent" };
      if (data.status === "unavailable" || data.status === "no_menu") return { kind: "stop", reason: data.reason ?? "O envio não pode continuar." };
      return { kind: "failed", error: data.status === "failed" ? data.result?.error ?? "Não enviado." : data.reason ?? "Não enviado." };
    }
    const res = await fetch(`/api/admin/whatsapp/conversations/${person.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: applyQuickReply(body, person.name) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { kind: "failed", error: data.error || "Não enviado." };
    return { kind: "sent" };
  };

  const run = async (list: BroadcastRecipient[], kind: Mode, body: string, force: boolean) => {
    if (runningRef.current || list.length === 0) return;
    runningRef.current = true;
    stopRef.current = false;
    setLastRun({ mode: kind, text: body, force });
    setPhase("sending");
    setTotal(list.length);
    setSent(0);
    setFailures([]);
    setStopReason(null);

    let okCount = 0;
    const failed: Failure[] = [];
    let consecutiveErrors = 0;

    for (let i = 0; i < list.length; i++) {
      while (pausedRef.current && !stopRef.current) await wait(300);
      if (stopRef.current) break;
      const person = list[i];
      setCurrent(person.name);
      let outcome: Outcome;
      try {
        outcome = await sendOne(person, kind, body, force);
      } catch (err) {
        outcome = { kind: "failed", error: err instanceof Error ? err.message : "Erro ao enviar." };
      }
      if (outcome.kind === "sent") {
        consecutiveErrors = 0;
        okCount += 1;
        setSent(okCount);
      } else if (outcome.kind === "stop") {
        setStopReason(outcome.reason);
        break;
      } else {
        consecutiveErrors += 1;
        failed.push({ id: person.id, name: person.name, error: outcome.error });
        setFailures([...failed]);
        if (consecutiveErrors >= 3) {
          setStopReason("Vários envios seguidos falharam. Confira o WhatsApp e a internet e tente de novo.");
          break;
        }
      }
      if (i < list.length - 1 && !stopRef.current) await wait(randomDelay());
    }

    runningRef.current = false;
    setCurrent(null);
    setPhase("done");
    void load(true); // atualiza quem já recebeu o cardápio, para "tentar de novo" e reabrir contarem certo
    onSent?.();
  };

  const retryFailed = () => {
    const ids = new Set(failures.map((f) => f.id));
    void run(people.filter((p) => ids.has(p.id)), lastRun.mode, lastRun.text, lastRun.force);
  };

  const stop = () => {
    stopRef.current = true;
    pausedRef.current = false;
    setPaused(false);
    setStopReason((r) => r ?? "Envio interrompido. Quem já recebeu não recebe de novo.");
  };

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const sending = phase === "sending";
  const processed = sent + failures.length;
  const pct = total ? Math.round((processed / total) * 100) : 0;
  const left = Math.max(0, total - processed);
  const whatsappDown = menuInfo && !menuInfo.whatsapp.ready;
  const noMenu = mode === "menu" && menuInfo && !menuInfo.menu;
  const canSend = !whatsappDown && !noMenu && queue.length > 0 && (mode === "menu" || (cleanText.length > 0 && !textTooLong));
  const noun = (n: number) => (n === 1 ? "cliente" : "clientes");

  const title = sending ? (lastRun.mode === "menu" ? "Enviando o cardápio…" : "Enviando a mensagem…") : phase === "done" ? "Envio concluído" : "Envio em massa";
  const subtitle = sending ? "Mantenha esta janela aberta até terminar." : "Cada cliente recebe a mensagem sozinho, uma de cada vez, pelo WhatsApp do estabelecimento.";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !sending && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden sm:max-w-[640px]" onInteractOutside={(e) => sending && e.preventDefault()} onEscapeKeyDown={(e) => sending && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}>
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            {title}
          </DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-6 py-4">
          {loadError ? (
            <Box tone="bad">{loadError}</Box>
          ) : phase === "loading" ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Verificando…</div>
          ) : sending ? (
            <>
              <div className="flex justify-between text-sm"><strong>{processed} de {total}</strong><span className="text-slate-500">{paused ? "pausado" : `faltam cerca de ${minutesLabel(left)}`}</span></div>
              <div className="h-3 overflow-hidden rounded-full bg-green-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all" style={{ width: `${pct}%` }} /></div>
              <p className="flex items-center gap-2 text-sm text-slate-600">{paused ? <Clock className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}{current ? <>{paused ? "Pausado antes de " : "Enviando para "}<strong className="text-slate-900">{current}</strong>…</> : "Terminando…"}</p>
              <div className="grid grid-cols-3 gap-2">
                <Counter value={sent} label="enviados" tone="text-green-700" />
                <Counter value={failures.length} label="com erro" tone={failures.length ? "text-rose-600" : "text-slate-900"} />
                <Counter value={left} label="faltam" />
              </div>
            </>
          ) : phase === "done" ? (
            <>
              {stopReason && <Box tone="bad">{stopReason}</Box>}
              <div className="grid grid-cols-3 gap-2">
                <Counter value={sent} label="enviados" tone="text-green-700" />
                <Counter value={failures.length} label="com erro" tone={failures.length ? "text-rose-600" : "text-slate-900"} />
                <Counter value={Math.max(0, total - sent - failures.length)} label="não enviados" tone="text-slate-500" />
              </div>
              {failures.length === 0 && !stopReason && (
                <Box tone="ok"><strong>{sent} {sent === 1 ? "cliente recebeu" : "clientes receberam"} {lastRun.mode === "menu" ? "o cardápio" : "a mensagem"}.</strong><br />{lastRun.mode === "menu" ? "O resultado de cada envio está em Histórico de envios." : "A mensagem aparece na conversa de cada cliente."}</Box>
              )}
              {failures.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Quem não recebeu</p>
                  <ul className="max-h-44 divide-y divide-slate-100 overflow-y-auto text-sm">
                    {failures.map((f) => (<li key={f.id} className="flex items-start gap-2 py-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden /><span><strong>{f.name}</strong><br /><span className="text-xs text-slate-500">{f.error}</span></span></li>))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              {/* o que enviar */}
              <div role="group" aria-label="O que enviar" className="flex gap-0.5 rounded-[10px] bg-slate-100 p-[3px]">
                {([["menu", "Cardápio de hoje"], ["text", "Mensagem personalizada"]] as const).map(([id, label]) => (
                  <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)} className={`h-9 flex-1 rounded-lg text-[13.5px] font-semibold transition-colors ${mode === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{label}</button>
                ))}
              </div>

              {whatsappDown && (
                <Box tone="bad"><strong>{menuInfo?.whatsapp.reason}</strong>{menuInfo?.whatsapp.fixHref && <>{" "}<Link href={menuInfo.whatsapp.fixHref} className="font-semibold underline">Resolver</Link></>}</Box>
              )}

              {mode === "menu" ? (
                noMenu ? (
                  <Box tone="warn"><strong>O cardápio de hoje ainda não foi publicado.</strong><br />Publique o de hoje (clique no dia de hoje na semana) e tente de novo.</Box>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                    <p className="text-[13px] font-bold text-slate-900">{menuInfo?.menu?.title || "Cardápio de hoje"}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{menuInfo?.menu ? `${menuInfo.menu.items} ${menuInfo.menu.items === 1 ? "item" : "itens"}. ` : ""}É o mesmo texto do envio individual, já com o nome de cada cliente.</p>
                  </div>
                )
              ) : (
                <div className="space-y-2">
                  <div className={`overflow-hidden rounded-xl border bg-white ${textTooLong ? "border-rose-400" : "border-slate-300 focus-within:border-primary"}`}>
                    <textarea
                      ref={textArea}
                      rows={3}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      aria-label="Mensagem para os clientes"
                      placeholder="Escreva a mensagem. Use {nome} para o primeiro nome de cada cliente."
                      className="block h-[84px] w-full resize-none border-0 bg-transparent px-3.5 pb-1 pt-2.5 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400"
                    />
                    <div className="flex items-center gap-1 px-1.5 pb-1.5 pt-1">
                      <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                        <PopoverTrigger asChild>
                          <button type="button" aria-label="Emojis" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Smile className="h-[18px] w-[18px]" /></button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="z-[80] max-h-72 w-[22rem] max-w-[90vw] overflow-y-auto border-slate-200 bg-white p-3 shadow-lg">
                          {EMOJI_GROUPS.map((g) => (
                            <div key={g.name} className="mb-2 last:mb-0">
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{g.name}</p>
                              <div className="flex flex-wrap gap-0.5">
                                {g.emojis.map((e) => <button key={e} type="button" aria-label={`Inserir ${e}`} onClick={() => { insertAtCursor(e); setEmojiOpen(false); }} className="flex h-9 w-9 items-center justify-center rounded-md text-xl hover:bg-slate-100">{e}</button>)}
                              </div>
                            </div>
                          ))}
                        </PopoverContent>
                      </Popover>
                      <button type="button" onClick={() => insertAtCursor("{nome}")} className="h-8 rounded-lg px-2.5 text-[12.5px] font-semibold text-blue-700 hover:bg-blue-50">Inserir {"{nome}"}</button>
                      <Popover open={repliesOpen} onOpenChange={setRepliesOpen}>
                        <PopoverTrigger asChild>
                          <button type="button" className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-[12.5px] font-semibold text-blue-700 hover:bg-blue-50"><Zap className="h-3.5 w-3.5" aria-hidden />Respostas rápidas</button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="z-[80] max-h-64 w-80 max-w-[90vw] overflow-y-auto border-slate-200 bg-white p-1 shadow-lg">
                          {replies.length === 0 ? (
                            <p className="px-3 py-3 text-sm text-slate-500">Nenhuma resposta criada ainda. <Link href="/admin/whatsapp/respostas" className="font-semibold text-blue-600 hover:underline">Criar</Link></p>
                          ) : (
                            replies.map((r) => (
                              <button key={r.id} type="button" onClick={() => { insertAtCursor(r.text); setRepliesOpen(false); }} className="block w-full rounded-md px-3 py-2 text-left hover:bg-slate-50">
                                <b className="block truncate text-[13px] text-slate-900">{r.title}</b>
                                <span className="block truncate text-xs text-slate-500">{r.text}</span>
                              </button>
                            ))
                          )}
                        </PopoverContent>
                      </Popover>
                      <span className={`ml-auto pr-2 text-[11.5px] ${textTooLong ? "font-semibold text-rose-700" : "text-slate-500"}`}>{text.length.toLocaleString("pt-BR")} de {BROADCAST_TEXT_MAX.toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                  {cleanText && (
                    <div className="flex items-start gap-3 rounded-xl bg-[#efeae2] px-3 py-2.5">
                      <span className="w-16 shrink-0 pt-1.5 text-[11.5px] font-semibold leading-tight text-slate-600">Prévia para {firstName(previewName)}</span>
                      <div className="max-w-full whitespace-pre-wrap break-words rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-[13px] leading-snug text-slate-900 shadow-sm">{applyQuickReply(cleanText, previewName)}</div>
                    </div>
                  )}
                </div>
              )}

              {/* quem recebe */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Quem recebe</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {AUDIENCES.map((a) => {
                    const on = audience === a.id;
                    const count = a.id === "pick" ? picked.size : counts[a.id];
                    return (
                      <button key={a.id} type="button" aria-pressed={on} onClick={() => setAudience(a.id)} className={`flex min-h-14 items-center gap-2.5 rounded-xl px-3 py-2 text-left ${on ? "border-[1.5px] border-green-700 bg-green-50" : "border border-slate-200 bg-white hover:bg-slate-50"}`}>
                        <span className={`h-[18px] w-[18px] shrink-0 rounded-full bg-white ${on ? "border-[5px] border-green-700" : "border-[1.5px] border-slate-400"}`} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <b className="block text-[13.5px] text-slate-900">{a.label}</b>
                          <span className="block text-xs text-slate-500">{a.hint}</span>
                        </span>
                        <span className="text-[15px] font-bold tabular-nums text-slate-900">{a.id === "pick" && count === 0 ? "—" : count}</span>
                      </button>
                    );
                  })}
                </div>
                {audience === "pick" && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3">
                      <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                      <input value={pickQuery} onChange={(e) => setPickQuery(e.target.value)} placeholder="Buscar cliente" aria-label="Buscar cliente" className="h-10 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
                      <button type="button" onClick={() => setPicked(new Set(visiblePeople.map((p) => p.id)))} className="shrink-0 text-xs font-semibold text-blue-700 hover:underline">Marcar todos</button>
                      <button type="button" onClick={() => setPicked(new Set())} className="shrink-0 text-xs font-semibold text-slate-600 hover:underline">Limpar</button>
                    </div>
                    <ul className="max-h-44 divide-y divide-slate-100 overflow-y-auto">
                      {visiblePeople.length === 0 && <li className="px-3 py-3 text-sm text-slate-500">Nenhum cliente encontrado.</li>}
                      {visiblePeople.map((p) => (
                        <li key={p.id}>
                          <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-green-700"
                              checked={picked.has(p.id)}
                              onChange={(e) => setPicked((prev) => { const next = new Set(prev); if (e.target.checked) next.add(p.id); else next.delete(p.id); return next; })}
                            />
                            <span className="truncate text-slate-900">{p.name}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {mode === "menu" && alreadyReceived > 0 && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] border-blue-600 bg-blue-50 px-3 py-2.5 text-sm leading-snug">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-blue-600" checked={skipReceived} onChange={(e) => setSkipReceived(e.target.checked)} />
                  <span><strong className="text-slate-900">Pular quem já recebeu o cardápio hoje</strong><br /><span className="text-slate-600">{alreadyReceived} já {alreadyReceived === 1 ? "recebeu" : "receberam"}. {skipReceived ? `Restam ${queue.length} para enviar agora.` : "Todos vão receber de novo."}</span></span>
                </label>
              )}

              {queue.length === 0 && members.length > 0 && mode === "menu" ? (
                <Box tone="muted"><strong>Todo mundo deste público já recebeu hoje.</strong></Box>
              ) : members.length === 0 ? (
                <Box tone="muted">{audience === "pick" ? "Marque pelo menos um cliente na lista." : "Nenhum cliente neste público agora."}</Box>
              ) : (
                <Box tone="warn">Uma mensagem a cada <strong>6 a 12 segundos</strong>, para o WhatsApp não bloquear o número. {queue.length} {noun(queue.length)} {queue.length === 1 ? "leva" : "levam"} cerca de <strong>{minutesLabel(queue.length)}</strong>. Deixe esta janela aberta até terminar.</Box>
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
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                {phase === "ready" && (
                  <Button type="button" onClick={() => void run(queue, mode, cleanText, !skipReceived)} disabled={!canSend} className="bg-green-700 hover:bg-green-800">
                    <Send className="mr-2 h-4 w-4" />Enviar para {queue.length} {noun(queue.length)}
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
