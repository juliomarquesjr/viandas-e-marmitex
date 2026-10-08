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
  const [failed, setFailed] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  // Foto nova, estado novo
  React.useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [imageUrl]);

  const showImage = Boolean(imageUrl) && !failed;

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
          src={imageUrl as string}
          alt=""
          width={size}
          height={size}
          decoding="async"
          className={loaded ? "is-loaded" : undefined}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
