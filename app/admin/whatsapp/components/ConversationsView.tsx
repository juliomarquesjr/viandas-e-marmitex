"use client";

import { FormattedText } from "@/app/admin/components/messages/WhatsAppBubble";
import { SendMenuDialog } from "@/app/admin/customers/components/SendMenuDialog";
import { SendPasswordDialog } from "@/app/admin/customers/components/SendPasswordDialog";
import { Button } from "@/app/components/ui/button";
import { EMOJI_GROUPS } from "@/lib/messages/format";
import { messageLabel, SYSTEM_LABEL } from "@/lib/whatsapp-chat";
import { AlertCircle, ArrowLeft, Check, CheckCheck, Image as ImageIcon, KeyRound, Loader2, MapPin, MessageCircle, Mic, Paperclip, Search, Send, Smile, Video } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Conversation {
  customerId: string;
  name: string;
  phone: string | null;
  lastType: string;
  lastBody: string | null;
  lastFromMe: boolean;
  lastSystemType: string | null;
  lastAt: string;
  unread: number;
}
interface Message {
  id: string;
  fromMe: boolean;
  type: string;
  body: string | null;
  systemType: string | null;
  status: string;
  error: string | null;
  sentByName: string | null;
  createdAt: string;
}
interface CustomerInfo {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  phoneIsWhatsapp: boolean;
  createdAt: string;
}

const TZ = "America/Sao_Paulo";
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
function dayLabel(iso: string): string {
  const key = dayKey(iso);
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86_400_000).toISOString());
  if (key === today) return "Hoje";
  if (key === yesterday) return "Ontem";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: TZ });
}
function listTime(iso: string): string {
  const key = dayKey(iso);
  if (key === dayKey(new Date().toISOString())) return hhmm(iso);
  if (key === dayKey(new Date(Date.now() - 86_400_000).toISOString())) return "Ontem";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: TZ });
}
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

const QUICK = ["Obrigado pelo contato! 😊", "Já vamos separar o seu pedido 🍽️", "Estamos fechados agora. Voltamos amanhã! 😊"];

function Ticks({ status }: { status: string }) {
  if (status === "failed") return <AlertCircle className="inline h-3.5 w-3.5 text-rose-600" aria-label="Não enviada" />;
  if (status === "read") return <CheckCheck className="inline h-3.5 w-3.5 text-sky-500" aria-label="Lida" />;
  if (status === "delivered") return <CheckCheck className="inline h-3.5 w-3.5 text-slate-400" aria-label="Entregue" />;
  return <Check className="inline h-3.5 w-3.5 text-slate-400" aria-label="Enviada" />;
}

function MediaIcon({ type }: { type: string }) {
  const cls = "mr-1 inline h-3.5 w-3.5 align-[-2px]";
  if (type === "image") return <ImageIcon className={cls} aria-hidden />;
  if (type === "audio") return <Mic className={cls} aria-hidden />;
  if (type === "video") return <Video className={cls} aria-hidden />;
  if (type === "location") return <MapPin className={cls} aria-hidden />;
  if (type === "document") return <Paperclip className={cls} aria-hidden />;
  return null;
}

function Bubble({ m }: { m: Message }) {
  const system = m.systemType ? SYSTEM_LABEL[m.systemType] ?? "Mensagem do sistema" : null;
  const text = m.type === "text" ? m.body : null;
  return (
    <div className={`max-w-[72%] rounded-xl px-3 pb-1 pt-2 text-[13.5px] leading-relaxed shadow-sm ${m.fromMe ? "self-end rounded-tr-sm bg-[#d9fdd3]" : "self-start rounded-tl-sm bg-white"}`}>
      {system && <span className="mb-1 inline-block rounded-md bg-green-200 px-1.5 py-px text-[10.5px] font-bold text-green-900">Enviado pelo sistema · {system}</span>}
      {m.fromMe && !system && m.sentByName && <span className="mb-0.5 block text-[10.5px] font-semibold text-slate-500">{m.sentByName}</span>}
      <div className="whitespace-pre-wrap break-words">
        {text ? (
          <FormattedText text={text} />
        ) : m.type !== "text" ? (
          <span className={m.type === "other" ? "italic text-slate-500" : ""}><MediaIcon type={m.type} />{messageLabel(m.type, m.body)}</span>
        ) : (
          <span className="italic text-slate-500">Texto não guardado (contém dado sensível).</span>
        )}
      </div>
      <p className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-slate-500">
        {hhmm(m.createdAt)}
        {m.fromMe && <Ticks status={m.status} />}
      </p>
      {m.status === "failed" && m.error && <p className="text-[11px] text-rose-700">{m.error}</p>}
    </div>
  );
}

/** Tela Conversas: lista, conversa e dados do cliente, para os clientes que têm WhatsApp. */
export function ConversationsView() {
  const [list, setList] = useState<Conversation[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "awaiting">("all");
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [more, setMore] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);

  const [connected, setConnected] = useState<boolean | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [menuFor, setMenuFor] = useState(false);
  const [passwordFor, setPasswordFor] = useState(false);

  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const textArea = useRef<HTMLTextAreaElement>(null);

  // abre já na conversa do cliente quando vem de "Ver conversa" (?cliente=)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("cliente");
    if (id) setSelected(id);
  }, []);
  useEffect(() => {
    const t = window.setTimeout(() => setQ(query.trim()), 350);
    return () => window.clearTimeout(t);
  }, [query]);

  const loadList = useCallback(async () => {
    try {
      const params = new URLSearchParams({ filter });
      if (q) params.set("q", q);
      const res = await fetch(`/api/admin/whatsapp/conversations?${params}`, { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Não foi possível carregar as conversas.");
      setList(body.conversations);
      setListError(null);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Erro ao carregar as conversas.");
    }
  }, [filter, q]);

  useEffect(() => {
    void loadList();
    const t = window.setInterval(() => document.visibilityState === "visible" && void loadList(), 8000);
    return () => window.clearInterval(t);
  }, [loadList]);

  // a conexão do WhatsApp (para avisar e travar o envio)
  useEffect(() => {
    const check = () =>
      fetch("/api/admin/whatsapp", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((s: { state?: string } | null) => s && setConnected(s.state === "open"))
        .catch(() => undefined);
    void check();
    const t = window.setInterval(check, 60_000);
    return () => window.clearInterval(t);
  }, []);

  const loadThread = useCallback(
    async (id: string, quiet = false) => {
      if (!quiet) setLoadingThread(true);
      try {
        const res = await fetch(`/api/admin/whatsapp/conversations/${id}`, { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Não foi possível carregar a conversa.");
        setCustomer(body.customer);
        setMessages((prev) => {
          // mantém as mensagens antigas já carregadas e troca as recentes
          const first = body.messages[0]?.createdAt;
          const older = first ? prev.filter((m) => m.createdAt < first) : [];
          return [...older, ...body.messages];
        });
        if (!quiet) setMore(body.more);
        setThreadError(null);
        if (body.messages.some((m: Message) => !m.fromMe)) {
          fetch(`/api/admin/whatsapp/conversations/${id}/read`, { method: "POST" })
            .then(() => {
              window.dispatchEvent(new Event("whatsapp-unread-changed"));
              void loadList();
            })
            .catch(() => undefined);
        }
      } catch (err) {
        setThreadError(err instanceof Error ? err.message : "Erro ao carregar a conversa.");
      } finally {
        setLoadingThread(false);
      }
    },
    [loadList]
  );

  useEffect(() => {
    if (!selected) return;
    setMessages([]);
    setCustomer(null);
    setMore(false);
    setText("");
    setSendError(null);
    stick.current = true;
    void loadThread(selected);
    const url = new URL(window.location.href);
    url.searchParams.set("cliente", selected);
    window.history.replaceState(null, "", url);
    const t = window.setInterval(() => document.visibilityState === "visible" && void loadThread(selected, true), 5000);
    return () => window.clearInterval(t);
  }, [selected, loadThread]);

  // rola para a mensagem mais nova (se a pessoa não subiu para ler o passado)
  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const loadOlder = async () => {
    if (!selected || messages.length === 0) return;
    const res = await fetch(`/api/admin/whatsapp/conversations/${selected}?before=${encodeURIComponent(messages[0].createdAt)}`, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body) return;
    stick.current = false;
    setMessages((prev) => [...body.messages, ...prev]);
    setMore(body.more);
  };

  const send = async () => {
    const value = text.trim();
    if (!value || !selected || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/admin/whatsapp/conversations/${selected}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: value }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Não foi possível enviar.");
      stick.current = true;
      setMessages((prev) => [...prev, body.message]);
      setText("");
      void loadList();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Não foi possível enviar.");
    } finally {
      setSending(false);
    }
  };

  const groups = useMemo(() => {
    const out: { key: string; label: string; items: Message[] }[] = [];
    for (const m of messages) {
      const key = dayKey(m.createdAt);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(m);
      else out.push({ key, label: dayLabel(m.createdAt), items: [m] });
    }
    return out;
  }, [messages]);

  const canSend = customer?.phoneIsWhatsapp && connected !== false;
  const picked = list?.find((c) => c.customerId === selected);

  return (
    <div className="flex h-[calc(100vh-15rem)] min-h-[560px] overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]">
      {/* lista */}
      <section aria-label="Lista de conversas" className={`${selected ? "hidden md:flex" : "flex"} w-full flex-col border-r border-[color:var(--border)] md:w-[320px] md:shrink-0 xl:w-[340px]`}>
        <div className="space-y-2.5 p-3">
          <label className="flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-500 focus-within:border-primary">
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cliente ou mensagem" className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" aria-label="Buscar cliente ou mensagem" />
          </label>
          <div className="flex gap-1.5" role="group" aria-label="Filtro">
            {([["all", "Todas"], ["unread", "Não lidas"], ["awaiting", "Aguardando resposta"]] as const).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${filter === id ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {listError ? (
            <p className="p-4 text-sm text-rose-700" role="alert">{listError}</p>
          ) : list === null ? (
            <div className="flex justify-center py-10 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : list.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500">{q || filter !== "all" ? "Nenhuma conversa encontrada." : "As conversas aparecem aqui quando um cliente com WhatsApp escrever ou receber uma mensagem do sistema."}</p>
          ) : (
            list.map((c) => (
              <button key={c.customerId} type="button" onClick={() => setSelected(c.customerId)} aria-current={c.customerId === selected ? "true" : undefined} className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${c.customerId === selected ? "bg-blue-50" : ""}`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-800">{initials(c.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <b className="truncate text-sm">{c.name}</b>
                    <span className={`shrink-0 text-[11.5px] ${c.unread ? "font-bold text-green-600" : "text-slate-500"}`}>{listTime(c.lastAt)}</span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] text-slate-500">
                      {c.lastFromMe ? "Você: " : ""}
                      {c.lastSystemType ? SYSTEM_LABEL[c.lastSystemType] ?? "Mensagem do sistema" : messageLabel(c.lastType, c.lastBody) || "Mensagem"}
                    </span>
                    {c.unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-green-600 px-1.5 text-[11.5px] font-bold text-white">{c.unread}</span>}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </section>

      {/* conversa */}
      <section aria-label="Conversa" className={`${selected ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
        {!selected ? (
          <div className="m-auto max-w-xs px-6 text-center text-slate-500">
            <MessageCircle className="mx-auto mb-3 h-10 w-10 text-slate-300" aria-hidden />
            <p className="text-sm">Escolha uma conversa para ver as mensagens.</p>
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-center gap-3 border-b border-[color:var(--border)] px-4 py-2.5">
              <button type="button" className="md:hidden" onClick={() => setSelected(null)} aria-label="Voltar para a lista"><ArrowLeft className="h-5 w-5" /></button>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-800">{initials(customer?.name ?? picked?.name ?? "?")}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{customer?.name ?? picked?.name ?? "…"}</p>
                <p className="text-xs text-slate-500">{customer?.phone ?? picked?.phone ?? ""}</p>
              </div>
              {customer && (
                <>
                  <Link href={`/admin/customers/${customer.id}`} className="inline-flex min-h-[36px] items-center rounded-lg border border-slate-300 px-3 text-[13px] font-semibold hover:bg-slate-50">Ver ficha</Link>
                  {customer.phoneIsWhatsapp && <Button type="button" variant="outline" size="sm" onClick={() => setMenuFor(true)} className="border-green-300 bg-green-50 text-green-800 hover:bg-green-100">Enviar cardápio</Button>}
                  <Button type="button" variant="outline" size="sm" onClick={() => setPasswordFor(true)}><KeyRound className="mr-1.5 h-4 w-4" />Enviar senha</Button>
                </>
              )}
            </header>

            {connected === false && (
              <p className="flex items-start gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2 text-[13px] text-rose-900" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span><b>O WhatsApp do estabelecimento está desconectado.</b> O histórico continua aqui; para responder, <Link href="/admin/settings?tab=whatsapp" className="font-semibold underline">reconecte</Link>.</span>
              </p>
            )}
            {customer && !customer.phoneIsWhatsapp && (
              <p className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[13px] text-amber-900"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span><b>{customer.name.split(" ")[0]} não tem WhatsApp marcado.</b> Marque “Este número é WhatsApp” no cadastro para enviar mensagens.</span></p>
            )}

            <div
              ref={scroller}
              onScroll={(e) => {
                const el = e.currentTarget;
                stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
              }}
              className="flex flex-1 flex-col gap-1.5 overflow-y-auto bg-[#efeae2] px-5 py-4"
              style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.045) 1px, transparent 1px)", backgroundSize: "14px 14px" }}
            >
              {more && <button type="button" onClick={loadOlder} className="mx-auto mb-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">Carregar mensagens anteriores</button>}
              {loadingThread && messages.length === 0 && <div className="m-auto text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /></div>}
              {threadError && <p className="m-auto rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">{threadError} <button type="button" className="font-semibold underline" onClick={() => selected && loadThread(selected)}>Tentar de novo</button></p>}
              {!loadingThread && !threadError && messages.length === 0 && customer && (
                <div className="m-auto max-w-xs rounded-xl bg-white/80 px-5 py-6 text-center text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">Nenhuma mensagem com {customer.name.split(" ")[0]} ainda</p>
                  <p className="mt-1">Comece enviando o cardápio de hoje ou escreva uma mensagem.</p>
                </div>
              )}
              {groups.map((g) => (
                <div key={g.key} className="flex flex-col gap-1.5">
                  <span className="my-1 self-center rounded-lg bg-white px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 shadow-sm">{g.label}</span>
                  {g.items.map((m) => <Bubble key={m.id} m={m} />)}
                </div>
              ))}
            </div>

            <footer className="border-t border-[color:var(--border)] bg-slate-100 px-4 pb-3 pt-2">
              {sendError && <p className="mb-2 flex items-center gap-2 text-[13px] text-rose-700" role="alert"><AlertCircle className="h-4 w-4" aria-hidden />{sendError}</p>}
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-bold text-slate-500">Respostas rápidas</span>
                {QUICK.map((r) => (
                  <button key={r} type="button" disabled={!canSend} onClick={() => { setText((t) => (t ? `${t} ${r}` : r)); textArea.current?.focus(); }} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50">{r}</button>
                ))}
              </div>
              <div className="relative flex items-end gap-2">
                <button type="button" onClick={() => setEmojiOpen((v) => !v)} aria-expanded={emojiOpen} aria-label="Emojis" disabled={!canSend} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-white disabled:opacity-50"><Smile className="h-5 w-5" /></button>
                {emojiOpen && (
                  <div className="absolute bottom-full left-0 z-20 mb-2 w-[22rem] max-w-full rounded-xl border border-slate-200 bg-white p-3 shadow-lg" role="group" aria-label="Emojis">
                    {EMOJI_GROUPS.map((g) => (
                      <div key={g.name} className="mb-2 last:mb-0">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g.name}</p>
                        <div className="flex flex-wrap gap-0.5">
                          {g.emojis.map((e) => <button key={e} type="button" aria-label={`Inserir ${e}`} onClick={() => { setText((t) => t + e); setEmojiOpen(false); textArea.current?.focus(); }} className="flex h-9 w-9 items-center justify-center rounded-md text-xl hover:bg-slate-100">{e}</button>)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <textarea
                  ref={textArea}
                  rows={1}
                  value={text}
                  disabled={!canSend}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder={canSend ? "Escreva uma mensagem… (Enter envia · Shift+Enter quebra a linha)" : "Não é possível enviar agora"}
                  aria-label="Mensagem"
                  className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary disabled:bg-slate-50"
                />
                <Button type="button" onClick={() => void send()} disabled={!canSend || sending || !text.trim()} className="h-11 gap-2 bg-green-600 px-5 hover:bg-green-700">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Enviar
                </Button>
              </div>
            </footer>
          </>
        )}
      </section>

      {/* cliente */}
      {selected && customer && (
        <aside aria-label="Dados do cliente" className="hidden w-[280px] shrink-0 overflow-y-auto border-l border-[color:var(--border)] p-5 2xl:block">
          <div className="text-center">
            <span className="mx-auto mb-2.5 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-800">{initials(customer.name)}</span>
            <p className="font-bold">{customer.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">Cliente desde {new Date(customer.createdAt).toLocaleDateString("pt-BR", { timeZone: TZ })}</p>
          </div>
          <dl className="mt-4 divide-y divide-slate-100 text-[13px]">
            <div className="flex justify-between gap-3 py-2.5"><dt className="text-slate-500">Telefone</dt><dd className="font-semibold">{customer.phone ?? "—"}</dd></div>
            <div className="flex justify-between gap-3 py-2.5"><dt className="text-slate-500">E-mail</dt><dd className="break-all text-right text-xs font-semibold">{customer.email ?? "—"}</dd></div>
          </dl>
          <Link href={`/admin/customers/${customer.id}`} className="mt-4 flex min-h-[38px] w-full items-center justify-center rounded-lg border border-slate-300 text-[13px] font-semibold hover:bg-slate-50">Abrir ficha completa</Link>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">Mensagens marcadas “Enviado pelo sistema” saíram dos envios de senha e cardápio. As demais são conversa normal.</p>
        </aside>
      )}

      <SendMenuDialog open={menuFor} customer={customer ? { id: customer.id, name: customer.name } : null} onClose={() => { setMenuFor(false); if (selected) void loadThread(selected, true); }} />
      <SendPasswordDialog open={passwordFor} customer={customer ? { id: customer.id, name: customer.name } : null} onClose={() => { setPasswordFor(false); if (selected) void loadThread(selected, true); }} />
    </div>
  );
}
