"use client";

import { useToast } from "@/app/components/Toast";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import type { WhatsAppStatus } from "@/lib/whatsapp-service";
import { AlertCircle, CheckCircle2, Loader2, MessageCircle, QrCode, RefreshCw, Send, ShieldCheck, Smartphone, Unplug } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type QrState = { qr: string | null; pairingCode: string | null };
type Result<T> = { ok: true; data: T } | { ok: false; message: string };

const QR_REFRESH_MS = 35_000;
const POLL_MS = 3_000;

async function call<T>(url: string, init?: RequestInit): Promise<Result<T>> {
  try {
    const res = await fetch(url, { cache: "no-store", ...init, headers: init?.body ? { "Content-Type": "application/json" } : undefined });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, message: (json as { error?: string } | null)?.error || "Algo deu errado. Tente de novo." };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, message: "Sem conexão. Tente de novo." };
  }
}

function ago(iso: string | null): string {
  if (!iso) return "ainda não";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "agora há pouco";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function Pill({ tone, children }: { tone: "faturado" | "pronto" | "cobrar" | "cancelado"; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold"
      style={{ background: `var(--state-${tone}-bg)`, color: `var(--state-${tone}-fg)` }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: `var(--state-${tone})` }} aria-hidden="true" />
      {children}
    </span>
  );
}

export function WhatsAppTab({ active }: { active: boolean }) {
  const { showToast } = useToast();
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [qr, setQr] = useState<QrState | null>(null);
  const [mode, setMode] = useState<"qr" | "code">("qr");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState<"connect" | "check" | "test" | "disconnect" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const wasOpen = useRef(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    const result = await call<WhatsAppStatus>("/api/admin/whatsapp");
    if (result.ok) {
      setStatus(result.data);
      setLoadError(null);
    } else if (!quiet) {
      setLoadError(result.message);
    }
    setLoading(false);
    return result.ok ? result.data : null;
  }, []);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  // Conectou (pelo celular): some o QR e avisa
  useEffect(() => {
    const open = status?.state === "open";
    if (open && !wasOpen.current && qr) {
      setQr(null);
      showToast("WhatsApp conectado", "success");
    }
    wasOpen.current = open;
  }, [status, qr, showToast]);

  // Enquanto o QR está na tela: confere a conexão a cada poucos segundos
  useEffect(() => {
    if (!active || !qr) return;
    const timer = window.setInterval(() => void load(true), POLL_MS);
    return () => window.clearInterval(timer);
  }, [active, qr, load]);

  // O QR code vence em cerca de 40 s: pede outro sozinho
  useEffect(() => {
    if (!active || !qr || mode !== "qr") return;
    const timer = window.setInterval(async () => {
      const result = await call<QrState & { state: string }>("/api/admin/whatsapp/connect", { method: "POST", body: JSON.stringify({}) });
      if (result.ok && result.data.qr) setQr({ qr: result.data.qr, pairingCode: null });
    }, QR_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [active, qr, mode]);

  const connect = async () => {
    setBusy("connect");
    setActionError(null);
    const result = await call<QrState & { state: string }>("/api/admin/whatsapp/connect", {
      method: "POST",
      body: JSON.stringify(mode === "code" ? { phone } : {}),
    });
    setBusy(null);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    if (result.data.state === "open") {
      void load(true);
      return;
    }
    setQr({ qr: result.data.qr, pairingCode: result.data.pairingCode });
    void load(true);
  };

  const check = async () => {
    setBusy("check");
    setActionError(null);
    const data = await load(true);
    setBusy(null);
    if (!data) setActionError("Não deu para conferir agora. Tente de novo.");
    else if (data.error) setActionError(data.error);
    else showToast(data.state === "open" ? "Conectado e funcionando" : "Conferido: o WhatsApp não está conectado", data.state === "open" ? "success" : "warning");
  };

  const sendTest = async () => {
    setBusy("test");
    setActionError(null);
    const result = await call<{ number: string }>("/api/admin/whatsapp/test", { method: "POST" });
    setBusy(null);
    if (result.ok) showToast("Mensagem de teste enviada. Confira no seu WhatsApp.", "success");
    else setActionError(result.message);
  };

  const disconnect = async () => {
    setBusy("disconnect");
    const result = await call<{ ok: true }>("/api/admin/whatsapp/disconnect", { method: "POST" });
    setBusy(null);
    setConfirmOff(false);
    if (result.ok) {
      setQr(null);
      showToast("WhatsApp desconectado", "success");
      void load(true);
    } else {
      setActionError(result.message);
    }
  };

  if (loading && !status) {
    return (
      <div className="animate-pulse space-y-5 px-4 py-6 sm:px-8" aria-busy="true" aria-label="Carregando o WhatsApp">
        <div className="h-48 rounded-2xl bg-[color:var(--muted)]" />
        <div className="h-32 rounded-2xl bg-[color:var(--muted)]" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="px-4 py-10 sm:px-8">
        <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 text-center">
          <AlertCircle className="h-8 w-8" style={{ color: "var(--state-cobrar)" }} aria-hidden="true" />
          <p className="text-sm font-medium">Não deu para carregar o WhatsApp.</p>
          {loadError && <p className="text-sm text-[color:var(--muted-foreground)]">{loadError}</p>}
          <Button type="button" className="min-h-[44px]" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Tentar de novo
          </Button>
        </div>
      </div>
    );
  }

  if (!status.configured) {
    return (
      <div className="px-4 py-8 sm:px-8">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-6">
          <h3 className="text-base font-semibold">WhatsApp ainda não está configurado neste ambiente</h3>
          <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">
            Falta informar o endereço e a chave da Evolution API (<code>EVOLUTION_API_URL</code> e <code>EVOLUTION_API_KEY</code>) nas variáveis de ambiente do sistema.
          </p>
        </div>
      </div>
    );
  }

  const open = status.state === "open";

  return (
    <div className="space-y-6 px-3 py-5 sm:px-8 sm:py-7">
      {(actionError || status.error) && (
        <div role="alert" className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: "var(--state-cobrar-bg)", color: "var(--state-cobrar-fg)" }}>
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          {actionError ?? status.error}
        </div>
      )}

      {open ? (
        <section aria-labelledby="wa-title" className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              {status.profilePicUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={status.profilePicUrl} alt="" className="h-16 w-16 flex-shrink-0 rounded-full border border-[color:var(--border)] object-cover" />
              ) : (
                <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <MessageCircle className="h-7 w-7 text-primary" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0">
                <Pill tone="faturado">Conectado</Pill>
                <h3 id="wa-title" className="mt-2 truncate text-xl font-bold">
                  {status.numberLabel || "WhatsApp do estabelecimento"}
                </h3>
                <p className="mt-0.5 text-sm text-[color:var(--muted-foreground)]">
                  {status.profileName ? `${status.profileName} · ` : ""}conectado {ago(status.connectedAt)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => void sendTest()} loading={busy === "test"}>
                {busy !== "test" && <Send className="h-4 w-4" aria-hidden="true" />}
                Enviar mensagem de teste
              </Button>
              <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => void check()} loading={busy === "check"}>
                {busy !== "check" && <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                Verificar agora
              </Button>
              <Button type="button" variant="ghost" className="min-h-[44px]" style={{ color: "var(--state-cobrar-fg)" }} onClick={() => setConfirmOff(true)} disabled={busy === "disconnect"}>
                <Unplug className="h-4 w-4" aria-hidden="true" />
                Desconectar
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <section aria-labelledby="wa-title" className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 sm:p-6">
          <Pill tone={status.state === "connecting" ? "pronto" : "cancelado"}>
            {status.state === "connecting" ? "Aguardando a leitura do QR code" : "Desconectado"}
          </Pill>
          <h3 id="wa-title" className="mt-3 text-xl font-bold">
            Conecte o WhatsApp do estabelecimento
          </h3>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[color:var(--muted-foreground)]">
            Um número só, que o sistema usa para enviar avisos aos clientes. Você conecta uma vez e o sistema cuida de manter a conexão.
          </p>

          {!qr ? (
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Como conectar">
                <Button type="button" variant="outline" className={`min-h-[44px] ${mode === "qr" ? "border-primary bg-primary/10 text-primary" : ""}`} aria-pressed={mode === "qr"} onClick={() => setMode("qr")}>
                  <QrCode className="h-4 w-4" aria-hidden="true" />
                  Ler QR code
                </Button>
                <Button type="button" variant="outline" className={`min-h-[44px] ${mode === "code" ? "border-primary bg-primary/10 text-primary" : ""}`} aria-pressed={mode === "code"} onClick={() => setMode("code")}>
                  <Smartphone className="h-4 w-4" aria-hidden="true" />
                  Usar código no celular
                </Button>
              </div>
              {mode === "code" && (
                <div className="max-w-xs">
                  <Label htmlFor="wa-phone" className="mb-1.5 block text-sm font-semibold">
                    Telefone do WhatsApp (com DDD)
                  </Label>
                  <Input id="wa-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(62) 99999-8888" inputMode="tel" className="min-h-[44px]" autoComplete="off" />
                </div>
              )}
              <Button type="button" className="min-h-[48px]" onClick={() => void connect()} loading={busy === "connect"} disabled={mode === "code" && !phone.trim()}>
                {busy !== "connect" && <MessageCircle className="h-4 w-4" aria-hidden="true" />}
                {mode === "code" ? "Gerar código" : "Gerar QR code"}
              </Button>
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap items-start gap-6">
              <div className="flex-shrink-0">
                {qr.qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr.qr} alt="QR code para conectar o WhatsApp" className="h-60 w-60 rounded-xl border border-[color:var(--border)] bg-white p-2" />
                ) : qr.pairingCode ? (
                  <div className="flex h-60 w-60 flex-col items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]/50 p-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">Código de pareamento</p>
                    <p className="mt-2 text-3xl font-bold tracking-widest">{qr.pairingCode.length === 8 ? `${qr.pairingCode.slice(0, 4)}-${qr.pairingCode.slice(4)}` : qr.pairingCode}</p>
                  </div>
                ) : (
                  <div className="flex h-60 w-60 items-center justify-center rounded-xl border border-dashed border-[color:var(--border)]">
                    <Loader2 className="h-6 w-6 animate-spin text-[color:var(--muted-foreground)]" aria-hidden="true" />
                  </div>
                )}
              </div>
              <ol className="min-w-[14rem] flex-1 space-y-3 text-sm">
                <li className="flex gap-3"><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">1</span><span>Abra o WhatsApp no celular do estabelecimento.</span></li>
                <li className="flex gap-3"><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">2</span><span>Toque em <strong>Aparelhos conectados</strong> e depois em <strong>Conectar um aparelho</strong>.</span></li>
                <li className="flex gap-3"><span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">3</span><span>{qr.pairingCode && !qr.qr ? "Escolha “Conectar com número de telefone” e digite o código ao lado." : "Aponte a câmera para o QR code ao lado."}</span></li>
                <li className="flex items-center gap-2 pt-1 text-[color:var(--muted-foreground)]">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Esperando a conexão. {qr.qr ? "O QR code se renova sozinho." : ""}
                </li>
                <li>
                  <Button type="button" variant="ghost" className="-ml-3 min-h-[44px]" onClick={() => setQr(null)}>
                    Cancelar
                  </Button>
                </li>
              </ol>
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="wa-keep" className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5 sm:p-6">
        <h3 id="wa-keep" className="flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          Como a conexão é mantida
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-[color:var(--muted-foreground)]">
          <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />Com o painel aberto, o sistema confere a conexão a cada poucos minutos.</li>
          <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />{status.realtime ? "A Evolution avisa o sistema na hora quando o WhatsApp cai." : "O aviso na hora (webhook) só funciona no sistema publicado, não neste ambiente de testes."}</li>
          <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />Uma checagem automática roda todo dia, mesmo sem ninguém no painel.</li>
          <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" aria-hidden="true" />Se uma conexão que estava boa cair, você recebe um aviso no sino do painel.</li>
        </ul>
        <p className="mt-4 text-xs text-[color:var(--muted-foreground)]">
          Última verificação: {ago(status.checkedAt)} · Aviso de queda: {status.watching ? "ligado" : "desligado (liga ao conectar)"}
        </p>
      </section>

      <Dialog open={confirmOff} onOpenChange={(v) => !v && busy !== "disconnect" && setConfirmOff(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Desconectar o WhatsApp?</DialogTitle>
            <DialogDescription>O sistema deixa de poder enviar mensagens por este número até você conectar de novo.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 text-sm">O aparelho sai da lista de “Aparelhos conectados” do celular.</div>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => setConfirmOff(false)} disabled={busy === "disconnect"}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" className="min-h-[44px]" onClick={() => void disconnect()} loading={busy === "disconnect"}>
              Desconectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
