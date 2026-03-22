"use client";

import { Calculator, Delete, Divide, Equal, Minus, Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useStandardCalculator } from "../pdv/hooks/useStandardCalculator";

interface CalculatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BUTTONS = [
  { label: "C", value: "C", variant: "outline" as const, className: "text-red-600" },
  {
    label: "⌫",
    value: "Backspace",
    variant: "outline" as const,
    className: "text-amber-700",
    icon: Delete,
  },
  { label: "÷", value: "/", variant: "outline" as const, icon: Divide },
  { label: "×", value: "*", variant: "outline" as const, className: "text-lg font-bold" },
  { label: "7", value: "7" },
  { label: "8", value: "8" },
  { label: "9", value: "9" },
  { label: "-", value: "-", variant: "outline" as const, icon: Minus },
  { label: "4", value: "4" },
  { label: "5", value: "5" },
  { label: "6", value: "6" },
  { label: "+", value: "+", variant: "outline" as const, icon: Plus },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  {
    label: "=",
    value: "=",
    icon: Equal,
    className: "row-span-2 h-full bg-primary text-white hover:bg-primary-hover",
  },
  { label: "0", value: "0", className: "col-span-2" },
  { label: ",", value: "." },
];

export function CalculatorModal({ open, onOpenChange }: CalculatorModalProps) {
  const { display, operatorLabel, onButtonPress, inputFromKeyboard } = useStandardCalculator();
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      contentRef.current?.focus();
    }, 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      const consumed = inputFromKeyboard(event);

      if (!consumed) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [inputFromKeyboard, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div ref={contentRef} tabIndex={-1} className="outline-none">
          <DialogHeader className="border-b bg-slate-50/80 px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Calculator className="h-5 w-5 text-primary" />
              Calculadora
            </DialogTitle>
            <DialogDescription>
              Use o teclado ou clique nos botões para calcular como na calculadora padrão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 bg-white p-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-950 px-4 py-5 text-right text-white shadow-inner">
              <div className="min-h-5 text-xs uppercase tracking-[0.3em] text-slate-400">
                {operatorLabel || "\u00A0"}
              </div>
              <div dir="ltr" className="mt-2 truncate text-4xl font-semibold tabular-nums">
                {display}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {BUTTONS.map((button) => {
                const Icon = button.icon;

                return (
                  <Button
                    key={`${button.label}-${button.value}`}
                    type="button"
                    variant={button.variant ?? "secondary"}
                    className={`h-16 text-xl font-semibold ${button.className ?? ""}`}
                    onClick={() => onButtonPress(button.value)}
                    aria-label={button.label === "⌫" ? "Apagar último dígito" : `Tecla ${button.label}`}
                  >
                    {Icon ? <Icon className="h-5 w-5" /> : button.label}
                  </Button>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>`Esc` limpa</span>
              <span>`Enter` calcula</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
