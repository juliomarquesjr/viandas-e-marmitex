import type { CartItem, Product } from "@/app/pdv/types";

export type LastAdded = {
  line: CartItem;
  lineIndex: number;
  /** Ausente se o produto saiu do catálogo carregado — o painel cai para o texto. */
  product?: Product;
};

/**
 * Resolve o item que o painel de conferência mostra. Prefere o último produto
 * marcado; se ele já saiu do carrinho, cai para a última linha da lista.
 */
export function resolveLastAdded(
  cart: CartItem[],
  products: Product[],
  lastAddedId: string | null
): LastAdded | null {
  if (cart.length === 0) return null;

  let lineIndex = -1;
  if (lastAddedId) {
    for (let i = cart.length - 1; i >= 0; i--) {
      if (cart[i].id === lastAddedId) {
        lineIndex = i;
        break;
      }
    }
  }
  if (lineIndex < 0) lineIndex = cart.length - 1;

  const line = cart[lineIndex];
  return {
    line,
    lineIndex,
    product: products.find((p) => p.id === line.id),
  };
}

/** Estoque restante depois do que já está no carrinho. Null quando não há controle. */
export function remainingStock(
  product: Product | undefined,
  cart: CartItem[]
): number | null {
  if (!product?.stockEnabled || product.stock == null) return null;
  const inCart = cart
    .filter((it) => it.id === product.id)
    .reduce((sum, it) => sum + it.qty, 0);
  return Math.max(0, product.stock - inCart);
}
