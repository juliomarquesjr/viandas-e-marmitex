"use client";

import * as React from "react";
import { initials } from "../lib/format";
import "./avatar.css";

/**
 * Foto do cliente em círculo. Sem foto, ou se a imagem não carregar, mostra as iniciais.
 * A foto entra com um fade, para não "piscar" por cima das iniciais.
 */
export function CustomerAvatar({
  name,
  imageUrl,
  size = 40,
  className,
}: {
  name?: string | null;
  imageUrl?: string | null;
  /** Lado do círculo em px. */
  size?: number;
  className?: string;
}) {
  // Guarda QUAL foto carregou (ou falhou), em vez de um "sim/não" que precisa ser zerado quando a foto muda.
  // Zerar num useEffect corre contra o onLoad: com a foto já no cache (voltar para a Home) ela carrega antes
  // do efeito rodar, o efeito apagava o "carregou" e a foto ficava invisível, só as iniciais.
  const [loadedUrl, setLoadedUrl] = React.useState<string | null>(null);
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);

  const showImage = Boolean(imageUrl) && failedUrl !== imageUrl;
  const loaded = Boolean(imageUrl) && loadedUrl === imageUrl;

  // Foto que já estava pronta antes de o React ligar o onLoad (cache): não espera um evento que não vem
  const ref = React.useCallback(
    (img: HTMLImageElement | null) => {
      if (img?.complete && img.naturalWidth > 0) setLoadedUrl(imageUrl ?? null);
    },
    [imageUrl],
  );

  return (
    <span
      className={["c-avatar", "c-avatar-ph", className].filter(Boolean).join(" ")}
      style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.34)) }}
      aria-hidden="true"
    >
      <span className="c-avatar-initials">{initials(name)}</span>
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={imageUrl}
          ref={ref}
          src={imageUrl as string}
          alt=""
          width={size}
          height={size}
          decoding="async"
          className={loaded ? "is-loaded" : undefined}
          onLoad={() => setLoadedUrl(imageUrl ?? null)}
          onError={() => setFailedUrl(imageUrl ?? null)}
        />
      )}
    </span>
  );
}
