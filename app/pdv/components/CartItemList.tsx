"use client";

import {
  canSatisfyStock,
  totalQtyInCartForProduct,
} from "@/lib/pdv/stockQuantity";
import { ShoppingCart } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { CartItem, Product } from "../types";
import { CartItemRow } from "./CartItem";

interface CartItemListProps {
  cart: CartItem[];
  products: Product[];
  selectedIndex: number | null;
  setSelectedIndex: (index: number) => void;
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  onRequestRemoveItem: (index: number) => void;
  onStockBlocked: (message: string) => void;
}

export function CartItemList({
  cart,
  products,
  selectedIndex,
  setSelectedIndex,
  setCart,
  onRequestRemoveItem,
  onStockBlocked,
}: CartItemListProps) {
  if (cart.length === 0) {
    return (
      <div className="min-h-0 h-full max-h-full flex flex-col items-center justify-center gap-3 overflow-y-auto py-8 px-4 text-center">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shadow-inner">
          <ShoppingCart className="h-6 w-6 text-slate-400" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">Carrinho vazio</p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-[180px]">
            Escaneie um código ou selecione um produto
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 h-full max-h-full overflow-y-auto overflow-x-hidden px-2 py-1">
      {cart.map((item, idx) => {
        const product = products.find((p) => p.id === item.id);
        const totalInCart = totalQtyInCartForProduct(cart, item.id);
        const atStockLimit =
          !item.isWeightBased &&
          !!product &&
          product.stockEnabled &&
          product.stock != null &&
          !canSatisfyStock(product, totalInCart + 1);

        return (
          <CartItemRow
            key={`${item.id}-${idx}-${item.isWeightBased ? item.weightKg : "u"}`}
            item={item}
            index={idx}
            isSelected={idx === selectedIndex}
            onClick={() => setSelectedIndex(idx)}
            incrementDisabled={atStockLimit}
            onDecrement={() =>
              setCart((prev) =>
                prev.map((it, i) =>
                  i === idx ? { ...it, qty: Math.max(1, it.qty - 1) } : it
                )
              )
            }
            onIncrement={() =>
              setCart((prev) => {
                const line = prev[idx];
                if (!line || line.isWeightBased) return prev;
                const p = products.find((x) => x.id === line.id);
                if (!p) {
                  return prev.map((it, i) =>
                    i === idx ? { ...it, qty: it.qty + 1 } : it
                  );
                }
                const total = totalQtyInCartForProduct(prev, line.id);
                if (!canSatisfyStock(p, total + 1)) {
                  queueMicrotask(() =>
                    onStockBlocked(`Estoque insuficiente para ${p.name}`)
                  );
                  return prev;
                }
                return prev.map((it, i) =>
                  i === idx ? { ...it, qty: it.qty + 1 } : it
                );
              })
            }
            onRemove={() => onRequestRemoveItem(idx)}
          />
        );
      })}
    </div>
  );
}
