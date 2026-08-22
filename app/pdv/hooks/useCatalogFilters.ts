import { useCallback, useMemo, useState } from "react";
import type { Product } from "../types";

export type FilterMode = "type" | "category" | "pricing";

/** Ícone de fallback do quadro quando a categoria não tem emoji cadastrado. */
export type TileIcon = "all" | "sellable" | "addon" | "unit" | "kg" | "tag";

export type CatalogTile = {
  key: string;
  label: string;
  count: number;
  emoji?: string | null;
  icon: TileIcon;
};

/**
 * Estado dos filtros do catálogo. Vive acima da grade porque os quadros de
 * categoria ficam na faixa da busca, e a grade só recebe a lista já filtrada.
 */
export function useCatalogFilters(products: Product[]) {
  const [mode, setMode] = useState<FilterMode>("category");
  const [typeValue, setTypeValue] = useState("all");
  const [categoryValue, setCategoryValue] = useState("all");
  const [pricingValue, setPricingValue] = useState("all");

  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; icon?: string | null }>();
    for (const p of products) {
      if (p.category) map.set(p.category.id, p.category);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR")
    );
  }, [products]);

  const hasKg = products.some((p) => !!p.pricePerKgCents);
  const hasUnit = products.some((p) => !p.pricePerKgCents);
  const hasAddons = products.some((p) => p.productType === "addon");

  const availableModes = useMemo(() => {
    const modes: { key: FilterMode; label: string }[] = [];
    if (categories.length > 0) modes.push({ key: "category", label: "Categoria" });
    modes.push({ key: "type", label: "Tipo" });
    if (hasKg && hasUnit) modes.push({ key: "pricing", label: "Preço" });
    return modes;
  }, [categories.length, hasKg, hasUnit]);

  // Sem categorias cadastradas o modo padrão não existe — cai para "tipo".
  const activeMode: FilterMode =
    availableModes.some((m) => m.key === mode) ? mode : "type";

  const activeKey =
    activeMode === "type"
      ? typeValue
      : activeMode === "category"
      ? categoryValue
      : pricingValue;

  const tiles = useMemo<CatalogTile[]>(() => {
    const count = (fn: (p: Product) => boolean) => products.filter(fn).length;

    if (activeMode === "category") {
      return [
        { key: "all", label: "Todas", icon: "all", count: products.length },
        ...categories.map((c) => ({
          key: c.id,
          label: c.name,
          emoji: c.icon,
          icon: "tag" as TileIcon,
          count: count((p) => p.categoryId === c.id),
        })),
      ];
    }

    if (activeMode === "pricing") {
      return [
        { key: "all", label: "Todos", icon: "all", count: products.length },
        { key: "unit", label: "Unitários", icon: "unit", count: count((p) => !p.pricePerKgCents) },
        { key: "kg", label: "Por Quilo", icon: "kg", count: count((p) => !!p.pricePerKgCents) },
      ];
    }

    return [
      { key: "all", label: "Todos", icon: "all", count: products.length },
      { key: "sellable", label: "Vendáveis", icon: "sellable", count: count((p) => p.productType === "sellable") },
      ...(hasAddons
        ? [{ key: "addon", label: "Adicionais", icon: "addon" as TileIcon, count: count((p) => p.productType === "addon") }]
        : []),
    ];
  }, [activeMode, products, categories, hasAddons]);

  const selectTile = useCallback(
    (key: string) => {
      if (activeMode === "type") setTypeValue(key);
      else if (activeMode === "category") setCategoryValue(key);
      else setPricingValue(key);
    },
    [activeMode]
  );

  const changeMode = useCallback((next: FilterMode) => {
    setMode(next);
    setTypeValue("all");
    setCategoryValue("all");
    setPricingValue("all");
  }, []);

  const displayed = useMemo(() => {
    if (activeKey === "all") return products;
    if (activeMode === "type") return products.filter((p) => p.productType === activeKey);
    if (activeMode === "category") return products.filter((p) => p.categoryId === activeKey);
    if (activeKey === "kg") return products.filter((p) => !!p.pricePerKgCents);
    return products.filter((p) => !p.pricePerKgCents);
  }, [products, activeMode, activeKey]);

  return { mode: activeMode, changeMode, availableModes, tiles, activeKey, selectTile, displayed };
}
