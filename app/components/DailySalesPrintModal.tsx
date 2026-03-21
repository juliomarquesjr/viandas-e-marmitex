"use client";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Calendar, ExternalLink, FileText, Printer } from "lucide-react";
import { useState } from "react";

interface DailySalesPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

export function DailySalesPrintModal({
  open,
  onOpenChange,
}: DailySalesPrintModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const handlePrintThermal = () => {
    const url = `/print/daily-sales-thermal?date=${selectedDate}`;
    window.open(url, "_blank");
    onOpenChange(false);
  };

  const handlePrintA4 = () => {
    const url = `/print/daily-sales-a4?date=${selectedDate}`;
    window.open(url, "_blank");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{
                background: "var(--modal-header-icon-bg)",
                outline: "1px solid var(--modal-header-icon-ring)",
              }}
            >
              <Printer className="h-5 w-5 text-primary" />
            </div>
            Imprimir Vendas Diárias
          </DialogTitle>
          <DialogDescription>
            Selecione a data e o formato de impressão
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          <SectionDivider label="Data" />

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <Calendar className="h-4 w-4 text-slate-400" />
            </div>
            <input
              id="print-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <SectionDivider label="Formato de Impressão" />

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handlePrintThermal}
              className="group flex flex-col items-center gap-2.5 p-4 border border-slate-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors"
                style={{
                  background: "var(--modal-header-icon-bg)",
                  outline: "1px solid var(--modal-header-icon-ring)",
                }}
              >
                <Printer className="h-5 w-5 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-900">Térmica</p>
                <p className="text-xs text-slate-400 mt-0.5">Bobina 58 mm</p>
              </div>
            </button>

            <button
              onClick={handlePrintA4}
              className="group flex flex-col items-center gap-2.5 p-4 border border-slate-200 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-slate-300/50"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 outline outline-1 outline-slate-200 transition-colors">
                <FileText className="h-5 w-5 text-slate-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-900">A4</p>
                <p className="text-xs text-slate-400 mt-0.5">Relatório completo</p>
              </div>
            </button>
          </div>
        </div>

        <DialogFooter>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <ExternalLink className="h-3 w-3" />
            Abre em uma nova aba
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
