"use client";

import { AlertCircle, Loader2, MessageCircle, Receipt, Send, Wallet } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { WhatsAppBubble } from "../../components/messages/WhatsAppBubble";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Notice } from "./SendMenuDialog";

export type FichaKind = "orders" | "balance";

interface Status {
  name: string;
  recipient: string | null;
  hasWhatsapp: boolean;
  whatsapp: { ready: boolean; reason: string | null; fixHref: string | null };
  preview: string | null;
  // compras
  maxDays?: number;
  days?: { day: string; label: string; count: number; totalCents: number }[];
  selected?: string[];
  // saldo
  balanceCents?: number | null;
}

type Outcome =
  | { status: "sent" | "failed"; result: { ok: boolean; recipient: string; error?: string; at: string } }
  | { status: "no_whatsapp" | "no_orders" | "unavailable"; reason: string };

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hour = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const shortDay = (day: string) => `${day.slice(8, 10)}/${day.slice(5, 7)}`;

/** Envia o resumo das compras (de 1 a 5 dias) ou o saldo da ficha a um cliente, pelo WhatsApp do estabelecimento. */
export function SendFichaDialog({ kind, open, onClose, customer }: { kind: FichaKind; open: boolean; onClose: () => void; customer: { id: string; name: string } | null }) {
  const [status, setStatus] = React.useState<Status | null>(null);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [loadingPreview, setLoadingPreview] = React.useState(false);
  const [outcome, setOutcome] = React.useState<Outcome | null>(null);

  const customerId = customer?.id;
  const endpoint = kind === "orders" ? "send-orders" : "send-balance";

  const load = React.useCallback(
    async (days?: string[]) => {
      const query = days && days.length > 0 ? `?days=${days.join(",")}` : "";
      const res = await fetch(`/api/admin/customers/${customerId}/${endpoint}${query}`, { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Não foi possível preparar o envio.");
      return body as Status;
    },
    [customerId, endpoint]
  );

  React.useEffect(() => {
    if (!open || !customerId) return;
    setStatus(null);
    setSelected([]);
    setError(null);
    setOutcome(null);
    let alive = true;
    load()
      .then((data) => {
        if (!alive) return;
        setStatus(data);
        setSelected(data.selected ?? []);
      })
      .catch((err) => alive && setError(err instanceof Error ? err.message : "Erro ao preparar o envio."));
    return () => {
      alive = false;
    };
  }, [open, customerId, load]);

  // a prévia acompanha os dias marcados
  const toggle = (day: string) => {
    if (!status || kind !== "orders") return;
    const max = status.maxDays ?? 5;
    const next = selected.includes(day) ? selected.filter((d) => d !== day) : selected.length < max ? [...selected, day] : selected;
    if (next === selected) return;
    setSelected(next);
    setError(null);
    if (next.length === 0) {
      setStatus((s) => (s ? { ...s, preview: null } : s));
      return;
    }
    setLoadingPreview(true);
    load(next)
      .then((data) => setStatus((s) => (s ? { ...s, preview: data.preview } : s)))
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao montar a prévia."))
      .finally(() => setLoadingPreview(false));
  };

  if (!customer) return null;

  const noPurchases = kind === "orders" && !!status && (status.days?.length ?? 0) === 0;
  const blocked = !status || !status.hasWhatsapp || !status.whatsapp.ready || noPurchases || (kind === "orders" && selected.length === 0) || loadingPreview;

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/customers/${customer.id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind === "orders" ? { days: selected } : {}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Não foi possível enviar.");
      setOutcome(body as Outcome);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar.");
    } finally {
      setBusy(false);
    }
  };

  const sent = outcome?.status === "sent" ? outcome.result : null;
  const Icon = kind === "orders" ? Receipt : Wallet;
  const title = kind === "orders" ? "Enviar compras" : "Enviar saldo da ficha";
  const max = status?.maxDays ?? 5;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--modal-header-icon-bg)", outline: "1px solid var(--modal-header-icon-ring)" }}>
              <Icon className="h-5 w-5 text-primary" />
            </div>
            {outcome ? "Resultado do envio" : title}
          </DialogTitle>
          <DialogDescription>{customer.name} · pelo WhatsApp do estabelecimento.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto px-6 py-4">
          {outcome ? (
            outcome.status === "sent" && sent ? (
              <Notice tone="ok"><strong>WhatsApp enviado</strong><br />Hoje, {hour(sent.at)} · {sent.recipient}</Notice>
            ) : outcome.status === "failed" ? (
              <Notice tone="bad"><strong>WhatsApp não enviado</strong><br />{outcome.result.error}</Notice>
            ) : (
              <Notice tone="bad">{"reason" in outcome ? outcome.reason : "Não foi possível enviar."}</Notice>
            )
          ) : error && !status ? (
            <Notice tone="bad">{error}</Notice>
          ) : !status ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Preparando…</div>
          ) : !status.hasWhatsapp ? (
            <Notice tone="warn"><strong>Este cliente não tem WhatsApp marcado.</strong><br />Marque “Este número é WhatsApp” no cadastro dele.</Notice>
          ) : !status.whatsapp.ready ? (
            <Notice tone="bad"><strong>{status.whatsapp.reason}</strong>{status.whatsapp.fixHref && <>{" "}<Link href={status.whatsapp.fixHref} className="font-semibold underline">Resolver</Link></>}</Notice>
          ) : noPurchases ? (
            <Notice tone="warn"><strong>Não há compras deste cliente nos últimos 90 dias.</strong></Notice>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm"><MessageCircle className="h-4 w-4 text-green-600" aria-hidden /><span><strong>WhatsApp</strong> · {status.recipient}</span></div>

              {kind === "orders" && status.days && (
                <fieldset>
                  <legend className="mb-1.5 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <span>Dias da mensagem</span>
                    <span className="normal-case tracking-normal">{selected.length} de {max}</span>
                  </legend>
                  <ul className="scroll-slim max-h-44 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                    {status.days.map((d) => {
                      const checked = selected.includes(d.day);
                      const locked = !checked && selected.length >= max;
                      return (
                        <li key={d.day}>
                          <label className={`flex items-center gap-3 px-3 py-2 text-sm ${locked ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-slate-50"}`}>
                            <input type="checkbox" checked={checked} disabled={locked} onChange={() => toggle(d.day)} className="h-4 w-4 accent-green-600" />
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium text-slate-800">{d.label}</span>
                              <span className="text-xs text-slate-500">{d.count === 1 ? "1 compra" : `${d.count} compras`}</span>
                            </span>
                            <b className="tabular-nums text-slate-900">{brl(d.totalCents)}</b>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  {selected.length >= max && <p className="mt-1.5 text-xs text-slate-500">Limite de {max} dias por mensagem, para ela não ficar longa demais.</p>}
                </fieldset>
              )}

              {kind === "balance" && typeof status.balanceCents === "number" && (
                <div className={`rounded-xl border px-3.5 py-3 ${status.balanceCents > 0 ? "border-rose-200 bg-rose-50" : status.balanceCents < 0 ? "border-green-200 bg-green-50" : "border-slate-200 bg-slate-50"}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saldo da ficha</p>
                  <p className={`text-2xl font-bold tabular-nums ${status.balanceCents > 0 ? "text-rose-700" : status.balanceCents < 0 ? "text-green-700" : "text-slate-700"}`}>{brl(Math.abs(status.balanceCents))}</p>
                  <p className="text-xs text-slate-600">{status.balanceCents > 0 ? "A pagar" : status.balanceCents < 0 ? "Crédito do cliente" : "Ficha em dia"}</p>
                </div>
              )}

              <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Mensagem que a pessoa vai receber</p>
              {loadingPreview ? (
                <div className="flex items-center gap-2 py-4 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Montando…</div>
              ) : status.preview ? (
                <WhatsAppBubble text={status.preview} />
              ) : (
                <p className="flex items-center gap-2 text-sm text-slate-500"><AlertCircle className="h-4 w-4" aria-hidden />Marque ao menos um dia para ver a mensagem.</p>
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
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>{!status || blocked ? "Fechar" : "Cancelar"}</Button>
                <Button type="button" onClick={send} disabled={blocked || busy} className="bg-green-600 hover:bg-green-700">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Enviar pelo WhatsApp
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
