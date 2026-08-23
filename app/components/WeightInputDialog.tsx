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
import { Label } from "@/app/components/ui/label";
import {
  WEIGHT_PRESETS_KG,
  WEIGHT_RANGE_HINT,
  WEIGHT_REQUIRED_MESSAGE,
  formatWeightKg,
  parseWeightInput,
  roundWeightKg,
  sanitizeWeightInput,
  validateWeightKg,
  weightPriceCents,
} from "@/lib/weight";
import { AlertCircle, Scale } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type WeightInputDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  pricePerKgCents: number;
  /** Peso já informado — preenche o campo ao editar um item existente. */
  initialWeightKg?: number | null;
  onConfirm: (weightKg: number) => void;
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function WeightInputDialog({
  open,
  onOpenChange,
  productName,
  pricePerKgCents,
  initialWeightKg,
  onConfirm,
}: WeightInputDialogProps) {
  const [weight, setWeight] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isEditing = initialWeightKg != null && initialWeightKg > 0;

  useEffect(() => {
    if (!open) return;
    setWeight(isEditing ? String(initialWeightKg) : "");
    setError("");
    // Deixa o Radix concluir o foco inicial antes de assumir o campo.
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 60);
    return () => clearTimeout(timer);
  }, [open, initialWeightKg, isEditing]);

  const applyWeight = (raw: string) => {
    const normalized = sanitizeWeightInput(raw);
    setWeight(normalized);

    const parsed = parseWeightInput(normalized);
    setError(parsed === null ? "" : validateWeightKg(parsed) ?? "");
  };

  const handleConfirm = () => {
    const parsed = parseWeightInput(weight);

    if (parsed === null) {
      setError(WEIGHT_REQUIRED_MESSAGE);
      inputRef.current?.focus();
      return;
    }

    const weightKg = roundWeightKg(parsed);
    const validationError = validateWeightKg(weightKg);

    if (validationError) {
      setError(validationError);
      inputRef.current?.focus();
      return;
    }

    onConfirm(weightKg);
  };

  const parsedWeight = parseWeightInput(weight);
  const previewWeight = parsedWeight !== null ? roundWeightKg(parsedWeight) : 0;
  const isValid = !validateWeightKg(previewWeight || null);
  const totalCents = isValid ? weightPriceCents(pricePerKgCents, previewWeight) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        /* Fica acima do modal de seleção de produtos (z-[80]/z-[79]). */
        className="max-w-md z-[90]"
        overlayClassName="z-[89]"
      >
        {/* ── HEADER ── */}
        <DialogHeader>
          <DialogTitle>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
              style={{
                background: "var(--modal-header-icon-bg)",
                outline: "1px solid var(--modal-header-icon-ring)",
              }}
            >
              <Scale className="h-5 w-5 text-primary" />
            </div>
            {isEditing ? "Ajustar peso" : "Informar peso"}
          </DialogTitle>
          <DialogDescription>
            {productName} · {formatCurrency(pricePerKgCents)}/kg
          </DialogDescription>
        </DialogHeader>

        {/* ── CORPO ── */}
        <div className="px-6 py-5 space-y-4">
          {/* Campo de peso */}
          <div className="space-y-1.5">
            <Label
              htmlFor="pre-order-weight"
              className="text-xs font-medium text-slate-500 uppercase tracking-wide"
            >
              Peso do item
            </Label>
            <div
              className={`flex items-center rounded-xl border overflow-hidden transition-all ${
                error
                  ? "border-red-300 ring-2 ring-red-100"
                  : "border-slate-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15"
              }`}
            >
              <div className="flex items-center px-4 py-3 bg-slate-50 border-r border-slate-200 flex-shrink-0">
                <Scale className="h-4 w-4 text-slate-400" />
              </div>
              <input
                id="pre-order-weight"
                ref={inputRef}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={weight}
                onChange={(e) => applyWeight(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirm();
                  }
                }}
                placeholder="0,000"
                className="flex-1 min-w-0 px-3 py-3 text-2xl font-bold text-slate-900 bg-white outline-none tabular-nums placeholder:text-slate-300 placeholder:font-normal placeholder:text-lg"
              />
              <span className="px-4 py-3 text-sm font-semibold text-slate-400 flex-shrink-0">
                kg
              </span>
            </div>

            {error ? (
              <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {error}
              </p>
            ) : (
              <p className="text-xs text-slate-400">{WEIGHT_RANGE_HINT}</p>
            )}
          </div>

          {/* Atalhos de peso */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Pesos rápidos
            </span>
            <div className="flex flex-wrap gap-1.5">
              {WEIGHT_PRESETS_KG.map((preset) => {
                const isActive = previewWeight === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyWeight(String(preset))}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-all ${
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                    }`}
                  >
                    {formatWeightKg(preset)} kg
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prévia do valor da linha */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white divide-y divide-slate-100">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-slate-500">Preço por quilo</span>
              <span className="text-xs font-medium text-slate-700 tabular-nums">
                {formatCurrency(pricePerKgCents)}/kg
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs text-slate-500">Peso informado</span>
              <span className="text-xs font-medium text-slate-700 tabular-nums">
                {isValid ? `${formatWeightKg(previewWeight)} kg` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-emerald-50">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                Total do item
              </span>
              <span className="text-xl font-bold text-emerald-700 tabular-nums">
                {formatCurrency(totalCents)}
              </span>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <DialogFooter>
          <p className="text-xs text-slate-400">Pressione Enter para confirmar</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={!isValid}>
              {isEditing ? "Salvar peso" : "Adicionar ao pedido"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
