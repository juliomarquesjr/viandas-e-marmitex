"use client";

import {
  canSatisfyStock,
  totalQtyInCartForProduct,
} from "@/lib/pdv/stockQuantity";
import { ScanBarcode, ShoppingCart } from "lucide-react";
import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { Kbd } from "../../components/ui/kbd";
import type { CartItem, Product } from "../types";
import { CartItemRow } from "./CartItem";

interface CartItemListProps {
  cart: CartItem[];
  products: Product[];
  selectedIndex: number | null;
  setSelectedIndex: (index: number) => void;
  /** Linha do último item adicionado — recebe destaque e rola para a vista. */
  lastAddedIndex: number | null;
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  onRequestRemoveItem: (index: number) => void;
  onStockBlocked: (message: string) => void;
}

export function CartItemList({
  cart,
  products,
  selectedIndex,
  setSelectedIndex,
  lastAddedIndex,
  setCart,
  onRequestRemoveItem,
  onStockBlocked,
}: CartItemListProps) {
  const listRef = useRef<HTMLDivElement | null>(null);

  // Item novo pode cair fora da área visível numa venda longa.
  useEffect(() => {
    if (lastAddedIndex === null) return;
    const row = listRef.current?.querySelector(`[data-cart-row="${lastAddedIndex}"]`);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [lastAddedIndex, cart.length]);

  if (cart.length === 0) {
    return (
      <div className="flex min-h-0 h-full max-h-full flex-col items-center justify-center gap-3 overflow-y-auto px-6 py-8 text-center">
        <div className="flex h-[60px] w-[60px] items-center justify-center rounded-[18px] bg-gradient-to-br from-slate-100 to-slate-200 shadow-inner">
          <ShoppingCart className="h-6 w-6 text-slate-400" strokeWidth={1.7} />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-bold text-slate-500">Carrinho vazio</p>
          <p className="mx-auto max-w-[24ch] text-[11.5px] leading-relaxed text-muted-foreground">
            Escaneie um código de barras ou escolha um produto no catálogo ao lado.
          </p>
        </div>
        <span className="flex items-center gap-2 text-[10.5px] text-slate-400">
          <ScanBarcode className="h-3.5 w-3.5" />
          <Kbd className="h-5 min-w-5 text-[9px]">Ctrl+K</Kbd>
          focar a busca
        </span>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="min-h-0 h-full max-h-full overflow-y-auto overflow-x-hidden px-2 py-1"
    >
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
            isLastAdded={idx === lastAddedIndex}
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
