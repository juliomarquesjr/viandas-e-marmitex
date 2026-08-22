"use client";

import { ShoppingCart, Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { CustomerSelector } from "../../components/CustomerSelector";
import { CountBadge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import type { CartItem, Customer, DiscountState, Product } from "../types";
import { CartItemList } from "./CartItemList";
import { CartTotals } from "./CartTotals";

interface CartSidebarProps {
  cart: CartItem[];
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  selectedIndex: number | null;
  setSelectedIndex: (index: number) => void;
  lastAddedIndex: number | null;
  onRequestClearCart: () => void;
  subtotal: number;
  discountAmount: number;
  discount: DiscountState;
  total: number;
  selectedCustomer: Customer | null;
  presetProductsLoaded: boolean;
  onSelectCustomer: (customer: Customer) => void;
  onRemoveCustomer: () => void;
  onPaymentOpen: () => void;
  onDiscountOpen: () => void;
  onRequestRemoveItem: (index: number) => void;
  products: Product[];
  onStockBlocked: (message: string) => void;
}

export function CartSidebar({
  cart,
  setCart,
  selectedIndex,
  setSelectedIndex,
  lastAddedIndex,
  onRequestClearCart,
  subtotal,
  discountAmount,
  discount,
  total,
  selectedCustomer,
  presetProductsLoaded,
  onSelectCustomer,
  onRemoveCustomer,
  onPaymentOpen,
  onDiscountOpen,
  onRequestRemoveItem,
  products,
  onStockBlocked,
}: CartSidebarProps) {
  return (
    <aside className="grid h-full max-h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      {/* Cabeçalho — título, contador, cliente e limpar na mesma linha, para a
          lista de itens ficar com toda a altura restante da coluna. */}
      <div className="flex min-w-0 items-center gap-2 border-b border-slate-100 px-3 py-2.5">
        <ShoppingCart className="h-5 w-5 flex-shrink-0 text-primary" />
        <span className="flex-shrink-0 font-semibold text-slate-900">Carrinho</span>
        <CountBadge count={cart.length} variant="primary" />

        <div className="ml-auto flex min-w-0 items-center gap-1">
          <CustomerSelector
            variant="chip"
            onSelect={onSelectCustomer}
            selectedCustomer={selectedCustomer}
            onRemove={onRemoveCustomer}
            presetProductsLoaded={presetProductsLoaded}
          />
          {cart.length > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onRequestClearCart}
              title="Limpar carrinho"
              className="flex-shrink-0 text-slate-400 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <CartItemList
        cart={cart}
        products={products}
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
        lastAddedIndex={lastAddedIndex}
        setCart={setCart}
        onRequestRemoveItem={onRequestRemoveItem}
        onStockBlocked={onStockBlocked}
      />

      <CartTotals
        subtotal={subtotal}
        discountAmount={discountAmount}
        discount={discount}
        total={total}
        cartLength={cart.length}
        onPaymentOpen={onPaymentOpen}
        onDiscountOpen={onDiscountOpen}
      />
    </aside>
  );
}
