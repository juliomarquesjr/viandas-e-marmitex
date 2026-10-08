import type { CSSProperties } from "react";
import { ProductThumb, type ThumbProduct } from "./ProductThumb";

/** Produtos distintos do pedido, na ordem dos itens (o mesmo produto não se repete). */
export function uniqueProducts(items: Array<{ product: ThumbProduct }>): ThumbProduct[] {
  const seen = new Set<string>();
  const products: ThumbProduct[] = [];
  for (const { product } of items) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    products.push(product);
  }
  return products;
}

/** No máximo 3 ladrilhos: com mais de 3 produtos, 2 fotos + "+N" (cabe no celular sem espremer o texto). */
const MAX_TILES = 3;

/**
 * Pilha de miniaturas da linha da lista: a primeira por cima, cada uma com um anel na cor de
 * fundo da linha (var(--c-ring), definida em thumbs.css conforme repouso/hover/selecionada).
 */
export function ThumbStack({ items, fallbackId }: { items: Array<{ product: ThumbProduct }>; fallbackId: string }) {
  const products = uniqueProducts(items);
  const overflow = products.length > MAX_TILES;
  const shown = overflow ? products.slice(0, MAX_TILES - 1) : products;
  const extra = products.length - shown.length;
  // Pedido sem itens: ladrilho neutro, para a linha manter a mesma altura e alinhamento.
  const list = shown.length > 0 ? shown : [{ id: fallbackId, name: "", imageUrl: null }];
  const total = list.length + (extra > 0 ? 1 : 0);
  const layer = (i: number) => ({ zIndex: total - i }) as CSSProperties;

  return (
    <span className="c-ts" aria-hidden="true">
      {list.map((product, i) => (
        <span key={product.id} className="c-ts-i" style={layer(i)}>
          <ProductThumb product={product} size="md" />
        </span>
      ))}
      {extra > 0 && (
        <span className="c-ts-i" style={layer(list.length)}>
          <span className="c-th is-md c-th-more">+{extra}</span>
        </span>
      )}
    </span>
  );
}
