"use client";

import { Check, Copy, ExternalLink, Link2, Loader2, Mail, MessageCircle, RefreshCw, Send } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { WhatsAppBubble } from "../../../../components/messages/WhatsAppBubble";
import { Button } from "../../../../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../../../components/ui/dialog";
import { Notice } from "../../../components/SendMenuDialog";
import type { Customer } from "../../types";

type Channel = "whatsapp" | "email";

interface ChannelOption {
  available: boolean;
  recipient: string | null;
  ready: boolean;
  reason: string | null;
  fixHref: string | null;
}

interface Prepared {
  balanceCents: number;
  link: string | null;
  channels: Record<Channel, ChannelOption>;
  preview: { whatsapp: string | null; email: { subject: string; body: string } | null };
}

interface SendResult {
  channel: Channel;
  ok: boolean;
  recipient: string;
  error?: string;
}

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const LABEL: Record<Channel, string> = { whatsapp: "WhatsApp", email: "E-mail" };

/**
 * Link de pagamento: abre a página de PIX da ficha do cliente, sem ele precisar entrar na conta.
 * O administrador copia o link ou o envia por WhatsApp e/ou e-mail. O “Já paguei” da página avisa o sino.
 */
export function PaymentLinkDialog({ open, onOpenChange, customer }: { open: boolean; onOpenChange: (open: boolean) => void; customer: Customer | null }) {
  const customerId = customer?.id;
  const [prepared, setPrepared] = React.useState<Prepared | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [channels, setChannels] = React.useState<Channel[]>([]);
  const [tab, setTab] = React.useState<Channel>("whatsapp");
  const [sending, setSending] = React.useState(false);
  const [results, setResults] = React.useState<SendResult[] | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open || !customerId) return;
    let alive = true;
    setPrepared(null);
    setError(null);
    setResults(null);
    setChannels([]);
    fetch(`/api/admin/customers/${customerId}/payment-link`, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Não foi possível preparar o link.");
        return body as Prepared;
      })
      .then((data) => {
        if (!alive) return;
        setPrepared(data);
        setChannels((["whatsapp", "email"] as Channel[]).filter((c) => data.channels[c].available && data.channels[c].ready));
        setTab(data.channels.whatsapp.available ? "whatsapp" : "email");
      })
      .catch((err) => alive && setError(err instanceof Error ? err.message : "Não foi possível preparar o link."));
    return () => {
      alive = false;
    };
  }, [open, customerId]);

  if (!customer) return null;

  const toggle = (c: Channel) => setChannels((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  const nothingAvailable = prepared && !prepared.channels.whatsapp.available && !prepared.channels.email.available;
  const sendLabel = channels.length === 2 ? "Enviar pelos dois" : channels[0] === "email" ? "Enviar por e-mail" : "Enviar pelo WhatsApp";

  const send = async (only?: Channel[]) => {
    const target = only ?? channels;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}/payment-link`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channels: target }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Não foi possível enviar.");
      const fresh = body.results as SendResult[];
      setResults((prev) => (only && prev ? [...prev.filter((r) => !only.includes(r.channel)), ...fresh] : fresh));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar.");
    } finally {
      setSending(false);
    }
  };

  const copy = async () => {
    if (!prepared?.link) return;
    try {
      await navigator.clipboard.writeText(prepared.link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* sem permissão: o link continua visível */
    }
  };

  const failed = results?.filter((r) => !r.ok) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}>
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            {results ? "Resultado do envio" : "Link de pagamento"}
          </DialogTitle>
          <DialogDescription>{customer.name} · pagar a ficha por PIX, sem entrar na conta.</DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4 overflow-y-auto px-6 py-4">
          {error && !prepared ? (
            <Notice tone="bad">{error}</Notice>
          ) : !prepared ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparando…
            </div>
          ) : !prepared.link ? (
            <Notice tone="info">
              <strong>A ficha deste cliente não tem saldo a pagar.</strong>
              <br />O link de pagamento só existe quando há valor em aberto.
            </Notice>
          ) : results ? (
            <div className="space-y-3">
              {results.map((r) => (
                <Notice key={r.channel} tone={r.ok ? "ok" : "bad"}>
                  <strong>{r.ok ? `${LABEL[r.channel]} enviado` : `${LABEL[r.channel]} não enviado`}</strong>
                  <br />
                  {r.ok ? r.recipient : r.error}
                </Notice>
              ))}
              {failed.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={() => void send(failed.map((r) => r.channel))} disabled={sending}>
                  {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Tentar de novo só o que falhou
                </Button>
              )}
              {error && <Notice tone="bad">{error}</Notice>}
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Em aberto na ficha</p>
                <p className="text-2xl font-bold tabular-nums text-rose-700">{brl(prepared.balanceCents)}</p>
                <p className="text-xs text-slate-600">O link mostra sempre o saldo de agora e vale por 45 dias.</p>
              </div>

              <div className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <code className="block min-w-0 flex-1 truncate text-slate-600">{prepared.link}</code>
                <Button type="button" variant="outline" size="sm" className="h-7 shrink-0 px-2" onClick={copy}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span className="ml-1">{copied ? "Copiado" : "Copiar"}</span>
                </Button>
                <a href={prepared.link} target="_blank" rel="noreferrer" className="shrink-0 text-slate-600" aria-label="Abrir a página do link de pagamento">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              <fieldset className="space-y-2">
                <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Enviar por</legend>
                {(["whatsapp", "email"] as Channel[]).map((c) => {
                  const opt = prepared.channels[c];
                  const usable = opt.available && opt.ready;
                  const Icon = c === "whatsapp" ? MessageCircle : Mail;
                  return (
                    <label key={c} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm ${usable ? "cursor-pointer border-slate-200 hover:bg-slate-50" : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-80"}`}>
                      <input type="checkbox" checked={channels.includes(c)} disabled={!usable || sending} onChange={() => toggle(c)} className="mt-1 h-4 w-4 accent-green-600" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Icon className={`h-4 w-4 ${c === "whatsapp" ? "text-green-600" : "text-blue-600"}`} aria-hidden />
                          {LABEL[c]}
                        </span>
                        <span className="block break-all text-xs text-slate-500">{opt.recipient ?? "Sem cadastro"}</span>
                        {!usable && opt.reason && (
                          <span className="mt-1 block text-xs text-rose-700">
                            {opt.reason}
                            {opt.fixHref && (
                              <>
                                {" "}
                                <Link href={opt.fixHref} className="font-semibold underline">
                                  Resolver
                                </Link>
                              </>
                            )}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
                {nothingAvailable && <Notice tone="warn">Este cliente não tem WhatsApp marcado nem e-mail cadastrado. Você ainda pode copiar o link e enviar por outro meio.</Notice>}
              </fieldset>

              {(prepared.preview.whatsapp || prepared.preview.email) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mensagem</p>
                    <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs" role="tablist" aria-label="Canal da mensagem">
                      {(["whatsapp", "email"] as Channel[])
                        .filter((c) => (c === "whatsapp" ? prepared.preview.whatsapp : prepared.preview.email))
                        .map((c) => (
                          <button key={c} type="button" role="tab" aria-selected={tab === c} onClick={() => setTab(c)} className={`rounded-md px-2.5 py-1 font-medium ${tab === c ? "bg-slate-800 text-white" : "text-slate-600"}`}>
                            {LABEL[c]}
                          </button>
                        ))}
                    </div>
                  </div>
                  {tab === "whatsapp" && prepared.preview.whatsapp ? (
                    <WhatsAppBubble text={prepared.preview.whatsapp} />
                  ) : prepared.preview.email ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-[13px] leading-relaxed text-slate-800">
                      <p className="mb-2 border-b border-slate-100 pb-2 text-xs text-slate-500">
                        Assunto: <strong className="text-slate-800">{prepared.preview.email.subject}</strong>
                      </p>
                      <p className="whitespace-pre-wrap break-words">{prepared.preview.email.body.replace(/\*/g, "")}</p>
                    </div>
                  ) : null}
                </div>
              )}
              {error && <Notice tone="bad">{error}</Notice>}
            </>
          )}
        </div>

        <DialogFooter>
          <div className="ml-auto flex gap-2">
            {results ? (
              <Button type="button" onClick={() => onOpenChange(false)}>
                Concluir
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
                  Fechar
                </Button>
                {prepared?.link && (
                  <Button type="button" onClick={() => void send()} disabled={channels.length === 0 || sending} className="bg-green-600 hover:bg-green-700">
                    {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {channels.length === 0 ? "Escolha por onde enviar" : sendLabel}
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
