"use client";

import { Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface ProductThumbProps {
  src?: string;
  alt: string;
  /** Tamanho, raio e sombra do quadro. */
  className?: string;
  /** Classe do ícone de fallback quando não há foto. */
  iconClassName?: string;
  /** Classe extra da imagem — usada para o zoom no hover do card. */
  imageClassName?: string;
  /** Esmaece foto e ícone: produto sem estoque. */
  dimmed?: boolean;
}

/**
 * Quadro da foto do produto com fallback próprio. Centraliza o tratamento de
 * imagem quebrada, que antes era feito escrevendo HTML na mão no onError.
 */
export function ProductThumb({
  src,
  alt,
  className = "",
  iconClassName = "h-7 w-7 text-slate-300",
  imageClassName = "",
  dimmed = false,
}: ProductThumbProps) {
  const [failed, setFailed] = useState(false);

  // Produto novo no mesmo slot precisa tentar carregar de novo.
  useEffect(() => setFailed(false), [src]);

  const showImage = !!src && !failed;
  const dim = dimmed ? "grayscale opacity-45" : "";

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 shadow-inner ${className}`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover transition-transform duration-300 ${imageClassName} ${dim}`}
        />
      ) : (
        <ImageIcon className={`${iconClassName} ${dim}`} />
      )}
    </div>
  );
}
