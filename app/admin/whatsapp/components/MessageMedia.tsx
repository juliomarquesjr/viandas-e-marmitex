"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/app/components/ui/dialog";
import { AlertCircle, Download, FileText, RotateCw } from "lucide-react";
import { useRef, useState } from "react";
import { VideoPlayer } from "./VideoPlayer";

/**
 * Foto, figurinha, áudio, vídeo e documento recebidos na conversa. O arquivo é buscado na Evolution só quando
 * a mensagem aparece na tela (nada fica guardado no sistema) e só administrador tem acesso à rota.
 */
export function MessageMedia({ id, type, caption, onLoaded }: { id: string; type: string; caption: string | null; onLoaded?: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // o vídeo da mensagem e o ampliado seguem juntos: o ponto de um vira o ponto de partida do outro
  const videoAt = useRef(0);
  const [startAt, setStartAt] = useState<number | undefined>(undefined);
  const src = `/api/admin/whatsapp/media/${id}${attempt ? `?t=${attempt}` : ""}`;

  const retry = () => {
    setFailed(false);
    setAttempt((n) => n + 1);
  };

  if (failed) {
    return (
      <span className="flex flex-col items-start gap-1 text-[12.5px] text-slate-500">
        <span className="flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />Arquivo indisponível. Pode ter expirado no WhatsApp.</span>
        <button type="button" onClick={retry} className="flex cursor-pointer items-center gap-1 font-semibold text-primary hover:underline"><RotateCw className="h-3 w-3" aria-hidden />Tentar de novo</button>
      </span>
    );
  }

  if (type === "image" || type === "sticker") {
    const sticker = type === "sticker";
    return (
      <>
        <button type="button" onClick={() => setZoom(true)} className="block cursor-zoom-in overflow-hidden rounded-lg" aria-label="Ampliar foto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={caption ?? (sticker ? "Figurinha recebida" : "Foto recebida")}
            loading="lazy"
            onLoad={onLoaded}
            onError={() => setFailed(true)}
            className={sticker ? "h-32 w-32 object-contain" : "max-h-64 min-h-[72px] min-w-[120px] max-w-full bg-slate-100 object-cover"}
          />
        </button>
        <Dialog open={zoom} onOpenChange={setZoom}>
          <DialogContent className="max-h-[92vh] max-w-[92vw] overflow-auto p-2 sm:max-w-3xl">
            <DialogTitle className="sr-only">Foto recebida</DialogTitle>
            <DialogDescription className="sr-only">{caption ?? "Foto enviada pelo cliente"}</DialogDescription>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={caption ?? "Foto recebida"} className="mx-auto max-h-[80vh] w-auto max-w-full rounded-lg object-contain" />
            <a href={src} target="_blank" rel="noreferrer" className="mt-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary hover:underline"><Download className="h-4 w-4" aria-hidden />Abrir em outra aba</a>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (type === "audio") {
    return <audio controls preload="none" src={src} onError={() => setFailed(true)} className="h-10 w-[240px] max-w-full" aria-label="Áudio recebido" />;
  }

  if (type === "video") {
    const name = caption?.trim() ? `${caption.trim().slice(0, 40)}.mp4` : "video-whatsapp.mp4";
    return (
      <>
        <VideoPlayer
          src={src}
          label={name}
          variant="inline"
          startAt={startAt}
          suspended={expanded}
          onLoaded={onLoaded}
          onUnavailable={() => setFailed(true)}
          onTime={(t) => {
            videoAt.current = t;
          }}
          onExpand={(t) => {
            videoAt.current = t;
            setExpanded(true);
          }}
        />
        <Dialog
          open={expanded}
          onOpenChange={(open) => {
            setExpanded(open);
            if (!open) setStartAt(videoAt.current);
          }}
        >
          <DialogContent
            className="max-w-[96vw] overflow-hidden border-black bg-black p-0 sm:max-w-4xl"
            style={{ "--modal-header-close": "#ffffff", "--modal-header-close-hover": "rgba(255,255,255,.18)" } as React.CSSProperties}
          >
            <DialogTitle className="sr-only">Vídeo recebido</DialogTitle>
            <DialogDescription className="sr-only">{caption ?? "Vídeo enviado pelo cliente"}</DialogDescription>
            <VideoPlayer
              src={src}
              label={name}
              variant="modal"
              autoPlay
              startAt={videoAt.current}
              onUnavailable={() => {
                setExpanded(false);
                setFailed(true);
              }}
              onTime={(t) => {
                videoAt.current = t;
              }}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // documento
  return (
    <a href={src} download className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-100">
      <FileText className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
      <span className="min-w-0 truncate">{caption ?? "Documento"}</span>
      <Download className="ml-auto h-4 w-4 shrink-0 text-slate-400" aria-hidden />
    </a>
  );
}
