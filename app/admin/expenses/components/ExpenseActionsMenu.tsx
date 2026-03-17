"use client";

import { Button } from "@/app/components/ui/button";
import { Edit, MoreVertical, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ExpenseActionsMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

export function ExpenseActionsMenu({ onEdit, onDelete }: ExpenseActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = 80;
      const top = spaceBelow < menuHeight ? rect.top - menuHeight - 8 : rect.bottom + 8;
      setMenuPosition({ top, left: rect.right - 128 });
    } else {
      setMenuPosition(null);
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleScroll = () => setOpen(false);

    if (open) {
      setTimeout(() => document.addEventListener("click", handleClickOutside), 0);
      window.addEventListener("scroll", handleScroll, true);
    } else {
      document.removeEventListener("click", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  return (
    <>
      <div className="relative inline-block" ref={menuRef}>
        <Button
          ref={buttonRef}
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Mais opções"
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        >
          <MoreVertical className="h-4 w-4 text-slate-500" />
        </Button>
      </div>

      {open && menuPosition && (
        <div
          ref={dropdownRef}
          className="fixed z-[100] w-32 bg-white border border-slate-200 rounded-lg shadow-lg py-1"
          style={{ top: menuPosition.top, left: menuPosition.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            onClick={(e) => { e.stopPropagation(); onEdit(); setOpen(false); }}
          >
            <Edit className="h-4 w-4 mr-2 text-blue-500" />
            Editar
          </button>
          <button
            className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            onClick={(e) => { e.stopPropagation(); onDelete(); setOpen(false); }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remover
          </button>
        </div>
      )}
    </>
  );
}
