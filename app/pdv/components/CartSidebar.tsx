"use client";

import { ShoppingCart, Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { CustomerSelector } from "../../components/CustomerSelector";
import { Button } from "../../components/ui/button";
import { CountBadge } from "../../components/ui/badge";
import type { CartItem, Customer, DiscountState, Product } from "../types";
import { CartItemList } from "./CartItemList";
import { CartTotals } from "./CartTotals";

interface CartSidebarProps {
  cart: CartItem[];
  setCart: Dispatch<SetStateAction<CartItem[]>>;
  selectedIndex: number | null;
  setSelectedIndex: (index: number) => void;
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
    <aside className="grid min-h-0 min-w-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] h-full max-h-full bg-white border border-slate-200 shadow-card rounded-xl overflow-hidden">
      {/* Header do carrinho */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <span className="font-semibold text-slate-900">Carrinho</span>
          <CountBadge count={cart.length} variant="primary" />
        </div>
        {cart.length > 0 && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRequestClearCart}
            title="Limpar carrinho"
            className="text-slate-400 hover:text-red-500 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Zona do cliente */}
      <div className="px-3 pt-2 pb-1">
        <CustomerSelector
          onSelect={onSelectCustomer}
          selectedCustomer={selectedCustomer}
          onRemove={onRemoveCustomer}
          presetProductsLoaded={presetProductsLoaded}
        />
      </div>

      {/* Lista de itens */}
      <CartItemList
        cart={cart}
        products={products}
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
        setCart={setCart}
        onRequestRemoveItem={onRequestRemoveItem}
        onStockBlocked={onStockBlocked}
      />

      {/* Totais e CTAs */}
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
