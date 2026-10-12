"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

type Stage = "cadastro" | "whatsapp" | "nenhuma";

/**
 * Foto da pessoa nas conversas: primeiro a do cadastro do cliente; se ela não existe ou não carrega, a foto de
 * perfil do próprio WhatsApp (buscada pelo servidor); se também não houver, as iniciais. As iniciais ficam por
 * baixo o tempo todo, então nada pisca enquanto a foto chega.
 */
export function ContactAvatar({ customerId, name, imageUrl, className }: { customerId: string; name: string; imageUrl?: string | null; className?: string }) {
  const [stage, setStage] = useState<Stage>(imageUrl ? "cadastro" : "whatsapp");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setStage(imageUrl ? "cadastro" : "whatsapp");
    setLoaded(false);
  }, [customerId, imageUrl]);

  const src = stage === "cadastro" ? imageUrl : stage === "whatsapp" ? `/api/admin/whatsapp/avatar/${customerId}` : null;

  return (
    <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 font-bold text-indigo-800", className)}>
      <span aria-hidden="true">{initials(name)}</span>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            setStage((s) => (s === "cadastro" ? "whatsapp" : "nenhuma"));
          }}
          className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-200", loaded ? "opacity-100" : "opacity-0")}
        />
      )}
    </span>
  );
}
