"use client";

import { UtensilsCrossed } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cx } from "../kit";
import "./thumbs.css";

export type ThumbSize = "sm" | "md" | "lg";

export interface ThumbProduct {
  id: string;
  name: string;
  imageUrl: string | null;
}

/** Lado em px do arquivo pedido ao navegador (o CSS manda no tamanho exibido; lg vai a 64 no computador). */
const PX: Record<ThumbSize, number> = { sm: 40, md: 48, lg: 64 };
const ICON: Record<ThumbSize, number> = { sm: 18, md: 20, lg: 26 };

/** Quantos pares de cores o ladrilho sem foto tem (ver thumbs.css: .tone-0 … .tone-3). */
const TONES = 4;

/** Mesmo produto, mesma cor, sempre: hash simples e estável do id. */
export function toneOf(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % TONES;
}

type Status = "loading" | "loaded" | "failed";

/**
 * Miniatura quadrada de um produto: foto com fade sobre um esqueleto e, sem foto
 * (ou se ela falhar), um ladrilho tingido com ícone de comida. Decorativa: o nome do
 * produto sempre aparece em texto ao lado, então fica fora da árvore de acessibilidade.
 */
export function ProductThumb({
  product,
  size = "md",
  className,
}: {
  product: ThumbProduct;
  size?: ThumbSize;
  className?: string;
}) {
  const url = product.imageUrl || null;
  // O estado vale para a URL em que foi medido: URL nova volta a "loading" sem efeito de reset.
  const [state, setState] = useState<{ url: string | null; status: Status }>({ url, status: "loading" });
  const imgRef = useRef<HTMLImageElement>(null);

  const status: Status = state.url === url ? state.status : "loading";
  const showImage = url !== null && status !== "failed";

  // Imagem em cache pode terminar de carregar antes da hidratação, sem disparar onLoad.
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !img.complete) return;
    setState({ url, status: img.naturalWidth > 0 ? "loaded" : "failed" });
  }, [url]);

  return (
    <span
      className={cx(
        "c-th",
        `is-${size}`,
        !showImage && `is-ph tone-${toneOf(product.id)}`,
        showImage && (status === "loaded" ? "is-loaded" : "is-loading"),
        className,
      )}
      aria-hidden="true"
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          key={url}
          src={url}
          alt=""
          width={PX[size]}
          height={PX[size]}
          loading="lazy"
          decoding="async"
          onLoad={() => setState({ url, status: "loaded" })}
          onError={() => setState({ url, status: "failed" })}
        />
      ) : (
        <UtensilsCrossed size={ICON[size]} strokeWidth={1.7} />
      )}
    </span>
  );
}
