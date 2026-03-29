import type { CartItem, Product } from "@/app/pdv/types";

export function totalQtyInCartForProduct(
  cart: CartItem[],
  productId: string
): number {
  return cart
    .filter((it) => it.id === productId)
    .reduce((sum, it) => sum + it.qty, 0);
}

/**
 * Alinha com POST /api/orders: só restringe quando stockEnabled e stock não é null.
 */
export function canSatisfyStock(
  product: Product,
  desiredTotalUnits: number
): boolean {
  if (!product.stockEnabled) return true;
  if (product.stock === undefined || product.stock === null) return false;
  return product.stock >= desiredTotalUnits;
}

export function canAddUnits(
  product: Product,
  cart: CartItem[],
  additionalUnits: number
): boolean {
  const nextTotal =
    totalQtyInCartForProduct(cart, product.id) + additionalUnits;
  return canSatisfyStock(product, nextTotal);
}
