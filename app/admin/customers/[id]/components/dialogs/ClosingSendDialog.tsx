"use client";

import { Check, Copy, ExternalLink, FileText, Loader2, Mail, MessageCircle, RefreshCw, Send } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { PDFGenerator } from "@/lib/pdf-generator";
import { WhatsAppBubble } from "../../../../components/messages/WhatsAppBubble";
import { Button } from "../../../../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../../../components/ui/dialog";
import { Switch } from "../../../../../components/ui/switch";
import { Notice } from "../../../components/SendMenuDialog";
import type { ClosingReportConfig } from "../../hooks/useClosingReport";
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
  name: string;
  balanceCents: number;
  kind: "owes" | "credit" | "even";
  paymentLink: string | null;
  channels: Record<Channel, ChannelOption>;
  preview: { whatsapp: string | null; email: { subject: string; body: string } | null };
}

interface PdfState {
  blob: Blob;
  pages: string[];
  url: string;
  hasPix: boolean;
  amountDueCents: number;
}

interface SendResult {
  channel: Channel;
  ok: boolean;
  recipient: string;
  error?: string;
}

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const br = (day: string) => day.split("-").reverse().join("/");
const kb = (bytes: number) => (bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`);
const LABEL: Record<Channel, string> = { whatsapp: "WhatsApp", email: "E-mail" };

/**
 * Prévia e envio do fechamento: mostra o PDF como ele vai (página por página), deixa escolher WhatsApp e/ou e-mail
 * e, estando tudo certo, envia o mesmo arquivo ao cliente. O link de pagamento PIX vai junto da mensagem quando há saldo.
 */
export function ClosingSendDialog({
  open,
  onOpenChange,
  onFinished,
  customer,
  config,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "Concluir" depois do envio: quem abriu a janela pode fechar a tela de trás também. */
  onFinished?: () => void;
  customer: Customer | null;
  config: ClosingReportConfig;
}) {
  const customerId = customer?.id;
  const { startDate, endDate, showDebtBalance, showPeriodBalance, showPaymentsTotal } = config;

  const [pdf, setPdf] = React.useState<PdfState | null>(null);
  const [pdfError, setPdfError] = React.useState<string | null>(null);
  const [prepared, setPrepared] = React.useState<Prepared | null>(null);
  const [prepareError, setPrepareError] = React.useState<string | null>(null);
  const [includeLink, setIncludeLink] = React.useState(true);
  const [channels, setChannels] = React.useState<Channel[]>([]);
  const [tab, setTab] = React.useState<Channel>("whatsapp");
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<SendResult[] | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const pdfUrl = React.useRef<string | null>(null);

  // 1) O PDF (e as imagens das páginas, para a prévia)
  React.useEffect(() => {
    if (!open || !customerId || !startDate || !endDate) return;
    let alive = true;
    setPdf(null);
    setPdfError(null);
    setResults(null);
    setSendError(null);
    PDFGenerator.generateCustomerClosingReportWithPreview(customerId, startDate, endDate, {
      compress: true,
      imageQuality: 0.6,
      show: { debt: showDebtBalance, period: showPeriodBalance, payments: showPaymentsTotal },
    })
      .then((out) => {
        if (!alive) return;
        if (PDFGenerator.isPDFTooLarge(out.blob)) throw new Error("O PDF ficou grande demais para enviar. Use um período menor.");
        const url = URL.createObjectURL(out.blob);
        pdfUrl.current = url;
        setPdf({ blob: out.blob, pages: out.pages, url, hasPix: out.hasPix, amountDueCents: out.amountDueCents });
      })
      .catch((err) => alive && setPdfError(err instanceof Error ? err.message : "Não foi possível montar o PDF."));
    return () => {
      alive = false;
      if (pdfUrl.current) URL.revokeObjectURL(pdfUrl.current);
      pdfUrl.current = null;
    };
  }, [open, customerId, startDate, endDate, showDebtBalance, showPeriodBalance, showPaymentsTotal, attempt]);

  // 2) Quem pode receber e o texto de cada canal (refaz quando o link de pagamento liga ou desliga)
  React.useEffect(() => {
    if (!open || !customerId || !startDate || !endDate) return;
    let alive = true;
    setPrepareError(null);
    fetch(`/api/admin/customers/${customerId}/send-closing?startDate=${startDate}&endDate=${endDate}&includeLink=${includeLink ? 1 : 0}`, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Não foi possível preparar o envio.");
        return body as Prepared;
      })
      .then((data) => {
        if (!alive) return;
        setPrepared(data);
        // primeira leitura: marca os canais que o cliente tem e que estão funcionando
        setChannels((current) => {
          const usable = (["whatsapp", "email"] as Channel[]).filter((c) => data.channels[c].available && data.channels[c].ready);
          return current.length === 0 ? usable : current.filter((c) => usable.includes(c));
        });
        setTab((t) => (data.channels[t].available ? t : data.channels.whatsapp.available ? "whatsapp" : "email"));
      })
      .catch((err) => alive && setPrepareError(err instanceof Error ? err.message : "Não foi possível preparar o envio."));
    return () => {
      alive = false;
    };
  }, [open, customerId, startDate, endDate, includeLink, attempt]);

  // abrir de novo começa limpo
  React.useEffect(() => {
    if (open) return;
    setPrepared(null);
    setChannels([]);
    setIncludeLink(true);
    setResults(null);
    setSendError(null);
    setCopied(false);
  }, [open]);

  if (!customer) return null;

  const owes = (prepared?.balanceCents ?? 0) > 0;
  const toggleChannel = (c: Channel) => setChannels((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  const nothingAvailable = prepared && !prepared.channels.whatsapp.available && !prepared.channels.email.available;
  const readyToSend = Boolean(pdf && prepared && channels.length > 0 && !sending);
  const sendLabel = channels.length === 2 ? "Enviar pelos dois" : channels[0] === "email" ? "Enviar por e-mail" : "Enviar pelo WhatsApp";

  const send = async (only?: Channel[]) => {
    if (!pdf) return;
    const target = only ?? channels;
    setSending(true);
    setSendError(null);
    try {
      const pdfBase64 = await PDFGenerator.blobToBase64(pdf.blob);
      const res = await fetch(`/api/admin/customers/${customer.id}/send-closing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate, includeLink, channels: target, pdfBase64 }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Não foi possível enviar.");
      const fresh = body.results as SendResult[];
      // no reenvio, o que já tinha ido continua marcado como enviado
      setResults((prev) => (only && prev ? [...prev.filter((r) => !only.includes(r.channel)), ...fresh] : fresh));
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Não foi possível enviar.");
    } finally {
      setSending(false);
    }
  };

  const copyLink = async () => {
    if (!prepared?.paymentLink) return;
    try {
      await navigator.clipboard.writeText(prepared.paymentLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* sem permissão: o link continua visível para copiar à mão */
    }
  };

  const failed = results?.filter((r) => !r.ok) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}>
              <Send className="h-5 w-5 text-primary" />
            </div>
            {results ? "Resultado do envio" : "Enviar fechamento ao cliente"}
          </DialogTitle>
          <DialogDescription>
            {customer.name} · {br(startDate)} a {br(endDate)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] overflow-y-auto md:grid-cols-[minmax(0,1fr)_340px] md:overflow-hidden">
          {/* ---------- prévia do PDF ---------- */}
          <section aria-label="Prévia do PDF" className="flex min-h-[260px] min-w-0 flex-col bg-slate-100 md:min-h-0 md:overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wide">
                <FileText className="h-3.5 w-3.5" aria-hidden />
                Como o cliente vai receber
              </span>
              {pdf && (
                <span className="flex shrink-0 items-center gap-3">
                  <span>
                    {pdf.pages.length} {pdf.pages.length === 1 ? "página" : "páginas"} · {kb(pdf.blob.size)}
                  </span>
                  <a href={pdf.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-slate-700 underline">
                    Abrir PDF <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </span>
              )}
            </div>
            <div className="scroll-slim min-h-0 flex-1 space-y-4 overflow-y-auto p-4 max-md:max-h-[52vh]">
              {pdfError ? (
                <div className="space-y-3">
                  <Notice tone="bad">{pdfError}</Notice>
                  <Button type="button" variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Tentar de novo
                  </Button>
                </div>
              ) : !pdf ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-slate-500" role="status">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Montando o PDF…
                </div>
              ) : (
                pdf.pages.map((src, i) => (
                  <figure key={i} className="mx-auto max-w-[560px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Página ${i + 1} de ${pdf.pages.length} do fechamento`} className="w-full rounded-md border border-slate-200 bg-white shadow-sm" />
                    <figcaption className="mt-1 text-center text-[11px] text-slate-400">
                      Página {i + 1} de {pdf.pages.length}
                    </figcaption>
                  </figure>
                ))
              )}
            </div>
          </section>

          {/* ---------- envio ---------- */}
          <aside className="min-w-0 space-y-5 border-t border-slate-200 p-5 md:overflow-y-auto md:border-l md:border-t-0">
            {results ? (
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
                {sendError && <Notice tone="bad">{sendError}</Notice>}
              </div>
            ) : prepareError ? (
              <Notice tone="bad">{prepareError}</Notice>
            ) : !prepared ? (
              <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparando…
              </div>
            ) : (
              <>
                <fieldset className="space-y-2">
                  <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Enviar por</legend>
                  {(["whatsapp", "email"] as Channel[]).map((c) => {
                    const opt = prepared.channels[c];
                    const usable = opt.available && opt.ready;
                    const Icon = c === "whatsapp" ? MessageCircle : Mail;
                    return (
                      <label
                        key={c}
                        className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm ${usable ? "cursor-pointer border-slate-200 hover:bg-slate-50" : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-80"}`}
                      >
                        <input type="checkbox" checked={channels.includes(c)} disabled={!usable || sending} onChange={() => toggleChannel(c)} className="mt-1 h-4 w-4 accent-green-600" />
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
                  {nothingAvailable && <Notice tone="warn">Este cliente não tem WhatsApp marcado nem e-mail cadastrado. Complete o cadastro dele para enviar.</Notice>}
                </fieldset>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pagamento por PIX</p>
                  {owes ? (
                    <>
                      <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
                        <div className="min-w-0">
                          <label htmlFor="include-pay-link" className="text-sm font-medium text-slate-800">
                            Incluir o link de pagamento
                          </label>
                          <p className="text-xs text-slate-500">
                            O cliente deve <strong>{brl(prepared.balanceCents)}</strong>. O link abre a página de PIX, sem precisar entrar na conta, e o “Já paguei” avisa você.
                          </p>
                        </div>
                        <Switch id="include-pay-link" checked={includeLink} onCheckedChange={setIncludeLink} disabled={sending} />
                      </div>
                      {includeLink && prepared.paymentLink && (
                        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                          <code className="block min-w-0 flex-1 truncate text-slate-600">{prepared.paymentLink}</code>
                          <Button type="button" variant="outline" size="sm" className="h-7 shrink-0 px-2" onClick={copyLink}>
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            <span className="ml-1">{copied ? "Copiado" : "Copiar"}</span>
                          </Button>
                          <a href={prepared.paymentLink} target="_blank" rel="noreferrer" className="shrink-0 text-slate-600" aria-label="Abrir a página do link de pagamento">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                      {prepared.kind === "credit" ? "O cliente tem crédito na ficha" : "A ficha está em dia"}: a mensagem vai sem link de pagamento.
                    </p>
                  )}
                  {pdf && !pdf.hasPix && owes && <p className="text-xs text-slate-500">O PDF vai sem QR code porque a chave PIX não está configurada. O link de pagamento continua valendo.</p>}
                </div>

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
                        <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                          <FileText className="h-3.5 w-3.5" aria-hidden />
                          PDF anexo
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}

                {sendError && <Notice tone="bad">{sendError}</Notice>}
              </>
            )}
          </aside>
        </div>

        <DialogFooter>
          <div className="ml-auto flex gap-2">
            {results ? (
              <Button type="button" onClick={() => (onFinished ? onFinished() : onOpenChange(false))}>
                Concluir
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
                  Cancelar
                </Button>
                <Button type="button" onClick={() => void send()} disabled={!readyToSend} className="bg-green-600 hover:bg-green-700">
                  {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {channels.length === 0 ? "Escolha por onde enviar" : sendLabel}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
