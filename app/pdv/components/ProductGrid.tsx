"use client";

import { Boxes } from "lucide-react";
import { useMemo, useState } from "react";
import type { Product } from "../types";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  loadingProducts: boolean;
  canAddProductToCart: (product: Product) => boolean;
  onAddProduct: (product: Product) => void;
}

type FilterMode = "type" | "category" | "pricing";
type TypeValue = "all" | "sellable" | "addon";
type PricingValue = "all" | "unit" | "kg";

export function ProductGrid({
  products,
  loadingProducts,
  canAddProductToCart,
  onAddProduct,
}: ProductGridProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>("type");
  const [typeValue, setTypeValue] = useState<TypeValue>("all");
  const [categoryValue, setCategoryValue] = useState<string>("all");
  const [pricingValue, setPricingValue] = useState<PricingValue>("all");

  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; icon?: string | null }>();
    for (const p of products) {
      if (p.category) map.set(p.category.id, p.category);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [products]);

  const hasKg = products.some((p) => !!p.pricePerKgCents);
  const hasUnit = products.some((p) => !p.pricePerKgCents);
  const hasBothPricingTypes = hasKg && hasUnit;
  const hasAddons = products.some((p) => p.productType === "addon");

  const availableModes = useMemo(() => {
    const modes: { key: FilterMode; label: string }[] = [{ key: "type", label: "Tipo" }];
    if (categories.length > 0) modes.push({ key: "category", label: "Categoria" });
    if (hasBothPricingTypes) modes.push({ key: "pricing", label: "Precificação" });
    return modes;
  }, [categories.length, hasBothPricingTypes]);

  const handleModeChange = (mode: FilterMode) => {
    setFilterMode(mode);
    setTypeValue("all");
    setCategoryValue("all");
    setPricingValue("all");
  };

  const displayed = useMemo(() => {
    if (filterMode === "type" && typeValue !== "all")
      return products.filter((p) => p.productType === typeValue);
    if (filterMode === "category" && categoryValue !== "all")
      return products.filter((p) => p.categoryId === categoryValue);
    if (filterMode === "pricing") {
      if (pricingValue === "kg") return products.filter((p) => !!p.pricePerKgCents);
      if (pricingValue === "unit") return products.filter((p) => !p.pricePerKgCents);
    }
    return products;
  }, [products, filterMode, typeValue, categoryValue, pricingValue]);

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

  /* ── pills por modo ── */
  const typePills = [
    { key: "all" as TypeValue, label: "Todos", count: products.length },
    { key: "sellable" as TypeValue, label: "Vendáveis", count: products.filter((p) => p.productType === "sellable").length },
    ...(hasAddons
      ? [{ key: "addon" as TypeValue, label: "Adicionais", count: products.filter((p) => p.productType === "addon").length }]
      : []),
  ];

  const categoryPills = [
    { key: "all", label: "Todas", icon: null, count: products.length },
    ...categories.map((c) => ({
      key: c.id,
      label: c.name,
      icon: c.icon ?? null,
      count: products.filter((p) => p.categoryId === c.id).length,
    })),
  ];

  const pricingPills = [
    { key: "all" as PricingValue, label: "Todos", count: products.length },
    { key: "unit" as PricingValue, label: "Unitários", count: products.filter((p) => !p.pricePerKgCents).length },
    { key: "kg" as PricingValue, label: "Por Kilo", count: products.filter((p) => !!p.pricePerKgCents).length },
  ];

  const pillClass = (active: boolean) =>
    `flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
      active
        ? "bg-white text-slate-900 shadow-sm"
        : "text-slate-500 hover:text-slate-700"
    }`;

  const countClass = (active: boolean) =>
    `text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums transition-colors duration-150 ${
      active ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-500"
    }`;

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      {/* Pills do modo ativo */}
      <div className="bg-slate-100 p-1 rounded-xl flex-shrink-0">
        {filterMode === "type" && (
          <div className="flex gap-1">
            {typePills.map((pill) => (
              <button
                key={pill.key}
                onClick={() => setTypeValue(pill.key)}
                className={`${pillClass(typeValue === pill.key)} flex-1 justify-center`}
              >
                {pill.label}
                <span className={countClass(typeValue === pill.key)}>{pill.count}</span>
              </button>
            ))}
          </div>
        )}

        {filterMode === "category" && (
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {categoryPills.map((pill) => (
              <button
                key={pill.key}
                onClick={() => setCategoryValue(pill.key)}
                className={pillClass(categoryValue === pill.key)}
              >
                {pill.icon && <span>{pill.icon}</span>}
                {pill.label}
                <span className={countClass(categoryValue === pill.key)}>{pill.count}</span>
              </button>
            ))}
          </div>
        )}

        {filterMode === "pricing" && (
          <div className="flex gap-1">
            {pricingPills.map((pill) => (
              <button
                key={pill.key}
                onClick={() => setPricingValue(pill.key)}
                className={`${pillClass(pricingValue === pill.key)} flex-1 justify-center`}
              >
                {pill.label}
                <span className={countClass(pricingValue === pill.key)}>{pill.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-8 text-center flex-1">
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

      {/* Seletor de modo — canto inferior esquerdo */}
      {availableModes.length > 1 && (
        <div className="flex-shrink-0 flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">
            Filtrar por:
          </span>
          <div className="flex gap-1">
            {availableModes.map((mode) => (
              <button
                key={mode.key}
                onClick={() => handleModeChange(mode.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 ${
                  filterMode === mode.key
                    ? "bg-primary text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
