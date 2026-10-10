"use client";

import { AlertCircle, CheckCircle2, Info, Loader2, MessageCircle, Send } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { WhatsAppBubble } from "../../components/messages/WhatsAppBubble";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";

interface MenuSendStatus {
  name: string;
  recipient: string | null;
  hasWhatsapp: boolean;
  menu: { date: string; title: string | null; items: number } | null;
  whatsapp: { ready: boolean; reason: string | null; fixHref: string | null };
  receivedAt: string | null;
  preview: string | null;
}

type Outcome =
  | { status: "sent" | "failed"; result: { ok: boolean; recipient: string; error?: string; at: string } }
  | { status: "no_menu" | "no_whatsapp" | "unavailable"; reason: string }
  | { status: "already_received"; at: string };

const hour = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export function Notice({ tone, children }: { tone: "warn" | "bad" | "info" | "ok"; children: React.ReactNode }) {
  const style = {
    warn: "border-amber-300 bg-amber-50 text-amber-900",
    bad: "border-rose-200 bg-rose-50 text-rose-900",
    info: "border-blue-200 bg-blue-50 text-blue-900",
    ok: "border-green-200 bg-green-50 text-green-900",
  }[tone];
  const Icon = tone === "ok" ? CheckCircle2 : tone === "info" ? Info : AlertCircle;
  return (
    <div className={`flex gap-3 rounded-xl border px-3 py-2.5 text-sm leading-relaxed ${style}`} role={tone === "bad" ? "alert" : undefined}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

/** Envia o cardápio de hoje a um cliente, pelo WhatsApp do estabelecimento. */
export function SendMenuDialog({ open, onClose, customer }: { open: boolean; onClose: () => void; customer: { id: string; name: string } | null }) {
  const [status, setStatus] = React.useState<MenuSendStatus | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [outcome, setOutcome] = React.useState<Outcome | null>(null);

  const customerId = customer?.id;
  React.useEffect(() => {
    if (!open || !customerId) return;
    setStatus(null);
    setError(null);
    setOutcome(null);
    let alive = true;
    fetch(`/api/admin/customers/${customerId}/send-menu`, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Não foi possível preparar o envio.");
        return body as MenuSendStatus;
      })
      .then((data) => alive && setStatus(data))
      .catch((err) => alive && setError(err instanceof Error ? err.message : "Erro ao preparar o envio."));
    return () => {
      alive = false;
    };
  }, [open, customerId]);

  if (!customer) return null;

  const blocked = status ? !status.hasWhatsapp || !status.menu || !status.whatsapp.ready : true;

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}/send-menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: Boolean(status?.receivedAt) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Não foi possível enviar o cardápio.");
      if (body.status === "already_received") setStatus((s) => (s ? { ...s, receivedAt: body.at } : s));
      else setOutcome(body as Outcome);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o cardápio.");
    } finally {
      setBusy(false);
    }
  };

  const sent = outcome?.status === "sent" ? outcome.result : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}>
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            {outcome ? "Resultado do envio" : "Enviar cardápio de hoje"}
          </DialogTitle>
          <DialogDescription>{customer.name} · pelo WhatsApp do estabelecimento.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto px-6 py-4">
          {outcome ? (
            outcome.status === "sent" && sent ? (
              <Notice tone="ok"><strong>WhatsApp enviado</strong><br />Hoje, {hour(sent.at)} · {sent.recipient}</Notice>
            ) : outcome.status === "failed" ? (
              <Notice tone="bad"><strong>WhatsApp não enviado</strong><br />{outcome.result.error}</Notice>
            ) : outcome.status === "already_received" ? null : (
              <Notice tone="bad">{"reason" in outcome ? outcome.reason : "Não foi possível enviar."}</Notice>
            )
          ) : error && !status ? (
            <Notice tone="bad">{error}</Notice>
          ) : !status ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Preparando…</div>
          ) : (
            <>
              {!status.hasWhatsapp ? (
                <Notice tone="warn"><strong>Este cliente não tem WhatsApp marcado.</strong><br />Marque “Este número é WhatsApp” no cadastro dele.</Notice>
              ) : !status.menu ? (
                <Notice tone="warn"><strong>O cardápio de hoje ainda não foi publicado.</strong><br />O cliente só recebe o que está publicado. Publique o de hoje e volte aqui.{" "}<Link href="/admin/menus" className="font-semibold underline">Abrir Cardápios</Link></Notice>
              ) : !status.whatsapp.ready ? (
                <Notice tone="bad"><strong>{status.whatsapp.reason}</strong>{status.whatsapp.fixHref && <>{" "}<Link href={status.whatsapp.fixHref} className="font-semibold underline">Resolver</Link></>}</Notice>
              ) : (
                <>
                  {status.receivedAt && <Notice tone="info"><strong>{status.name.split(" ")[0]} já recebeu o cardápio hoje, às {hour(status.receivedAt)}.</strong><br />Quer enviar de novo mesmo assim?</Notice>}
                  <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm"><MessageCircle className="h-4 w-4 text-green-600" aria-hidden /><span><strong>WhatsApp</strong> · {status.recipient}</span></div>
                  <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Mensagem que a pessoa vai receber</p>
                  {status.preview && <WhatsAppBubble text={status.preview} />}
                </>
              )}
              {error && <Notice tone="bad">{error}</Notice>}
            </>
          )}
        </div>

        <DialogFooter>
          <div className="ml-auto flex gap-2">
            {outcome ? (
              <Button type="button" onClick={onClose}>Concluir</Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>{blocked && status ? "Fechar" : "Cancelar"}</Button>
                <Button type="button" onClick={send} disabled={blocked || busy} className="bg-green-600 hover:bg-green-700">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {status?.receivedAt ? "Enviar de novo" : "Enviar pelo WhatsApp"}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
