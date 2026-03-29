"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import type { CartItem } from "../types";

interface CartItemRowProps {
  item: CartItem;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onDecrement: () => void;
  onIncrement: () => void;
  onRemove: () => void;
  incrementDisabled?: boolean;
}

export function CartItemRow({
  item,
  index,
  isSelected,
  onClick,
  onDecrement,
  onIncrement,
  onRemove,
  incrementDisabled = false,
}: CartItemRowProps) {
  return (
    <div
      className={`group relative flex items-start gap-2.5 mx-1.5 my-0.5 px-3 py-2.5 rounded-xl transition-all duration-150 ${
        isSelected
          ? "bg-gradient-to-r from-primary/8 to-primary/5 ring-1 ring-primary/20 shadow-sm"
          : "hover:bg-slate-50/80"
      }`}
      onClick={onClick}
    >
      {/* Barra de acento lateral */}
      <div
        className={`absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-full transition-all duration-150 ${
          isSelected ? "bg-primary opacity-100" : "opacity-0"
        }`}
      />

      {/* Número do item */}
      <div
        className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 transition-colors duration-150 ${
          isSelected ? "bg-primary text-white shadow-sm" : "bg-slate-100 text-slate-400"
        }`}
      >
        {index + 1}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium leading-tight line-clamp-1 flex-1 text-slate-800">
            {item.name}
          </span>
          <span className="text-sm font-bold text-slate-900 whitespace-nowrap tabular-nums">
            R$ {(item.qty * item.price).toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-1.5">
          <span className="text-[11px] text-muted-foreground">
            {item.isWeightBased && item.weightKg ? (
              <>
                {item.weightKg.toFixed(3)} kg × R$ {(item.price / item.weightKg).toFixed(2)}/kg
              </>
            ) : (
              <>
                R$ {item.price.toFixed(2)} × {item.qty}
              </>
            )}
          </span>

          <div className="flex items-center gap-1">
            {!item.isWeightBased ? (
              <div className="flex items-center gap-0.5 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <button
                  onClick={onDecrement}
                  className="h-5 w-6 flex items-center justify-center hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                  aria-label="Diminuir quantidade"
                >
                  <Minus className="h-2.5 w-2.5" />
                </button>
                <span className="w-5 text-center text-[11px] font-bold tabular-nums text-slate-800 border-x border-slate-200">
                  {item.qty}
                </span>
                <button
                  type="button"
                  onClick={onIncrement}
                  disabled={incrementDisabled}
                  className={`h-5 w-6 flex items-center justify-center transition-colors ${
                    incrementDisabled
                      ? "text-slate-300 cursor-not-allowed"
                      : "hover:bg-primary/10 hover:text-primary text-slate-500"
                  }`}
                  aria-label="Aumentar quantidade"
                >
                  <Plus className="h-2.5 w-2.5" />
                </button>
              </div>
            ) : (
              <Badge variant="info" size="sm">
                {item.weightKg?.toFixed(3)} kg
              </Badge>
            )}

            <button
              onClick={onRemove}
              aria-label={`Remover ${item.name}`}
              className="h-6 w-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 ml-0.5"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
