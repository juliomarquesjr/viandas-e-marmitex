"use client";

import { ArrowLeft, Battery, Camera, Lock, MoreVertical, Paperclip, Phone, Signal, Smile, Video, Wifi, Mic } from "lucide-react";
import * as React from "react";
import { FormattedText } from "./WhatsAppBubble";

const nowLabel = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

/**
 * Um celular com a conversa do WhatsApp, para o operador ver a mensagem como o cliente a recebe:
 * cabeçalho do contato, fundo da conversa, balão recebido (com *negrito*, _itálico_ e links aplicados) e o campo de mensagem.
 */
export function WhatsAppPhone({ name, text, empty, className = "" }: { name: string; text: string | null; empty?: string; className?: string }) {
  const [time, setTime] = React.useState("");
  React.useEffect(() => setTime(nowLabel()), []);

  return (
    <div className={`mx-auto w-[300px] rounded-[42px] bg-slate-900 p-[9px] shadow-xl ${className}`} aria-label={`Prévia da conversa de WhatsApp com ${name}`}>
      <div className="relative flex h-[min(600px,calc(100dvh-15rem))] min-h-[440px] flex-col overflow-hidden rounded-[34px] bg-[#efeae2]">
        {/* barra de status */}
        <div className="flex items-center justify-between bg-[#075e54] px-5 pb-1 pt-2 text-[11px] font-semibold text-white">
          <span>{time || "9:41"}</span>
          <span className="absolute left-1/2 top-1.5 h-[18px] w-[70px] -translate-x-1/2 rounded-full bg-black" aria-hidden />
          <span className="flex items-center gap-1" aria-hidden>
            <Signal className="h-3 w-3" />
            <Wifi className="h-3 w-3" />
            <Battery className="h-3.5 w-3.5" />
          </span>
        </div>

        {/* cabeçalho da conversa */}
        <div className="flex items-center gap-2 bg-[#008069] px-2 pb-2.5 pt-1.5 text-white">
          <ArrowLeft className="h-5 w-5 shrink-0" aria-hidden />
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/25 text-sm font-bold" aria-hidden>
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[15px] font-semibold">{name}</span>
            <span className="block text-[11px] text-white/80">online</span>
          </span>
          <Video className="h-5 w-5 shrink-0" aria-hidden />
          <Phone className="h-[18px] w-[18px] shrink-0" aria-hidden />
          <MoreVertical className="h-5 w-5 shrink-0" aria-hidden />
        </div>

        {/* conversa */}
        <div
          className="flex-1 space-y-2 overflow-y-auto px-2.5 py-3"
          style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.045) 1px, transparent 1px)", backgroundSize: "14px 14px" }}
        >
          <p className="mx-auto w-fit rounded-md bg-white px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-wide text-slate-500 shadow-sm">Hoje</p>
          <p className="mx-auto flex max-w-[92%] items-start gap-1.5 rounded-md bg-[#fff5c4] px-2.5 py-1.5 text-center text-[10px] leading-snug text-slate-600 shadow-sm">
            <Lock className="mt-px h-2.5 w-2.5 shrink-0" aria-hidden />
            As mensagens e as chamadas são protegidas com a criptografia de ponta a ponta.
          </p>

          {text ? (
            <div className="relative max-w-[90%]">
              <span className="absolute -left-[6px] top-0 h-0 w-0 border-r-[8px] border-t-[8px] border-r-white border-t-transparent" aria-hidden />
              <div className="rounded-lg rounded-tl-none bg-white px-2.5 pb-1 pt-1.5 text-[12.5px] leading-[1.4] text-[#111b21] shadow-sm">
                <div className="whitespace-pre-wrap break-words">
                  <FormattedText text={text} />
                </div>
                <p className="mt-0.5 text-right text-[10px] text-slate-400">{time || "09:41"}</p>
              </div>
            </div>
          ) : (
            <p className="px-4 py-10 text-center text-xs text-slate-500">{empty ?? "A mensagem aparece aqui."}</p>
          )}
        </div>

        {/* campo de mensagem */}
        <div className="flex items-center gap-1.5 bg-[#efeae2] px-1.5 pb-3 pt-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-3 py-2 text-slate-400 shadow-sm" aria-hidden>
            <Smile className="h-5 w-5 shrink-0" />
            <span className="flex-1 text-[13px]">Mensagem</span>
            <Paperclip className="h-4 w-4 shrink-0" />
            <Camera className="h-[18px] w-[18px] shrink-0" />
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white" aria-hidden>
            <Mic className="h-5 w-5" />
          </span>
        </div>
      </div>
    </div>
  );
}
