"use client";

import { ShoppingCart } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { CartItem } from "../types";
import { CartItemRow } from "./CartItem";

interface CartItemListProps {
  cart: CartItem[];
  selectedIndex: number | null;
  setSelectedIndex: (index: number) => void;
  setCart: Dispatch<SetStateAction<CartItem[]>>;
}

export function CartItemList({
  cart,
  selectedIndex,
  setSelectedIndex,
  setCart,
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
      {cart.map((item, idx) => (
        <CartItemRow
          key={item.id}
          item={item}
          index={idx}
          isSelected={idx === selectedIndex}
          onMouseEnter={() => setSelectedIndex(idx)}
          onDecrement={() =>
            setCart((prev) =>
              prev.map((it, i) =>
                i === idx ? { ...it, qty: Math.max(1, it.qty - 1) } : it
              )
            )
          }
          onIncrement={() =>
            setCart((prev) =>
              prev.map((it, i) =>
                i === idx ? { ...it, qty: it.qty + 1 } : it
              )
            )
          }
          onRemove={() =>
            setCart((prev) => prev.filter((_, i) => i !== idx))
          }
        />
      ))}
    </div>
  );
}
