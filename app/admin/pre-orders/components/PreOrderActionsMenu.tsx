"use client";

import { Button } from "@/app/components/ui/button";
import {
  FileText,
  MapPin,
  MoreVertical,
  Package,
  Printer,
  Receipt,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function PreOrderActionsMenu({
  onEdit,
  onViewDetails,
  onViewSummary,
  onPrint,
  onConvert,
  onTrack,
  onDelete,
}: {
  onEdit: () => void;
  onViewDetails: () => void;
  onViewSummary: () => void;
  onPrint: () => void;
  onConvert: () => void;
  onTrack: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(!open)}
        aria-label="Ações"
      >
        <MoreVertical className="h-4 w-4" />
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-48 bg-white rounded-lg border border-slate-200 shadow-lg py-1">
          <button
            role="menuitem"
            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onViewSummary();
            }}
          >
            <Package className="h-4 w-4 mr-2 text-slate-400" />
            Ver resumo
          </button>
          <button
            role="menuitem"
            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            <Package className="h-4 w-4 mr-2 text-slate-400" />
            Editar
          </button>
          <button
            role="menuitem"
            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onViewDetails();
            }}
          >
            <FileText className="h-4 w-4 mr-2 text-slate-400" />
            Ver detalhes
          </button>
          <button
            role="menuitem"
            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onPrint();
            }}
          >
            <Printer className="h-4 w-4 mr-2 text-slate-400" />
            Imprimir recibo
          </button>
          <button
            role="menuitem"
            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onConvert();
            }}
          >
            <Receipt className="h-4 w-4 mr-2 text-slate-400" />
            Converter em venda
          </button>
          <button
            role="menuitem"
            className="flex items-center w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onTrack();
            }}
          >
            <MapPin className="h-4 w-4 mr-2 text-slate-400" />
            Rastrear entrega
          </button>
          <div className="border-t border-slate-100 my-1"></div>
          <button
            role="menuitem"
            className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remover
          </button>
        </div>
      )}
    </div>
  );
}
