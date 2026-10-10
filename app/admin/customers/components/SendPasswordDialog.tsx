"use client";

import { AlertCircle, Check, CheckCircle2, Copy, KeyRound, Loader2, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";

type Channel = "whatsapp" | "email";

interface ChannelOption {
  has: boolean;
  to: string | null;
  ready: boolean;
  reason: string | null;
  fixHref: string | null;
}

export interface PasswordSendResult {
  channel: Channel;
  ok: boolean;
  recipient: string;
  error?: string;
  at: string;
}

export interface PasswordOutcome {
  password: string;
  results: PasswordSendResult[];
}

const LABEL: Record<Channel, string> = { whatsapp: "WhatsApp", email: "E-mail" };
const CHANNELS: Channel[] = ["whatsapp", "email"];

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // sem permissão de área de transferência: a senha continua visível para copiar à mão
    }
  };
  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
      {copied ? "Copiado" : "Copiar"}
    </Button>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  customer: { id: string; name: string } | null;
  /** Quando já existe um resultado (ex.: o envio falhou ao cadastrar), abre direto nele. */
  initialOutcome?: PasswordOutcome | null;
  onEditCustomer?: () => void;
  onSent?: () => void;
}

/** Gera uma senha nova para o cliente e avisa pelo WhatsApp e/ou e-mail. */
export function SendPasswordDialog({ open, onClose, customer, initialOutcome = null, onEditCustomer, onSent }: Props) {
  const [options, setOptions] = React.useState<Record<Channel, ChannelOption> | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Channel[]>([]);
  const [busy, setBusy] = React.useState<Channel | "all" | null>(null);
  const [outcome, setOutcome] = React.useState<PasswordOutcome | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const customerId = customer?.id;
  React.useEffect(() => {
    if (!open || !customerId) return;
    setOutcome(initialOutcome);
    setError(null);
    setOptions(null);
    setLoadError(null);
    let alive = true;
    fetch(`/api/admin/customers/${customerId}/send-password`, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Não foi possível verificar os canais de envio.");
        return body.options as Record<Channel, ChannelOption>;
      })
      .then((opts) => {
        if (!alive) return;
        setOptions(opts);
        setSelected(CHANNELS.filter((c) => opts[c].has && opts[c].ready));
      })
      .catch((err) => alive && setLoadError(err instanceof Error ? err.message : "Erro ao verificar os canais."));
    return () => {
      alive = false;
    };
  }, [open, customerId, initialOutcome]);

  if (!customer) return null;

  const hasContact = options ? CHANNELS.some((c) => options[c].has) : true;
  const toggle = (channel: Channel) => setSelected((prev) => (prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]));

  const send = async (channels: Channel[], password?: string) => {
    setBusy(password ? channels[0] : "all");
    setError(null);
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}/send-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Não foi possível gerar a senha.");
      if (password && outcome) {
        // "tentar de novo": troca só o resultado do canal reenviado
        setOutcome({ password, results: outcome.results.map((r) => body.results.find((n: PasswordSendResult) => n.channel === r.channel) ?? r) });
      } else {
        setOutcome(body as PasswordOutcome);
      }
      onSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar a senha.");
    } finally {
      setBusy(null);
    }
  };

  const title = outcome ? "Resultado do envio" : hasContact ? "Enviar senha de acesso" : "Gerar senha de acesso";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}
            >
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            {title}
          </DialogTitle>
          <DialogDescription>
            {outcome ? `${customer.name} · senha nova gerada.` : `${customer.name} · gera uma senha nova e avisa o cliente.`}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-2 overflow-y-auto">
          {outcome ? (
            <>
              {outcome.results.map((r) => (
                <div
                  key={r.channel}
                  className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm ${r.ok ? "border-green-200 bg-green-50 text-green-900" : "border-rose-200 bg-rose-50 text-rose-900"}`}
                >
                  {r.ok ? <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" /> : <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />}
                  <span className="flex-1 min-w-0">
                    <strong>{LABEL[r.channel]} {r.ok ? "enviado" : "não enviado"}</strong>
                    <br />
                    {r.ok ? `Hoje, ${timeLabel(r.at)} · ${r.recipient}` : r.error}
                    {!r.ok && (
                      <>
                        {" "}
                        <button
                          type="button"
                          className="font-semibold underline disabled:opacity-50"
                          disabled={busy !== null}
                          onClick={() => send([r.channel], outcome.password)}
                        >
                          {busy === r.channel ? "Enviando…" : "Tentar de novo"}
                        </button>
                      </>
                    )}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5">
                <b className="font-mono text-xl tracking-wider text-slate-900 break-all">{outcome.password}</b>
                <CopyButton text={outcome.password} />
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                {outcome.results.length === 0
                  ? "Este cliente não tem e-mail nem WhatsApp cadastrados. A senha só aparece agora: copie e entregue pessoalmente."
                  : "A senha nova já vale e só aparece agora. Se preferir, copie e entregue ao cliente."}
              </p>
            </>
          ) : loadError ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-900" role="alert">{loadError}</p>
          ) : !options ? (
            <div className="flex items-center gap-2 py-6 justify-center text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Verificando os canais…
            </div>
          ) : (
            <>
              {CHANNELS.map((channel) => {
                const o = options[channel];
                const Icon = channel === "whatsapp" ? MessageCircle : Mail;
                const on = selected.includes(channel);
                const usable = o.has && o.ready;
                if (!o.has) return null;
                return (
                  <label
                    key={channel}
                    className={`flex items-center gap-3 rounded-xl border-[1.5px] px-3 py-2.5 text-sm ${usable ? (on ? "border-blue-600 bg-blue-50 cursor-pointer" : "border-slate-200 bg-white cursor-pointer") : "border-slate-200 bg-slate-50 text-slate-500"}`}
                  >
                    <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={on && usable} disabled={!usable} onChange={() => toggle(channel)} />
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${channel === "whatsapp" ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"} ${usable ? "" : "opacity-60"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <strong>{LABEL[channel]}</strong> <span className="text-slate-500">· {o.to}</span>
                      {!usable && (
                        <>
                          <br />
                          <span className="text-rose-700">{o.reason}</span>
                          {o.fixHref && (
                            <>
                              {" "}
                              <Link href={o.fixHref} className="font-semibold text-blue-600 underline">Resolver</Link>
                            </>
                          )}
                        </>
                      )}
                    </span>
                  </label>
                );
              })}
              {!options.whatsapp.has && options.email.has && (
                <p className="text-xs leading-relaxed text-slate-500">
                  Quer enviar por WhatsApp? No cadastro do cliente, marque “Este número é WhatsApp”.{" "}
                  {onEditCustomer && (
                    <button type="button" className="font-semibold text-blue-600 underline" onClick={onEditCustomer}>Editar cliente</button>
                  )}
                </p>
              )}
              {!hasContact && (
                <p className="text-sm leading-relaxed text-slate-600">
                  Este cliente não tem e-mail nem WhatsApp cadastrados. A senha só aparece depois de gerada: copie e entregue pessoalmente.{" "}
                  {onEditCustomer && (
                    <button type="button" className="font-semibold text-blue-600 underline" onClick={onEditCustomer}>Editar cliente</button>
                  )}
                </p>
              )}
              <p className="text-xs leading-relaxed text-slate-500">A senha antiga deixa de valer assim que a nova for gerada.</p>
            </>
          )}
          {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900" role="alert">{error}</p>}
        </div>

        <DialogFooter>
          {outcome ? (
            <div className="ml-auto flex gap-2">
              <Button type="button" onClick={onClose}>Concluir</Button>
            </div>
          ) : (
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={busy !== null}>Cancelar</Button>
              <Button type="button" onClick={() => send(selected)} disabled={!options || busy !== null}>
                {busy === "all" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {selected.length > 0 ? "Gerar e enviar" : "Gerar e copiar"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
