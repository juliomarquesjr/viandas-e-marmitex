"use client";

import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  Hash,
  Package,
  PlusCircle,
  Scale,
  Tag,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CatalogTile, TileIcon } from "../hooks/useCatalogFilters";

const SCROLL_STEP = 240;

const ICONS: Record<TileIcon, typeof Boxes> = {
  all: Boxes,
  sellable: Package,
  addon: PlusCircle,
  unit: Hash,
  kg: Scale,
  tag: Tag,
};

interface CategoryNavProps {
  tiles: CatalogTile[];
  activeKey: string;
  onSelect: (key: string) => void;
}

/**
 * Quadros de filtro lado a lado, com setas nas pontas. A rolagem horizontal
 * mantém a faixa em uma linha só, independente de quantas categorias existam.
 */
export function CategoryNav({ tiles, activeKey, onSelect }: CategoryNavProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const syncArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= max - 1);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    syncArrows();
    const observer = new ResizeObserver(syncArrows);
    observer.observe(el);
    return () => observer.disconnect();
  }, [syncArrows, tiles.length]);

  const scrollByStep = (direction: -1 | 1) => {
    trackRef.current?.scrollBy({ left: direction * SCROLL_STEP, behavior: "smooth" });
  };

  const arrowClass = (disabled: boolean) =>
    `flex-shrink-0 grid place-items-center w-[30px] h-[68px] rounded-xl border bg-white transition-colors duration-150 ${
      disabled
        ? "border-slate-200 text-slate-300 opacity-30 cursor-default"
        : "border-slate-200 text-slate-500 shadow-sm hover:border-blue-200 hover:text-primary hover:bg-blue-50/60"
    }`;

  return (
    <div className="flex w-fit max-w-full items-center gap-2">
      <button
        type="button"
        onClick={() => scrollByStep(-1)}
        disabled={atStart}
        aria-label="Categorias anteriores"
        className={arrowClass(atStart)}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div
        ref={trackRef}
        onScroll={syncArrows}
        className="min-w-0 overflow-x-auto scrollbar-none"
      >
        <div className="flex gap-2 p-px">
          {tiles.map((tile) => {
            const active = tile.key === activeKey;
            const Icon = ICONS[tile.icon];
            return (
              <button
                key={tile.key}
                type="button"
                onClick={() => onSelect(tile.key)}
                aria-pressed={active}
                title={tile.label}
                className={`relative flex-shrink-0 w-[112px] h-[68px] rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-150 ${
                  active
                    ? "bg-gradient-to-br from-primary to-[color:var(--primary-hover)] border-[color:var(--primary-hover)] shadow-[0_10px_20px_-11px_rgba(37,99,235,0.9)]"
                    : "bg-white border-slate-200 shadow-sm hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_11px_22px_-13px_rgba(37,99,235,0.8)]"
                }`}
              >
                {tile.emoji ? (
                  <span className="text-[21px] leading-none">{tile.emoji}</span>
                ) : (
                  <Icon className={`h-5 w-5 ${active ? "text-white" : "text-slate-400"}`} />
                )}
                <span
                  className={`text-[10.5px] font-semibold leading-none max-w-[96px] truncate ${
                    active ? "text-white" : "text-slate-600"
                  }`}
                >
                  {tile.label}
                </span>
                <span
                  className={`absolute top-1.5 right-1.5 text-[9px] font-bold tabular-nums px-1.5 py-px rounded-full ${
                    active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {tile.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => scrollByStep(1)}
        disabled={atEnd}
        aria-label="Próximas categorias"
        className={arrowClass(atEnd)}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
