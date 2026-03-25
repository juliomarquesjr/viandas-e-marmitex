"use client";

import { Boxes } from "lucide-react";
import { useState } from "react";
import type { Product } from "../types";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  loadingProducts: boolean;
  canAddProductToCart: (product: Product) => boolean;
  onAddProduct: (product: Product) => void;
}

type CategoryTab = "all" | "sellable" | "addon";

export function ProductGrid({
  products,
  loadingProducts,
  canAddProductToCart,
  onAddProduct,
}: ProductGridProps) {
  const [activeTab, setActiveTab] = useState<CategoryTab>("all");

  const sellable = products.filter((p) => p.productType === "sellable");
  const addons = products.filter((p) => p.productType === "addon");
  const displayed =
    activeTab === "all" ? products : activeTab === "sellable" ? sellable : addons;

  const tabs = [
    { key: "all" as const, label: "Todos", count: products.length },
    { key: "sellable" as const, label: "Vendáveis", count: sellable.length },
    ...(addons.length > 0
      ? [{ key: "addon" as const, label: "Adicionais", count: addons.length }]
      : []),
  ];

  if (loadingProducts) {
    return (
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl flex-shrink-0">
          <div className="h-7 flex-1 rounded-lg bg-slate-200 animate-pulse" />
          <div className="h-7 flex-1 rounded-lg bg-slate-200 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden">
              <div className="h-[88px] bg-slate-200 animate-pulse" />
              <div className="p-2.5 space-y-1.5 bg-white">
                <div className="h-3 bg-slate-200 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-slate-200 rounded animate-pulse w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 py-12 text-center">
        <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
          <Boxes className="h-7 w-7 text-slate-400" />
        </div>
        <p className="text-sm text-muted-foreground">Nenhum produto cadastrado.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {/* Tabs pill-style */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              activeTab === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums transition-colors duration-150 ${
                activeTab === tab.key
                  ? "bg-primary/10 text-primary"
                  : "bg-slate-200 text-slate-500"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhum produto nesta categoria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5 overflow-y-auto flex-1 pr-0.5 content-start pb-2">
          {displayed.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              canAdd={canAddProductToCart(product)}
              onAdd={onAddProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
}
