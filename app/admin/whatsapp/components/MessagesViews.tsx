"use client";

import { SendPasswordDialog } from "@/app/admin/customers/components/SendPasswordDialog";
import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Textarea } from "@/app/components/ui/textarea";
import { FormattedText } from "@/app/admin/components/messages/WhatsAppBubble";
import { WhatsAppPhone } from "@/app/admin/components/messages/WhatsAppPhone";
import { EMOJI_GROUPS, toggleWrap, type WrapKind } from "@/lib/messages/format";
import { renderTemplate } from "@/lib/messages/render";
import { AlertCircle, Bold, CheckCircle2, Clock, History, Italic, KeyRound, Loader2, Mail, MessageCircle, RotateCcw, Save, Send, Smile, Strikethrough } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Channel = "whatsapp" | "email";

interface Variable {
  key: string;
  label: string;
  sample: string;
  sensitive?: boolean;
  auto?: boolean;
}

interface ChannelTemplate {
  enabled: boolean;
  subject: string | null;
  body: string;
  customized: boolean;
  default: { subject?: string; body: string };
}

interface MessageType {
  key: string;
  name: string;
  description: string;
  group: string;
  variables: Variable[];
  alwaysOn: boolean;
  channels: Partial<Record<Channel, ChannelTemplate>>;
}

interface Overview {
  types: MessageType[];
  upcoming: { group: string; names: string[] }[];
  signature: { text: string; enabled: boolean };
  storeName: string;
  limits: { BODY_WHATSAPP: number; BODY_EMAIL: number; SUBJECT: number; SIGNATURE: number };
}

interface LogItem {
  id: string;
  typeKey: string;
  typeName: string;
  channel: Channel;
  customerId: string | null;
  customerName: string | null;
  recipient: string;
  status: "sent" | "failed";
  error: string | null;
  createdAt: string;
}

interface LogPage {
  items: LogItem[];
  summary: { sent: number; failed: number };
  next: string | null;
}

const LABEL: Record<Channel, string> = { whatsapp: "WhatsApp", email: "E-mail" };
const ICON = { whatsapp: MessageCircle, email: Mail } as const;

async function call<T>(url: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  try {
    const res = await fetch(url, { cache: "no-store", ...init, headers: init?.body ? { "Content-Type": "application/json" } : undefined });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, message: (json as { error?: string } | null)?.error || "Algo deu errado. Tente de novo." };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, message: "Sem conexão. Tente de novo." };
  }
}

const SELECT = "h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

/* ------------------------------------------------------------------ Modelos */

function TemplatesPanel({ overview, reload }: { overview: Overview; reload: () => Promise<void> }) {
  const { showToast } = useToast();
  const [typeKey, setTypeKey] = useState(overview.types[0]?.key ?? "");
  const type = overview.types.find((t) => t.key === typeKey) ?? overview.types[0];
  const channels = (Object.keys(type.channels) as Channel[]).filter((c) => type.channels[c]);
  const [channel, setChannel] = useState<Channel>(channels[0]);
  const active = channels.includes(channel) ? channel : channels[0];
  const saved = type.channels[active]!;

  const [draft, setDraft] = useState({ enabled: saved.enabled, subject: saved.subject ?? "", body: saved.body });
  const [busy, setBusy] = useState<"save" | "reset" | "test" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // trocar de mensagem ou de canal (ou salvar) recarrega o rascunho com o que está gravado
  useEffect(() => {
    setDraft({ enabled: saved.enabled, subject: saved.subject ?? "", body: saved.body });
    setError(null);
  }, [saved.enabled, saved.subject, saved.body, type.key, active]);

  const limit = active === "whatsapp" ? overview.limits.BODY_WHATSAPP : overview.limits.BODY_EMAIL;
  const dirty = draft.enabled !== saved.enabled || draft.body !== saved.body || (active === "email" && draft.subject !== (saved.subject ?? ""));

  const values = useMemo(() => {
    const sample = Object.fromEntries(type.variables.map((v) => [v.key, v.sample]));
    return { ...sample, loja: overview.storeName };
  }, [type, overview.storeName]);
  const signature = overview.signature.enabled && overview.signature.text ? `\n\n${overview.signature.text}` : "";
  const preview = renderTemplate(draft.body, values) + signature;

  const [emojiOpen, setEmojiOpen] = useState(false);

  /** Troca o texto do campo e devolve a seleção depois que o React desenhar. */
  const setBody = (body: string, selStart: number, selEnd: number) => {
    setDraft((d) => ({ ...d, body }));
    window.requestAnimationFrame(() => {
      const el = bodyRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  };

  const insertText = (text: string) => {
    const el = bodyRef.current;
    const start = el?.selectionStart ?? draft.body.length;
    const end = el?.selectionEnd ?? start;
    setBody(draft.body.slice(0, start) + text + draft.body.slice(end), start + text.length, start + text.length);
  };
  const insert = (key: string) => insertText(`{${key}}`);

  const wrap = (kind: WrapKind) => {
    const el = bodyRef.current;
    const start = el?.selectionStart ?? draft.body.length;
    const end = el?.selectionEnd ?? start;
    const next = toggleWrap(draft.body, start, end, kind);
    setBody(next.text, next.start, next.end);
  };

  const onBodyKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const kind: WrapKind | null = e.key === "b" ? "bold" : e.key === "i" ? "italic" : null;
    if (!kind) return;
    e.preventDefault();
    wrap(kind);
  };

  const url = `/api/admin/messages/${type.key}/${active}`;

  const save = async () => {
    setBusy("save");
    setError(null);
    const result = await call(url, { method: "PUT", body: JSON.stringify({ enabled: draft.enabled, subject: draft.subject, body: draft.body }) });
    setBusy(null);
    if (!result.ok) return setError(result.message);
    await reload();
    showToast("Mensagem salva", "success");
  };

  const reset = async () => {
    setBusy("reset");
    setError(null);
    const result = await call(url, { method: "DELETE" });
    setBusy(null);
    if (!result.ok) return setError(result.message);
    await reload();
    showToast("Texto padrão restaurado", "success");
  };

  const test = async () => {
    setBusy("test");
    setError(null);
    const result = await call<{ recipient: string }>(`${url}/test`, { method: "POST" });
    setBusy(null);
    if (!result.ok) return setError(result.message);
    showToast(`Teste enviado para ${result.data.recipient}`, "success");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <nav aria-label="Tipos de mensagem" className="space-y-4">
        {[...new Set(overview.types.map((t) => t.group))].map((group) => (
          <div key={group} className="space-y-1.5">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group}</p>
            {overview.types
              .filter((t) => t.group === group)
              .map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTypeKey(t.key)}
                  aria-current={t.key === type.key ? "true" : undefined}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${t.key === type.key ? "border-blue-600 bg-blue-50 text-slate-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  <span className="flex-1 font-medium">{t.name}</span>
                  {(Object.keys(t.channels) as Channel[]).map((c) => {
                    const Icon = ICON[c];
                    return <Icon key={c} className={`h-4 w-4 ${t.channels[c]!.enabled ? "text-green-600" : "text-slate-300"}`} aria-label={LABEL[c]} />;
                  })}
                </button>
              ))}
          </div>
        ))}
        {overview.upcoming.map((g) => (
          <div key={g.group} className="space-y-1.5">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.group}</p>
            {g.names.map((name) => (
              <div key={name} className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-sm text-slate-400">
                <span className="flex-1">{name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold">em breve</span>
              </div>
            ))}
          </div>
        ))}
      </nav>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5" aria-label={type.name}>
        <header>
          <h3 className="text-lg font-bold text-slate-900">{type.name}</h3>
          <p className="mt-1 text-sm text-slate-500">{type.description}</p>
        </header>

        {channels.length > 1 && (
          <div className="flex gap-2" role="tablist" aria-label="Canal">
            {channels.map((c) => {
              const Icon = ICON[c];
              return (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={c === active}
                  onClick={() => setChannel(c)}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${c === active ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  <Icon className="h-4 w-4" />
                  {LABEL[c]}
                </button>
              );
            })}
          </div>
        )}

        {/* em tela larga a prévia fica à direita do editor */}
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
        {!type.alwaysOn && (
          <label className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <span>
              <strong>Enviar por {LABEL[active]}</strong>
              <br />
              <span className="text-slate-500">Desligado, o sistema não oferece este canal ao enviar.</span>
            </span>
            <Switch checked={draft.enabled} onCheckedChange={(v) => setDraft((d) => ({ ...d, enabled: v }))} aria-label={`Enviar por ${LABEL[active]}`} />
          </label>
        )}

        {active === "email" && (
          <div className="space-y-1.5">
            <label htmlFor="msg-subject" className="text-xs font-medium uppercase tracking-wide text-slate-500">Assunto</label>
            <Input id="msg-subject" value={draft.subject} maxLength={overview.limits.SUBJECT} onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))} />
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="msg-body" className="text-xs font-medium uppercase tracking-wide text-slate-500">Texto da mensagem</label>
            <span className={`text-xs ${draft.body.length > limit ? "text-rose-600" : "text-slate-400"}`}>{draft.body.length}/{limit}</span>
          </div>
          <div className="relative">
            <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-slate-300 bg-slate-50 px-2 py-1.5" role="toolbar" aria-label="Formatar o texto">
              {([["bold", Bold, "Negrito (Ctrl+B)"], ["italic", Italic, "Itálico (Ctrl+I)"], ["strike", Strikethrough, "Tachado"]] as const).map(([kind, Icon, label]) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => wrap(kind)}
                  title={label}
                  aria-label={label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
              <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden />
              <button
                type="button"
                onClick={() => setEmojiOpen((v) => !v)}
                aria-expanded={emojiOpen}
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Smile className="h-4 w-4" />
                Emojis
              </button>
              <span className="ml-auto hidden text-xs text-slate-400 sm:block">*negrito* · _itálico_ · ~tachado~</span>
            </div>
            {emojiOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 w-[min(22rem,100%)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg" role="group" aria-label="Emojis">
                {EMOJI_GROUPS.map((group) => (
                  <div key={group.name} className="mb-2 last:mb-0">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group.name}</p>
                    <div className="flex flex-wrap gap-0.5">
                      {group.emojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            insertText(emoji);
                            setEmojiOpen(false);
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-xl hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label={`Inserir ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Textarea id="msg-body" ref={bodyRef} rows={11} value={draft.body} onKeyDown={onBodyKeyDown} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} className="rounded-t-none text-[15px] leading-relaxed" />
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-500">Toque para inserir:</span>
            {type.variables.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => insert(v.key)}
                title={v.label}
                className={`rounded-full border px-2.5 py-1 font-mono text-xs ${v.sensitive ? "border-amber-300 bg-amber-50 text-amber-800" : v.auto ? "border-green-300 bg-green-50 text-green-800" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
              >
                {`{${v.key}}`}
              </button>
            ))}
          </div>
          {type.variables.some((v) => v.auto) && (
            <p className="text-xs text-slate-500">Em verde: o sistema preenche sozinho (ex.: o cardápio publicado de hoje).</p>
          )}
          {type.variables.some((v) => v.sensitive) && (
            <p className="text-xs text-slate-500">Em âmbar: dados sensíveis. Vão na mensagem, mas nunca ficam guardados no histórico.</p>
          )}
        </div>

        </div>

        <div className="space-y-1.5 xl:sticky xl:top-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Prévia, com dados de exemplo</p>
          {active === "whatsapp" ? (
            <div className="rounded-2xl bg-slate-100 px-3 py-6"><WhatsAppPhone name={overview.storeName} text={preview} /></div>
          ) : (
            <div className="rounded-2xl bg-slate-100 p-4">
              <div className="mx-auto max-w-[520px] overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="bg-blue-600 px-5 py-3 text-base font-bold text-white">{overview.storeName}</div>
                <p className="border-b border-slate-100 px-5 py-2 text-xs text-slate-500">Assunto: {renderTemplate(draft.subject, values)}</p>
                <div className="whitespace-pre-wrap break-words px-5 py-4 text-sm leading-relaxed text-slate-800"><FormattedText text={preview} /></div>
              </div>
            </div>
          )}
        </div>
        </div>

        {error && (
          <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-900" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={test} disabled={busy !== null || dirty} title={dirty ? "Salve a mensagem para testar" : undefined}>
              {busy === "test" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar teste para mim
            </Button>
            {saved.customized && (
              <Button type="button" variant="outline" size="sm" onClick={reset} disabled={busy !== null}>
                {busy === "reset" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                Restaurar texto padrão
              </Button>
            )}
          </div>
          <Button type="button" size="sm" onClick={save} disabled={busy !== null || !dirty}>
            {busy === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar mensagem
          </Button>
        </div>
      </section>

      <SignatureCard overview={overview} reload={reload} />
    </div>
  );
}

function SignatureCard({ overview, reload }: { overview: Overview; reload: () => Promise<void> }) {
  const { showToast } = useToast();
  const [text, setText] = useState(overview.signature.text);
  const [enabled, setEnabled] = useState(overview.signature.enabled);
  const [busy, setBusy] = useState(false);
  const dirty = text.trim() !== overview.signature.text || enabled !== overview.signature.enabled;

  const save = async () => {
    setBusy(true);
    const result = await call("/api/admin/messages/signature", { method: "PUT", body: JSON.stringify({ text, enabled }) });
    setBusy(false);
    if (!result.ok) return showToast(result.message, "error");
    await reload();
    showToast("Assinatura salva", "success");
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2" aria-label="Assinatura">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">Assinatura</h3>
          <p className="text-sm text-slate-500">Uma frase no fim de todas as mensagens, como “Sabores de Casa · seg a sex, 11h às 14h”.</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Usar assinatura" />
      </div>
      <Input value={text} maxLength={overview.limits.SIGNATURE} onChange={(e) => setText(e.target.value)} placeholder="Ex.: Sabores de Casa · Obrigado pela preferência!" aria-label="Texto da assinatura" disabled={!enabled} />
      <div className="flex justify-end">
        <Button type="button" size="sm" variant="outline" onClick={save} disabled={busy || !dirty}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar assinatura
        </Button>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- Histórico */

const when = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function HistoryPanel({ types }: { types: MessageType[] }) {
  const [filters, setFilters] = useState({ days: "30", type: "", channel: "", status: "", q: "" });
  const [query, setQuery] = useState("");
  const [page, setPage] = useState<LogPage | null>(null);
  const [items, setItems] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resend, setResend] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setFilters((f) => ({ ...f, q: query.trim() })), 400);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(
    async (before?: string) => {
      setLoading(true);
      const params = new URLSearchParams({ days: filters.days });
      (["type", "channel", "status", "q"] as const).forEach((k) => filters[k] && params.set(k, filters[k]));
      if (before) params.set("before", before);
      const result = await call<LogPage>(`/api/admin/messages/log?${params}`);
      setLoading(false);
      if (!result.ok) return setError(result.message);
      setError(null);
      setPage(result.data);
      setItems((prev) => (before ? [...prev, ...result.data.items] : result.data.items));
    },
    [filters]
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select className={SELECT} value={filters.days} onChange={(e) => setFilters((f) => ({ ...f, days: e.target.value }))} aria-label="Período">
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
        </select>
        <select className={SELECT} value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))} aria-label="Tipo de mensagem">
          <option value="">Todos os tipos</option>
          {types.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
        </select>
        <select className={SELECT} value={filters.channel} onChange={(e) => setFilters((f) => ({ ...f, channel: e.target.value }))} aria-label="Canal">
          <option value="">Todos os canais</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">E-mail</option>
        </select>
        <select className={SELECT} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} aria-label="Situação">
          <option value="">Enviadas e com erro</option>
          <option value="sent">Só enviadas</option>
          <option value="failed">Só com erro</option>
        </select>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cliente" aria-label="Buscar cliente" className="h-10 max-w-[220px]" />
      </div>

      {page && (
        <p className="text-sm text-slate-600">
          <strong className="text-green-700">{page.summary.sent}</strong> enviadas ·{" "}
          <strong className={page.summary.failed ? "text-rose-700" : "text-slate-700"}>{page.summary.failed}</strong> com erro
        </p>
      )}

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-900" role="alert">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Quando</th>
              <th className="px-4 py-2.5 font-semibold">Mensagem</th>
              <th className="px-4 py-2.5 font-semibold">Cliente</th>
              <th className="px-4 py-2.5 font-semibold">Canal</th>
              <th className="px-4 py-2.5 font-semibold">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const Icon = ICON[item.channel];
              return (
                <tr key={item.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{when(item.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.typeName}</td>
                  <td className="px-4 py-3">
                    {item.customerName ?? "Cliente removido"}
                    <br />
                    <span className="text-xs text-slate-500">{item.recipient}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-700"><Icon className="h-4 w-4" />{LABEL[item.channel]}</span>
                  </td>
                  <td className="px-4 py-3">
                    {item.status === "sent" ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-green-700"><CheckCircle2 className="h-4 w-4" />Enviada</span>
                    ) : (
                      <span className="text-rose-800">
                        <span className="inline-flex items-center gap-1.5 font-semibold"><AlertCircle className="h-4 w-4" />Erro</span>
                        <br />
                        <span className="text-xs">{item.error}</span>
                        {item.typeKey === "customer_password" && item.customerId && (
                          <>
                            <br />
                            <button type="button" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 underline" onClick={() => setResend({ id: item.customerId!, name: item.customerName ?? "Cliente" })}>
                              <KeyRound className="h-3 w-3" />Enviar nova senha
                            </button>
                          </>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  <Clock className="mx-auto mb-2 h-5 w-5" />
                  Nenhuma mensagem enviada neste período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Carregando…</div>
        )}
      </div>

      {page?.next && !loading && (
        <div className="flex justify-center">
          <Button type="button" variant="outline" size="sm" onClick={() => load(page.next!)}>Carregar mais</Button>
        </div>
      )}

      <p className="text-xs text-slate-500">O histórico guarda só quem recebeu (com o contato escondido em parte) e se deu certo. O texto e a senha nunca são guardados, e os registros somem depois de 90 dias.</p>

      <SendPasswordDialog open={resend !== null} customer={resend} onClose={() => setResend(null)} onSent={() => void load()} />
    </div>
  );
}

/* -------------------------------------------------------------------- Telas */

function useOverview() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const result = await call<Overview>("/api/admin/messages");
    if (result.ok) {
      setOverview(result.data);
      setError(null);
    } else {
      setError(result.message);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return { overview, error, load };
}

function LoadState({ error, load }: { error: string | null; load: () => void }) {
  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">
        {error} <button type="button" className="font-semibold underline" onClick={load}>Tentar de novo</button>
      </div>
    );
  }
  return <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Carregando mensagens…</div>;
}

/** WhatsApp → Mensagens: os textos prontos (WhatsApp e e-mail), com prévia e assinatura. */
export function MessageTemplatesView() {
  const { overview, error, load } = useOverview();
  if (!overview) return <LoadState error={error} load={load} />;
  return <TemplatesPanel overview={overview} reload={load} />;
}

/** WhatsApp → Histórico: o que já foi enviado, por tipo, canal e situação. */
export function MessageHistoryView() {
  const { overview, error, load } = useOverview();
  if (!overview) return <LoadState error={error} load={load} />;
  return <HistoryPanel types={overview.types} />;
}
