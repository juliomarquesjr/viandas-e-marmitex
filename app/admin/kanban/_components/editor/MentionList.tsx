"use client";

import { useEffect, useRef } from "react";
import { Package, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MentionResult } from "../shared/types";

const TYPE_ICONS = {
  user: User,
  customer: ShoppingBag,
  product: Package,
};

const TYPE_LABELS = {
  user: "Usuário",
  customer: "Cliente",
  product: "Produto",
};

const TYPE_COLORS = {
  user: "text-blue-400",
  customer: "text-emerald-400",
  product: "text-amber-400",
};

interface MentionListProps {
  items: MentionResult[];
  command: (item: { id: string; label: string; mentionType: string }) => void;
  onClose: () => void;
}

export function MentionList({ items, command }: MentionListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-slate-800 border border-white/10 p-3 shadow-xl min-w-[220px]">
        <p className="text-xs text-white/40">Nenhum resultado</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-slate-800 border border-white/10 py-1 shadow-xl min-w-[220px] max-h-64 overflow-y-auto">
      {items.map((item) => {
        const Icon = TYPE_ICONS[item.type];
        const colorClass = TYPE_COLORS[item.type];
        return (
          <button
            key={`${item.type}-${item.id}`}
            type="button"
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-white/10 transition-colors"
            onMouseDown={(e) => {
              e.preventDefault();
              command({ id: item.id, label: item.label, mentionType: item.type });
            }}
          >
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.label}
                className="h-7 w-7 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className={cn("flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/10", colorClass)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{item.label}</p>
              {item.subtitle && (
                <p className={cn("text-[10px] truncate", colorClass)}>{item.subtitle}</p>
              )}
            </div>
            <span className={cn("ml-auto text-[9px] font-medium uppercase tracking-wide opacity-50", colorClass)}>
              {TYPE_LABELS[item.type]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
