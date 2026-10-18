"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { ArrowRight, Loader2, MessageCircle, User } from "lucide-react";
import { useEffect, useState } from "react";

type Probe = "checking" | "available" | "none";

interface WhatsappPhotoOfferProps {
  customerId: string;
  name: string;
  /** A foto que o cadastro tem agora (a do formulário, ainda não salva). */
  currentImageUrl: string;
  /** O administrador aceitou: a URL da foto já guardada, para entrar no formulário. */
  onUse: (url: string) => void;
}

function Face({ src, label, caption }: { src: string | null; label: string; caption: string }) {
  return (
    <figure className="flex flex-1 flex-col items-center gap-2 text-center">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
      <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow-md">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={caption} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <User className="h-10 w-10 text-slate-400" />
        )}
      </div>
      <figcaption className="text-xs text-slate-500">{caption}</figcaption>
    </figure>
  );
}

/**
 * Oferece a foto de perfil do WhatsApp como foto de cadastro. Só aparece se o servidor achar a foto (a rota devolve 404
 * quando o contato não tem foto ou a escondeu). Mostra o antes e o depois; nada é gravado no cadastro até o
 * administrador aceitar aqui e depois salvar o formulário.
 */
export function WhatsappPhotoOffer({ customerId, name, currentImageUrl, onUse }: WhatsappPhotoOfferProps) {
  const previewSrc = `/api/admin/whatsapp/avatar/${customerId}`;
  const [probe, setProbe] = useState<Probe>("checking");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProbe("checking");
    const image = new window.Image();
    image.onload = () => !cancelled && setProbe("available");
    image.onerror = () => !cancelled && setProbe("none");
    image.src = previewSrc;
    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [previewSrc]);

  const changeOpen = (next: boolean) => {
    setOpen(next);
    setError(null);
  };

  const accept = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(previewSrc, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok || typeof body?.url !== "string") {
        setError(body?.error || "Não foi possível guardar a foto agora. Tente de novo.");
        return;
      }
      onUse(body.url);
      changeOpen(false);
    } catch {
      setError("Não foi possível guardar a foto agora. Tente de novo.");
    } finally {
      setSaving(false);
    }
  };

  if (probe === "none") return null;

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
        <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600" />
        <p className="min-w-0 flex-1 text-xs text-slate-600">
          {probe === "checking"
            ? "Procurando a foto do WhatsApp…"
            : currentImageUrl
              ? "Esta pessoa tem uma foto no WhatsApp. Quer comparar com a do cadastro?"
              : "Esta pessoa tem uma foto no WhatsApp. Quer usá-la no cadastro?"}
        </p>
        {probe === "checking" ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
        ) : (
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => changeOpen(true)}>
            Ver antes e depois
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent higherZIndex className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Foto do WhatsApp</DialogTitle>
            <DialogDescription>
              Veja como fica a foto de {name} no cadastro antes de trocar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 px-6 py-5">
            <Face src={currentImageUrl || null} label="Antes" caption={currentImageUrl ? "Foto do cadastro" : "Sem foto"} />
            <ArrowRight className="h-5 w-5 shrink-0 text-slate-300" />
            <Face src={previewSrc} label="Depois" caption="Foto do WhatsApp" />
          </div>

          {error && <p className="px-6 text-sm text-red-600">{error}</p>}
          <p className="px-6 pb-1 text-xs text-slate-400">
            A troca só vale depois que você salvar o cadastro.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => changeOpen(false)} disabled={saving}>
              Manter a atual
            </Button>
            <Button type="button" onClick={accept} disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Usar foto do WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
